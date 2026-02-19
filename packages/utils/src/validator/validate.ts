// @kairos/validator - Validation helper functions

import type { z } from 'zod';

/** Result of a validation operation */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

/** Individual validation error */
export interface ValidationError {
  field?: string;
  message: string;
}

/**
 * Validates input data against a Zod schema.
 * Returns a discriminated union result with either parsed data or errors.
 *
 * @param schema - Zod schema to validate against
 * @param data - Input data to validate
 * @returns Validation result with parsed data or error details
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: issue.message,
  }));

  return { success: false, errors };
}

/**
 * Validates input data against a Zod schema and throws on failure.
 * Use this when you want to fail fast with an error.
 *
 * @param schema - Zod schema to validate against
 * @param data - Input data to validate
 * @returns Parsed and validated data
 * @throws ValidationFailedError with structured error details
 */
export function validateOrThrow<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  const result = validate(schema, data);

  if (!result.success) {
    const error = new ValidationFailedError(
      'Validation failed',
      result.errors
    );
    throw error;
  }

  return result.data;
}

/**
 * Custom error class for validation failures.
 * Contains structured error details for API responses.
 */
export class ValidationFailedError extends Error {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'ValidationFailedError';
    this.errors = errors;
  }
}
