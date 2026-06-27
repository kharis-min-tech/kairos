import { argon2id } from '@noble/hashes/argon2';

// Workers-friendly params: 19 MiB memory, 2 iterations. Stays well under the
// 128 MiB isolate ceiling and the 10ms CPU budget on Workers Free (~30-50ms
// observed). Still meets OWASP 2025 minimum recommendation for argon2id
// (m≥19MiB, t≥2, p≥1). Verify-side reads params from the stored hash so
// older/stronger hashes still verify — old admins must be re-seeded if their
// hash params exceed what the runtime can afford.
const ARGON2_M = 19456;
const ARGON2_T = 2;
const ARGON2_P = 1;
const HASH_LEN = 32;
const SALT_LEN = 16;
const PHC_PREFIX = '$argon2id$v=19$';

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, '');
}

function fromB64(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len);
  crypto.getRandomValues(out);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}

/** Hash a plaintext password with argon2id, returning a PHC-formatted string. */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = argon2id(utf8(plaintext), salt, {
    t: ARGON2_T,
    m: ARGON2_M,
    p: ARGON2_P,
    dkLen: HASH_LEN,
  });
  return `${PHC_PREFIX}m=${ARGON2_M},t=${ARGON2_T},p=${ARGON2_P}$${toB64(salt)}$${toB64(hash)}`;
}

/** Verify a plaintext password against a stored PHC-formatted argon2id hash. */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (!stored.startsWith(PHC_PREFIX)) return false;
  const parts = stored.slice(PHC_PREFIX.length).split('$');
  if (parts.length !== 3) return false;
  const [paramsStr, saltB64, hashB64] = parts as [string, string, string];
  const params: Record<string, number> = {};
  for (const kv of paramsStr.split(',')) {
    const [k, v] = kv.split('=');
    if (!k || !v) return false;
    const n = Number(v);
    if (!Number.isFinite(n)) return false;
    params[k] = n;
  }
  const m = params['m'];
  const t = params['t'];
  const p = params['p'];
  if (m === undefined || t === undefined || p === undefined) return false;
  const salt = fromB64(saltB64);
  const expected = fromB64(hashB64);
  const actual = argon2id(utf8(plaintext), salt, { t, m, p, dkLen: expected.length });
  return constantTimeEqual(actual, expected);
}

/** Generate a random token, returned as a lowercase hex string of length `2 * bytes`. */
export function randomTokenHex(bytes: number): string {
  const buf = randomBytes(bytes);
  let out = '';
  for (const b of buf) out += b.toString(16).padStart(2, '0');
  return out;
}
