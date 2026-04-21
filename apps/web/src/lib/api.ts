import { createApiClient } from '@kairos/api-client';
import { useAuthStore } from './auth-store';

// In Docker the web container proxies /api/* to the API container via next.config.ts rewrites.
// Use a relative base so the browser always calls the same origin — no CORS, no hardcoded ports.
const API_BASE_URL =
  typeof window !== 'undefined'
    ? '' // browser: relative URL, proxied by Next.js
    : (process.env.INTERNAL_API_URL ?? 'http://localhost:3001'); // SSR: call API directly

export const api = createApiClient(API_BASE_URL, () => {
  return useAuthStore.getState().accessToken;
}, {
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokenRefreshed: (accessToken, refreshToken) => {
    useAuthStore.getState().setTokens({ accessToken, refreshToken });
  },
  onAuthFailure: () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  },
});
