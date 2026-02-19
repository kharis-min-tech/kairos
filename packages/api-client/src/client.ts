// Base fetch wrapper with automatic Bearer token injection and error handling

import { ApiError } from './errors';
import type { ApiErrorBody } from './errors';

export type GetTokenFn = () => Promise<string | null>;

export interface ClientConfig {
  baseUrl: string;
  getToken: GetTokenFn;
}

let _config: ClientConfig | null = null;

/** Initialize the API client. Call once at app startup. */
export function configureClient(config: ClientConfig): void {
  _config = config;
}

function getConfig(): ClientConfig {
  if (!_config) {
    throw new Error(
      '@kairos/api-client: client not configured. Call configureClient() before making requests.'
    );
  }
  return _config;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const { baseUrl } = getConfig();
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; params?: QueryParams }
): Promise<T> {
  const { getToken } = getConfig();
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(path, options?.params);

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let errorBody: ApiErrorBody;
    try {
      const json = (await res.json()) as { error?: ApiErrorBody };
      errorBody = json.error ?? { code: 'UNKNOWN_ERROR', message: res.statusText };
    } catch {
      errorBody = { code: 'UNKNOWN_ERROR', message: res.statusText };
    }
    throw new ApiError(res.status, errorBody);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/** HTTP GET */
export function get<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>('GET', path, { params });
}

/** HTTP POST */
export function post<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
  return request<T>('POST', path, { body, params });
}

/** HTTP PUT */
export function put<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
  return request<T>('PUT', path, { body, params });
}

/** HTTP DELETE */
export function del<T = void>(path: string, params?: QueryParams): Promise<T> {
  return request<T>('DELETE', path, { params });
}
