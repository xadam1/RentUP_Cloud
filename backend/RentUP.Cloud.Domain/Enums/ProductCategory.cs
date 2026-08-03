namespace RentUP.Cloud.Domain.Enums;

/// <summary>
/// Financial product category. Drives UI grouping and color coding.
/// Maps to Czech UI labels in the frontend.
/// </summary>
public enum ProductCategory
{
    // Investiční fondy
    InvestmentFund = 0,

    // Stavební spoření
    BuildingSavings = 1,

    // Životní pojištění
    LifeInsurance = 2,

    // Penzijní spoření
    PensionSavings = 3,

    // Dluhopisy
    Bonds = 4,

    // Zlato / Komodity
    Commodities = 5,

    // Nemovitosti
    RealEstate = 6,

    // Peněžní trh
    MoneyMarket = 7,

    // Ostatní
    Other = 99
}
