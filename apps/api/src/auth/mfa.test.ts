/**
 * The MFA service against a REAL Postgres (PGlite, in-process) running the
 * REAL 0067 migration.
 *
 * A mocked Drizzle chain cannot prove the two things most worth proving here:
 * that a backup code is single-use, which lives in whether the UPDATE's own
 * WHERE excludes an already-used row, and that the unique index stops the
 * same code being issued twice. Both are SQL behaviour, not TypeScript.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { memberMfa, memberMfaBackupCodes } from '@kairos/database';
import type { Database } from '@kairos/database';
import type { Grant } from '@kairos/types';
import {
  generateSecretBoxKey,
  importSecretBoxKey,
  totpCodeAt,
  TOTP_STEP_SECONDS,
} from '@kairos/utils';
import {
  beginEnrolment,
  confirmEnrolment,
  disableMfa,
  getMfaState,
  mfaIsRequiredFor,
  regenerateBackupCodes,
  verifySecondFactor,
  MFA_LOCK_MINUTES,
  MFA_MAX_FAILED_ATTEMPTS,
} from './mfa';

const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_ID = '55555555-5555-5555-5555-555555555555';
const EMAIL = 'grace@kharis.org';
const NOW = 1_700_000_000_000;

let db: Database;
let key: CryptoKey;
let pg: PGlite;

const LEADER_GRANT: Grant = {
  role: 'FellowshipLeader',
  scope: { kind: 'fellowship', id: 'fel-1' },
  branchId: '33333333-3333-3333-3333-333333333333',
} as Grant;

function migration(file: string): string {
  return readFileSync(resolve(__dirname, '../../../../packages/database/drizzle', file), 'utf8');
}

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    CREATE TABLE members (
      id uuid PRIMARY KEY,
      email varchar(100) NOT NULL UNIQUE
    );
    INSERT INTO members (id, email) VALUES
      ('${MEMBER_ID}', '${EMAIL}'),
      ('${OTHER_ID}', 'other@kharis.org');
  `);
  await pg.exec(migration('0067_member_mfa.sql'));
  db = drizzle(pg) as unknown as Database;
  key = await importSecretBoxKey(generateSecretBoxKey());
});

beforeEach(async () => {
  // Only Date is faked. Faking timers wholesale stalls PGlite's own async work.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await pg.exec('DELETE FROM member_mfa_backup_codes; DELETE FROM member_mfa;');
});

/** Enrol fully and return the secret plus the step confirmation consumed. */
async function enrol(memberId = MEMBER_ID): Promise<{ secret: string; backupCodes: string[] }> {
  const { secretBase32 } = await beginEnrolment(db, key, {
    memberId,
    email: EMAIL,
    issuer: 'Kairos',
  });
  const { backupCodes } = await confirmEnrolment(
    db,
    key,
    memberId,
    totpCodeAt(secretBase32, Date.now()),
  );
  return { secret: secretBase32, backupCodes };
}

describe('mfaIsRequiredFor', () => {
  it('requires a factor of system admins and of anyone holding a grant', () => {
    expect(mfaIsRequiredFor('admin', [])).toBe(true);
    expect(mfaIsRequiredFor('member', [LEADER_GRANT])).toBe(true);
  });

  it('does not require one of an ordinary member', () => {
    expect(mfaIsRequiredFor('member', [])).toBe(false);
  });
});

describe('beginEnrolment', () => {
  it('stores the secret encrypted, never in plaintext', async () => {
    const { secretBase32 } = await beginEnrolment(db, key, {
      memberId: MEMBER_ID,
      email: EMAIL,
      issuer: 'Kairos',
    });
    const [row] = await db.select().from(memberMfa).where(eq(memberMfa.memberId, MEMBER_ID));
    expect(row?.secretCiphertext).not.toContain(secretBase32);
    expect(row?.secretIv).toBeTruthy();
  });

  it('produces an otpauth URI an authenticator can read', async () => {
    const { secretBase32, enrolmentUri } = await beginEnrolment(db, key, {
      memberId: MEMBER_ID,
      email: EMAIL,
      issuer: 'Kairos',
    });
    expect(enrolmentUri).toContain('otpauth://totp/');
    expect(enrolmentUri).toContain(`secret=${secretBase32}`);
    expect(enrolmentUri).toContain('issuer=Kairos');
  });

  it('leaves the enrolment unconfirmed, which is not a factor', async () => {
    await beginEnrolment(db, key, { memberId: MEMBER_ID, email: EMAIL, issuer: 'Kairos' });
    const state = await getMfaState(db, MEMBER_ID, 'member', [LEADER_GRANT]);
    expect(state).toMatchObject({ enrolled: false, pendingEnrolment: true, required: true });
  });

  it('restarts cleanly when someone closed the page halfway', async () => {
    const first = await beginEnrolment(db, key, {
      memberId: MEMBER_ID,
      email: EMAIL,
      issuer: 'Kairos',
    });
    const second = await beginEnrolment(db, key, {
      memberId: MEMBER_ID,
      email: EMAIL,
      issuer: 'Kairos',
    });
    expect(second.secretBase32).not.toBe(first.secretBase32);
    // The abandoned secret must stop working, or a QR code photographed over
    // someone's shoulder during a failed attempt stays live.
    await expect(
      confirmEnrolment(db, key, MEMBER_ID, totpCodeAt(first.secretBase32, Date.now())),
    ).rejects.toThrow();
  });

  it('refuses to silently replace a CONFIRMED factor', async () => {
    // This is the account-takeover shape: someone holding a borrowed session
    // re-runs enrolment and walks away owning the second factor.
    await enrol();
    await expect(
      beginEnrolment(db, key, { memberId: MEMBER_ID, email: EMAIL, issuer: 'Kairos' }),
    ).rejects.toThrow(/already has an authenticator/i);
  });
});

