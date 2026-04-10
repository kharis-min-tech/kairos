import { describe, it, expect } from 'vitest';
import {
  ukPhoneSchema,
  phoneSchema,
  ukDateSchema,
  parseUkDate,
  formatUkDate,
  nonEmptyString,
  positiveAmount,
  paginationSchema,
} from './custom-validators';

describe('ukPhoneSchema', () => {
  it('should accept valid UK phone numbers', () => {
    expect(ukPhoneSchema.safeParse('+447700900000').success).toBe(true);
    expect(ukPhoneSchema.safeParse('07700900000').success).toBe(true);
    expect(ukPhoneSchema.safeParse('+442071234567').success).toBe(true);
    expect(ukPhoneSchema.safeParse('02071234567').success).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(ukPhoneSchema.safeParse('123').success).toBe(false);
    expect(ukPhoneSchema.safeParse('').success).toBe(false);
    expect(ukPhoneSchema.safeParse('not-a-phone').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('should accept valid international phone numbers', () => {
    expect(phoneSchema.safeParse('+447700900000').success).toBe(true);
    expect(phoneSchema.safeParse('+1234567890').success).toBe(true);
    expect(phoneSchema.safeParse('07700900000').success).toBe(true);
    expect(phoneSchema.safeParse('+44 7700 900000').success).toBe(true);
  });

  it('should reject too short phone numbers', () => {
    expect(phoneSchema.safeParse('123').success).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
  });
});

describe('ukDateSchema', () => {
  it('should accept valid UK dates (DD/MM/YYYY)', () => {
    expect(ukDateSchema.safeParse('25/12/2024').success).toBe(true);
    expect(ukDateSchema.safeParse('01/01/2000').success).toBe(true);
    expect(ukDateSchema.safeParse('29/02/2024').success).toBe(true); // Leap year
  });

  it('should reject invalid date formats', () => {
    expect(ukDateSchema.safeParse('2024-12-25').success).toBe(false);
    expect(ukDateSchema.safeParse('12/25/2024').success).toBe(false); // US format with month > 12
    expect(ukDateSchema.safeParse('25-12-2024').success).toBe(false);
  });

  it('should reject invalid date values', () => {
    expect(ukDateSchema.safeParse('31/02/2024').success).toBe(false); // Feb 31
    expect(ukDateSchema.safeParse('29/02/2023').success).toBe(false); // Not a leap year
    expect(ukDateSchema.safeParse('00/01/2024').success).toBe(false); // Day 0
    expect(ukDateSchema.safeParse('01/13/2024').success).toBe(false); // Month 13
  });
});

describe('parseUkDate', () => {
  it('should parse DD/MM/YYYY to Date object', () => {
    const date = parseUkDate('25/12/2024');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11); // 0-indexed
    expect(date.getDate()).toBe(25);
  });
});

describe('formatUkDate', () => {
  it('should format Date to DD/MM/YYYY', () => {
    const date = new Date(2024, 11, 25); // Dec 25, 2024
    expect(formatUkDate(date)).toBe('25/12/2024');
  });

  it('should pad single-digit day and month', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    expect(formatUkDate(date)).toBe('05/01/2024');
  });
});

describe('nonEmptyString', () => {
  it('should accept non-empty strings', () => {
    expect(nonEmptyString.safeParse('hello').success).toBe(true);
  });

  it('should reject empty strings', () => {
    expect(nonEmptyString.safeParse('').success).toBe(false);
  });

  it('should reject whitespace-only strings', () => {
    expect(nonEmptyString.safeParse('   ').success).toBe(false);
  });
});

describe('positiveAmount', () => {
  it('should accept positive numbers', () => {
    expect(positiveAmount.safeParse(10.50).success).toBe(true);
    expect(positiveAmount.safeParse(0.01).success).toBe(true);
  });

  it('should reject zero', () => {
    expect(positiveAmount.safeParse(0).success).toBe(false);
  });

  it('should reject negative numbers', () => {
    expect(positiveAmount.safeParse(-5).success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('should use defaults when not provided', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    }
  });

  it('should accept valid pagination params', () => {
    const result = paginationSchema.safeParse({ page: 2, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it('should reject page < 1', () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('should reject limit > 100', () => {
    expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false);
  });
});
