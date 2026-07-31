namespace RentUP.Cloud.Domain.Enums;

/// <summary>
/// Lifecycle status of a client deal / production record.
/// </summary>
public enum DealStatus
{
    /// <summary>Submitted, awaiting approval.</summary>
    Pending = 0,

    /// <summary>Approved and active.</summary>
    Active = 1,

    /// <summary>Successfully completed.</summary>
    Completed = 2,

    /// <summary>Cancelled or rejected.</summary>
    Cancelled = 3
}
