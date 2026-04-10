// @kairos/error-handler - Custom error classes for the Kairos platform

/** Error codes used across the API */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Error detail for field-level errors */
export interface ErrorDetail {
  field?: string;
  message: string;
}

/** Standard error response format: { error: { code, message, details? } } */
export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Base application error class.
 * All custom errors extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** Converts the error to the standard API error response format */
  toResponse(): ErrorResponseBody {
    const response: ErrorResponseBody = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details && this.details.length > 0) {
      response.error.details = this.details;
    }
    return response;
  }
}

/** 400 Bad Request - Invalid input data */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: ErrorDetail[]) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
    this.name = 'BadRequestError';
  }
}

/** 401 Unauthorized - Missing or invalid authentication */
export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

/** 403 Forbidden - Insufficient permissions */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions to access this resource') {
    super(message, 403, ErrorCode.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

/** 404 Not Found - Resource does not exist */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier?: string) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, ErrorCode.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

/** 409 Conflict - Duplicate resource or constraint violation */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: ErrorDetail[]) {
    super(message, 409, ErrorCode.CONFLICT, details);
    this.name = 'ConflictError';
  }
}

/** 422 Unprocessable Entity - Validation error */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ErrorDetail[]) {
    super(message, 422, ErrorCode.UNPROCESSABLE_ENTITY, details);
    this.name = 'ValidationError';
  }
}

/** 500 Internal Server Error - Unexpected server error */
export class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR);
    this.name = 'InternalServerError';
  }
}
