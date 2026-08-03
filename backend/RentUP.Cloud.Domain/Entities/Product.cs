using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Domain.Entities;

/// <summary>
/// A financial product defined by the advisor.
/// Each product belongs to exactly one user (multi-tenancy via UserId).
/// CommissionFormula uses NCalc syntax with the AUM variable (e.g. "(AUM/1555200)*24").
/// </summary>
public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Supabase Auth user ID — used by EF Core Global Query Filter.</summary>
    public string UserId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public ProductCategory Category { get; set; } = ProductCategory.InvestmentFund;

    public ProductCompany Company { get; set; } = ProductCompany.Other;

    /// <summary>Hex color string for chart display (e.g. "#3b82f6").</summary>
    public string ColorHex { get; set; } = "#3b82f6";

    /// <summary>Expected annual yield percentage (e.g. 5.3 = 5.3%).</summary>
    public decimal AverageYield { get; set; }

    /// <summary>Monthly deposit added to this product each month in projections.</summary>
    public decimal MonthlyDeposit { get; set; }

    /// <summary>
    /// NCalc formula string for commission/points calculation.
    /// Variable: AUM (current AUM value for this product).
    /// Example: "(AUM/1555200)*24"
    /// Ported 1:1 from legacy PointsFormula field.
    /// </summary>
    public string CommissionFormula { get; set; } = string.Empty;

    /// <summary>Display order in UI lists.</summary>
    public int Order { get; set; }

    /// <summary>Whether this product is included in total AUM calculation and dashboard.</summary>
    public bool IncludeInAum { get; set; } = true;

    /// <summary>Current total AUM of this product.</summary>
    public decimal CurrentAum { get; set; }

    /// <summary>Soft-delete flag. Inactive products are hidden from UI but kept for history.</summary>
    public bool IsActive { get; set; } = true;
}

