import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from './errors';

describe('AppError', () => {
  it('sets statusCode, message, and code', () => {
    const err = new AppError(500, 'Internal error', 'INTERNAL');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Internal error');
    expect(err.code).toBe('INTERNAL');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without a code', () => {
    const err = new AppError(400, 'Bad request');
    expect(err.code).toBeUndefined();
  });
});

describe('UnauthorizedError', () => {
  it('has status 401 and UNAUTHORIZED code', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has status 403 and FORBIDDEN code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
  });

  it('accepts a custom message', () => {
    const err = new ForbiddenError('Insufficient permissions');
    expect(err.message).toBe('Insufficient permissions');
  });
});

describe('NotFoundError', () => {
  it('has status 404 and includes resource in message', () => {
    const err = new NotFoundError('Member');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Member not found');
  });
});

describe('ConflictError', () => {
  it('has status 409 and CONFLICT code', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Email already exists');
  });
});

describe('ValidationError', () => {
  it('has status 400 and VALIDATION_ERROR code', () => {
    const err = new ValidationError('Name is required');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Name is required');
  });
});
