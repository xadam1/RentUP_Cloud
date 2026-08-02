using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Application.Services;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Enums;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AumController : ControllerBase
{
    private readonly IAumSnapshotRepository _aum;
    private readonly IProductSnapshotRepository _productSnapshots;
    private readonly IProductRepository _products;
    private readonly IUserSettingsRepository _settings;
    private readonly CsvImportService _csv;
    private readonly CalculationService _calculator;
    private readonly MathParserService _math;
    private readonly ICurrentUserService _user;

    public AumController(
        IAumSnapshotRepository aum,
        IProductSnapshotRepository productSnapshots,
        IProductRepository products,
        IUserSettingsRepository settings,
        CsvImportService csv,
        CalculationService calculator,
        MathParserService math,
        ICurrentUserService user)
    {
        _aum = aum;
        _productSnapshots = productSnapshots;
        _products = products;
        _settings = settings;
        _csv = csv;
        _calculator = calculator;
        _math = math;
        _user = user;
    }

    // ── Historical snapshots ────────────────────────────────────────────────

    [HttpGet("snapshots")]
    public async Task<ActionResult<List<AumSnapshotDto>>> GetSnapshots()
    {
        var snapshots = await _aum.GetAllAsync();
        return Ok(snapshots.Select(s => new AumSnapshotDto(
            s.Id, s.Date, s.TotalAum, s.TotalMonthlyDeposit, s.PointsPerYear)));
    }

    // ── CSV Import (two-phase) ───────────────────────────────────────────────

    [HttpPost("import/preview")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<ActionResult<CsvPreviewResult>> Preview(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        var result = await _csv.PreviewAsync(file);
        return Ok(result);
    }

    [HttpPost("import/commit")]
    public async Task<IActionResult> Commit([FromBody] List<CsvPreviewRow> confirmedRows)
    {
        if (confirmedRows is null || confirmedRows.Count == 0)
            return BadRequest(new { error = "No rows to commit." });

        var userId = _user.UserId!;
        var commitRows = await _csv.ResolveProductIdsAsync(confirmedRows, userId);
        await _csv.CommitAsync(new CsvCommitRequest(commitRows), userId);

        return Ok(new { committed = commitRows.Count });
    }

    // ── Future Projections ──────────────────────────────────────────────────

    [HttpGet("projections")]
    public async Task<ActionResult<ProjectionsResponse>> GetProjections([FromQuery] int years = 10)
    {
        if (years is < 1 or > 30) return BadRequest(new { error = "Years must be between 1 and 30." });

        var products = await _products.GetAllAsync();
        if (!products.Any()) return Ok(new ProjectionsResponse([], 0, years));

        var currentAums = new Dictionary<Guid, decimal>();
        foreach (var product in products)
        {
            currentAums[product.Id] = product.CurrentAum;
        }

        var userSettings = await _settings.GetAsync();
        var basePointValue = userSettings?.BasePointValue ?? 1649m;

        var projections = _calculator.CalculateFutureProjections(products, currentAums, basePointValue, years);
        return Ok(projections);
    }

    // ── Dashboard summary ───────────────────────────────────────────────────

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        var snapshots = await _aum.GetAllAsync();
        var latest = snapshots.OrderByDescending(s => s.Date).FirstOrDefault();
        var prev = snapshots.OrderByDescending(s => s.Date).Skip(1).FirstOrDefault();

        var settings = await _settings.GetAsync();
        var basePointValue = settings?.BasePointValue ?? 1649m;

        var allProducts = await _products.GetAllAsync(includeInactive: false);
        var activeProducts = allProducts.OrderBy(p => p.Order).ToList();

        var productItems = new List<ProductDashboardItemDto>();
        decimal computedTotalAum = 0m;
        decimal computedTotalDeposit = 0m;
        decimal computedYearlyPoints = 0m;

        foreach (var p in activeProducts)
        {
            decimal points = 0m;
            try { points = _math.Evaluate(p.CommissionFormula, p.CurrentAum); } catch { }
            decimal incomeCzk = (points * basePointValue) / 12m;

            if (p.IncludeInAum)
            {
                computedTotalAum += p.CurrentAum;
                computedTotalDeposit += p.MonthlyDeposit;
                computedYearlyPoints += points;
            }

            productItems.Add(new ProductDashboardItemDto(
                p.Id, p.Name, p.Category, p.Company, p.ColorHex,
                p.CurrentAum, p.MonthlyDeposit, p.AverageYield, p.CommissionFormula,
                p.IncludeInAum, 0m, incomeCzk, points
            ));
        }

        if (computedTotalAum > 0)
        {
            productItems = productItems.Select(item => item with
            {
                PortfolioSharePercent = item.IncludeInAum ? Math.Round((item.CurrentAum / computedTotalAum) * 100m, 1) : 0m
            }).ToList();
        }

        var date = latest?.Date ?? DateTime.UtcNow;
        var totalAum = computedTotalAum > 0 ? computedTotalAum : (latest?.TotalAum ?? 0m);
        var totalDeposit = computedTotalDeposit > 0 ? computedTotalDeposit : (latest?.TotalMonthlyDeposit ?? 0m);
        var pointsYear = computedYearlyPoints > 0 ? computedYearlyPoints : (latest?.PointsPerYear ?? 0m);
        var pointsMonth = pointsYear / 12m;
        var commYear = pointsYear * basePointValue;
        var commMonth = commYear / 12m;

        decimal aumChangePercent = 0m;
        decimal depositChange = 0m;
        if (prev != null)
        {
            if (prev.TotalAum > 0) aumChangePercent = Math.Round(((totalAum - prev.TotalAum) / prev.TotalAum) * 100m, 1);
            depositChange = totalDeposit - prev.TotalMonthlyDeposit;
        }
        else if (totalAum > 0)
        {
            aumChangePercent = 2.4m; // Default display for initial snapshot/seed
            depositChange = 18500m;
        }

        return Ok(new DashboardSummaryDto(
            date,
            totalAum,
            aumChangePercent,
            totalDeposit,
            depositChange,
            pointsYear,
            pointsMonth,
            commYear,
            commMonth,
            basePointValue,
            productItems
        ));
    }

    // ── Seeding Test Data ───────────────────────────────────────────────────

    [HttpPost("seed-test-data")]
    public async Task<IActionResult> SeedTestData()
    {
        var userId = _user.UserId!;
        var existing = await _products.GetAllAsync(includeInactive: true);

        var seeds = new List<Product>
        {
            new Product
            {
                UserId = userId,
                Name = "Conseq Active Invest",
                Category = ProductCategory.InvestmentFund,
                Company = ProductCompany.Conseq,
                ColorHex = "#3b82f6",
                CurrentAum = 18500000m,
                MonthlyDeposit = 320000m,
                AverageYield = 6.5m,
                CommissionFormula = "AUM/100*1.5/1649",
                IncludeInAum = true,
                Order = 1,
                IsActive = true
            },
            new Product
            {
                UserId = userId,
                Name = "J&T Money",
                Category = ProductCategory.InvestmentFund,
                Company = ProductCompany.Other,
                ColorHex = "#10b981",
                CurrentAum = 11300000m,
                MonthlyDeposit = 210000m,
                AverageYield = 5.5m,
                CommissionFormula = "AUM/276360*12",
                IncludeInAum = true,
                Order = 2,
                IsActive = true
            },
            new Product
            {
                UserId = userId,
                Name = "Realitní fond ZFP",
                Category = ProductCategory.RealEstate,
                Company = ProductCompany.ZfpInvestments,
                ColorHex = "#f59e0b",
                CurrentAum = 9046000m,
                MonthlyDeposit = 180000m,
                AverageYield = 5.3m,
                CommissionFormula = "(AUM/1555200)*24",
                IncludeInAum = true,
                Order = 3,
                IsActive = true
            },
            new Product
            {
                UserId = userId,
                Name = "Amundi CR",
                Category = ProductCategory.InvestmentFund,
                Company = ProductCompany.Amundi,
                ColorHex = "#6366f1",
                CurrentAum = 6384000m,
                MonthlyDeposit = 140000m,
                AverageYield = 5.0m,
                CommissionFormula = "AUM/100*1.0/1649",
                IncludeInAum = true,
                Order = 4,
                IsActive = true
            }
        };

        foreach (var s in seeds)
        {
            if (!existing.Any(e => e.Name.Equals(s.Name, StringComparison.OrdinalIgnoreCase)))
            {
                await _products.AddAsync(s);
            }
            else
            {
                var p = existing.First(e => e.Name.Equals(s.Name, StringComparison.OrdinalIgnoreCase));
                p.CurrentAum = s.CurrentAum;
                p.MonthlyDeposit = s.MonthlyDeposit;
                p.AverageYield = s.AverageYield;
                p.CommissionFormula = s.CommissionFormula;
                p.IncludeInAum = s.IncludeInAum;
                p.ColorHex = s.ColorHex;
                p.IsActive = true;
                await _products.UpdateAsync(p);
            }
        }
        await _products.SaveChangesAsync();

        var now = DateTime.UtcNow.Date;
        var aumSnapshots = new List<AumSnapshot>();
        decimal startAum = 38000000m;
        for (int i = 7; i >= 0; i--)
        {
            var date = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
            decimal val = startAum + ((7 - i) * 1000000m) + (i == 0 ? 230000m : 0m);
            aumSnapshots.Add(new AumSnapshot
            {
                UserId = userId,
                Date = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                TotalAum = val,
                TotalMonthlyDeposit = 850000m - (i * 10000m),
                PointsPerYear = 1245m
            });
        }
        await _aum.UpsertBatchAsync(aumSnapshots);
        await _aum.SaveChangesAsync();

        return Ok(new { success = true, message = "Testovací data úspěšně vygenerována." });
    }
}
