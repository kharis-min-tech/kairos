import type { Context } from 'hono';

export interface AuthSecrets {
  accessSecret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

const DEFAULT_ACCESS_EXPIRY = '15m';
// 1 year matches consumer-app norms (Google/Microsoft account persistence,
// WhatsApp, 1Password) for keychain-stored session tokens on mobile. Since
// the mobile app seals the refresh token behind the OS keychain's
// biometric requirement, an attacker still needs both the phone AND the
// enrolled biometric to redeem it — the extra window doesn't degrade the
// effective posture. Biometric-armed users can go a full year between
// password sign-ins.
//
// The proper long-term fix is a WebAuthn-style device keypair that
// decouples biometric arming from the session token entirely — filed as
// a backlog. Until then this bump is the pragmatic middle ground.
//
// Override with JWT_REFRESH_EXPIRY.
const DEFAULT_REFRESH_EXPIRY = '365d';

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
