using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Application.Services;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _repo;
    private readonly IAumSnapshotRepository _aum;
    private readonly MathParserService _math;
    private readonly ICurrentUserService _user;

    public ProductsController(IProductRepository repo, IAumSnapshotRepository aum, MathParserService math, ICurrentUserService user)
    {
        _repo = repo;
        _aum = aum;
        _math = math;
        _user = user;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProductDto>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var products = await _repo.GetAllAsync(includeInactive);
        return Ok(products.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id)
    {
        var p = await _repo.GetByIdAsync(id);
        return p is null ? NotFound() : Ok(ToDto(p));
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest req)
    {
        if (!_math.IsValid(req.CommissionFormula, out var formulaError))
            return BadRequest(new { error = $"Invalid formula: {formulaError}" });

        var product = new Product
        {
            UserId = _user.UserId!,
            Name = req.Name,
            Category = req.Category,
            Company = req.Company,
            ColorHex = req.ColorHex,
            AverageYield = req.AverageYield,
            MonthlyDeposit = req.MonthlyDeposit,
            CommissionFormula = req.CommissionFormula,
            Order = req.Order,
            IncludeInAum = req.IncludeInAum,
            CurrentAum = req.CurrentAum,
            IsActive = true
        };

        await _repo.AddAsync(product);
        await _repo.SaveChangesAsync();
        await SyncTodayAumSnapshotAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ToDto(product));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductDto>> Update(Guid id, [FromBody] UpdateProductRequest req)
    {
        var product = await _repo.GetByIdAsync(id);
        if (product is null) return NotFound();

        if (!_math.IsValid(req.CommissionFormula, out var formulaError))
            return BadRequest(new { error = $"Invalid formula: {formulaError}" });

        product.Name = req.Name;
        product.Category = req.Category;
        product.Company = req.Company;
        product.ColorHex = req.ColorHex;
        product.AverageYield = req.AverageYield;
        product.MonthlyDeposit = req.MonthlyDeposit;
        product.CommissionFormula = req.CommissionFormula;
        product.Order = req.Order;
        product.IncludeInAum = req.IncludeInAum;
        product.CurrentAum = req.CurrentAum;
        product.IsActive = req.IsActive;

        await _repo.UpdateAsync(product);
        await _repo.SaveChangesAsync();
        await SyncTodayAumSnapshotAsync();
        return Ok(ToDto(product));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _repo.GetByIdAsync(id);
        if (product is null) return NotFound();

        await _repo.DeleteAsync(id);
        await _repo.SaveChangesAsync();
        await SyncTodayAumSnapshotAsync();
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<Guid> orderedIds)
    {
        var products = await _repo.GetAllAsync(includeInactive: false);
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var p = products.FirstOrDefault(x => x.Id == orderedIds[i]);
            if (p != null && p.Order != i)
            {
                p.Order = i;
                await _repo.UpdateAsync(p);
            }
        }
        await _repo.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Validates a formula without saving.</summary>
    [HttpPost("validate-formula")]
    public ActionResult ValidateFormula([FromBody] string formula)
    {
        if (_math.IsValid(formula, out var error))
            return Ok(new { valid = true });
        return BadRequest(new { valid = false, error });
    }

    private async Task SyncTodayAumSnapshotAsync()
    {
        var allProducts = await _repo.GetAllAsync(includeInactive: false);
        decimal totalAum = 0m;
        decimal totalDeposit = 0m;
        decimal yearlyPoints = 0m;

        foreach (var p in allProducts.Where(x => x.IncludeInAum))
        {
            totalAum += p.CurrentAum;
            totalDeposit += p.MonthlyDeposit;
            try
            {
                yearlyPoints += _math.Evaluate(p.CommissionFormula, p.CurrentAum);
            }
            catch { }
        }

        if (totalAum > 0 || totalDeposit > 0 || allProducts.Count > 0)
        {
            var today = DateTime.UtcNow.Date;
            await _aum.UpsertBatchAsync(new[]
            {
                new AumSnapshot
                {
                    UserId = _user.UserId!,
                    Date = today,
                    TotalAum = totalAum,
                    TotalMonthlyDeposit = totalDeposit,
                    PointsPerYear = yearlyPoints
                }
            });
            await _aum.SaveChangesAsync();
        }
    }

    private static ProductDto ToDto(Product p) => new(
        p.Id, p.Name, p.Category, p.Company, p.ColorHex,
        p.AverageYield, p.MonthlyDeposit, p.CommissionFormula, p.Order, p.IncludeInAum, p.CurrentAum, p.IsActive);
}
