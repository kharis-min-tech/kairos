/**
 * Small crypto helpers for the OAuth authorization server. Web Crypto only, so
 * it behaves identically on Workers, Node and vitest.
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** `bytes` bytes of CSPRNG output, base64url — the shape of every secret we mint. */
export function randomToken(bytes = 32): string {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return toBase64Url(out);
}

/**
 * SHA-256 hex digest. Right for high-entropy secrets (client secrets, codes,
 * refresh tokens); never use it for passwords.
 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison, so a secret check does not leak by timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}

/** RFC 7636 S256: `base64url(sha256(verifier)) === challenge`. */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return timingSafeEqual(toBase64Url(new Uint8Array(digest)), challenge);
}
