using RentUP.Cloud.Domain.Enums;

namespace RentUP.Cloud.Application.DTOs;

public record ProductDto(
    Guid Id,
    string Name,
    ProductCategory Category,
    ProductCompany Company,
    string ColorHex,
    decimal AverageYield,
    decimal MonthlyDeposit,
    string CommissionFormula,
    int Order,
    bool IncludeInAum,
    decimal CurrentAum,
    bool IsActive
);

public record CreateProductRequest(
    string Name,
    ProductCategory Category,
    ProductCompany Company,
    string ColorHex,
    decimal AverageYield,
    decimal MonthlyDeposit,
    string CommissionFormula,
    int Order,
    bool IncludeInAum = true,
    decimal CurrentAum = 0m
);

public record UpdateProductRequest(
    string Name,
    ProductCategory Category,
    ProductCompany Company,
    string ColorHex,
    decimal AverageYield,
    decimal MonthlyDeposit,
    string CommissionFormula,
    int Order,
    bool IncludeInAum,
    decimal CurrentAum,
    bool IsActive
);
