import { describe, it, expect } from 'vitest';
import {
  generateBackupCodes,
  hashBackupCode,
  normaliseBackupCode,
  BACKUP_CODE_COUNT,
} from './backup-codes';

describe('generateBackupCodes', () => {
  it('returns ten formatted codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('excludes the characters people mistranscribe from a printed card', () => {
    const all = generateBackupCodes(200).join('');
    for (const confusable of ['I', 'O', '0', '1']) expect(all).not.toContain(confusable);
  });

  it('does not repeat', () => {
    const codes = generateBackupCodes(200);
    expect(new Set(codes).size).toBe(200);
  });
});

describe('hashBackupCode', () => {
  it('is stable and 64 hex characters', () => {
    const hash = hashBackupCode('ABCDE-FGHJK');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashBackupCode('ABCDE-FGHJK')).toBe(hash);
  });

  it('ignores the formatting people reintroduce', () => {
    // The code is DISPLAYED with a hyphen, so it comes back with one whether
    // or not the field asks. Phone keyboards also capitalise unpredictably.
    const canonical = hashBackupCode('ABCDE-FGHJK');
    for (const variant of ['ABCDEFGHJK', 'abcde-fghjk', ' ABCDE FGHJK ', 'AbCdE-FgHjK']) {
      expect(hashBackupCode(variant)).toBe(canonical);
    }
  });

  it('separates codes that differ by one character', () => {
    expect(hashBackupCode('ABCDE-FGHJK')).not.toBe(hashBackupCode('ABCDE-FGHJL'));
  });
});

describe('normaliseBackupCode', () => {
  it('strips separators and upper-cases', () => {
    expect(normaliseBackupCode(' abcde-fghjk ')).toBe('ABCDEFGHJK');
  });
});
