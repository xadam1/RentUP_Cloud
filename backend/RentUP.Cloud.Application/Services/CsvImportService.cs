using System.Globalization;
using Microsoft.AspNetCore.Http;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Entities;

namespace RentUP.Cloud.Application.Services;

/// <summary>
/// Two-phase CSV import service.
/// Phase 1 (Preview): parse, validate, return preview rows — NO DB writes.
/// Phase 2 (Commit): client sends confirmed rows, service writes to DB.
///
/// Ported from legacy RentUP.Services.CsvImportService.
/// CSV format: semicolon-separated, columns: Date;ProductName;AUM;MonthlyDeposit
/// Multiple Czech date formats supported (dd.MM.yyyy, yyyy-MM-dd, M/d/yyyy).
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
        "yyyy-MM-dd", "M/d/yyyy", "MM/dd/yyyy"
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

    /// <summary>
    /// Parses the uploaded CSV file and returns a preview without writing to DB.
    /// The client shows this to the user for confirmation.
    /// </summary>
    public async Task<CsvPreviewResult> PreviewAsync(IFormFile file)
    {
        var lines = await ReadLinesAsync(file);
        var existingProducts = await _products.GetAllAsync(includeInactive: true);
        var productByName = existingProducts.ToDictionary(p => p.Name.Trim(), p => p, StringComparer.OrdinalIgnoreCase);

        var rows = new List<CsvPreviewRow>();
        var warnings = new List<string>();
        int skipped = 0;

        foreach (var (line, lineNumber) in lines.Select((l, i) => (l, i + 2))) // 1-based, skip header
        {
            var parts = line.Split(';');
            if (parts.Length < 3)
            {
                warnings.Add($"Řádek {lineNumber}: nedostatečný počet sloupců, přeskočeno.");
                skipped++;
                continue;
            }

            if (!TryParseDate(parts[0].Trim(), out var date))
            {
                warnings.Add($"Řádek {lineNumber}: nepodporovaný formát data '{parts[0]}', přeskočeno.");
                skipped++;
                continue;
            }

            var productName = parts[1].Trim();
            if (string.IsNullOrEmpty(productName))
            {
                warnings.Add($"Řádek {lineNumber}: prázdný název produktu, přeskočeno.");
                skipped++;
                continue;
            }

            if (!TryParseDecimal(parts[2].Trim(), out var aum))
            {
                warnings.Add($"Řádek {lineNumber}: nelze parsovat AUM '{parts[2]}', přeskočeno.");
                skipped++;
                continue;
            }

            decimal monthlyDeposit = 0m;
            if (parts.Length > 3 && !string.IsNullOrWhiteSpace(parts[3]))
                TryParseDecimal(parts[3].Trim(), out monthlyDeposit);

            string? rowWarning = null;
            if (!productByName.ContainsKey(productName))
                rowWarning = $"Produkt '{productName}' neexistuje — bude automaticky vytvořen.";

            rows.Add(new CsvPreviewRow(date, productName, aum, monthlyDeposit, rowWarning));
        }

        return new CsvPreviewResult(rows, warnings, rows.Count, skipped);
    }

    // ── Phase 2: Commit ───────────────────────────────────────────────────────

    /// <summary>
    /// Commits confirmed rows to the database.
    /// Auto-creates missing products. Upserts snapshots.
    /// Recalculates AumSnapshots for each affected date.
    /// </summary>
    public async Task CommitAsync(CsvCommitRequest request, string userId)
    {
        var allProducts = await _products.GetAllAsync(includeInactive: true);
        var productById = allProducts.ToDictionary(p => p.Id);

        // Group rows by date
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
                if (!productById.ContainsKey(row.ProductId)) continue;

                productSnapshots.Add(new ProductSnapshot
                {
                    UserId = userId,
                    ProductId = row.ProductId,
                    Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                    Aum = row.Aum,
                    MonthlyDeposit = row.MonthlyDeposit
                });

                dateTotalAum += row.Aum;
                dateTotalDeposit += row.MonthlyDeposit;
                aumByProductId[row.ProductId] = row.Aum;
            }

            var pointsPerYear = _calculator.CalculatePointsPerYear(
                allProducts.Where(p => aumByProductId.ContainsKey(p.Id)),
                aumByProductId);

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
    }

    // ── Preview with name resolution (maps names → IDs before Commit) ─────────

    /// <summary>
    /// Converts CsvPreviewRows to CsvCommitRows by resolving (or creating) product IDs.
    /// Called server-side when client sends confirmed preview rows.
    /// </summary>
    public async Task<List<CsvCommitRow>> ResolveProductIdsAsync(
        List<CsvPreviewRow> confirmedRows, string userId)
    {
        var allProducts = await _products.GetAllAsync(includeInactive: true);
        var productByName = allProducts.ToDictionary(p => p.Name.Trim(), p => p, StringComparer.OrdinalIgnoreCase);

        var result = new List<CsvCommitRow>();

        foreach (var row in confirmedRows)
        {
            if (!productByName.TryGetValue(row.ProductName, out var product))
            {
                // Auto-create minimal product
                product = new Product
                {
                    UserId = userId,
                    Name = row.ProductName,
                    IsActive = true
                };
                await _products.AddAsync(product);
                await _products.SaveChangesAsync();
                productByName[product.Name] = product;
            }

            result.Add(new CsvCommitRow(row.Date, product.Id, row.Aum, row.MonthlyDeposit));
        }

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static async Task<List<string>> ReadLinesAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream());
        var all = await reader.ReadToEndAsync();
        var lines = all.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries).ToList();
        // Skip header row
        if (lines.Count > 0) lines.RemoveAt(0);
        return lines;
    }

    private static bool TryParseDate(string s, out DateTime result)
    {
        return DateTime.TryParseExact(s, DateFormats,
            CultureInfo.InvariantCulture, DateTimeStyles.None, out result)
            || DateTime.TryParse(s, new CultureInfo("cs-CZ"), DateTimeStyles.None, out result);
    }

    private static bool TryParseDecimal(string s, out decimal result)
    {
        // Czech locale uses comma as decimal separator
        var normalized = s.Replace(" ", "").Replace(",", ".");
        return decimal.TryParse(normalized, NumberStyles.Any, CultureInfo.InvariantCulture, out result);
    }
}
