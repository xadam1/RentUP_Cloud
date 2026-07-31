namespace RentUP.Cloud.Domain.Entities;

/// <summary>
/// Aggregate AUM snapshot for all products at a given date.
/// Calculated and stored during CSV import. Used for the historical
/// AUM chart on the dashboard.
/// Ported from legacy AumSnapshotEntity.
/// </summary>
public class AumSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Supabase Auth user ID — used by EF Core Global Query Filter.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Date of the aggregate snapshot.</summary>
    public DateTime Date { get; set; }

    /// <summary>Sum of AUM across all products at this date.</summary>
    public decimal TotalAum { get; set; }

    /// <summary>Sum of monthly deposits across all active products at this date.</summary>
    public decimal TotalMonthlyDeposit { get; set; }

    /// <summary>
    /// Total commission points per year at this date.
    /// Calculated by evaluating CommissionFormula for each product.
    /// </summary>
    public decimal PointsPerYear { get; set; }
}
