import type { Context } from 'hono';

export interface AuthSecrets {
  accessSecret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

const DEFAULT_ACCESS_EXPIRY = '15m';
const DEFAULT_REFRESH_EXPIRY = '7d';

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
