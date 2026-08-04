import { createApiClient } from '@kairos/api-client';
import { apiBaseUrl } from './config';

let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * Session hooks the auth store calls into. Keeps the api-client singleton's
 * auth state in sync without threading tokens through every call site.
 * Wired up in Phase 4 (auth flow); safe to import elsewhere before then.
 */
export function setSessionTokens(next: { accessToken: string; refreshToken: string } | null) {
  accessToken = next?.accessToken ?? null;
  refreshToken = next?.refreshToken ?? null;
}

export const api = createApiClient(
  apiBaseUrl,
  () => accessToken,
  {
    getRefreshToken: () => refreshToken,
  },
);
