import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from './client';
import { ApiClientError } from './errors';

// Use vi.stubGlobal to mock fetch
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockSuccess(body: unknown, status = 200) {
  mockFetch.mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFailure(body: unknown, status: number) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('ApiClient', () => {
  describe('constructor', () => {
    it('strips trailing slash from baseUrl', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001/' });
      mockSuccess({ success: true, data: {} });
      await client.get('/api/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.any(Object),
      );
    });
  });

  describe('GET request', () => {
    it('sends a GET request with Content-Type header', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockSuccess({ success: true, data: { id: '1' } });

      const result = await client.get<{ success: boolean; data: { id: string } }>('/api/members');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/members',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
      expect(result.data.id).toBe('1');
    });

    it('includes Authorization header when token is provided', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:3001',
        getToken: () => 'test-token',
      });
      mockSuccess({ success: true });

      await client.get('/api/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });

    it('omits Authorization header when token is null', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:3001',
        getToken: () => null,
      });
      mockSuccess({ success: true });

      await client.get('/api/public');

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('POST request', () => {
    it('sends body as JSON', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockSuccess({ success: true, data: { memberId: 'abc' } });

      await client.post('/api/auth/signup', { email: 'test@example.com', password: 'secret' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'secret' }),
        }),
      );
    });

    it('sends a POST with no body when body is not provided', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockSuccess({ success: true });

      await client.post('/api/auth/logout');

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.body).toBeUndefined();
    });
  });

  describe('PATCH request', () => {
    it('sends a PATCH with body', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockSuccess({ success: true });

      await client.patch('/api/members/1', { firstName: 'Jane' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('DELETE request', () => {
    it('sends a DELETE request', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockSuccess({ success: true });

      await client.delete('/api/branches/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/branches/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('error handling', () => {
    it('throws ApiClientError on non-ok response', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockFailure({ message: 'Not found', code: 'NOT_FOUND' }, 404);

      await expect(client.get('/api/members/999')).rejects.toThrow(ApiClientError);
    });

    it('includes status, message, and code in the thrown error', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:3001',
        getToken: () => null,
      });
      mockFailure({ message: 'No account found with that email', code: 'UNAUTHORIZED' }, 401);

      try {
        await client.get('/api/auth/login');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.status).toBe(401);
        // Without a token, the client passes through the server error directly
        expect(apiErr.message).toBe('No account found with that email');
      }
    });

    it('attempts refresh and throws session expired on 401 with token', async () => {
      const client = new ApiClient({
        baseUrl: 'http://localhost:3001',
        getToken: () => 'my-token',
        getRefreshToken: () => 'my-refresh-token',
      });
      // First call: 401 on the actual request
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 401,
        json: () => Promise.resolve({ message: 'Invalid or expired token', code: 'UNAUTHORIZED' }),
      });
      // Second call: refresh attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 401,
        json: () => Promise.resolve({ message: 'Refresh failed' }),
      });

      try {
        await client.get('/api/protected');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.status).toBe(401);
        expect(apiErr.message).toBe('Session expired. Please log in again.');
      }
    });

    it('falls back to "Request failed" when error response has no message', async () => {
      const client = new ApiClient({ baseUrl: 'http://localhost:3001' });
      mockFailure({}, 500);

      await expect(client.get('/api/fail')).rejects.toThrow('Request failed');
    });
  });
});
