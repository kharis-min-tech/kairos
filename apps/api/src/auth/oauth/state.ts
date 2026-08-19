import { SignJWT, jwtVerify } from 'jose';
import type { ProviderId } from './providers';

/**
 * Short-lived signed cookie that holds the PKCE verifier + return-to hint
 * for one OAuth redirect. Cookie lifespan is 10min — long enough for a slow
 * provider consent flow, short enough that a stolen cookie is near-useless.
 *
 * SameSite=None; Secure is REQUIRED here: Apple's `response_mode=form_post`
 * has the IdP top-level POST back to our callback, and modern browsers drop
 * SameSite=Lax cookies on cross-site POST navigation (the "lax-allowing-unsafe"
 * grace period was removed in Chrome ~91 / Firefox ~103). Google + Microsoft
 * use 302 GET so they'd survive Lax, but None-Secure is safe for them too.
 * CSRF is already defended by the signed nonce inside the cookie payload +
 * `state` query parameter comparison, so the SameSite guarantee isn't
 * carrying any weight we can't do without. Path is scoped to /api/auth/oauth
 * so we don't leak it to unrelated endpoints.
 */
export const OAUTH_STATE_COOKIE_NAME = 'kairos.oauth_state';
const COOKIE_MAX_AGE_SECONDS = 600; // 10min

export interface StatePayload {
  provider: ProviderId;
  /** PKCE verifier — the value we hash to compute code_challenge. */
  verifier: string;
  /** Optional post-login destination the frontend passes into /start. */
  returnTo?: string;
  /** Random nonce echoed back as the `state` query param and matched at callback. */
  nonce: string;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len);
  crypto.getRandomValues(out);
  return out;
}

/**
 * Generate a PKCE verifier + challenge pair per RFC 7636. Verifier is 43-128
 * URL-safe characters; challenge is `base64url(sha256(verifier))`.
 */
export async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64urlEncode(randomBytes(48)); // 64 URL-safe chars
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64urlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

/** URL-safe nonce for the OAuth `state` parameter. */
export function generateStateNonce(): string {
  return base64urlEncode(randomBytes(24));
}

/**
 * Serialize + HS256-sign the state payload. Reuses the caller's existing
 * JWT_SECRET (via `getAuthSecrets(c).accessSecret`) so we don't introduce a
 * new secret surface.
 */
export async function generateStateCookie(payload: StatePayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SECONDS}s`)
    .sign(key);
}

/**
 * Verify + decode. Throws (via `jose`) if the signature, exp, or payload
 * shape is invalid.
 */
export async function parseStateCookie(cookie: string, secret: string): Promise<StatePayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(cookie, key);
  const provider = payload['provider'];
  const verifier = payload['verifier'];
  const nonce = payload['nonce'];
  if (
    (provider !== 'google' && provider !== 'microsoft' && provider !== 'apple') ||
    typeof verifier !== 'string' ||
    typeof nonce !== 'string'
  ) {
    throw new Error('Invalid OAuth state payload');
  }
  const returnTo = typeof payload['returnTo'] === 'string' ? (payload['returnTo'] as string) : undefined;
  return { provider, verifier, nonce, ...(returnTo ? { returnTo } : {}) };
}

/**
 * Build the Set-Cookie header value for the state cookie. Attributes are
 * fixed — SameSite=None is required for Apple's form_post cross-site POST
 * callback; Secure is required because SameSite=None is refused without it.
 */
export function stateCookieSetHeader(value: string): string {
  return [
    `${OAUTH_STATE_COOKIE_NAME}=${value}`,
    `Path=/api/auth/oauth`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
  ].join('; ');
}

/** Clear-cookie header — always emitted on both success and error callbacks. */
export function stateCookieClearHeader(): string {
  return [
    `${OAUTH_STATE_COOKIE_NAME}=`,
    `Path=/api/auth/oauth`,
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=None',
  ].join('; ');
}

/** Pull a single cookie value out of the `Cookie` header string. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    if (k === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}
