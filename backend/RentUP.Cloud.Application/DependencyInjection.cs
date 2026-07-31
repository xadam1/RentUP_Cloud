using Microsoft.Extensions.DependencyInjection;
using RentUP.Cloud.Application.Services;

namespace RentUP.Cloud.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<MathParserService>();
        services.AddScoped<CalculationService>();
        services.AddScoped<CsvImportService>();
        return services;
    }
}
