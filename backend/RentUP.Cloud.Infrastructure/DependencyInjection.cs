using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Interfaces;
using RentUP.Cloud.Infrastructure.Persistence;
using RentUP.Cloud.Infrastructure.Repositories;
using RentUP.Cloud.Infrastructure.Services;

namespace RentUP.Cloud.Infrastructure;

/// <summary>
/// Extension method to register all Infrastructure layer services.
/// Called from Program.cs: builder.Services.AddInfrastructure(builder.Configuration);
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // EF Core — Npgsql / PostgreSQL (Supabase)
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)
            )
        );

        // IHttpContextAccessor — required by CurrentUserService
        services.AddHttpContextAccessor();

        // ICurrentUserService — Scoped (one per HTTP request)
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Repositories
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IProductSnapshotRepository, ProductSnapshotRepository>();
        services.AddScoped<IAumSnapshotRepository, AumSnapshotRepository>();
        services.AddScoped<IUserSettingsRepository, UserSettingsRepository>();

        return services;
    }
}
