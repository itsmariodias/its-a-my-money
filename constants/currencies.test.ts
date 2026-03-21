import { formatAmount, getCurrencySymbol } from '@/constants/currencies';

describe('formatAmount', () => {
  it('should format an expense with minus sign and currency symbol', () => {
    // Given an amount of 1234.56 with currency USD
    // When formatAmount is called with type "expense"
    const result = formatAmount(1234.56, 'USD', 'expense');
    // Then it should have a minus prefix and contain the dollar sign
    expect(result).toMatch(/^-/);
    expect(result).toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('should format an income with plus sign', () => {
    // Given an amount of 500 with currency USD
    // When formatAmount is called with type "income"
    const result = formatAmount(500, 'USD', 'income');
    // Then it should have a plus prefix
    expect(result).toMatch(/^\+/);
    expect(result).toContain('$');
  });

  it('should use comma as decimal separator for European format', () => {
    // Given an amount of 1234.56 with currency EUR and locale de-DE
    // When formatAmount is called
    const result = formatAmount(1234.56, 'EUR', undefined, 'de-DE');
    // Then it should use comma as decimal separator
    expect(result).toMatch(/1\.234,56/);
  });

  it('should use Indian grouping for en-IN locale', () => {
    // Given an amount of 123456.78 with currency INR and locale en-IN
    // When formatAmount is called
    const result = formatAmount(123456.78, 'INR', undefined, 'en-IN');
    // Then it should use Indian grouping (1,23,456.78 pattern)
    expect(result).toContain('₹');
    expect(result).toMatch(/1,23,456\.78/);
  });

  it('should disable thousands grouping for plain locale', () => {
    // Given an amount of 1234.56 with currency USD and locale "plain"
    // When formatAmount is called
    const result = formatAmount(1234.56, 'USD', undefined, 'plain');
    // Then there should be no thousands separator
    expect(result).toContain('1234.56');
  });

  it('should handle zero amount', () => {
    // Given an amount of 0 with currency USD and type expense
    // When formatAmount is called
    const result = formatAmount(0, 'USD', 'expense');
    // Then it should return -$0.00
    expect(result).toBe('-$0.00');
  });

  it('should show negative sign for negative balance without type', () => {
    // Given a negative amount with no type (balance display)
    // When formatAmount is called
    const result = formatAmount(-250.75, 'USD');
    // Then it should start with a minus sign
    expect(result).toMatch(/^-/);
    expect(result).toContain('250.75');
  });

  it('should not show sign for positive balance without type', () => {
    // Given a positive amount with no type
    // When formatAmount is called
    const result = formatAmount(100, 'USD');
    // Then it should not have a plus or minus prefix
    expect(result).not.toMatch(/^[+-]/);
  });
});

describe('getCurrencySymbol', () => {
  it('should return the correct symbol for a known currency', () => {
    // Given a currency code "BRL"
    // When getCurrencySymbol is called
    // Then it should return "R$"
    expect(getCurrencySymbol('BRL')).toBe('R$');
  });

  it('should fall back to the code itself for an unknown currency', () => {
    // Given an unknown currency code "XYZ"
    // When getCurrencySymbol is called
    // Then it should return "XYZ" as the fallback
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});
