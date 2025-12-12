/**
 * String manipulation utilities for the Kairos Church Management System
 */

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns String with each word capitalized
 */
export function capitalizeWords(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Capitalizes only the first letter of a string
 * @param str - The string to capitalize
 * @returns String with first letter capitalized
 */
export function capitalizeFirst(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to kebab-case (lowercase with hyphens)
 * @param str - The string to convert
 * @returns Kebab-case string
 */
export function toKebabCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to camelCase
 * @param str - The string to convert
 * @returns CamelCase string
 */
export function toCamelCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Converts a string to PascalCase
 * @param str - The string to convert
 * @returns PascalCase string
 */
export function toPascalCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/**
 * Truncates a string to a specified length and adds ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated string
 */
export function truncateString(
  str: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes extra whitespace and normalizes spacing
 * @param str - The string to normalize
 * @returns Normalized string
 */
export function normalizeWhitespace(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Generates initials from a full name
 * @param fullName - The full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string
 */
export function getInitials(fullName: string, maxInitials: number = 2): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  const words = fullName.trim().split(/\s+/);
  const initials = words
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials;
}

/**
 * Masks sensitive information (like phone numbers or emails)
 * @param str - The string to mask
 * @param visibleStart - Number of characters to show at start (default: 2)
 * @param visibleEnd - Number of characters to show at end (default: 2)
 * @param maskChar - Character to use for masking (default: '*')
 * @returns Masked string
 */
export function maskString(
  str: string,
  visibleStart: number = 2,
  visibleEnd: number = 2,
  maskChar: string = '*'
): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  if (str.length <= visibleStart + visibleEnd) {
    return str;
  }

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;
  const mask = maskChar.repeat(maskLength);

  return start + mask + end;
}

/**
 * Generates a slug from a string (URL-friendly)
 * @param str - The string to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Checks if a string contains only alphabetic characters
 * @param str - The string to check
 * @returns True if string contains only letters
 */
export function isAlphabetic(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  return /^[a-zA-Z]+$/.test(str);
}

/**
 * Checks if a string contains only numeric characters
 * @param str - The string to check
 * @returns True if string contains only numbers
 */
export function isNumeric(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  return /^\d+$/.test(str);
}

/**
 * Checks if a string contains only alphanumeric characters
 * @param str - The string to check
 * @returns True if string contains only letters and numbers
 */
export function isAlphanumeric(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  return /^[a-zA-Z0-9]+$/.test(str);
}
