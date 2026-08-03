using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.DTOs;

// ── AUM Snapshots ────────────────────────────────────────────────────────────

public record AumSnapshotDto(
    Guid Id,
    DateTime Date,
    decimal TotalAum,
    decimal TotalMonthlyDeposit,
    decimal PointsPerYear
);
public record ProductDashboardItemDto(
    Guid Id,
    string Name,
    ProductCategory Category,
    ProductCompany Company,
    string ColorHex,
    decimal CurrentAum,
    decimal MonthlyDeposit,
    decimal AverageYield,
    string CommissionFormula,
    bool IncludeInAum,
    decimal PortfolioSharePercent,
    decimal MonthlyIncomeCzk,
    decimal YearlyPoints
);

public record DashboardSummaryDto(
    DateTime Date,
    decimal TotalAum,
    decimal AumChangeYtdPercent,
    decimal TotalMonthlyDeposit,
    decimal DepositChangeCzk,
    decimal PointsPerYear,
    decimal PointsPerMonth,
    decimal EstimatedCommissionYearCzk,
    decimal EstimatedCommissionMonthCzk,
    decimal BasePointValue,
    List<ProductDashboardItemDto> Products
);

// ── CSV Import ────────────────────────────────────────────────────────────────

/// <summary>
/// Returned from the preview step — client reviews before committing.
/// Mirrors legacy CsvImportService.PreviewResult.
/// </summary>
public record CsvPreviewResult(
    List<CsvPreviewRow> Rows,
    List<string> Warnings,
    int ValidCount,
    int SkippedCount
);

public record CsvPreviewRow(
    DateTime Date,
    string ProductName,
    decimal Aum,
    decimal MonthlyDeposit,
    /// <summary>Null = product exists or will be created; non-null = warning message.</summary>
    string? Warning
);

/// <summary>Sent by client to commit a previously validated CSV import.</summary>
public record CsvCommitRequest(List<CsvCommitRow> Rows);

public record CsvCommitRow(
    DateTime Date,
    Guid ProductId,
    decimal Aum,
    decimal MonthlyDeposit
);

// ── Historical AUM CSV Import ────────────────────────────────────────────────

public record HistoryCsvPreviewResult(
    List<HistoryCsvPreviewRow> Rows,
    List<string> Warnings,
    int ValidCount,
    int OverwriteCount
);

public record HistoryCsvPreviewRow(
    DateTime Date,
    decimal Aum,
    bool OverwritesExisting,
    string? Warning
);

public record HistoryCsvCommitRequest(List<HistoryCsvCommitRow> Rows);

public record HistoryCsvCommitRow(
    DateTime Date,
    decimal Aum
);

// ── Projections ───────────────────────────────────────────────────────────────

/// <summary>
/// One point on the future AUM projection chart.
/// Mirrors legacy CalculationService.ProjectionPoint.
/// </summary>
public record ProjectionPoint(
    DateTime Date,
    decimal TotalAum,
    decimal TotalMonthlyDeposit,
    decimal PointsPerYear,
    decimal EstimatedCommissionCzk
);

public record ProjectionsResponse(
    List<ProjectionPoint> Points,
    decimal BasePointValue,
    int YearsProjected
);

// ── User Settings ─────────────────────────────────────────────────────────────

public record UserSettingsDto(
    string UserId,
    decimal BasePointValue,
    decimal MonthlyGoalPoints,
    string Theme
);

public record UpdateUserSettingsRequest(
    decimal BasePointValue,
    decimal MonthlyGoalPoints,
    string Theme
);
