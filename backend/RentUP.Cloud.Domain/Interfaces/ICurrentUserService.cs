namespace RentUP.Cloud.Domain.Interfaces;

/// <summary>
/// Provides the current authenticated user's ID (Supabase Auth UUID).
/// Implemented in Infrastructure and injected into AppDbContext
/// to power EF Core Global Query Filters for multi-tenancy.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// The Supabase Auth user ID (sub claim from JWT).
    /// Null when the request is unauthenticated (e.g. migrations, health checks).
    /// </summary>
    string? UserId { get; }

    /// <summary>True when a valid authenticated user is present.</summary>
    bool IsAuthenticated { get; }
}
