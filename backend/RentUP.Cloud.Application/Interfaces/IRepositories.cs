using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.Interfaces;

public interface IProductRepository
{
    Task<List<Product>> GetAllAsync(bool includeInactive = false);
    Task<Product?> GetByIdAsync(Guid id);
    Task<Product?> GetByNameAsync(string name);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task DeleteAsync(Guid id);
    Task SaveChangesAsync();
}

public interface IProductSnapshotRepository
{
    Task<List<ProductSnapshot>> GetByProductIdAsync(Guid productId);
    Task<List<ProductSnapshot>> GetByDateRangeAsync(DateTime from, DateTime to);
    Task UpsertBatchAsync(IEnumerable<ProductSnapshot> snapshots);
    Task SaveChangesAsync();
}

public interface IAumSnapshotRepository
{
    Task<List<AumSnapshot>> GetAllAsync();
    Task<AumSnapshot?> GetByDateAsync(DateTime date);
    Task UpsertBatchAsync(IEnumerable<AumSnapshot> snapshots);
    Task SaveChangesAsync();
}

public interface IUserSettingsRepository
{
    Task<UserSettings?> GetAsync();
    Task UpsertAsync(UserSettings settings);
    Task SaveChangesAsync();
}

public interface IDealRepository
{
    Task<List<Deal>> GetAllAsync(DateTime? from = null, DateTime? to = null, DealStatus? status = null);
    Task<Deal?> GetByIdAsync(Guid id);
    Task AddAsync(Deal deal);
    Task UpdateAsync(Deal deal);
    Task DeleteAsync(Guid id);
    Task SaveChangesAsync();
}
