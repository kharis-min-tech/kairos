import { describe, it, expect } from 'vitest';
import {
  importSecretBoxKey,
  generateSecretBoxKey,
  seal,
  open,
  type SealedSecret,
} from './secret-box';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('secret-box', () => {
  it('round-trips a TOTP secret', async () => {
    const key = await importSecretBoxKey(generateSecretBoxKey());
    const sealed = await seal(key, SECRET);
    expect(await open(key, sealed)).toBe(SECRET);
  });

  it('never produces the same ciphertext twice for the same plaintext', async () => {
    // The IV is random per call. If it were fixed, identical secrets would
    // produce identical ciphertext and the table would leak which members
    // share one — and under GCM, IV reuse is catastrophic rather than untidy.
    const key = await importSecretBoxKey(generateSecretBoxKey());
    const a = await seal(key, SECRET);
    const b = await seal(key, SECRET);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(await open(key, a)).toBe(await open(key, b));
  });

  it('returns null rather than throwing for a wrong key', async () => {
    const sealed = await seal(await importSecretBoxKey(generateSecretBoxKey()), SECRET);
    const other = await importSecretBoxKey(generateSecretBoxKey());
    expect(await open(other, sealed)).toBeNull();
  });

  it('returns null for a tampered ciphertext, which is the point of GCM', async () => {
    const key = await importSecretBoxKey(generateSecretBoxKey());
    const sealed = await seal(key, SECRET);
    const flipped: SealedSecret = {
      iv: sealed.iv,
      ciphertext: sealed.ciphertext.startsWith('A')
        ? `B${sealed.ciphertext.slice(1)}`
        : `A${sealed.ciphertext.slice(1)}`,
    };
    expect(await open(key, flipped)).toBeNull();
  });

  it('returns null for a tampered IV', async () => {
    const key = await importSecretBoxKey(generateSecretBoxKey());
    const sealed = await seal(key, SECRET);
    const other = await seal(key, SECRET);
    expect(await open(key, { ciphertext: sealed.ciphertext, iv: other.iv })).toBeNull();
  });

  it('returns null for garbage rather than throwing', async () => {
    const key = await importSecretBoxKey(generateSecretBoxKey());
    expect(await open(key, { ciphertext: 'not base64!!', iv: 'nope' })).toBeNull();
  });

  it('refuses a key that is the wrong length', async () => {
    // The failure worth being loud about: a short key still "works" in
    // testing and quietly weakens every secret sealed with it.
    await expect(importSecretBoxKey(btoa('too short'))).rejects.toThrow(/32 bytes/);
  });

  it('refuses a key that is not base64', async () => {
    await expect(importSecretBoxKey('!!!!')).rejects.toThrow(/secret-box/);
  });

  it('generates 32 bytes of key material', () => {
    const key = generateSecretBoxKey();
    expect(atob(key)).toHaveLength(32);
    expect(generateSecretBoxKey()).not.toBe(key);
  });
});
