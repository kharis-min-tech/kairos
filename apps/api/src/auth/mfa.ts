import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberMfa, memberMfaBackupCodes } from '@kairos/database';
import type { Grant, SystemRole } from '@kairos/types';
import { isPrivileged } from '@kairos/types';
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  normaliseBackupCode,
  open,
  seal,
  totpEnrolmentUri,
  verifyTotp,
  BACKUP_CODE_COUNT,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '@kairos/utils';

/**
 * The TOTP second factor, server side.
 *
 * `packages/utils/src/totp.ts` holds the algorithm. This holds the policy:
 * who needs a factor, what an unconfirmed enrolment means, how a wrong code
 * is throttled, and how a lost phone is recovered from.
 */

/**
 * Six digits is a one-in-a-million guess, and a few hundred thousand requests
 * is not a large number. The edge rate-limit rule is the first line and this
 * is the second. It is per-account rather than per-IP, so a distributed
 * attempt against one leader's account is still throttled even though no
 * single address trips the edge rule.
 */
export const MFA_MAX_FAILED_ATTEMPTS = 5;
export const MFA_LOCK_MINUTES = 15;

export interface MfaState {
  /** A confirmed factor exists. Only this counts as having MFA. */
  enrolled: boolean;
  /** A QR code was generated and never proved. Not a factor. */
  pendingEnrolment: boolean;
  /** This member is privileged, so a factor is expected of them. */
  required: boolean;
  backupCodesRemaining: number;
}

export function mfaIsRequiredFor(systemRole: SystemRole, grants: readonly Grant[]): boolean {
  return isPrivileged(systemRole, grants);
}

async function countBackupCodes(db: Database, memberId: string): Promise<number> {
  const [codes] = await db
    .select({ remaining: sql<number>`count(*)::int` })
    .from(memberMfaBackupCodes)
    .where(and(eq(memberMfaBackupCodes.memberId, memberId), isNull(memberMfaBackupCodes.usedAt)));
  return codes?.remaining ?? 0;
}

export async function getMfaState(
  db: Database,
  memberId: string,
  systemRole: SystemRole,
  grants: readonly Grant[],
): Promise<MfaState> {
  const [row] = await db
    .select({ confirmedAt: memberMfa.confirmedAt })
    .from(memberMfa)
    .where(eq(memberMfa.memberId, memberId))
    .limit(1);

  return {
    enrolled: Boolean(row?.confirmedAt),
    pendingEnrolment: Boolean(row) && !row?.confirmedAt,
    required: mfaIsRequiredFor(systemRole, grants),
    backupCodesRemaining: await countBackupCodes(db, memberId),
  };
}

/**
 * Start, or restart, enrolment.
 *
 * Restarting overwrites an unconfirmed secret, which is what someone who
 * closed the page halfway needs. It refuses to overwrite a CONFIRMED one.
 * Silently replacing a working factor with a fresh QR code is how an attacker
 * holding a borrowed session takes an account over, and it is also how an
 * honest user locks themselves out by reloading a page. Replacing a confirmed
 * factor goes through `disableMfa`, which re-asks for the password.
 */
