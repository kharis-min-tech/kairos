import { SignJWT, importPKCS8 } from 'jose';
import type { OAuthEnv } from './env';

/**
 * Apple's OAuth "client secret" is not a static string — it's a fresh JWT
 * signed with ES256 using your .p8 private key. Apple accepts JWTs valid up
 * to ~6 months, but we sign short-ish (still 180d) and cache the result in
 * memory so we're not doing an ECDSA sign on every callback.
 *
 * Cache key is `${teamId}:${clientId}:${keyId}` — rotate any of those and we
 * automatically regenerate. Cache eviction is triggered 5min before the JWT's
 * own `exp` so we never hand out a stale-by-a-second token.
 */
interface CachedSecret {
  jwt: string;
  expiresAtMs: number;
}

const cache = new Map<string, CachedSecret>();

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const JWT_LIFETIME_SECONDS = 15552000; // 180 days
const CACHE_EARLY_EVICT_MS = 5 * 60 * 1000; // refresh 5min before expiry

function assertEnv(env: OAuthEnv): asserts env is OAuthEnv & Required<Pick<OAuthEnv, 'APPLE_CLIENT_ID' | 'APPLE_TEAM_ID' | 'APPLE_KEY_ID' | 'APPLE_PRIVATE_KEY'>> {
  const missing: string[] = [];
  if (!env.APPLE_CLIENT_ID) missing.push('APPLE_CLIENT_ID');
  if (!env.APPLE_TEAM_ID) missing.push('APPLE_TEAM_ID');
  if (!env.APPLE_KEY_ID) missing.push('APPLE_KEY_ID');
  if (!env.APPLE_PRIVATE_KEY) missing.push('APPLE_PRIVATE_KEY');
  if (missing.length > 0) {
    // Do NOT include the p8 payload in the error message — it's fine that
    // the missing field NAME shows up, but we never surface the key itself
    // and this branch guards the "one of these is missing" case only.
    throw new Error(`Apple OAuth is misconfigured — missing: ${missing.join(', ')}`);
  }
}

export async function buildAppleClientSecret(env: OAuthEnv): Promise<string> {
  assertEnv(env);

  const cacheKey = `${env.APPLE_TEAM_ID}:${env.APPLE_CLIENT_ID}:${env.APPLE_KEY_ID}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAtMs - CACHE_EARLY_EVICT_MS > now) {
    return cached.jwt;
  }

  const nowSeconds = Math.floor(now / 1000);
  const expSeconds = nowSeconds + JWT_LIFETIME_SECONDS;

  // importPKCS8 handles the -----BEGIN PRIVATE KEY-----/-----END/ boundaries
  // and internal newlines as-is. The p8 must be PKCS#8 (which Apple's downloads
  // always are).
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, 'ES256');

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID, typ: 'JWT' })
    .setIssuer(env.APPLE_TEAM_ID)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .setAudience(APPLE_AUDIENCE)
    .setSubject(env.APPLE_CLIENT_ID)
    .sign(privateKey);

  cache.set(cacheKey, { jwt, expiresAtMs: expSeconds * 1000 });
  return jwt;
}
