using Microsoft.EntityFrameworkCore;
using RentUP.Cloud.Application.Interfaces;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Enums;
using RentUP.Cloud.Infrastructure.Persistence;

namespace RentUP.Cloud.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;
    public ProductRepository(AppDbContext db) => _db = db;

    public Task<List<Product>> GetAllAsync(bool includeInactive = false)
    {
        var q = _db.Products.AsQueryable();
        if (!includeInactive) q = q.Where(p => p.IsActive);
        return q.OrderBy(p => p.Order).ThenBy(p => p.Name).ToListAsync();
    }

    public Task<Product?> GetByIdAsync(Guid id) =>
        _db.Products.FirstOrDefaultAsync(p => p.Id == id);

    public Task<Product?> GetByNameAsync(string name) =>
        _db.Products.FirstOrDefaultAsync(p => p.Name == name);

    public async Task AddAsync(Product product) => await _db.Products.AddAsync(product);

    public Task UpdateAsync(Product product)
    {
        _db.Products.Update(product);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id)
    {
        var p = await _db.Products.FindAsync(id);
        if (p is not null) _db.Products.Remove(p);
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}

public class AumSnapshotRepository : IAumSnapshotRepository
{
    private readonly AppDbContext _db;
    public AumSnapshotRepository(AppDbContext db) => _db = db;

    public Task<List<AumSnapshot>> GetAllAsync() =>
        _db.AumSnapshots.OrderBy(s => s.Date).ToListAsync();

    public Task<AumSnapshot?> GetByDateAsync(DateTime date) =>
        _db.AumSnapshots.FirstOrDefaultAsync(s => s.Date == date);

    public async Task UpsertBatchAsync(IEnumerable<AumSnapshot> snapshots)
    {
        var existingList = await _db.AumSnapshots.ToListAsync();
        var existingMap = existingList.ToDictionary(s => s.Date.Date);

        foreach (var snap in snapshots)
        {
            snap.Date = DateTime.SpecifyKind(snap.Date.Date, DateTimeKind.Utc);

            if (existingMap.TryGetValue(snap.Date.Date, out var target))
            {
                target.TotalAum = snap.TotalAum;
                target.TotalMonthlyDeposit = snap.TotalMonthlyDeposit;
                if (snap.PointsPerYear > 0) target.PointsPerYear = snap.PointsPerYear;
            }
            else
            {
                await _db.AumSnapshots.AddAsync(snap);
                existingMap[snap.Date.Date] = snap;
            }
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var snapshot = await _db.AumSnapshots.FindAsync(id);
        if (snapshot is not null)
        {
            _db.AumSnapshots.Remove(snapshot);
        }
    }

    public async Task DeleteAllAsync()
    {
        var all = await _db.AumSnapshots.ToListAsync();
        _db.AumSnapshots.RemoveRange(all);
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}

public class UserSettingsRepository : IUserSettingsRepository
{
    private readonly AppDbContext _db;
    public UserSettingsRepository(AppDbContext db) => _db = db;

    public Task<UserSettings?> GetAsync() =>
        _db.UserSettings.FirstOrDefaultAsync();

    public async Task UpsertAsync(UserSettings settings)
    {
        var existing = await _db.UserSettings.FindAsync(settings.UserId);
        if (existing is null)
            await _db.UserSettings.AddAsync(settings);
        else
        {
            existing.BasePointValue = settings.BasePointValue;
            existing.MonthlyGoalPoints = settings.MonthlyGoalPoints;
            existing.Theme = settings.Theme;
        }
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}

public class DealRepository : IDealRepository
{
    private readonly AppDbContext _db;
    public DealRepository(AppDbContext db) => _db = db;

    public Task<List<Deal>> GetAllAsync(DateTime? from = null, DateTime? to = null, DealStatus? status = null)
    {
        var q = _db.Deals.AsQueryable();
        if (from.HasValue)   q = q.Where(d => d.Date >= from.Value);
        if (to.HasValue)     q = q.Where(d => d.Date <= to.Value);
        if (status.HasValue) q = q.Where(d => d.Status == status.Value);
        return q.OrderByDescending(d => d.Date).ToListAsync();
    }

    public Task<Deal?> GetByIdAsync(Guid id) => _db.Deals.FirstOrDefaultAsync(d => d.Id == id);

    public async Task AddAsync(Deal deal) => await _db.Deals.AddAsync(deal);

    public Task UpdateAsync(Deal deal) { _db.Deals.Update(deal); return Task.CompletedTask; }

    public async Task DeleteAsync(Guid id)
    {
        var d = await _db.Deals.FindAsync(id);
        if (d is not null) _db.Deals.Remove(d);
    }

    public Task SaveChangesAsync() => _db.SaveChangesAsync();
}
