import type { Context } from 'hono';
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  importJWK,
  type JWK,
  type KeyLike,
} from 'jose';
import { readEnv } from './config';

/**
 * ES256 signing key for ID and access tokens. Asymmetric on purpose: client
 * apps verify tokens against our public JWKS and never hold a shared secret.
 *
 * Production reads the private JWK from the `OAUTH_SIGNING_KEY` secret (a JSON
 * string; generate one with `npm run oauth:key --workspace=@kairos/api`).
 * Without it — local dev and tests — a throwaway key is generated per process,
 * so tokens signed in one run do not verify in the next. That is the safe
 * failure: nothing silently signs with a well-known key.
 */

export interface SigningKey {
  kid: string;
  privateKey: KeyLike | Uint8Array;
  publicJwk: JWK;
}

let cached: { source: string; key: Promise<SigningKey> } | null = null;

async function fromPrivateJwk(jwk: JWK): Promise<SigningKey> {
  const kid = jwk.kid ?? (await calculateJwkThumbprint(jwk));
  const privateKey = await importJWK({ ...jwk, kid }, 'ES256');
  // Strip the private scalar to get the publishable half.
  const { d: _d, ...pub } = jwk;
  void _d;
  return { kid, privateKey, publicJwk: { ...pub, kid, alg: 'ES256', use: 'sig' } };
}

async function ephemeral(): Promise<SigningKey> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const pub = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint(pub);
  return { kid, privateKey, publicJwk: { ...pub, kid, alg: 'ES256', use: 'sig' } };
}

export function getSigningKey(c?: Context): Promise<SigningKey> {
  const raw = readEnv(c, 'OAUTH_SIGNING_KEY') ?? '';
  if (cached && cached.source === raw) return cached.key;
  const key = raw ? fromPrivateJwk(JSON.parse(raw) as JWK) : ephemeral();
  cached = { source: raw, key };
  return key;
}

export async function getJwks(c?: Context): Promise<{ keys: JWK[] }> {
  return { keys: [(await getSigningKey(c)).publicJwk] };
}