describe('confirmEnrolment', () => {
  it('refuses a wrong code and leaves the factor inactive', async () => {
    await beginEnrolment(db, key, { memberId: MEMBER_ID, email: EMAIL, issuer: 'Kairos' });
    await expect(confirmEnrolment(db, key, MEMBER_ID, '000000')).rejects.toThrow(/not correct/i);
    const state = await getMfaState(db, MEMBER_ID, 'member', [LEADER_GRANT]);
    expect(state.enrolled).toBe(false);
  });

  it('refuses when enrolment was never started', async () => {
    await expect(confirmEnrolment(db, key, MEMBER_ID, '000000')).rejects.toThrow(/start setting/i);
  });

  it('activates the factor and issues ten backup codes', async () => {
    const { backupCodes } = await enrol();
    expect(backupCodes).toHaveLength(10);
    expect(new Set(backupCodes).size).toBe(10);
    const state = await getMfaState(db, MEMBER_ID, 'member', [LEADER_GRANT]);
    expect(state).toMatchObject({ enrolled: true, pendingEnrolment: false, backupCodesRemaining: 10 });
  });

  it('stores only hashes of the backup codes', async () => {
    const { backupCodes } = await enrol();
    const rows = await db
      .select()
      .from(memberMfaBackupCodes)
      .where(eq(memberMfaBackupCodes.memberId, MEMBER_ID));
    const hashes = rows.map((r) => r.codeHash);
    for (const code of backupCodes) expect(hashes).not.toContain(code);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a second confirmation', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    await expect(
      confirmEnrolment(db, key, MEMBER_ID, totpCodeAt(secret, Date.now())),
    ).rejects.toThrow(/already set up/i);
  });
});

describe('verifySecondFactor — TOTP', () => {
  it('accepts a current code', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    const result = await verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secret, Date.now()));
    expect(result.method).toBe('totp');
  });

  it('refuses to reuse the code that completed enrolment', async () => {
    // Replay across the 90-second window is the defect TOTP most often ships
    // with. Enrolment consumes a step, so that step must already be spent.
    const { secret } = await enrol();
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secret, Date.now())),
    ).rejects.toThrow(/not correct/i);
  });

  it('refuses to reuse a code it just accepted', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    const code = totpCodeAt(secret, Date.now());
    await verifySecondFactor(db, key, MEMBER_ID, code);
    await expect(verifySecondFactor(db, key, MEMBER_ID, code)).rejects.toThrow(/not correct/i);
  });

  it('treats an unconfirmed enrolment as a failed challenge, not a pass', async () => {
    // The caller only reaches here because the sign-in path decided a factor
    // was required. Answering "there is none, come in" would make the
    // requirement cosmetic.
    const { secretBase32 } = await beginEnrolment(db, key, {
      memberId: MEMBER_ID,
      email: EMAIL,
      issuer: 'Kairos',
    });
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secretBase32, Date.now())),
    ).rejects.toThrow(/not correct/i);
  });

  it('treats a member with no enrolment at all as a failed challenge', async () => {
    await expect(verifySecondFactor(db, key, MEMBER_ID, '123456')).rejects.toThrow(/not correct/i);
  });

  it('does not accept another member\'s code', async () => {
    const { secret } = await enrol(MEMBER_ID);
    await enrol(OTHER_ID);
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    await expect(
      verifySecondFactor(db, key, OTHER_ID, totpCodeAt(secret, Date.now())),
    ).rejects.toThrow(/not correct/i);
  });
});

