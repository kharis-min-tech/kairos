import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse, paginatedResponse, parsePagination } from './response';

describe('successResponse', () => {
  it('wraps data with success: true', () => {
    const res = successResponse({ id: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 1 });
    expect(res.message).toBeUndefined();
  });

  it('includes an optional message', () => {
    const res = successResponse('ok', 'Created successfully');
    expect(res.message).toBe('Created successfully');
  });
});

describe('errorResponse', () => {
  it('wraps message with success: false', () => {
    const res = errorResponse('Something went wrong');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Something went wrong');
    expect(res.code).toBeUndefined();
  });

  it('includes an optional code', () => {
    const res = errorResponse('Not found', 'NOT_FOUND');
    expect(res.code).toBe('NOT_FOUND');
  });
});

describe('paginatedResponse', () => {
  it('calculates totalPages correctly', () => {
    const res = paginatedResponse([1, 2, 3], 30, 1, 10);
    expect(res.data).toEqual([1, 2, 3]);
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(10);
    expect(res.meta.total).toBe(30);
    expect(res.meta.totalPages).toBe(3);
  });

  it('rounds up for partial last page', () => {
    const res = paginatedResponse([], 25, 2, 10);
    expect(res.meta.totalPages).toBe(3);
  });

  it('returns 0 total pages when total is 0', () => {
    const res = paginatedResponse([], 0, 1, 20);
    expect(res.meta.totalPages).toBe(0);
  });
});

describe('parsePagination', () => {
  it('parses valid page and limit', () => {
    const result = parsePagination({ page: '2', limit: '10' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
  });

  it('defaults to page 1 and limit 20 when params are absent', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('clamps page to minimum 1', () => {
    const result = parsePagination({ page: '0' });
    expect(result.page).toBe(1);
  });

  it('clamps limit to maximum 100', () => {
    const result = parsePagination({ limit: '200' });
    expect(result.limit).toBe(100);
  });

  it('treats "0" limit as non-numeric, falling back to default 20', () => {
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(20);
  });

  it('handles non-numeric strings by falling back to defaults', () => {
    const result = parsePagination({ page: 'abc', limit: 'xyz' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
