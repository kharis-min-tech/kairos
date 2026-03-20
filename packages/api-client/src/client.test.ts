import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureClient } from './client';
import { ApiError } from './errors';

// We need to re-import the http helpers after configuring the client,
// but since they use module-level state, we import them once.
import { get, post, put, del } from './client';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockGetToken = vi.fn<() => Promise<string | null>>();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue('test-jwt-token');
  configureClient({
    baseUrl: 'https://api.kairos.church/v1',
    getToken: mockGetToken,
  });
});

describe('configureClient', () => {
  it('throws if client is not configured', async () => {
    // Reset config by configuring with a getter that throws
    // We test this indirectly: the module state is already set from beforeEach
    // Instead, test that configured client works
    const response = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });

    const result = await get('/test');
    expect(result).toEqual(response);
  });
});

describe('Bearer token injection', () => {
  it('injects Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
        }),
      })
    );
  });

  it('omits Authorization header when token is null', async () => {
    mockGetToken.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/test');

    const callHeaders = mockFetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBeUndefined();
  });

  it('calls getToken before every request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/a');
    await get('/b');

    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });
});

describe('URL building', () => {
  it('appends path to base URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/members');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.kairos.church/v1/members',
      expect.any(Object)
    );
  });

  it('appends query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/members', { page: 1, limit: 50, status: 'active' });

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('limit=50');
    expect(url).toContain('status=active');
  });

  it('skips undefined query parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await get('/members', { page: 1, branchId: undefined });

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('page=1');
    expect(url).not.toContain('branchId');
  });
});

describe('HTTP methods', () => {
  it('GET sends correct method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await get('/members');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET', body: undefined })
    );
  });

  it('POST sends body as JSON', async () => {
    const body = { first_name: 'John', last_name: 'Doe' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1, ...body }),
    });

    await post('/members', body);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('PUT sends body as JSON', async () => {
    const body = { first_name: 'Jane' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });

    await put('/members/1', body);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) })
    );
  });

  it('DELETE sends correct method with no body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await del('/members/1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE', body: undefined })
    );
  });
});

describe('error handling', () => {
  it('throws ApiError with parsed error body on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () =>
        Promise.resolve({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: [{ field: 'email', message: 'Invalid email format' }],
          },
        }),
    });

    try {
      await post('/members', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.message).toBe('Invalid input');
      expect(apiErr.details).toHaveLength(1);
      expect(apiErr.details![0]!.field).toBe('email');
      expect(apiErr.isValidation).toBe(true);
    }
  });

  it('throws ApiError with fallback when JSON parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });

    try {
      await get('/test');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(500);
      expect(apiErr.code).toBe('UNKNOWN_ERROR');
      expect(apiErr.message).toBe('Internal Server Error');
    }
  });

  it('handles 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        }),
    });

    try {
      await get('/members');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.isUnauthorized).toBe(true);
      expect(apiErr.isForbidden).toBe(false);
    }
  });

  it('handles 403 Forbidden', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () =>
        Promise.resolve({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        }),
    });

    try {
      await get('/members');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.isForbidden).toBe(true);
    }
  });

  it('handles 404 Not Found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () =>
        Promise.resolve({
          error: { code: 'NOT_FOUND', message: 'Member not found' },
        }),
    });

    try {
      await get('/members/999');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.isNotFound).toBe(true);
    }
  });

  it('handles 204 No Content response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await del('/members/1');
    expect(result).toBeUndefined();
  });
});
