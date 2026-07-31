namespace RentUP.Cloud.Domain.Enums;

/// <summary>
/// Financial product company / provider.
/// Seeded with known companies from legacy CsvImportService.
/// </summary>
public enum ProductCompany
{
    ZfpInvestments = 0,
    WoodAndCo = 1,
    Avant = 2,
    Conseq = 3,
    GeneraliInvestments = 4,
    ZfpFinance = 5,
    ZfpGold = 6,
    NnInvestments = 7,
    Amundi = 8,
    Other = 99
}
