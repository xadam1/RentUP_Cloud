namespace RentUP.Cloud.Application.DTOs;

// ── AUM Snapshots ────────────────────────────────────────────────────────────

public record AumSnapshotDto(
    Guid Id,
    DateTime Date,
    decimal TotalAum,
    decimal TotalMonthlyDeposit,
    decimal PointsPerYear
);

public record ProductSnapshotDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    DateTime Date,
    decimal Aum,
    decimal MonthlyDeposit
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
