using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentUP.Cloud.Application.DTOs;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserSettingsController : ControllerBase
{
    private readonly IUserSettingsRepository _repo;
    private readonly ICurrentUserService _user;

    public UserSettingsController(IUserSettingsRepository repo, ICurrentUserService user)
    {
        _repo = repo;
        _user = user;
    }

    [HttpGet]
    public async Task<ActionResult<UserSettingsDto>> Get()
    {
        var settings = await _repo.GetAsync();
        if (settings is null)
        {
            // Return defaults — settings row is created on first PUT
            return Ok(new UserSettingsDto(_user.UserId!, 150m, 0m, "dark"));
        }
        return Ok(new UserSettingsDto(
            settings.UserId, settings.BasePointValue, settings.MonthlyGoalPoints, settings.Theme));
    }

    [HttpPut]
    public async Task<ActionResult<UserSettingsDto>> Update([FromBody] UpdateUserSettingsRequest req)
    {
        var userId = _user.UserId!;
        await _repo.UpsertAsync(new UserSettings
        {
            UserId = userId,
            BasePointValue = req.BasePointValue,
            MonthlyGoalPoints = req.MonthlyGoalPoints,
            Theme = req.Theme
        });
        await _repo.SaveChangesAsync();
        return Ok(new UserSettingsDto(userId, req.BasePointValue, req.MonthlyGoalPoints, req.Theme));
    }
}