export async function beginEnrolment(
  db: Database,
  key: CryptoKey,
  params: { memberId: string; email: string; issuer: string },
): Promise<{ secretBase32: string; enrolmentUri: string }> {
  const [existing] = await db
    .select({ confirmedAt: memberMfa.confirmedAt })
    .from(memberMfa)
    .where(eq(memberMfa.memberId, params.memberId))
    .limit(1);

  if (existing?.confirmedAt) {
    throw new ConflictError(
      'This account already has an authenticator set up. Remove it before setting up a new one.',
    );
  }

  const secretBase32 = generateTotpSecret();
  const sealed = await seal(key, secretBase32);

  await db
    .insert(memberMfa)
    .values({
      memberId: params.memberId,
      secretCiphertext: sealed.ciphertext,
      secretIv: sealed.iv,
      confirmedAt: null,
      lastUsedStep: null,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .onConflictDoUpdate({
      target: memberMfa.memberId,
      set: {
        secretCiphertext: sealed.ciphertext,
        secretIv: sealed.iv,
        confirmedAt: null,
        lastUsedStep: null,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });

  return {
    secretBase32,
    enrolmentUri: totpEnrolmentUri({
      secretBase32,
      accountName: params.email,
      issuer: params.issuer,
    }),
  };
}

/**
 * Finish enrolment by proving the authenticator works, and hand back backup
 * codes.
 *
 * The proof is the whole point of a two-step enrolment. Marking a factor
 * active because a QR code was *displayed* locks out everyone whose phone
 * clock is wrong, whose camera misread the code, or who scanned it into an
 * app they then deleted. They would find out at their next sign-in, by which
 * point they can no longer reach the page that would fix it.
 */
export async function confirmEnrolment(
  db: Database,
  key: CryptoKey,
  memberId: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const [row] = await db.select().from(memberMfa).where(eq(memberMfa.memberId, memberId)).limit(1);

  if (!row) throw new NotFoundError('Start setting up your authenticator first.');
  if (row.confirmedAt) throw new ConflictError('This authenticator is already set up.');

  const secret = await open(key, { ciphertext: row.secretCiphertext, iv: row.secretIv });
  if (!secret) throw new UnauthorizedError('That code was not correct. Try the next one.');

  const result = verifyTotp(secret, code, { lastUsedStep: row.lastUsedStep });
  if (!result.valid) throw new UnauthorizedError('That code was not correct. Try the next one.');

  const backupCodes = generateBackupCodes();

  await db
    .update(memberMfa)
    .set({
      confirmedAt: new Date(),
      lastUsedStep: result.step,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(memberMfa.memberId, memberId));

  // Codes from a previous enrolment are void: they belong to a secret that no
  // longer exists.
  await db.delete(memberMfaBackupCodes).where(eq(memberMfaBackupCodes.memberId, memberId));
  await db
    .insert(memberMfaBackupCodes)
    .values(backupCodes.map((plain) => ({ memberId, codeHash: hashBackupCode(plain) })));

  return { backupCodes };
}

/** A six-digit string is a TOTP code. Anything else is treated as a backup code. */
function looksLikeTotpCode(submitted: string): boolean {
  return /^[0-9]{6}$/.test(submitted.replace(/[\s-]/g, ''));
}

async function recordFailure(db: Database, memberId: string, failedAttempts: number): Promise<void> {
  const next = failedAttempts + 1;
  await db
    .update(memberMfa)
    .set({
      failedAttempts: next,
      lockedUntil:
        next >= MFA_MAX_FAILED_ATTEMPTS ? new Date(Date.now() + MFA_LOCK_MINUTES * 60_000) : null,
      updatedAt: new Date(),
    })
    .where(eq(memberMfa.memberId, memberId));
}

export interface SecondFactorResult {
  method: 'totp' | 'backup-code';
  /** Unused codes left afterwards, so the UI can warn before the last one goes. */
  backupCodesRemaining: number;
}

/**
 * Check a second factor at sign-in. Throws on anything but success.
 *
 * Accepts a TOTP code or a backup code, because by the time someone needs a
 * backup code they have already lost the thing that produces the other kind.
 */
export async function verifySecondFactor(
  db: Database,
  key: CryptoKey,
  memberId: string,
  submitted: string,
): Promise<SecondFactorResult> {
  const [row] = await db.select().from(memberMfa).where(eq(memberMfa.memberId, memberId)).limit(1);

  // No row, or an unconfirmed one, is not a factor. That is treated as a
  // failed challenge rather than a pass: the caller only reaches here because
  // the sign-in path decided a factor was required, and answering "there is
  // none, come in" would make the requirement cosmetic.
  if (!row?.confirmedAt) {
    throw new UnauthorizedError('That code was not correct.');
  }

  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    throw new UnauthorizedError(
      `Too many incorrect codes. Try again in ${MFA_LOCK_MINUTES} minutes.`,
    );
  }

  if (looksLikeTotpCode(submitted)) {
    const secret = await open(key, { ciphertext: row.secretCiphertext, iv: row.secretIv });
    const result = secret
      ? verifyTotp(secret, submitted, { lastUsedStep: row.lastUsedStep })
      : { valid: false as const, step: null };

    if (result.valid) {
      await db
        .update(memberMfa)
        .set({
          lastUsedStep: result.step,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(memberMfa.memberId, memberId));
      return { method: 'totp', backupCodesRemaining: await countBackupCodes(db, memberId) };
    }
  } else {
    // Single use, enforced by the UPDATE's own WHERE rather than by a read
    // followed by a write. Two sign-ins racing with the same code would both
    // see it unused, and only one should win.
    const updated = await db
      .update(memberMfaBackupCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(memberMfaBackupCodes.memberId, memberId),
          eq(memberMfaBackupCodes.codeHash, hashBackupCode(normaliseBackupCode(submitted))),
          isNull(memberMfaBackupCodes.usedAt),
        ),
      )
      .returning({ id: memberMfaBackupCodes.id });

    if (updated.length > 0) {
      await db
        .update(memberMfa)
        .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(memberMfa.memberId, memberId));
      return {
        method: 'backup-code',
        backupCodesRemaining: await countBackupCodes(db, memberId),
      };
    }
  }

  await recordFailure(db, memberId, row.failedAttempts);
  throw new UnauthorizedError('That code was not correct.');
}

/**
 * Remove the factor entirely, including the backup codes, which belong to the
 * secret being destroyed.
 *
 * The caller re-checks the password first. This function does not, because it
 * is also the admin reset path, where the admin's own password is what was
 * checked.
 */
export async function disableMfa(db: Database, memberId: string): Promise<void> {
  await db.delete(memberMfaBackupCodes).where(eq(memberMfaBackupCodes.memberId, memberId));
  await db.delete(memberMfa).where(eq(memberMfa.memberId, memberId));
}

/** Fresh backup codes, voiding the old set. For "I have used my last one". */
export async function regenerateBackupCodes(
  db: Database,
  memberId: string,
): Promise<{ backupCodes: string[] }> {
  const [row] = await db
    .select({ confirmedAt: memberMfa.confirmedAt })
    .from(memberMfa)
    .where(eq(memberMfa.memberId, memberId))
    .limit(1);
  if (!row?.confirmedAt) throw new NotFoundError('No authenticator is set up on this account.');

  const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT);
  await db.delete(memberMfaBackupCodes).where(eq(memberMfaBackupCodes.memberId, memberId));
  await db
    .insert(memberMfaBackupCodes)
    .values(backupCodes.map((plain) => ({ memberId, codeHash: hashBackupCode(plain) })));
  return { backupCodes };
}

/**
 * Does this member have a factor that actually works?
 *
 * A cheap, single-column check for the sign-in path, which runs this on every
 * login and must not drag the backup-code count along with it. Unconfirmed
 * rows are not factors and are excluded here, not by the caller.
 */
export async function hasConfirmedFactor(db: Database, memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ confirmedAt: memberMfa.confirmedAt })
    .from(memberMfa)
    .where(eq(memberMfa.memberId, memberId))
    .limit(1);
  return Boolean(row?.confirmedAt);
}
