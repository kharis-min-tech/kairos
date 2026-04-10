// @kairos/error-handler - Error handling utilities for Lambda functions

import { AppError, InternalServerError } from './errors';
import type { ErrorResponseBody, ErrorDetail } from './errors';
import { ValidationFailedError } from '../validator/validate';

/** API Gateway proxy result shape */
export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** Standard CORS and JSON headers for API responses */
const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Creates a successful API response.
 *
 * @param data - Response body data
 * @param statusCode - HTTP status code (default: 200)
 * @returns Lambda proxy response
 */
export function successResponse(
  data: unknown,
  statusCode = 200
): LambdaResponse {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(data),
  };
}

/**
 * Creates a 201 Created response.
 *
 * @param data - Created resource data
 * @returns Lambda proxy response
 */
export function createdResponse(data: unknown): LambdaResponse {
  return successResponse(data, 201);
}

/**
 * Handles an error and returns a standardized API error response.
 * Maps known error types to appropriate HTTP status codes.
 * Never exposes internal error details to clients.
 *
 * @param error - The error to handle
 * @param context - Optional context for structured logging
 * @returns Lambda proxy response with error body
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>
): LambdaResponse {
  // Log the error with context for debugging
  logError(error, context);

  // Handle known application errors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(error.toResponse()),
    };
  }

  // Handle Zod/validator validation errors
  if (error instanceof ValidationFailedError) {
    const details: ErrorDetail[] = error.errors.map((e) => ({
      field: e.field,
      message: e.message,
    }));

    const responseBody: ErrorResponseBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details,
      },
    };

    return {
      statusCode: 422,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(responseBody),
    };
  }

  // Handle database unique constraint violations (PostgreSQL error code 23505)
  if (isDatabaseUniqueViolation(error)) {
    const responseBody: ErrorResponseBody = {
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      },
    };

    return {
      statusCode: 409,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(responseBody),
    };
  }

  // Handle database foreign key violations (PostgreSQL error code 23503)
  if (isDatabaseForeignKeyViolation(error)) {
    const responseBody: ErrorResponseBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Referenced resource does not exist',
      },
    };

    return {
      statusCode: 400,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(responseBody),
    };
  }

  // Handle all other errors as 500 Internal Server Error
  const internalError = new InternalServerError();
  return {
    statusCode: 500,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(internalError.toResponse()),
  };
}

/**
 * Logs an error with structured context for CloudWatch.
 * Never logs sensitive data (passwords, tokens, etc.).
 */
function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const logEntry: Record<string, unknown> = {
    level: 'error',
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (error instanceof Error) {
    logEntry['errorName'] = error.name;
    logEntry['errorMessage'] = error.message;
    logEntry['stack'] = error.stack;

    if (error instanceof AppError) {
      logEntry['errorCode'] = error.code;
      logEntry['statusCode'] = error.statusCode;
    }
  } else {
    logEntry['error'] = String(error);
  }

  // Use console.error for CloudWatch structured logging
  console.error(JSON.stringify(logEntry));
}

/**
 * Checks if an error is a PostgreSQL unique constraint violation.
 */
function isDatabaseUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as Record<string, unknown>)['code'] === '23505'
  );
}

/**
 * Checks if an error is a PostgreSQL foreign key violation.
 */
function isDatabaseForeignKeyViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as Record<string, unknown>)['code'] === '23503'
  );
}
