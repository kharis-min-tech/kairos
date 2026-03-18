import { describe, it, expect } from 'vitest';
import { ApiClientError } from './errors';

describe('ApiClientError', () => {
  it('sets status, message, and code', () => {
    const err = new ApiClientError(404, 'Not found', 'NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiClientError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without a code', () => {
    const err = new ApiClientError(500, 'Server error');
    expect(err.code).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const err = new ApiClientError(400, 'Bad request');
    expect(err instanceof Error).toBe(true);
  });
});
