import type { Context } from 'hono';

/**
 * OAuth environment surface. Every field is optional — an absent provider
 * secret just means that provider's `/start` endpoint returns 501 at runtime
 * (see `handler.ts`). Tests instantiate this with all fields undefined and
 * still boot the module cleanly.
 *
 * `readOAuthEnv(c)` mirrors the pattern in `lib/auth-secrets.ts`: check the
 * Workers `c.env` binding first, then fall through to `process.env` for the
 * Node dev server + vitest.
 */
export interface OAuthEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  DEFAULT_HOME_BRANCH_ID?: string;
  FRONTEND_URL?: string;
}

const KEYS: (keyof OAuthEnv)[] = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'APPLE_CLIENT_ID',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_PRIVATE_KEY',
  'DEFAULT_HOME_BRANCH_ID',
  'FRONTEND_URL',
];

function readOne(c: Context | undefined, key: string): string | undefined {
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

export function readOAuthEnv(c?: Context): OAuthEnv {
  const out: OAuthEnv = {};
  for (const k of KEYS) {
    const v = readOne(c, k);
    if (v !== undefined) out[k] = v;
  }
  return out;
}
