/**
 * Validation utility functions for the Kairos Church Management System
 */

/**
 * Validates an email address format
 * @param email - The email address to validate
 * @returns True if the email is valid
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return false;
  }

  // Basic email validation
  const emailRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmedEmail);
}

/**
 * Validates a phone number (supports various formats)
 * @param phone - The phone number to validate
 * @returns True if the phone number is valid
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's between 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validates that a string is not empty or just whitespace
 * @param value - The string to validate
 * @returns True if the string has content
 */
export function validateRequired(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a string meets minimum length requirements
 * @param value - The string to validate
 * @param minLength - Minimum required length
 * @returns True if the string meets the minimum length
 */
export function validateMinLength(value: string, minLength: number): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return value.trim().length >= minLength;
}

/**
 * Validates that a string doesn't exceed maximum length
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length
 * @returns True if the string is within the maximum length
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  if (!value || typeof value !== 'string') {
    return true; // Empty strings are valid for max length
  }

  return value.length <= maxLength;
}

/**
 * Validates a password strength (at least 8 chars, contains letter and number)
 * @param password - The password to validate
 * @returns True if the password meets strength requirements
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // At least 8 characters, contains at least one letter and one number
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinLength && hasLetter && hasNumber;
}

/**
 * Validates a URL format
 * @param url - The URL to validate
 * @returns True if the URL is valid
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a number is within a specified range
 * @param value - The number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if the number is within range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): boolean {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }

  return value >= min && value <= max;
}
