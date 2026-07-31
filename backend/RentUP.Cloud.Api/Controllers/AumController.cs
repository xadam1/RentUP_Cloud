using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Application.Services;
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
    private readonly ICurrentUserService _user;

    public AumController(
        IAumSnapshotRepository aum,
        IProductSnapshotRepository productSnapshots,
        IProductRepository products,
        IUserSettingsRepository settings,
        CsvImportService csv,
        CalculationService calculator,
        ICurrentUserService user)
    {
        _aum = aum;
        _productSnapshots = productSnapshots;
        _products = products;
        _settings = settings;
        _csv = csv;
        _calculator = calculator;
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

    /// <summary>Phase 1: Parse and preview the uploaded CSV without writing to DB.</summary>
    [HttpPost("import/preview")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<ActionResult<CsvPreviewResult>> Preview(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        var result = await _csv.PreviewAsync(file);
        return Ok(result);
    }

    /// <summary>Phase 2: Commit confirmed CSV preview rows to the database.</summary>
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

    /// <summary>
    /// Calculates future AUM projections starting from current product AUMs.
    /// Uses latest ProductSnapshot per product as baseline.
    /// </summary>
    [HttpGet("projections")]
    public async Task<ActionResult<ProjectionsResponse>> GetProjections([FromQuery] int years = 10)
    {
        if (years is < 1 or > 30) return BadRequest(new { error = "Years must be between 1 and 30." });

        var products = await _products.GetAllAsync();
        if (!products.Any()) return Ok(new ProjectionsResponse([], 0, years));

        // Build current AUM dictionary from latest snapshot per product
        var currentAums = new Dictionary<Guid, decimal>();
        foreach (var product in products)
        {
            var snapshots = await _productSnapshots.GetByProductIdAsync(product.Id);
            var latest = snapshots.OrderByDescending(s => s.Date).FirstOrDefault();
            currentAums[product.Id] = latest?.Aum ?? 0m;
        }

        var userSettings = await _settings.GetAsync();
        var basePointValue = userSettings?.BasePointValue ?? 1649m;

        var projections = _calculator.CalculateFutureProjections(products, currentAums, basePointValue, years);
        return Ok(projections);
    }

    // ── Dashboard summary ───────────────────────────────────────────────────

    /// <summary>Returns the latest AUM snapshot for dashboard KPI cards.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var snapshots = await _aum.GetAllAsync();
        var latest = snapshots.OrderByDescending(s => s.Date).FirstOrDefault();
        if (latest is null) return Ok(null);

        var settings = await _settings.GetAsync();
        var basePointValue = settings?.BasePointValue ?? 1649m;

        return Ok(new
        {
            date = latest.Date,
            totalAum = latest.TotalAum,
            totalMonthlyDeposit = latest.TotalMonthlyDeposit,
            pointsPerYear = latest.PointsPerYear,
            estimatedCommissionCzk = latest.PointsPerYear * basePointValue
        });
    }
}
