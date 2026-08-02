using System.Globalization;
using Microsoft.AspNetCore.Http;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.Services;

/// <summary>
/// Two-phase CSV import service ported from legacy desktop application logic.
/// Supports matrix CSV format (datum_stav;AVANT;CONSEQ;...) where columns represent products.
/// Phase 1 (Preview): parse, validate, return preview rows — NO DB writes.
/// Phase 2 (Commit): client sends confirmed rows, service writes to DB and updates CurrentAum.
/// </summary>
public class CsvImportService
{
    private readonly IProductRepository _products;
    private readonly IProductSnapshotRepository _productSnapshots;
    private readonly IAumSnapshotRepository _aumSnapshots;
    private readonly CalculationService _calculator;

    private static readonly string[] DateFormats =
    [
        "dd.MM.yyyy", "d.M.yyyy", "d.MM.yyyy", "dd.M.yyyy",
        "yyyy-MM-dd", "M/d/yyyy", "MM/dd/yyyy", "d. M. yyyy", "dd. MM. yyyy"
    ];

    public CsvImportService(
        IProductRepository products,
        IProductSnapshotRepository productSnapshots,
        IAumSnapshotRepository aumSnapshots,
        CalculationService calculator)
    {
        _products = products;
        _productSnapshots = productSnapshots;
        _aumSnapshots = aumSnapshots;
        _calculator = calculator;
    }

    // ── Phase 1: Preview ──────────────────────────────────────────────────────

    public async Task<CsvPreviewResult> PreviewAsync(IFormFile file)
    {
        var lines = await ReadRawLinesAsync(file);
        if (lines.Count == 0)
        {
            return new CsvPreviewResult([], ["Soubor je prázdný."], 0, 0);
        }

        var header = lines[0].Split(';');
        if (header.Length < 2)
        {
            return new CsvPreviewResult([], ["Neplatný formát hlavičky — chybí sloupce s názvy produktů nebo oddělovače středníkem."], 0, 0);
        }

        var productNames = new List<string>();
        for (int i = 1; i < header.Length; i++)
        {
            productNames.Add(header[i].Trim());
        }

        var existingProducts = await _products.GetAllAsync(includeInactive: true);
        var productByName = existingProducts.ToDictionary(p => p.Name.Trim(), p => p, StringComparer.OrdinalIgnoreCase);

        var rows = new List<CsvPreviewRow>();
        var warnings = new List<string>();
        var newProductNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int skipped = 0;

        foreach (var name in productNames)
        {
            if (!string.IsNullOrEmpty(name) && !productByName.ContainsKey(name))
            {
                newProductNames.Add(name);
            }
        }

        if (newProductNames.Count > 0)
        {
            warnings.Add($"Nové produkty k vytvoření ({newProductNames.Count}): {string.Join(", ", newProductNames)}");
        }

        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = line.Split(';');
            if (parts.Length < 1 || string.IsNullOrWhiteSpace(parts[0]))
            {
                skipped++;
                continue;
            }

            if (!TryParseDate(parts[0].Trim(), out var date))
            {
                warnings.Add($"Řádek {i + 1}: neplatný formát data '{parts[0]}', řádek přeskočen.");
                skipped++;
                continue;
            }

            for (int j = 1; j < parts.Length && (j - 1) < productNames.Count; j++)
            {
                var valStr = parts[j].Trim().Replace(" ", "").Replace(",", ".");
                if (string.IsNullOrWhiteSpace(valStr)) continue;

                if (decimal.TryParse(valStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var aumValue))
                {
                    var productName = productNames[j - 1];
                    if (string.IsNullOrEmpty(productName)) continue;

                    string? rowWarning = newProductNames.Contains(productName) ? $"Nový produkt '{productName}'" : null;
                    rows.Add(new CsvPreviewRow(date, productName, aumValue, 0m, rowWarning));
                }
            }
        }

