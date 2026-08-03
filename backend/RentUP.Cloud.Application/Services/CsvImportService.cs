using System.Globalization;
using Microsoft.AspNetCore.Http;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.Services;

/// <summary>
/// Two-phase CSV import service supporting:
/// 1) Partner AUM matrix or Partner-per-row format (Partner, Datum aktualizace, AUM)
/// 2) Historical AUM chart series format (Date, Datum aktualizace, AUM)
/// </summary>
public class CsvImportService
{
    private readonly IProductRepository _products;
    private readonly IAumSnapshotRepository _aumSnapshots;
    private readonly CalculationService _calculator;

    private static readonly string[] DateFormats =
    [
        "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss",
        "dd.MM.yyyy", "d.M.yyyy", "d.MM.yyyy", "dd.M.yyyy",
        "M/d/yyyy", "MM/dd/yyyy", "d. M. yyyy", "dd. MM. yyyy"
    ];

    public CsvImportService(
        IProductRepository products,
        IAumSnapshotRepository aumSnapshots,
        CalculationService calculator)
    {
        _products = products;
        _aumSnapshots = aumSnapshots;
        _calculator = calculator;
    }

    // ── Phase 1: Preview (Products / Partner AUM) ─────────────────────────────

    public async Task<CsvPreviewResult> PreviewAsync(IFormFile file)
    {
        var lines = await ReadRawLinesAsync(file);
        if (lines.Count == 0)
        {
            return new CsvPreviewResult([], ["Soubor je prázdný."], 0, 0);
        }

        var headerLine = lines[0];
        var existingProducts = await _products.GetAllAsync(includeInactive: true);
        var productByName = existingProducts.ToDictionary(p => p.Name.Trim(), p => p, StringComparer.OrdinalIgnoreCase);

        // Detect new "AUM dle partnera" format (Partner, Datum aktualizace, AUM)
        if (headerLine.Contains("Partner", StringComparison.OrdinalIgnoreCase) ||
            headerLine.Contains("Datum aktualizace", StringComparison.OrdinalIgnoreCase))
        {
            return await PreviewPartnerRowsAsync(lines, productByName);
        }

        // Legacy matrix format fallback (datum_stav;AVANT;CONSEQ;...)
        var header = headerLine.Split(';');
        if (header.Length < 2)
        {
            return new CsvPreviewResult([], ["Neplatný formát souboru — očekává se CSV s hlavičkou Partner, Datum aktualizace, AUM."], 0, 0);
        }

        var productNames = new List<string>();
        for (int i = 1; i < header.Length; i++)
        {
            productNames.Add(header[i].Trim());
        }

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
            warnings.Add($"Nové produkty k založení ({newProductNames.Count}): {string.Join(", ", newProductNames)}");
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

    private Task<CsvPreviewResult> PreviewPartnerRowsAsync(List<string> lines, Dictionary<string, Product> productByName)
    {
        var rows = new List<CsvPreviewRow>();
        var warnings = new List<string>();
        var newProductNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int skipped = 0;

        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = line.Split(',', ';');
            if (parts.Length < 3 || string.IsNullOrWhiteSpace(parts[0]))
            {
                skipped++;
                continue;
            }

            var productName = parts[0].Trim();
            var dateStr = parts[1].Trim();
            var valStr = parts[2].Trim().Replace(" ", "").Replace(",", ".").Replace("'", "");

            if (!TryParseDate(dateStr, out var date))
            {
                date = DateTime.UtcNow.Date;
            }

            if (decimal.TryParse(valStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var aumValue))
            {
                if (!productByName.ContainsKey(productName))
                {
                    newProductNames.Add(productName);
                }
                string? rowWarning = newProductNames.Contains(productName) ? $"Neznáš partner – při importu se automaticky založí nový produkt '{productName}'" : null;
                rows.Add(new CsvPreviewRow(date, productName, Math.Round(aumValue, 2), 0m, rowWarning));
            }
            else
            {
                warnings.Add($"Řádek {i + 1}: nelze přečíst částku AUM '{parts[2]}', přeskočen.");
                skipped++;
            }
        }

        if (newProductNames.Count > 0)
        {
            warnings.Add($"Nové produkty/partneři, kteří budou vytvořeni ({newProductNames.Count}): {string.Join(", ", newProductNames)}");
        }

        return Task.FromResult(new CsvPreviewResult(rows, warnings, rows.Count, skipped));
    }

    // ── Phase 2: Commit (Products / Partner AUM) ──────────────────────────────

