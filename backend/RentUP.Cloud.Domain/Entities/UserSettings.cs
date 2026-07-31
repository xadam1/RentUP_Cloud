namespace RentUP.Cloud.Domain.Entities;

/// <summary>
/// Per-user application settings.
/// UserId is both the primary key and the multi-tenancy key — one row per user.
/// </summary>
public class UserSettings
{
    /// <summary>
    /// Supabase Auth user ID (PK). One UserSettings row per user.
    /// Also acts as the Global Query Filter key (no separate UserId column needed).
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// CZK value per commission point.
    /// Used as the czkPerPoint multiplier in CalculationService.CalculateFutureProjections.
    /// Maps from legacy AppSettings.CzkPerPoint / BasePointValue.
    /// </summary>
    public decimal BasePointValue { get; set; } = 1649m;

    /// <summary>Monthly production points goal for gamification / dashboard KPIs.</summary>
    public decimal MonthlyGoalPoints { get; set; }

    /// <summary>UI theme preference ("dark" | "light" | "system").</summary>
    public string Theme { get; set; } = "dark";
}
