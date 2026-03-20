// @kairos/validator - Custom validators for Kairos-specific formats

import { z } from 'zod';

/**
 * UK phone number validator.
 * Accepts formats: +44XXXXXXXXXX, 07XXXXXXXXX, 0XXXXXXXXXX
 */
export const ukPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+44\s?\d{10}|\+44\s?\d{4}\s?\d{6}|0\d{10}|0\d{4}\s?\d{6})$/,
    'Invalid UK phone number format. Expected +44XXXXXXXXXX or 0XXXXXXXXXXX'
  );

/**
 * General phone number validator (more permissive for international numbers).
 * Allows +country code followed by digits, spaces, and hyphens.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone number must be at least 7 characters')
  .max(20, 'Phone number must be at most 20 characters')
  .regex(
    /^\+?[\d\s\-()]{7,20}$/,
    'Invalid phone number format'
  );

/**
 * UK date format validator (DD/MM/YYYY).
 * Validates the format and checks for valid date values.
 */
export const ukDateSchema = z
  .string()
  .trim()
  .regex(
    /^\d{2}\/\d{2}\/\d{4}$/,
    'Invalid date format. Expected DD/MM/YYYY'
  )
  .refine(
    (val) => {
      const [dayStr, monthStr, yearStr] = val.split('/');
      const day = parseInt(dayStr!, 10);
      const month = parseInt(monthStr!, 10);
      const year = parseInt(yearStr!, 10);

      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      if (year < 1900 || year > 2100) return false;

      // Validate actual date (handles leap years, month lengths)
      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: 'Invalid date value' }
  );

/**
 * Parses a UK date string (DD/MM/YYYY) into a Date object.
 */
export function parseUkDate(dateStr: string): Date {
  const [dayStr, monthStr, yearStr] = dateStr.split('/');
  return new Date(
    parseInt(yearStr!, 10),
    parseInt(monthStr!, 10) - 1,
    parseInt(dayStr!, 10)
  );
}

/**
 * Formats a Date object to UK date string (DD/MM/YYYY).
 */
export function formatUkDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Non-empty trimmed string validator.
 */
export const nonEmptyString = z.string().trim().min(1, 'This field is required');

/**
 * Positive amount validator for financial values.
 * Must be greater than 0.
 */
export const positiveAmount = z
  .number()
  .positive('Amount must be greater than 0')
  .finite('Amount must be a finite number');

/**
 * Pagination parameters schema.
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Sort parameters schema.
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
