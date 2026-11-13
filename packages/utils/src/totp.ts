import { hmac } from '@noble/hashes/hmac';
import { sha1 } from '@noble/hashes/sha1';

/**
 * TOTP (RFC 6238) — the second factor for privileged Kairos accounts.
 *
 * ── Why hand-rolled rather than a library ─────────────────────────────────
 *
 * The whole algorithm is HMAC plus a truncation, and `@noble/hashes` is
 * already a production dependency: `password.ts` runs argon2id from it on
 * workerd today. So this adds **no new dependency** to a Worker that has to
 * stay small, and it reuses a crypto implementation already trusted with
 * password hashing. The alternatives (`otplib` needs a separate web-crypto
 * plugin and async-only calls on Workers; `@oslojs/otp` has not been touched
 * in two years) would each add a package to save about forty lines.
 *
 * The RFC's own Appendix B vectors are in the test file, which is the point:
 * a TOTP implementation is either bit-exact with every authenticator app or
 * it is useless, and the vectors are how you know which.
 *
 * ── SHA-1, deliberately ───────────────────────────────────────────────────
 *
 * RFC 6238 permits SHA-256 and SHA-512, and SHA-1 is broken for collision
 * resistance. It is used here anyway, because HMAC-SHA1 does not depend on
 * collision resistance and because it is the only variant Google
 * Authenticator, Microsoft Authenticator and Authy all reliably accept. A
 * SHA-256 secret that silently fails to verify in the app a volunteer
 * actually installed is a worse outcome than a theoretical weakness that no
 * attack reaches. This is the same choice every major provider makes.
 *
 * ── What this file does NOT do ────────────────────────────────────────────
 *
 * No storage, no encryption, no rate limiting, no enrolment state. It is a
 * pure function over a secret and a clock so it can be tested exhaustively.
 * The secret arrives already decrypted; encrypting it at rest is the caller's
 * job, and it is not optional — a TOTP secret is symmetric, so whoever reads
 * the row can mint valid codes forever. It cannot be one-way hashed the way a
 * password can.
 */

/** Seconds per code. 30 is the RFC default and what every authenticator assumes. */
export const TOTP_STEP_SECONDS = 30;

/** Digits shown to the user. 6 is the universal default. */
export const TOTP_DIGITS = 6;

/**
 * How many steps either side of now are accepted, for clock drift.
 *
 * 1 means a code is live for up to 90 seconds. That is the standard trade:
 * 0 rejects anyone whose cheap Android phone has drifted by a few seconds and
 * produces a support call with an opaque cause, while 2 or more widens the
 * replay window for no real gain. Replay inside the window is handled by
 * `lastUsedStep` rather than by narrowing this.
 */
export const TOTP_DRIFT_STEPS = 1;

/** 160 bits, the size RFC 4226 recommends for HMAC-SHA1. */
const SECRET_BYTES = 20;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32, no padding. The encoding every authenticator QR uses. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Longest input accepted. A 160-bit secret is 32 characters, so this is
 * generous; it exists so that nothing pasted into an enrolment field gets
 * walked character by character at length.
 */
const MAX_BASE32_INPUT = 1024;

/**
 * Decode RFC 4648 base32.
 *
 * Tolerant of the two things humans and apps actually do — lower case, and
 * the spaces secrets are displayed with — and strict about everything else.
 * Unknown characters THROW rather than being skipped: `0`, `1` and `8` are
 * absent from the alphabet precisely because they are confusable with `O`,
 * `I` and `B`, so silently dropping them would turn a mistyped secret into a
 * different valid one and hand someone an enrolment that never verifies.
 *
 * Separators are dropped and trailing padding trimmed by walking the string
 * once, rather than with `/=+$/` as this first did. That regex backtracks from
 * every start position across a long run of `=`, which is quadratic: harmless
 * for a 32-character secret, a cheap denial-of-service primitive once a
 * request body can reach it, which it will at enrolment confirm. CodeQL
 * flagged it on the pull request and was right to. The per-character `\s`
 * test below is a fixed-width match on one character, so it cannot backtrack.
 */
