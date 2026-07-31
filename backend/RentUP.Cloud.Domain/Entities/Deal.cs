using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Domain.Entities;

/// <summary>
/// A single client deal / production record (Phase 6 module).
/// Tracks individual sales for commission and points calculation.
/// </summary>
public class Deal
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Supabase Auth user ID — used by EF Core Global Query Filter.</summary>
    public string UserId { get; set; } = string.Empty;

    public string ClientName { get; set; } = string.Empty;

    public DateTime Date { get; set; } = DateTime.UtcNow;

    public ProductCategory Category { get; set; } = ProductCategory.InvestmentFund;

    public ProductCompany Company { get; set; } = ProductCompany.Other;

    /// <summary>Free-text product name (may differ from a managed Product entity name).</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Deposit / investment amount in CZK.</summary>
    public decimal DepositAmount { get; set; }

    /// <summary>Points calculated by evaluating CommissionFormula with DepositAmount as AUM.</summary>
    public decimal CalculatedPoints { get; set; }

    /// <summary>Estimated CZK commission (CalculatedPoints * BasePointValue).</summary>
    public decimal EstimatedCommission { get; set; }

    public DealStatus Status { get; set; } = DealStatus.Pending;

    public string Note { get; set; } = string.Empty;
}
