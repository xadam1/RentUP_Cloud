using NCalc;

namespace RentUP.Cloud.Application.Services;

/// <summary>
/// Evaluates NCalc formula strings with a single AUM variable.
/// Ported 1:1 from legacy RentUP.Core.Services.MathParserService.
///
/// Formula example: "(AUM/1555200)*24"
/// The variable name "AUM" is case-sensitive.
/// </summary>
public class MathParserService
{
    /// <summary>
    /// Evaluates the formula with the given AUM value.
    /// Returns 0 on any parse/evaluation error (same behaviour as legacy).
    /// </summary>
    public decimal Evaluate(string formula, decimal aum)
    {
        if (string.IsNullOrWhiteSpace(formula)) return 0m;

        try
        {
            var expression = new Expression(formula);
            expression.Parameters["AUM"] = (double)aum;

            var result = expression.Evaluate();

            return result switch
            {
                double d => (decimal)d,
                float f  => (decimal)f,
                int i    => i,
                long l   => l,
                decimal dec => dec,
                _        => 0m
            };
        }
        catch
        {
            // Same as legacy — silently return 0 so bad formulas don't crash the UI
            return 0m;
        }
    }

    /// <summary>Returns true if the formula parses without errors.</summary>
    public bool IsValid(string formula, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(formula)) { error = "Formula is empty."; return false; }

        try
        {
            var expression = new Expression(formula);
            expression.Parameters["AUM"] = 1000000.0;
            expression.Evaluate();
            return true;
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }
    }
}
