using Microsoft.EntityFrameworkCore;
using RentUP.Cloud.Domain.Entities;
using RentUP.Cloud.Domain.Interfaces;

namespace RentUP.Cloud.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext for RentUP Cloud.
///
/// Multi-tenancy strategy: EF Core Global Query Filters on every entity.
/// Every query is automatically scoped to the current user's UserId —
/// it is physically impossible for a user to read another user's data
/// through this context.
///
/// Global Query Filter pattern:
///   builder.Entity&lt;T&gt;().HasQueryFilter(e => e.UserId == _currentUser.UserId);
/// </summary>
public class AppDbContext : DbContext
{
    private readonly ICurrentUserService _currentUser;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUser)
        : base(options)
    {
        _currentUser = currentUser;
    }

    // ── DbSets ──────────────────────────────────────────────────────────────

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductSnapshot> ProductSnapshots => Set<ProductSnapshot>();
    public DbSet<AumSnapshot> AumSnapshots => Set<AumSnapshot>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Deal> Deals => Set<Deal>();

    // ── Model Configuration ─────────────────────────────────────────────────

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ── Product ─────────────────────────────────────────────────────────
        builder.Entity<Product>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
            e.Property(p => p.ColorHex).HasMaxLength(9);
            e.Property(p => p.CommissionFormula).HasMaxLength(500);
            e.Property(p => p.AverageYield).HasPrecision(18, 6);
            e.Property(p => p.MonthlyDeposit).HasPrecision(18, 2);
            e.Property(p => p.Category).HasConversion<int>();
            e.Property(p => p.Company).HasConversion<int>();

            // Global Query Filter — all queries auto-scoped to current user
            e.HasQueryFilter(p => p.UserId == _currentUser.UserId);

            e.HasMany(p => p.Snapshots)
             .WithOne(s => s.Product)
             .HasForeignKey(s => s.ProductId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(p => new { p.UserId, p.Name });
        });

        // ── ProductSnapshot ─────────────────────────────────────────────────
        builder.Entity<ProductSnapshot>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Aum).HasPrecision(18, 2);
            e.Property(s => s.MonthlyDeposit).HasPrecision(18, 2);

            // Global Query Filter
            e.HasQueryFilter(s => s.UserId == _currentUser.UserId);

            // Unique constraint: one snapshot per product per date
            e.HasIndex(s => new { s.ProductId, s.Date }).IsUnique();
        });

        // ── AumSnapshot ─────────────────────────────────────────────────────
        builder.Entity<AumSnapshot>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.TotalAum).HasPrecision(18, 2);
            e.Property(s => s.TotalMonthlyDeposit).HasPrecision(18, 2);
            e.Property(s => s.PointsPerYear).HasPrecision(18, 6);

            // Global Query Filter
            e.HasQueryFilter(s => s.UserId == _currentUser.UserId);

            // One aggregate snapshot per user per date
            e.HasIndex(s => new { s.UserId, s.Date }).IsUnique();
        });

        // ── UserSettings ────────────────────────────────────────────────────
        builder.Entity<UserSettings>(e =>
        {
            // PK is UserId — one row per user, no separate Id column
            e.HasKey(u => u.UserId);
            e.Property(u => u.BasePointValue).HasPrecision(18, 4);
            e.Property(u => u.MonthlyGoalPoints).HasPrecision(18, 4);
            e.Property(u => u.Theme).HasMaxLength(20);

            // Global Query Filter — UserId IS the PK, still needed for consistency
            e.HasQueryFilter(u => u.UserId == _currentUser.UserId);
        });

        // ── Deal ─────────────────────────────────────────────────────────────
        builder.Entity<Deal>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.ClientName).HasMaxLength(200).IsRequired();
            e.Property(d => d.ProductName).HasMaxLength(200);
            e.Property(d => d.Note).HasMaxLength(1000);
            e.Property(d => d.DepositAmount).HasPrecision(18, 2);
            e.Property(d => d.CalculatedPoints).HasPrecision(18, 6);
            e.Property(d => d.EstimatedCommission).HasPrecision(18, 2);
            e.Property(d => d.Category).HasConversion<int>();
            e.Property(d => d.Company).HasConversion<int>();
            e.Property(d => d.Status).HasConversion<int>();

            // Global Query Filter
            e.HasQueryFilter(d => d.UserId == _currentUser.UserId);

            e.HasIndex(d => new { d.UserId, d.Date });
        });
    }

    // ── Auto-stamp UserId on SaveChanges ────────────────────────────────────

    /// <summary>
    /// Automatically sets UserId on all new entities before saving.
    /// This is a safety net — controllers should always set UserId explicitly,
    /// but this ensures nothing slips through.
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampUserId();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        StampUserId();
        return base.SaveChanges();
    }

    private void StampUserId()
    {
        var userId = _currentUser.UserId;
        if (string.IsNullOrEmpty(userId)) return;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Added) continue;

            var userIdProp = entry.Properties
                .FirstOrDefault(p => p.Metadata.Name == nameof(ICurrentUserService.UserId));

            if (userIdProp is not null && string.IsNullOrEmpty(userIdProp.CurrentValue as string))
            {
                userIdProp.CurrentValue = userId;
            }
        }
    }
}
