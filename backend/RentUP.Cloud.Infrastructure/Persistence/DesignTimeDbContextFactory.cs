using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Infrastructure.Persistence;

/// <summary>
/// Used exclusively by the EF Core CLI tools (dotnet ef migrations add / database update).
/// Provides a design-time AppDbContext with a stub ICurrentUserService so the CLI
/// can run without a live HTTP context.
/// Never used at runtime.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Load connection string from the Api project's appsettings.Development.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../RentUP.Cloud.Api"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found. " +
                "Ensure appsettings.Development.json is populated with your Supabase DB credentials.");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        // Stub service — migrations don't need a real user, Global Query Filters
        // are not applied during schema creation.
        return new AppDbContext(optionsBuilder.Options, new DesignTimeUserService());
    }

    /// <summary>Stub ICurrentUserService that returns null (no user during migrations).</summary>
    private sealed class DesignTimeUserService : ICurrentUserService
    {
        public string? UserId => null;
        public bool IsAuthenticated => false;
    }
}