export function base32Decode(input: string): Uint8Array {
  if (input.length > MAX_BASE32_INPUT) throw new Error('base32: input too long');

  const chars: string[] = [];
  for (const char of input) {
    if (char === '-' || /\s/.test(char)) continue;
    chars.push(char);
  }
  // Padding is only meaningful at the end. A `=` anywhere else is an invalid
  // character and falls through to the throw below, which is the point.
  let end = chars.length;
  while (end > 0 && chars[end - 1] === '=') end--;
  if (end === 0) throw new Error('base32: empty input');

  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < end; i++) {
    const char = (chars[i] as string).toUpperCase();
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`base32: invalid character ${JSON.stringify(char)}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** A fresh 160-bit secret, base32-encoded for the enrolment QR. */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function counterBytes(step: number): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(step));
  return buf;
}

/** The step number containing `atMs`. Exposed because callers persist it for replay protection. */
export function totpStepAt(atMs: number): number {
  return Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
}

function codeForStep(secretBase32: string, step: number): string {
  const key = base32Decode(secretBase32);
  const mac = hmac(sha1, key, counterBytes(step));
  // RFC 4226 §5.3 dynamic truncation.
  const offset = (mac[mac.length - 1] as number) & 0x0f;
  const binary =
    (((mac[offset] as number) & 0x7f) << 24) |
    ((mac[offset + 1] as number) << 16) |
    ((mac[offset + 2] as number) << 8) |
    (mac[offset + 3] as number);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** The code a correctly-configured authenticator shows at `atMs`. */
export function totpCodeAt(secretBase32: string, atMs: number = Date.now()): string {
  return codeForStep(secretBase32, totpStepAt(atMs));
}

export interface VerifyTotpOptions {
  /** Defaults to now. Injectable so the tests are not time-dependent. */
  at?: number;
  /**
   * The highest step this secret has already authenticated with. A code at or
   * below it is refused. Without this, a code observed over a shoulder or in
   * a screenshot stays usable for the rest of its 90-second window.
   */
  lastUsedStep?: number | null;
}

export interface VerifyTotpResult {
  valid: boolean;
  /** The step that matched. Persist it as the new `lastUsedStep`. Null when invalid. */
  step: number | null;
}

/** Constant-time string compare, so a wrong code leaks nothing by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Check a submitted code.
 *
 * Returns rather than throws for every failure, including an unusable secret:
 * this sits on the sign-in path, and a decryption that quietly produced
 * garbage must fail closed as "wrong code" rather than as a 500 that tells an
 * attacker they found something interesting.
 */
export function verifyTotp(
  secretBase32: string,
  submitted: string,
  options: VerifyTotpOptions = {},
): VerifyTotpResult {
  const at = options.at ?? Date.now();
  const lastUsedStep = options.lastUsedStep ?? null;

  const candidate = submitted.replace(/[\s-]/g, '');
  // Explicitly ASCII digits: `\d` in a JS regex is ASCII-only, but being
  // literal here documents that full-width numerals from a mobile IME are
  // rejected rather than accidentally coerced.
  if (!new RegExp(`^[0-9]{${TOTP_DIGITS}}$`).test(candidate)) return { valid: false, step: null };

  const current = totpStepAt(at);
  for (let offset = -TOTP_DRIFT_STEPS; offset <= TOTP_DRIFT_STEPS; offset++) {
    const step = current + offset;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    let expected: string;
    try {
      expected = codeForStep(secretBase32, step);
    } catch {
      return { valid: false, step: null };
    }
    if (timingSafeEqual(expected, candidate)) return { valid: true, step };
  }
  return { valid: false, step: null };
}

/**
 * The `otpauth://` URI an authenticator QR encodes.
 *
 * `issuer` appears twice on purpose — as a path prefix and as a parameter.
 * The prefix is what older apps display; the parameter is what current ones
 * read. Apps that honour both show one entry, not two.
 */
export function totpEnrolmentUri(params: {
  secretBase32: string;
  accountName: string;
  issuer: string;
}): string {
  const label = `${params.issuer}:${params.accountName}`;
  const query = new URLSearchParams({
    secret: params.secretBase32,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}
