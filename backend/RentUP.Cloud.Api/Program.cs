using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RentUP.Cloud.Application;
using RentUP.Cloud.Infrastructure;
using RentUP.Cloud.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ────────────────────────────────────────────────────────────
var supabaseSection = builder.Configuration.GetSection("Supabase");
var jwksUrl = supabaseSection["JwksUrl"]
    ?? throw new InvalidOperationException("Supabase:JwksUrl is not configured.");
var validIssuer = supabaseSection["ValidIssuer"]
    ?? throw new InvalidOperationException("Supabase:ValidIssuer is not configured.");
var validAudience = supabaseSection["ValidAudience"] ?? "authenticated";

// ── JWT Authentication — Supabase ECC P-256 asymmetric keys via JWKS ─────────
var keyResolver = new SupabaseKeyResolver(jwksUrl);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = validIssuer,

            ValidateAudience = true,
            ValidAudience = validAudience,

            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            IssuerSigningKeyResolver = keyResolver.Resolve,
        };
    });

builder.Services.AddAuthorization();

// ── Infrastructure (EF Core + ICurrentUserService + Repositories) ────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── Application services (MathParser, Calculation, CsvImport) ────────────────
builder.Services.AddApplication();

// ── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173", "http://localhost:3000"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Allow any localhost origin during development to avoid CORS block
            policy.SetIsOriginAllowed(origin => 
                    new Uri(origin).Host == "localhost" || 
                    new Uri(origin).Host == "127.0.0.1")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// ── Controllers & OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── Build ──────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Database Initialization & Self-Healing ─────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        
        // Auto-heal database schema with new columns if they don't exist yet
        db.Database.ExecuteSqlRaw(@"
            ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IncludeInAum"" boolean NOT NULL DEFAULT TRUE;
            ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""CurrentAum"" numeric(18,2) NOT NULL DEFAULT 0.0;
        ");
        Console.WriteLine("[Database] Schema verification and initialization successful.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Database] Initialization note/warning: {ex.Message}");
    }
}

// ── Middleware pipeline ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // Only redirect to HTTPS in production; in local dev it breaks HTTP CORS preflight
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

/// <summary>
/// Resolves signing keys directly from Supabase JWKS endpoint without requiring OIDC discovery metadata.
/// </summary>
public class SupabaseKeyResolver
{
    private readonly string _jwksUrl;
    private List<SecurityKey>? _cachedKeys;
    private DateTime _lastFetch = DateTime.MinValue;
    private readonly object _lock = new object();

    public SupabaseKeyResolver(string jwksUrl)
    {
        _jwksUrl = jwksUrl;
    }

    public IEnumerable<SecurityKey> Resolve(string token, SecurityToken securityToken, string kid, TokenValidationParameters validationParameters)
    {
        lock (_lock)
        {
            if (_cachedKeys == null || DateTime.UtcNow - _lastFetch > TimeSpan.FromHours(12) || (kid != null && !_cachedKeys.Any(k => k.KeyId == kid)))
            {
                try
                {
                    using var client = new System.Net.Http.HttpClient();
                    var jwksJson = client.GetStringAsync(_jwksUrl).GetAwaiter().GetResult();
                    var jwks = new JsonWebKeySet(jwksJson);
                    _cachedKeys = jwks.GetSigningKeys().ToList();
                    _lastFetch = DateTime.UtcNow;
                }
                catch
                {
                    // If fetching fails, fallback to existing cached keys
                }
            }
            return _cachedKeys ?? Enumerable.Empty<SecurityKey>();
        }
    }
}
