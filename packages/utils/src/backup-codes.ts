import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Single-use backup codes, for the phone that is lost, wiped or replaced.
 *
 * Without these the recovery path for a locked-out leader is "ask an admin to
 * remove your second factor", which is a social-engineering target — and for
 * the one system admin it is not a path at all, so a lost phone would lock
 * the church out of its own system permanently.
 *
 * ── Why SHA-256 and not argon2id ──────────────────────────────────────────
 *
 * Deliberate, not an oversight. argon2id exists to make LOW-entropy secrets
 * expensive to guess; these codes are 50 bits of randomness, so there is no
 * dictionary for key stretching to defend against. Two practical reasons
 * follow from that: verification is a single indexed equality lookup rather
 * than an argon2id comparison against every unused row, and the Worker's CPU
 * budget is not spent on a check that gains nothing.
 */

/**
 * Crockford-style: no `I`, `O`, `0`, `1` — the four characters people
 * mistranscribe from a printed card, which is exactly how these get stored.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10; // 10 × 5 bits = 50 bits per code.
const CODE_COUNT = 10;

export const BACKUP_CODE_COUNT = CODE_COUNT;

/**
 * Strip the formatting people will reintroduce.
 *
 * Codes are displayed as `ABCDE-FGHJK`, so the hyphen comes back whether or
 * not the field asks for it, and phone keyboards capitalise unpredictably.
 */
export function normaliseBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** Hex SHA-256 of the normalised code. What is stored; the code itself never is. */
export function hashBackupCode(code: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(normaliseBackupCode(code))));
}

/**
 * A fresh set, shown to the member exactly once.
 *
 * Returned formatted for display. The caller stores `hashBackupCode(code)`
 * and must not store, log or email the plaintext.
 */
export function generateBackupCodes(count: number = CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);
    let code = '';
    for (const byte of bytes) {
      // Rejection-free because the alphabet is exactly 32 characters, so
      // `byte & 31` is uniform over it. With any other size this would need
      // rejection sampling, and a modulo would quietly bias the result.
      code += CODE_ALPHABET[byte & 31];
    }
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
}
