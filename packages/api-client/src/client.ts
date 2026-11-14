import { ApiClientError } from './errors';

// Read a fetch Response as text first, then try to JSON-parse. If parsing
// fails (server returned HTML from an edge 404, or a bare "Not Found" text),
// throw an ApiClientError that surfaces the status + a trimmed snippet of
// the body — so callers see "GET /foo → 404: <!DOCTYPE html>…" instead of
// the opaque "JSON Parse error: Unexpected character N".
async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.length > 160 ? `${text.slice(0, 160)}…` : text;
    throw new ApiClientError(
      response.status,
      `Server returned non-JSON (${response.status}): ${snippet}`,
    );
  }
}

interface ClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onTokenRefreshed?: (accessToken: string, refreshToken: string) => void;
  onAuthFailure?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private getRefreshToken: () => string | null;
  private onTokenRefreshed: ((accessToken: string, refreshToken: string) => void) | undefined;
  private onAuthFailure: (() => void) | undefined;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken ?? (() => null);
    this.getRefreshToken = config.getRefreshToken ?? (() => null);
    this.onTokenRefreshed = config.onTokenRefreshed;
    this.onAuthFailure = config.onAuthFailure;
  }

  private async tryRefresh(): Promise<string> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = (await parseJsonSafely(res)) as Record<string, unknown>;
      if (!res.ok) throw new Error('Refresh failed');

      const payload = data.data as { accessToken: string; refreshToken: string };
      this.onTokenRefreshed?.(payload.accessToken, payload.refreshToken);
      return payload.accessToken;
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-refresh on 401, then retry once (only when a token was sent)
    if (response.status === 401 && !isRetry && token) {
      try {
        await this.tryRefresh();
        return this.request<T>(method, path, body, true);
      } catch {
        this.onAuthFailure?.();
        throw new ApiClientError(401, 'Session expired. Please log in again.');
      }
    }

    const data = (await parseJsonSafely(response)) as Record<string, unknown>;

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        (data.message as string) ?? 'Request failed',
        data.code as string | undefined,
      );
    }

    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * POST with an explicit bearer token, bypassing the stored session entirely.
   *
   * This exists for the pre-MFA token. That token is not an access token: it
   * has no refresh counterpart, so `request`'s 401 handling would try to
   * refresh, fail, and fire `onAuthFailure` - which logs out and redirects.
   * A mistyped authenticator code is a 401, so going through `request` would
   * turn every typo into a forced sign-out instead of "that code is wrong".
   *
   * It also deliberately does NOT read `getToken()`. During sign-in the store
   * is empty; after sign-in (turning MFA on from settings) the store holds a
   * real session, and sending that instead of the token the caller passed
   * would silently change which identity the call is made as.
   */
  async postWithToken<T>(path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const data = (await parseJsonSafely(response)) as Record<string, unknown>;
    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        (data.message as string) ?? 'Request failed',
        data.code as string | undefined,
      );
    }
    return data as T;
  }

  async postForm<T>(path: string, file: File): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = (await parseJsonSafely(response)) as Record<string, unknown>;
    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        (data.message as string) ?? 'Request failed',
        data.code as string | undefined,
      );
    }
    return data as T;
  }

  async getBlob(path: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const data = (await parseJsonSafely(response)) as Record<string, unknown>;
      throw new ApiClientError(
        response.status,
        (data.message as string) ?? 'Request failed',
        data.code as string | undefined,
      );
    }
    return response.blob();
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
