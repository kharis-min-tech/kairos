import type { Context } from 'hono';
import { readSetting, requireSecret } from './secret-env';

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

export function getAuthSecrets(c?: Context): AuthSecrets {
  // The two signing secrets have no usable default — see `secret-env.ts` for
  // why they fail closed rather than fail safe. The two expiries are ordinary
  // settings and keep their defaults.
  return {
    accessSecret: requireSecret(c, 'JWT_SECRET', 'dev-secret-change-me'),
    refreshSecret: requireSecret(c, 'JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessTokenExpiry: readSetting(c, 'JWT_ACCESS_EXPIRY', DEFAULT_ACCESS_EXPIRY),
    refreshTokenExpiry: readSetting(c, 'JWT_REFRESH_EXPIRY', DEFAULT_REFRESH_EXPIRY),
  };
}
