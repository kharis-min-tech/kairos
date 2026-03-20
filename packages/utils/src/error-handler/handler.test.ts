import { describe, it, expect } from 'vitest';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from './errors';
import { handleError, successResponse, createdResponse } from './handler';
import { ValidationFailedError } from '../validator/validate';

describe('Error Classes', () => {
  it('BadRequestError should have status 400', () => {
    const err = new BadRequestError('Bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('UnauthorizedError should have status 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError should have status 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError should have status 404', () => {
    const err = new NotFoundError('Member', '123');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('123');
  });

  it('ConflictError should have status 409', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('ValidationError should have status 422', () => {
    const err = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE_ENTITY');
  });

  it('InternalServerError should have status 500', () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('AppError.toResponse', () => {
  it('should return standard error format { error: { code, message } }', () => {
    const err = new NotFoundError('Member');
    const response = err.toResponse();
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.error).toHaveProperty('message');
  });

  it('should include details when present', () => {
    const err = new BadRequestError('Invalid input', [
      { field: 'email', message: 'Required' },
    ]);
    const response = err.toResponse();
    expect(response.error.details).toHaveLength(1);
    expect(response.error.details![0]).toEqual({
      field: 'email',
      message: 'Required',
    });
  });

  it('should omit details when not present', () => {
    const err = new UnauthorizedError();
    const response = err.toResponse();
    expect(response.error.details).toBeUndefined();
  });
});

describe('handleError', () => {
  it('should handle AppError instances', () => {
    const err = new ForbiddenError('No access');
    const response = handleError(err);
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should handle ValidationFailedError', () => {
    const err = new ValidationFailedError('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);
    const response = handleError(err);
    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toHaveLength(1);
  });

  it('should handle PostgreSQL unique constraint violations', () => {
    const err = { code: '23505', message: 'unique_violation' };
    const response = handleError(err);
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('should handle PostgreSQL foreign key violations', () => {
    const err = { code: '23503', message: 'foreign_key_violation' };
    const response = handleError(err);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle unknown errors as 500', () => {
    const response = handleError(new Error('Something broke'));
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    // Should not expose internal error message
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('should include CORS headers', () => {
    const response = handleError(new Error('test'));
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(response.headers['Content-Type']).toBe('application/json');
  });
});

describe('successResponse', () => {
  it('should return 200 by default', () => {
    const response = successResponse({ id: 1 });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ id: 1 });
  });

  it('should accept custom status code', () => {
    const response = successResponse({ id: 1 }, 201);
    expect(response.statusCode).toBe(201);
  });
});

describe('createdResponse', () => {
  it('should return 201', () => {
    const response = createdResponse({ id: 1 });
    expect(response.statusCode).toBe(201);
  });
});
