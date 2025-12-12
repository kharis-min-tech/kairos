/**
 * Currency formatting utilities for the Kairos Church Management System
 */

/**
 * Supported currency codes
 */
export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'NGN'
  | 'GHS'
  | 'KES'
  | 'ZAR';

/**
 * Currency configuration interface
 */
interface CurrencyConfig {
  symbol: string;
  code: string;
  locale: string;
  decimals: number;
}

/**
 * Currency configurations
 */
const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: { symbol: '$', code: 'USD', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE', decimals: 2 },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB', decimals: 2 },
  NGN: { symbol: '₦', code: 'NGN', locale: 'en-NG', decimals: 2 },
  GHS: { symbol: '₵', code: 'GHS', locale: 'en-GH', decimals: 2 },
  KES: { symbol: 'KSh', code: 'KES', locale: 'en-KE', decimals: 2 },
  ZAR: { symbol: 'R', code: 'ZAR', locale: 'en-ZA', decimals: 2 },
};

/**
 * Formats a number as currency
 * @param amount - The amount to format
 * @param currencyCode - The currency code (default: USD)
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  showSymbol: boolean = true
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount provided');
  }

  const config = CURRENCY_CONFIGS[currencyCode];
  if (!config) {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return formatter.format(amount);
}

/**
 * Formats currency with custom symbol placement
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @param symbolPosition - Position of symbol ('before' | 'after')
 * @returns Formatted currency string
 */
export function formatCurrencyCustom(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  symbolPosition: 'before' | 'after' = 'before'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount provided');
  }

  const config = CURRENCY_CONFIGS[currencyCode];
  if (!config) {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  const formattedAmount = formatter.format(amount);

  return symbolPosition === 'before'
    ? `${config.symbol}${formattedAmount}`
    : `${formattedAmount} ${config.symbol}`;
}

/**
 * Parses a currency string to a number
 * @param currencyString - The currency string to parse
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(currencyString: string): number | null {
  if (!currencyString || typeof currencyString !== 'string') {
    return null;
  }

  // Handle European format (1.234,56) vs US format (1,234.56)
  let cleanString = currencyString.replace(/[^\d.,-]/g, '');

  // Check if it's European format (comma as decimal separator)
  const commaIndex = cleanString.lastIndexOf(',');
  const dotIndex = cleanString.lastIndexOf('.');

  if (commaIndex > dotIndex && commaIndex === cleanString.length - 3) {
    // European format: replace comma with dot and remove other dots
    cleanString = cleanString.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: remove commas
    cleanString = cleanString.replace(/,/g, '');
  }

  if (!cleanString) {
    return null;
  }

  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Formats an amount for accounting display (negative amounts in parentheses)
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @returns Formatted accounting string
 */
export function formatAccountingCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'USD'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount provided');
  }

  const config = CURRENCY_CONFIGS[currencyCode];
  if (!config) {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }

  const absAmount = Math.abs(amount);
  const formatted = formatCurrency(absAmount, currencyCode);

  return amount < 0 ? `(${formatted})` : formatted;
}

/**
 * Calculates percentage of an amount
 * @param amount - The base amount
 * @param percentage - The percentage to calculate
 * @returns Calculated percentage amount
 */
export function calculatePercentage(
  amount: number,
  percentage: number
): number {
  if (typeof amount !== 'number' || typeof percentage !== 'number') {
    throw new Error('Invalid amount or percentage provided');
  }

  if (isNaN(amount) || isNaN(percentage)) {
    throw new Error('Invalid amount or percentage provided');
  }

  return (amount * percentage) / 100;
}

/**
 * Rounds amount to currency precision
 * @param amount - The amount to round
 * @param currencyCode - The currency code
 * @returns Rounded amount
 */
export function roundToCurrencyPrecision(
  amount: number,
  currencyCode: CurrencyCode = 'USD'
): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount provided');
  }

  const config = CURRENCY_CONFIGS[currencyCode];
  if (!config) {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }

  const multiplier = Math.pow(10, config.decimals);
  return Math.round(amount * multiplier) / multiplier;
}