    public async Task CommitAsync(CsvCommitRequest request, string userId)
    {
        var allProducts = await _products.GetAllAsync(includeInactive: true);
        var productById = allProducts.ToDictionary(p => p.Id);

        // Update CurrentAum directly on products (no product snapshot table needed!)
        foreach (var row in request.Rows)
        {
            if (productById.TryGetValue(row.ProductId, out var p))
            {
                p.CurrentAum = row.Aum;
                if (row.MonthlyDeposit > 0) p.MonthlyDeposit = row.MonthlyDeposit;
                await _products.UpdateAsync(p);
            }
        }
        await _products.SaveChangesAsync();

        // Record aggregate AUM snapshots grouped strictly by calendar day (one per day)
        var rowsByDate = request.Rows
            .GroupBy(r => r.Date.Date)
            .OrderBy(g => g.Key);

        var aumSnapshots = new List<AumSnapshot>();

        foreach (var dateGroup in rowsByDate)
        {
            var date = dateGroup.Key;
            decimal dateTotalAum = 0m;
            decimal dateTotalDeposit = 0m;
            var aumByProductId = new Dictionary<Guid, decimal>();

            foreach (var p in allProducts)
            {
                var rowForProduct = dateGroup.LastOrDefault(r => r.ProductId == p.Id);
                var productAum = rowForProduct != null ? rowForProduct.Aum : p.CurrentAum;
                var productDeposit = rowForProduct != null && rowForProduct.MonthlyDeposit > 0 ? rowForProduct.MonthlyDeposit : p.MonthlyDeposit;

                if (p.IncludeInAum && p.IsActive)
                {
                    dateTotalAum += productAum;
                    dateTotalDeposit += productDeposit;
                }
                aumByProductId[p.Id] = productAum;
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

        if (aumSnapshots.Count > 0)
        {
            await _aumSnapshots.UpsertBatchAsync(aumSnapshots);
            await _aumSnapshots.SaveChangesAsync();
        }
    }

    // ── Historical AUM Import (Vývoj AUM.csv) ─────────────────────────────────

    public async Task<HistoryCsvPreviewResult> PreviewHistoryAsync(IFormFile file)
    {
        var lines = await ReadRawLinesAsync(file);
        if (lines.Count < 2)
        {
            return new HistoryCsvPreviewResult([], ["Soubor je prázdný nebo chybí datové řádky."], 0, 0);
        }

        var existingSnaps = await _aumSnapshots.GetAllAsync();
        var existingDates = existingSnaps.Select(s => s.Date.Date).ToHashSet();

        var rows = new List<HistoryCsvPreviewRow>();
        var warnings = new List<string>();
        int valid = 0;
        int overwriteCount = 0;

        // Skip header at line 0
        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = line.Split(',', ';');
            if (parts.Length < 2) continue;

            var dateStr = parts[0].Trim();
            var valStr = parts[parts.Length - 1].Trim().Replace(" ", "").Replace(",", ".");

            if (!TryParseDate(dateStr, out var date))
            {
                if (parts.Length >= 3 && TryParseDate(parts[1].Trim(), out var date2))
                {
                    date = date2;
                }
                else
                {
                    warnings.Add($"Řádek {i + 1}: neplatný formát data '{dateStr}', přeskočen.");
                    continue;
                }
            }

            if (decimal.TryParse(valStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var aum))
            {
                bool overwrites = existingDates.Contains(date.Date);
                if (overwrites) overwriteCount++;
                string? warn = overwrites ? "Existující záznam z tohoto dne bude naimportovanou hodnotou přepisán" : null;
                rows.Add(new HistoryCsvPreviewRow(date.Date, Math.Round(aum, 2), overwrites, warn));
                valid++;
            }
            else
            {
                warnings.Add($"Řádek {i + 1}: nelze vyčíst číselnou hodnotu AUM '{valStr}', přeskočen.");
            }
        }

        if (overwriteCount > 0)
        {
            warnings.Add($"Pozor: Pro {overwriteCount} zástupných dat už v historii záznam existuje. Potvrzením importu dojde k přepsání a aktualizaci na tyto nové naimportované hodnoty.");
        }

        return new HistoryCsvPreviewResult(rows, warnings, valid, overwriteCount);
    }

    public async Task CommitHistoryAsync(HistoryCsvCommitRequest request, string userId)
    {
        if (request.Rows.Count == 0) return;

        var existingSnaps = await _aumSnapshots.GetAllAsync();
        var latestSnapshot = existingSnaps.OrderByDescending(s => s.Date).FirstOrDefault();
        var defaultDeposit = latestSnapshot?.TotalMonthlyDeposit ?? 0m;
        var defaultPoints = latestSnapshot?.PointsPerYear ?? 0m;

        // Group strictly by calendar day (one record per day)
        var groupedRows = request.Rows
            .GroupBy(r => r.Date.Date)
            .Select(g => g.Last())
            .ToList();

        var snapshotsToUpsert = groupedRows.Select(row => new AumSnapshot
        {
            UserId = userId,
            Date = DateTime.SpecifyKind(row.Date.Date, DateTimeKind.Utc),
            TotalAum = row.Aum,
            TotalMonthlyDeposit = defaultDeposit,
            PointsPerYear = defaultPoints
        }).ToList();

        await _aumSnapshots.UpsertBatchAsync(snapshotsToUpsert);
        await _aumSnapshots.SaveChangesAsync();
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
                    commissionFormula = "AUM/100*1.5/150";
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
                    commissionFormula = "AUM/100*1.0/150";
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
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out result)) return true;
        if (DateTime.TryParse(s, new CultureInfo("cs-CZ"), DateTimeStyles.None, out result)) return true;
        return DateTime.TryParseExact(s, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out result);
    }
}