        return new CsvPreviewResult(rows, warnings, rows.Count, skipped);
    }

    // ── Phase 2: Commit ───────────────────────────────────────────────────────

    public async Task CommitAsync(CsvCommitRequest request, string userId)
    {
        var allProducts = await _products.GetAllAsync(includeInactive: true);
        var productById = allProducts.ToDictionary(p => p.Id);

        var rowsByDate = request.Rows
            .GroupBy(r => r.Date.Date)
            .OrderBy(g => g.Key);

        var productSnapshots = new List<ProductSnapshot>();
        var aumSnapshots = new List<AumSnapshot>();

        foreach (var dateGroup in rowsByDate)
        {
            var date = dateGroup.Key;
            decimal dateTotalAum = 0m;
            decimal dateTotalDeposit = 0m;
            var aumByProductId = new Dictionary<Guid, decimal>();

            foreach (var row in dateGroup)
            {
                if (!productById.TryGetValue(row.ProductId, out var p)) continue;

                productSnapshots.Add(new ProductSnapshot
                {
                    UserId = userId,
                    ProductId = row.ProductId,
                    Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                    Aum = row.Aum,
                    MonthlyDeposit = row.MonthlyDeposit
                });

                if (p.IncludeInAum && p.IsActive)
                {
                    dateTotalAum += row.Aum;
                    dateTotalDeposit += row.MonthlyDeposit;
                }
                aumByProductId[row.ProductId] = row.Aum;
            }

            foreach (var p in allProducts)
            {
                if (!aumByProductId.ContainsKey(p.Id) && p.IncludeInAum && p.IsActive)
                {
                    dateTotalDeposit += p.MonthlyDeposit;
                }
            }

            var pointsPerYear = _calculator.CalculatePointsPerYear(allProducts, aumByProductId);

            aumSnapshots.Add(new AumSnapshot
            {
                UserId = userId,
                Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                TotalAum = dateTotalAum,
                TotalMonthlyDeposit = dateTotalDeposit,
                PointsPerYear = pointsPerYear
            });
        }

        await _productSnapshots.UpsertBatchAsync(productSnapshots);
        await _aumSnapshots.UpsertBatchAsync(aumSnapshots);
        await _productSnapshots.SaveChangesAsync();

        // Aktualizace CurrentAum u všech produktů podle jejich nejnovějšího snapshotu
        foreach (var product in allProducts)
        {
            var snaps = await _productSnapshots.GetByProductIdAsync(product.Id);
            var latest = snaps.OrderByDescending(s => s.Date).FirstOrDefault();
            if (latest != null)
            {
                product.CurrentAum = latest.Aum;
                if (latest.MonthlyDeposit > 0) product.MonthlyDeposit = latest.MonthlyDeposit;
                await _products.UpdateAsync(product);
            }
        }
        await _products.SaveChangesAsync();
    }

    // ── Name resolution (maps names → IDs before Commit) ──────────────────────

    public async Task<List<CsvCommitRow>> ResolveProductIdsAsync(
        List<CsvPreviewRow> confirmedRows, string userId)
    {
        var allProducts = await _products.GetAllAsync(includeInactive: true);
        var productByName = allProducts.ToDictionary(p => p.Name.Trim(), p => p, StringComparer.OrdinalIgnoreCase);

        var randomColors = new[] { "#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16", "#14b8a6", "#f97316" };
        var rand = new Random();

        var result = new List<CsvCommitRow>();

        foreach (var row in confirmedRows)
        {
            if (!productByName.TryGetValue(row.ProductName, out var product))
            {
                decimal averageYield = 0m;
                string commissionFormula = "0";
                var category = ProductCategory.InvestmentFund;
                var company = ProductCompany.Other;

                var name = row.ProductName;
                if (name.Contains("ZFP Investments", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 5.3m;
                    commissionFormula = "(AUM/1555200)*24";
                    company = ProductCompany.ZfpInvestments;
                }
                else if (name.Contains("Wood", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 8.5m;
                    commissionFormula = "AUM/276360*12";
                    company = ProductCompany.WoodAndCo;
                }
                else if (name.Contains("AVANT", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 9m;
                    commissionFormula = "AUM/173340*4";
                    company = ProductCompany.Avant;
                }
                else if (name.Contains("Conseq", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 8.5m;
                    commissionFormula = "AUM/100*1.5/1649";
                    company = ProductCompany.Conseq;
                }
                else if (name.Contains("Generali I", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 6m;
                    commissionFormula = "AUM/437000*12";
                    company = ProductCompany.GeneraliInvestments;
                }
                else if (name.Contains("ZFP Finance", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 0m;
                    commissionFormula = "0";
                    company = ProductCompany.ZfpFinance;
                    category = ProductCategory.Bonds;
                }
                else if (name.Contains("ZFP Gold", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 6m;
                    commissionFormula = "AUM/100000";
                    company = ProductCompany.ZfpGold;
                    category = ProductCategory.Commodities;
                }
                else if (name.Contains("JT", StringComparison.OrdinalIgnoreCase) || name.Contains("J&T", StringComparison.OrdinalIgnoreCase))
                {
                    averageYield = 6.5m;
                    commissionFormula = "AUM/100*1.0/1649";
                }

                product = new Product
                {
                    UserId = userId,
                    Name = row.ProductName,
                    Category = category,
                    Company = company,
                    ColorHex = randomColors[rand.Next(randomColors.Length)],
                    AverageYield = averageYield,
                    CommissionFormula = commissionFormula,
                    MonthlyDeposit = 0m,
                    IncludeInAum = true,
                    CurrentAum = 0m,
                    IsActive = true
                };
                await _products.AddAsync(product);
                await _products.SaveChangesAsync();
                productByName[product.Name] = product;
            }

            decimal deposit = row.MonthlyDeposit > 0 ? row.MonthlyDeposit : product.MonthlyDeposit;
            result.Add(new CsvCommitRow(row.Date, product.Id, row.Aum, deposit));
        }

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static async Task<List<string>> ReadRawLinesAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream());
        var all = await reader.ReadToEndAsync();
        return all.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries).ToList();
    }

    private static bool TryParseDate(string s, out DateTime result)
    {
        return DateTime.TryParseExact(s, DateFormats,
            CultureInfo.InvariantCulture, DateTimeStyles.None, out result)
            || DateTime.TryParse(s, new CultureInfo("cs-CZ"), DateTimeStyles.None, out result);
    }
}