describe('verifySecondFactor — backup codes', () => {
  it('accepts one and consumes it', async () => {
    const { backupCodes } = await enrol();
    const code = backupCodes[0] as string;
    const result = await verifySecondFactor(db, key, MEMBER_ID, code);
    expect(result).toEqual({ method: 'backup-code', backupCodesRemaining: 9 });
    await expect(verifySecondFactor(db, key, MEMBER_ID, code)).rejects.toThrow(/not correct/i);
  });

  it('accepts it however the member retypes it', async () => {
    const { backupCodes } = await enrol();
    const code = (backupCodes[0] as string).toLowerCase().replace('-', ' ');
    await expect(verifySecondFactor(db, key, MEMBER_ID, code)).resolves.toMatchObject({
      method: 'backup-code',
    });
  });

  it('is single-use even when two sign-ins race for it', async () => {
    // Enforced by the UPDATE's own WHERE rather than a read-then-write, so
    // exactly one of two concurrent redemptions wins.
    const { backupCodes } = await enrol();
    const code = backupCodes[0] as string;
    const outcomes = await Promise.allSettled([
      verifySecondFactor(db, key, MEMBER_ID, code),
      verifySecondFactor(db, key, MEMBER_ID, code),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
  });

  it('does not accept another member\'s backup code', async () => {
    const { backupCodes } = await enrol(MEMBER_ID);
    await enrol(OTHER_ID);
    await expect(
      verifySecondFactor(db, key, OTHER_ID, backupCodes[0] as string),
    ).rejects.toThrow(/not correct/i);
  });
});

describe('throttling', () => {
  it('locks the account after repeated wrong codes', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    for (let i = 0; i < MFA_MAX_FAILED_ATTEMPTS; i++) {
      await expect(verifySecondFactor(db, key, MEMBER_ID, '000000')).rejects.toThrow();
    }
    // A CORRECT code is now refused too. That is the point of a lock: six
    // digits is a one-in-a-million guess, so an unthrottled endpoint is
    // brute-forceable with a few hundred thousand requests.
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secret, Date.now())),
    ).rejects.toThrow(/too many incorrect codes/i);
  });

  it('lets the member back in once the lock expires', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    for (let i = 0; i < MFA_MAX_FAILED_ATTEMPTS; i++) {
      await expect(verifySecondFactor(db, key, MEMBER_ID, '000000')).rejects.toThrow();
    }
    vi.setSystemTime(NOW + (MFA_LOCK_MINUTES + 1) * 60_000);
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secret, Date.now())),
    ).resolves.toMatchObject({ method: 'totp' });
  });

  it('clears the failure count after a success', async () => {
    const { secret } = await enrol();
    vi.setSystemTime(NOW + TOTP_STEP_SECONDS * 1000);
    await expect(verifySecondFactor(db, key, MEMBER_ID, '000000')).rejects.toThrow();
    await verifySecondFactor(db, key, MEMBER_ID, totpCodeAt(secret, Date.now()));
    const [row] = await db.select().from(memberMfa).where(eq(memberMfa.memberId, MEMBER_ID));
    expect(row?.failedAttempts).toBe(0);
    expect(row?.lockedUntil).toBeNull();
  });
});

describe('disableMfa', () => {
  it('removes the factor and the backup codes together', async () => {
    const { backupCodes } = await enrol();
    await disableMfa(db, MEMBER_ID);
    const state = await getMfaState(db, MEMBER_ID, 'member', [LEADER_GRANT]);
    expect(state).toMatchObject({ enrolled: false, pendingEnrolment: false, backupCodesRemaining: 0 });
    // Codes belong to the secret that was destroyed.
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, backupCodes[0] as string),
    ).rejects.toThrow(/not correct/i);
  });

  it('leaves another member untouched', async () => {
    await enrol(MEMBER_ID);
    await enrol(OTHER_ID);
    await disableMfa(db, MEMBER_ID);
    expect((await getMfaState(db, OTHER_ID, 'member', [LEADER_GRANT])).enrolled).toBe(true);
  });
});

describe('regenerateBackupCodes', () => {
  it('voids the old set', async () => {
    const { backupCodes: old } = await enrol();
    const { backupCodes: fresh } = await regenerateBackupCodes(db, MEMBER_ID);
    expect(fresh).toHaveLength(10);
    expect(fresh).not.toEqual(expect.arrayContaining(old));
    await expect(verifySecondFactor(db, key, MEMBER_ID, old[0] as string)).rejects.toThrow();
    await expect(
      verifySecondFactor(db, key, MEMBER_ID, fresh[0] as string),
    ).resolves.toMatchObject({ method: 'backup-code' });
  });

  it('refuses when no factor is set up', async () => {
    await expect(regenerateBackupCodes(db, MEMBER_ID)).rejects.toThrow(/no authenticator/i);
  });
});
