using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Domain.Entities;

namespace RentUP.Cloud.Application.Services;

/// <summary>
/// Generates future AUM projections using monthly compound growth.
/// Ported 1:1 from legacy RentUP.Core.Services.CalculationService.
///
/// Legacy formula per product per month:
///   newAum = (currentAum + monthlyDeposit) * (1 + averageYield/12/100)
/// </summary>
public class CalculationService
{
    private readonly MathParserService _mathParser;

    public CalculationService(MathParserService mathParser)
    {
        _mathParser = mathParser;
    }

    /// <summary>
    /// Calculates future AUM projections starting from the current product AUMs.
    /// </summary>
    /// <param name="products">Active products with their current AUM (from latest snapshot).</param>
    /// <param name="currentAums">Dictionary of ProductId → current AUM.</param>
    /// <param name="basePointValue">CZK per commission point (from UserSettings.BasePointValue).</param>
    /// <param name="yearsToProject">How many years to project forward (default 10).</param>
    public ProjectionsResponse CalculateFutureProjections(
        IEnumerable<Product> products,
        Dictionary<Guid, decimal> currentAums,
        decimal basePointValue,
        int yearsToProject = 10)
    {
        var productList = products.Where(p => p.IsActive).ToList();
        var months = yearsToProject * 12;
        var startDate = DateTime.UtcNow.Date;
        // Start from the first of next month
        startDate = new DateTime(startDate.Year, startDate.Month, 1).AddMonths(1);

        // Working AUM values per product
        var workingAums = new Dictionary<Guid, decimal>();
        foreach (var p in productList)
        {
            workingAums[p.Id] = currentAums.TryGetValue(p.Id, out var aum) ? aum : 0m;
        }

        var points = new List<ProjectionPoint>(months);

        for (int m = 0; m < months; m++)
        {
            var date = startDate.AddMonths(m);

            // Apply one month of growth to each product
            foreach (var product in productList)
            {
                var current = workingAums[product.Id];
                var deposit = product.MonthlyDeposit;
                var monthlyRate = product.AverageYield / 12m / 100m;

                // Legacy formula: (current + deposit) * (1 + monthlyRate)
                workingAums[product.Id] = (current + deposit) * (1m + monthlyRate);
            }

            // Aggregate for this month
            var totalAum = workingAums.Values.Sum();
            var totalDeposit = productList.Sum(p => p.MonthlyDeposit);

            // Points per year = sum of CommissionFormula(AUM) for each product * 12
            decimal totalPointsPerYear = 0m;
            foreach (var product in productList)
            {
                var productPoints = _mathParser.Evaluate(product.CommissionFormula, workingAums[product.Id]);
                totalPointsPerYear += productPoints * 12m;
            }

            var commissionCzk = totalPointsPerYear * basePointValue;

            points.Add(new ProjectionPoint(date, totalAum, totalDeposit, totalPointsPerYear, commissionCzk));
        }

        return new ProjectionsResponse(points, basePointValue, yearsToProject);
    }

    /// <summary>
    /// Calculates commission points per year for a single AUM snapshot.
    /// Used during CSV import to populate AumSnapshot.PointsPerYear.
    /// </summary>
    public decimal CalculatePointsPerYear(IEnumerable<Product> products, Dictionary<Guid, decimal> aumByProduct)
    {
        decimal total = 0m;
        foreach (var p in products.Where(p => p.IsActive))
        {
            if (aumByProduct.TryGetValue(p.Id, out var aum))
                total += _mathParser.Evaluate(p.CommissionFormula, aum) * 12m;
        }
        return total;
    }
}
