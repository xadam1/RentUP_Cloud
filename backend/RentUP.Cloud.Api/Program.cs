using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using RentUP.Cloud.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ────────────────────────────────────────────────────────────
var supabaseSection = builder.Configuration.GetSection("Supabase");
var jwksUrl = supabaseSection["JwksUrl"]
    ?? throw new InvalidOperationException("Supabase:JwksUrl is not configured.");
var validIssuer = supabaseSection["ValidIssuer"]
    ?? throw new InvalidOperationException("Supabase:ValidIssuer is not configured.");
var validAudience = supabaseSection["ValidAudience"] ?? "authenticated";

// ── JWT Authentication — Supabase ECC P-256 asymmetric keys via JWKS ─────────
//
// We use MetadataAddress to point to the Supabase JWKS endpoint.
// The JwtBearer middleware fetches and caches the public keys automatically.
// Key rotation is handled transparently — no secrets stored in the API.
//
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Disable automatic claim type mapping so "sub" stays as "sub"
        // (ASP.NET Core would otherwise remap it to a long ClaimTypes.NameIdentifier URI)
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = validIssuer,

            ValidateAudience = true,
            ValidAudience = validAudience,

            ValidateLifetime = true,

            // Public key fetched from JWKS — no symmetric secret needed
            ValidateIssuerSigningKey = true,

            // Clock skew tolerance (default 5 min — keep it short)
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        // JWKS endpoint — middleware downloads & caches public keys automatically
        options.MetadataAddress = jwksUrl;

        // Allow JWKS refresh if key rotation happens (max once per 24h)
        options.RefreshOnIssuerKeyNotFound = true;
        options.AutomaticRefreshInterval = TimeSpan.FromHours(24);
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    });

builder.Services.AddAuthorization();

// ── Infrastructure (EF Core + ICurrentUserService) ───────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── Controllers & OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── Build ──────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
