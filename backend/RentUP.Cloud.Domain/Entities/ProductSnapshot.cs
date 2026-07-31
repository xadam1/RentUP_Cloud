namespace RentUP.Cloud.Domain.Entities;

/// <summary>
/// A point-in-time AUM value for a single product.
/// Populated by the CSV import service.
/// </summary>
public class ProductSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Supabase Auth user ID — used by EF Core Global Query Filter.</summary>
    public string UserId { get; set; } = string.Empty;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    /// <summary>Date of the snapshot (typically end-of-month).</summary>
    public DateTime Date { get; set; }

    /// <summary>AUM value for this product at this date.</summary>
    public decimal Aum { get; set; }

    /// <summary>Monthly deposit recorded at this point in time.</summary>
    public decimal MonthlyDeposit { get; set; }
}
