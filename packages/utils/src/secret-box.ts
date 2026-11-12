/**
 * AES-256-GCM over WebCrypto, for the handful of secrets this system has to
 * store **reversibly**.
 *
 * Almost nothing qualifies. Passwords are hashed with argon2id and never
 * recovered; email verification and reset tokens are hashed too. A TOTP
 * secret is the exception: verification needs the original bytes, so it
 * cannot be hashed, and the only remaining protection is that the key is
 * somewhere the database is not.
 *
 * GCM rather than CBC because it authenticates: a ciphertext altered in the
 * database fails to decrypt rather than decrypting to different bytes. The IV
 * is random per call and stored alongside; it is not secret, but it must
 * never repeat under one key, which is why it is generated here and never
 * supplied by a caller.
 *
 * WebCrypto is used directly because it is present on workerd and on Node 18
 * and later, so this needs no polyfill and no dependency.
 */

const IV_BYTES = 12; // The size GCM is specified for. Other lengths are legal and slower.
const KEY_BYTES = 32; // AES-256.

export interface SealedSecret {
  /** base64 */
  ciphertext: string;
  /** base64 */
  iv: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// `Uint8Array<ArrayBuffer>` rather than a bare `Uint8Array`: TypeScript 5.7
// made the backing-buffer type a parameter, and WebCrypto's `BufferSource`
// excludes `SharedArrayBuffer`. A bare annotation widens to `ArrayBufferLike`
// and will not pass.
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Turn the configured key material into a CryptoKey.
 *
 * Throws on anything that is not exactly 32 bytes of base64. A short key is
 * the failure worth being loud about: it is the one that still "works" in
 * testing and quietly halves the strength of every secret sealed with it.
 */
export async function importSecretBoxKey(keyBase64: string): Promise<CryptoKey> {
  let raw: Uint8Array<ArrayBuffer>;
  try {
    raw = fromBase64(keyBase64);
  } catch {
    throw new Error('secret-box: key is not valid base64');
  }
  if (raw.length !== KEY_BYTES) {
    throw new Error(`secret-box: key must be ${KEY_BYTES} bytes, got ${raw.length}`);
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Generate key material for MFA_ENCRYPTION_KEY. Not called at runtime; used to mint the secret. */
export function generateSecretBoxKey(): string {
  const raw = new Uint8Array(KEY_BYTES);
  crypto.getRandomValues(raw);
  return toBase64(raw);
}

export async function seal(key: CryptoKey, plaintext: string): Promise<SealedSecret> {
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}

/**
 * Open a sealed secret, or return null.
 *
 * Null rather than a throw, for every failure including a tampered
 * ciphertext and a wrong key. Callers are on the sign-in path, where the
 * useful behaviour is to treat an unreadable secret as a failed factor
 * rather than to return a 500 that tells an attacker which accounts have
 * something interesting stored.
 */
export async function open(key: CryptoKey, sealed: SealedSecret): Promise<string | null> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv) },
      key,
      fromBase64(sealed.ciphertext),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
