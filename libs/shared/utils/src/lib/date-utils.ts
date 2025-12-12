/**
 * Date formatting utilities for the Kairos Church Management System
 */

/**
 * Formats a date according to the specified format string
 * @param date - The date to format
 * @param format - Format string (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string = 'DD/MM/YYYY'): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();

  return format.replace('DD', day).replace('MM', month).replace('YYYY', year);
}

/**
 * Formats a date for display in a human-readable format
 * @param date - The date to format
 * @returns Human-readable date string (e.g., "January 15, 2024")
 */
export function formatDateLong(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date and time for display
 * @param date - The date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gets the age in years from a birth date
 * @param birthDate - The birth date
 * @returns Age in years
 */
export function getAge(birthDate: Date): number {
  if (
    !birthDate ||
    !(birthDate instanceof Date) ||
    isNaN(birthDate.getTime())
  ) {
    throw new Error('Invalid birth date provided');
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Checks if a date is in the past
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export function isDateInPast(date: Date): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  return date < new Date();
}

/**
 * Checks if a date is in the future
 * @param date - The date to check
 * @returns True if the date is in the future
 */
export function isDateInFuture(date: Date): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  return date > new Date();
}
