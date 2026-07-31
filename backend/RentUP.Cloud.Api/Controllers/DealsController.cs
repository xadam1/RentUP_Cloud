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
public class DealsController : ControllerBase
{
    private readonly IDealRepository _repo;
    private readonly IUserSettingsRepository _settings;
    private readonly MathParserService _math;
    private readonly ICurrentUserService _user;

    public DealsController(
        IDealRepository repo,
        IUserSettingsRepository settings,
        MathParserService math,
        ICurrentUserService user)
    {
        _repo = repo;
        _settings = settings;
        _math = math;
        _user = user;
    }

    [HttpGet]
    public async Task<ActionResult<List<DealDto>>> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] DealStatus? status)
    {
        var deals = await _repo.GetAllAsync(from, to, status);
        return Ok(deals.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DealDto>> GetById(Guid id)
    {
        var deal = await _repo.GetByIdAsync(id);
        return deal is null ? NotFound() : Ok(ToDto(deal));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DealsStatsDto>> GetStats(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var deals = await _repo.GetAllAsync(from, to);
        var settings = await _settings.GetAsync();
        var basePointValue = settings?.BasePointValue ?? 1649m;

        return Ok(new DealsStatsDto(
            TotalCount: deals.Count,
            TotalDepositAmount: deals.Sum(d => d.DepositAmount),
            TotalPoints: deals.Sum(d => d.CalculatedPoints),
            TotalCommissionCzk: deals.Sum(d => d.CalculatedPoints) * basePointValue,
            PendingCount: deals.Count(d => d.Status == DealStatus.Pending),
            ActiveCount: deals.Count(d => d.Status == DealStatus.Active)
        ));
    }

    [HttpPost]
    public async Task<ActionResult<DealDto>> Create([FromBody] CreateDealRequest req)
    {
        var points = _math.Evaluate(req.CommissionFormula, req.DepositAmount);
        var settings = await _settings.GetAsync();
        var basePointValue = settings?.BasePointValue ?? 1649m;

        var deal = new Deal
        {
            UserId = _user.UserId!,
            ClientName = req.ClientName,
            Date = req.Date.ToUniversalTime(),
            Category = req.Category,
            Company = req.Company,
            ProductName = req.ProductName,
            DepositAmount = req.DepositAmount,
            CalculatedPoints = points,
            EstimatedCommission = points * basePointValue,
            Status = req.Status,
            Note = req.Note
        };

        await _repo.AddAsync(deal);
        await _repo.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = deal.Id }, ToDto(deal));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DealDto>> Update(Guid id, [FromBody] UpdateDealRequest req)
    {
        var deal = await _repo.GetByIdAsync(id);
        if (deal is null) return NotFound();

        var points = _math.Evaluate(req.CommissionFormula, req.DepositAmount);
        var settings = await _settings.GetAsync();
        var basePointValue = settings?.BasePointValue ?? 1649m;

        deal.ClientName = req.ClientName;
        deal.Date = req.Date.ToUniversalTime();
        deal.Category = req.Category;
        deal.Company = req.Company;
        deal.ProductName = req.ProductName;
        deal.DepositAmount = req.DepositAmount;
        deal.CalculatedPoints = points;
        deal.EstimatedCommission = points * basePointValue;
        deal.Status = req.Status;
        deal.Note = req.Note;

        await _repo.UpdateAsync(deal);
        await _repo.SaveChangesAsync();
        return Ok(ToDto(deal));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deal = await _repo.GetByIdAsync(id);
        if (deal is null) return NotFound();
        await _repo.DeleteAsync(id);
        await _repo.SaveChangesAsync();
        return NoContent();
    }

    private static DealDto ToDto(Deal d) => new(
        d.Id, d.ClientName, d.Date, d.Category, d.Company, d.ProductName,
        d.DepositAmount, d.CalculatedPoints, d.EstimatedCommission, d.Status, d.Note);
}
