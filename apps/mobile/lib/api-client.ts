import type { AuthTokens } from '@kairos/types';
import { createApiClient } from '@kairos/api-client';
import { apiBaseUrl } from './config';

let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * Called by the auth store to keep the api-client's in-memory token cache
 * in sync with persisted state. Every login/refresh/logout flows through here.
 */
export function setSessionTokens(next: AuthTokens | null) {
  accessToken = next?.accessToken ?? null;
  refreshToken = next?.refreshToken ?? null;
}

interface AuthCallbacks {
  onRefreshed: (tokens: AuthTokens) => void;
  onFailure: () => void;
}

let callbacks: AuthCallbacks | null = null;

/**
 * Register callbacks so the api-client's transparent-refresh loop can push
 * new tokens back into the store, and terminal auth failures can trigger
 * a session clear + redirect to login. Called once during root layout mount.
 */
export function registerAuthCallbacks(next: AuthCallbacks) {
  callbacks = next;
}

export const api = createApiClient(
  apiBaseUrl,
  () => accessToken,
  {
    getRefreshToken: () => refreshToken,
    onTokenRefreshed: (a, r) => {
      callbacks?.onRefreshed({ accessToken: a, refreshToken: r });
    },
    onAuthFailure: () => {
      callbacks?.onFailure();
    },
  },
);
