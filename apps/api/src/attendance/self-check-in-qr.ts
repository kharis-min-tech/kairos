/**
 * Rotating QR tokens for member self-check-in.
 *
 * Design: stateless HMAC. We sign `{serviceId, timeBucket}` with HMAC-SHA256
 * using the SELF_CHECK_IN_QR_SECRET env var. Time bucket is
 * `floor(Date.now() / BUCKET_MS)` and the verifier accepts the current or
 * previous bucket so a scan at second 29 doesn't fail. No storage — the
 * token IS the HMAC, so it costs zero writes to rotate.
 *
 * Set the secret via:
 *   wrangler secret put SELF_CHECK_IN_QR_SECRET
 *   wrangler secret put --env staging SELF_CHECK_IN_QR_SECRET
 * See docs/self-check-in.md for the setup checklist.
 */

const BUCKET_MS = 30_000;
const encoder = new TextEncoder();

export interface SignedQrToken {
  token: string;
  bucket: number;
  /** ms epoch when this bucket's token expires (start of the *next* bucket). */
  expiresAt: number;
}

function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / BUCKET_MS);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = Array.from(new Uint8Array(bytes))
    .map((b) => String.fromCharCode(b))
    .join('');
  // btoa is available in Workers + Node 20+.
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signBucket(secret: string, serviceId: string, bucket: number): Promise<string> {
  const key = await importKey(secret);
  const payload = `${serviceId}.${bucket}`;
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${bucket}.${toBase64Url(sig)}`;
}

/**
 * Sign a token for the current time bucket. Returns the token, the bucket
 * number, and the epoch-ms when the next bucket starts (i.e. this token's
 * hard-expiry from the *server's* clock — the verifier still accepts one
 * previous bucket after that as a grace window).
 */
export async function signQrToken(
  secret: string,
  serviceId: string,
  now: number = Date.now(),
): Promise<SignedQrToken> {
  if (!secret) throw new Error('SELF_CHECK_IN_QR_SECRET is not configured');
  const bucket = currentBucket(now);
  const token = await signBucket(secret, serviceId, bucket);
  return { token, bucket, expiresAt: (bucket + 1) * BUCKET_MS };
}

/**
 * Verify a token belongs to `serviceId` and is inside the acceptable window
 * (current or previous bucket). Returns the bucket number on success; throws
 * an Error on any mismatch — callers should translate to whatever HTTP error
 * shape the module uses.
 */
export async function verifyQrToken(
  secret: string,
  serviceId: string,
  token: string,
  now: number = Date.now(),
): Promise<number> {
  if (!secret) throw new Error('SELF_CHECK_IN_QR_SECRET is not configured');
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('QR token is empty');
  }
  const dot = token.indexOf('.');
  if (dot <= 0) throw new Error('QR token is malformed');
  const bucketStr = token.slice(0, dot);
  const bucketNum = Number(bucketStr);
  if (!Number.isFinite(bucketNum) || !Number.isInteger(bucketNum) || bucketNum < 0) {
    throw new Error('QR token has an invalid bucket');
  }

  const now_ = currentBucket(now);
  if (bucketNum !== now_ && bucketNum !== now_ - 1) {
    throw new Error('QR token has expired');
  }

  const expected = await signBucket(secret, serviceId, bucketNum);
  // Constant-time-ish compare — token length is short + fixed so a linear
  // compare after the length check gives a negligible signal.
  if (expected.length !== token.length) {
    throw new Error('QR token does not match this service');
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  if (diff !== 0) {
    throw new Error('QR token does not match this service');
  }
  return bucketNum;
}

export const QR_BUCKET_MS = BUCKET_MS;
