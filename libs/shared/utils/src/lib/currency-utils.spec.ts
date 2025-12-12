import {
  formatCurrency,
  formatCurrencyCustom,
  parseCurrency,
  formatAccountingCurrency,
  calculatePercentage,
  roundToCurrencyPrecision,
  type CurrencyCode,
} from './currency-utils';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format USD currency by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should format different currencies', () => {
      expect(formatCurrency(1234.56, 'EUR')).toContain('1.234,56');
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
      expect(formatCurrency(1234.56, 'NGN')).toBe('₦1,234.56');
    });

    it('should format without symbol when requested', () => {
      const result = formatCurrency(1234.56, 'USD', false);
      expect(result).toBe('1,234.56');
      expect(result).not.toContain('$');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    });

    it('should throw error for invalid amounts', () => {
      expect(() => formatCurrency(NaN)).toThrow('Invalid amount provided');
      expect(() => formatCurrency(null as any)).toThrow(
        'Invalid amount provided'
      );
      expect(() => formatCurrency('123' as any)).toThrow(
        'Invalid amount provided'
      );
    });

    it('should throw error for unsupported currency', () => {
      expect(() => formatCurrency(100, 'XYZ' as CurrencyCode)).toThrow(
        'Unsupported currency code: XYZ'
      );
    });
  });

  describe('formatCurrencyCustom', () => {
    it('should format with symbol before by default', () => {
      expect(formatCurrencyCustom(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('should format with symbol after when requested', () => {
      expect(formatCurrencyCustom(1234.56, 'USD', 'after')).toBe('1,234.56 $');
    });

    it('should work with different currencies', () => {
      expect(formatCurrencyCustom(1000, 'EUR', 'after')).toBe('1.000,00 €');
    });

    it('should throw error for invalid amounts', () => {
      expect(() => formatCurrencyCustom(NaN)).toThrow(
        'Invalid amount provided'
      );
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency strings correctly', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('€1.234,56')).toBe(1234.56);
      expect(parseCurrency('1234.56')).toBe(1234.56);
      expect(parseCurrency('-$500.00')).toBe(-500);
    });

    it('should handle various formats', () => {
      expect(parseCurrency('USD 1,000.50')).toBe(1000.5);
      expect(parseCurrency('₦ 2,500.75')).toBe(2500.75);
      expect(parseCurrency('(1,000.00)')).toBe(1000); // Accounting format
    });

    it('should return null for invalid strings', () => {
      expect(parseCurrency('')).toBe(null);
      expect(parseCurrency('not a number')).toBe(null);
      expect(parseCurrency(null as any)).toBe(null);
      expect(parseCurrency('abc')).toBe(null);
    });
  });

  describe('formatAccountingCurrency', () => {
    it('should format positive amounts normally', () => {
      expect(formatAccountingCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format negative amounts in parentheses', () => {
      expect(formatAccountingCurrency(-1234.56)).toBe('($1,234.56)');
    });

    it('should work with different currencies', () => {
      const result = formatAccountingCurrency(-500, 'EUR');
      expect(result).toContain('(');
      expect(result).toContain('500');
      expect(result).toContain('€');
      expect(result).toContain(')');
    });

    it('should throw error for invalid amounts', () => {
      expect(() => formatAccountingCurrency(NaN)).toThrow(
        'Invalid amount provided'
      );
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentages correctly', () => {
      expect(calculatePercentage(1000, 10)).toBe(100);
      expect(calculatePercentage(500, 25)).toBe(125);
      expect(calculatePercentage(1000, 0)).toBe(0);
    });

    it('should handle decimal percentages', () => {
      expect(calculatePercentage(1000, 12.5)).toBe(125);
      expect(calculatePercentage(200, 7.25)).toBe(14.5);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePercentage(NaN, 10)).toThrow(
        'Invalid amount or percentage provided'
      );
      expect(() => calculatePercentage(100, NaN)).toThrow(
        'Invalid amount or percentage provided'
      );
      expect(() => calculatePercentage('100' as any, 10)).toThrow(
        'Invalid amount or percentage provided'
      );
    });
  });

  describe('roundToCurrencyPrecision', () => {
    it('should round to 2 decimal places for USD', () => {
      expect(roundToCurrencyPrecision(1234.567, 'USD')).toBe(1234.57);
      expect(roundToCurrencyPrecision(1234.564, 'USD')).toBe(1234.56);
      expect(roundToCurrencyPrecision(1234.565, 'USD')).toBe(1234.57);
    });

    it('should work with different currencies', () => {
      expect(roundToCurrencyPrecision(1234.567, 'EUR')).toBe(1234.57);
      expect(roundToCurrencyPrecision(1234.567, 'GBP')).toBe(1234.57);
    });

    it('should handle whole numbers', () => {
      expect(roundToCurrencyPrecision(1234, 'USD')).toBe(1234);
    });

    it('should throw error for invalid amounts', () => {
      expect(() => roundToCurrencyPrecision(NaN)).toThrow(
        'Invalid amount provided'
      );
      expect(() => roundToCurrencyPrecision('123' as any)).toThrow(
        'Invalid amount provided'
      );
    });

    it('should throw error for unsupported currency', () => {
      expect(() =>
        roundToCurrencyPrecision(100, 'XYZ' as CurrencyCode)
      ).toThrow('Unsupported currency code: XYZ');
    });
  });
});
