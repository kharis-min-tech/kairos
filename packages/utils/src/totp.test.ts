import { describe, it, expect } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  totpCodeAt,
  verifyTotp,
  TOTP_STEP_SECONDS,
  TOTP_DIGITS,
} from './totp';

// RFC 6238 Appendix B. The published vectors are 8-digit; the 6-digit value
// is the same truncation taken mod 10^6, which is what every authenticator
// app actually shows.
const RFC_SECRET_ASCII = '12345678901234567890';
const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

const RFC_VECTORS: Array<{ seconds: number; eight: string; six: string }> = [
  { seconds: 59, eight: '94287082', six: '287082' },
  { seconds: 1111111109, eight: '07081804', six: '081804' },
  { seconds: 1111111111, eight: '14050471', six: '050471' },
  { seconds: 1234567890, eight: '89005924', six: '005924' },
  { seconds: 2000000000, eight: '69279037', six: '279037' },
  { seconds: 20000000000, eight: '65353130', six: '353130' },
];

describe('base32', () => {
  it('round-trips the RFC secret', () => {
    const encoded = base32Encode(new TextEncoder().encode(RFC_SECRET_ASCII));
    expect(encoded).toBe(RFC_SECRET_BASE32);
    expect(new TextDecoder().decode(base32Decode(encoded))).toBe(RFC_SECRET_ASCII);
  });

  it('is case-insensitive and tolerates the spaces people retype', () => {
    const spaced = 'gezd gnbv gy3t qojq gezd gnbv gy3t qojq';
    expect(base32Decode(spaced)).toEqual(base32Decode(RFC_SECRET_BASE32));
  });

  it('tolerates padding, which some authenticators emit and some strip', () => {
    expect(base32Decode('MZXW6===')).toEqual(base32Decode('MZXW6'));
  });

  it('rejects characters outside the alphabet rather than silently skipping them', () => {
    // 0, 1 and 8 are excluded from RFC 4648 base32 precisely because they are
    // confusable. Silently dropping them would turn a mistyped secret into a
    // different valid one, and the donor would get a working-looking enrolment
    // that never verifies.
    expect(() => base32Decode('MZXW6!!!')).toThrow(/base32/i);
    expect(() => base32Decode('MZXW601')).toThrow(/base32/i);
  });
});

describe('totpCodeAt — RFC 6238 Appendix B', () => {
  for (const v of RFC_VECTORS) {
    it(`matches the published vector at T=${v.seconds}`, () => {
      expect(totpCodeAt(RFC_SECRET_BASE32, v.seconds * 1000)).toBe(v.six);
    });
  }

  it('produces exactly TOTP_DIGITS digits, including leading zeros', () => {
    // 1111111109 -> 081804. A naive Number().toString() drops that zero and
    // the comparison then fails for one code in ten.
    const code = totpCodeAt(RFC_SECRET_BASE32, 1111111109 * 1000);
    expect(code).toBe('081804');
    expect(code).toHaveLength(TOTP_DIGITS);
  });

  it('holds the same code for a whole step and changes at the boundary', () => {
    const base = 1700000000;
    const stepStart = Math.floor(base / TOTP_STEP_SECONDS) * TOTP_STEP_SECONDS;
    const first = totpCodeAt(RFC_SECRET_BASE32, stepStart * 1000);
    expect(totpCodeAt(RFC_SECRET_BASE32, (stepStart + TOTP_STEP_SECONDS - 1) * 1000)).toBe(first);
    expect(totpCodeAt(RFC_SECRET_BASE32, (stepStart + TOTP_STEP_SECONDS) * 1000)).not.toBe(first);
  });
});

describe('generateTotpSecret', () => {
  it('returns a 160-bit base32 secret, the RFC-recommended size for SHA-1', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret)).toHaveLength(20);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateTotpSecret()));
    expect(seen.size).toBe(50);
  });
});

describe('verifyTotp', () => {
  const at = 1700000000 * 1000;
  const currentStep = Math.floor(1700000000 / TOTP_STEP_SECONDS);

  it('accepts the current code and reports the step it matched', () => {
    const code = totpCodeAt(RFC_SECRET_BASE32, at);
    const result = verifyTotp(RFC_SECRET_BASE32, code, { at });
    expect(result.valid).toBe(true);
    expect(result.step).toBe(currentStep);
  });

  it('accepts one step either side, for clock drift on cheap phones', () => {
    const past = totpCodeAt(RFC_SECRET_BASE32, at - TOTP_STEP_SECONDS * 1000);
    const future = totpCodeAt(RFC_SECRET_BASE32, at + TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET_BASE32, past, { at }).step).toBe(currentStep - 1);
    expect(verifyTotp(RFC_SECRET_BASE32, future, { at }).step).toBe(currentStep + 1);
  });

  it('rejects two steps away', () => {
    const tooOld = totpCodeAt(RFC_SECRET_BASE32, at - 2 * TOTP_STEP_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET_BASE32, tooOld, { at }).valid).toBe(false);
  });

  /**
   * Replay is the defect a TOTP implementation most often ships with. A code
   * is valid for 90 seconds across the drift window, so without this an
   * attacker who observes one — over a shoulder, in a screenshot, in a phished
   * form — can reuse it. The caller persists `step` and passes it back.
   */
  it('refuses a code at or before the last step already used', () => {
    const code = totpCodeAt(RFC_SECRET_BASE32, at);
    expect(verifyTotp(RFC_SECRET_BASE32, code, { at, lastUsedStep: currentStep }).valid).toBe(false);
    expect(
      verifyTotp(RFC_SECRET_BASE32, code, { at, lastUsedStep: currentStep + 1 }).valid,
    ).toBe(false);
    expect(
      verifyTotp(RFC_SECRET_BASE32, code, { at, lastUsedStep: currentStep - 1 }).valid,
    ).toBe(true);
  });

  it('tolerates the spaces authenticator apps display codes with', () => {
    const code = totpCodeAt(RFC_SECRET_BASE32, at);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET_BASE32, spaced, { at }).valid).toBe(true);
  });

  it('rejects malformed input without throwing', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 5', '０１２３４５']) {
      expect(verifyTotp(RFC_SECRET_BASE32, bad, { at }).valid).toBe(false);
    }
  });

  it('rejects rather than throws when the stored secret is unusable', () => {
    // A decryption that silently produced garbage must fail closed, not 500.
    expect(verifyTotp('not!valid!base32', '123456', { at }).valid).toBe(false);
  });
});
