// @kairos/error-handler - Error handling layer for the Kairos platform
// Provides standardized error responses, HTTP status code mapping, and structured logging

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  ErrorCode,
} from './errors';
export type { ErrorDetail, ErrorResponseBody } from './errors';

export {
  handleError,
  successResponse,
  createdResponse,
} from './handler';
export type { LambdaResponse } from './handler';
