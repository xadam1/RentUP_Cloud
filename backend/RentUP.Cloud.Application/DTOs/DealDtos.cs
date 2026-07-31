using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.DTOs;

public record DealDto(
    Guid Id,
    string ClientName,
    DateTime Date,
    ProductCategory Category,
    ProductCompany Company,
    string ProductName,
    decimal DepositAmount,
    decimal CalculatedPoints,
    decimal EstimatedCommission,
    DealStatus Status,
    string Note
);

public record CreateDealRequest(
    string ClientName,
    DateTime Date,
    ProductCategory Category,
    ProductCompany Company,
    string ProductName,
    decimal DepositAmount,
    string CommissionFormula,
    DealStatus Status,
    string Note
);

public record UpdateDealRequest(
    string ClientName,
    DateTime Date,
    ProductCategory Category,
    ProductCompany Company,
    string ProductName,
    decimal DepositAmount,
    string CommissionFormula,
    DealStatus Status,
    string Note
);

public record DealsStatsDto(
    int TotalCount,
    decimal TotalDepositAmount,
    decimal TotalPoints,
    decimal TotalCommissionCzk,
    int PendingCount,
    int ActiveCount
);
