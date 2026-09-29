import type { Context } from 'hono';

export interface AuthSecrets {
  accessSecret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

const DEFAULT_ACCESS_EXPIRY = '15m';
// 90 days matches banking-app norms for keychain-stored session tokens
// (Monzo, Revolut, Chase all sit in this range) and dovetails with biometric
// sign-in: the sealed refresh token stays valid across this window, so a
// biometric-only user password-signs-in about once a quarter. Any password
// sign-in inside the window rearms via handlePostLogin, so periodic users
// effectively never see the password screen. Override with JWT_REFRESH_EXPIRY.
const DEFAULT_REFRESH_EXPIRY = '90d';

function readEnv(c: Context | undefined, key: string): string | undefined {
  if (c) {
    const env = (c as { env?: unknown }).env;
    if (env && typeof env === 'object') {
      const v = (env as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

export function getAuthSecrets(c?: Context): AuthSecrets {
  return {
    accessSecret: readEnv(c, 'JWT_SECRET') ?? 'dev-secret-change-me',
    refreshSecret: readEnv(c, 'JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me',
    accessTokenExpiry: readEnv(c, 'JWT_ACCESS_EXPIRY') ?? DEFAULT_ACCESS_EXPIRY,
    refreshTokenExpiry: readEnv(c, 'JWT_REFRESH_EXPIRY') ?? DEFAULT_REFRESH_EXPIRY,
  };
}
