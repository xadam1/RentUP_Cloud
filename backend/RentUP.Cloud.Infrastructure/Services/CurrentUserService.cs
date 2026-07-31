using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Infrastructure.Services;

/// <summary>
/// Reads the authenticated user's ID from the JWT "sub" claim via IHttpContextAccessor.
/// Registered as Scoped — one instance per HTTP request.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public string? UserId =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("sub");

    /// <inheritdoc />
    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
