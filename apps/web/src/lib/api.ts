import { createApiClient } from '@kairos/api-client';
import { useAuthStore } from './auth-store';

// All API calls use a relative base URL (/api/...).
// In Docker, the catch-all route handler at src/app/api/[...path]/route.ts
// proxies these to INTERNAL_API_URL at request time (no build-time baking).
const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL ?? 'http://localhost:3001') // SSR / route handler itself
  : ''; // browser → relative → handled by the route handler

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
