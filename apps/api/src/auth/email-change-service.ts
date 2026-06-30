import { and, eq, gt } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  emailChangeRequests,
  type NewEmailChangeRequest,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { AuditAction, AuditOutcome } from '@kairos/types';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  hashPassword,
  randomTokenHex,
  verifyPassword,
  sendEmailChangeConfirmEmail,
  sendEmailChangedAlertEmail,
} from '@kairos/utils';
import { recordAuditEvent } from '../audit/service';

const EMAIL_CHANGE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function frontendUrl(): string {
  return process.env['FRONTEND_URL'] ?? 'http://localhost:3002';
}

/**
 * Step 1 — user submits new email + re-auth password from /profile/settings.
 * Hashes both tokens, stores them, sends confirm-new + alert-old emails.
 */
export async function requestEmailChange(
  db: Database,
  auth: AuthContext,
  currentPassword: string,
  newEmail: string,
): Promise<void> {
  const normalisedNew = newEmail.trim().toLowerCase();

  const [member] = await db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      passwordHash: members.passwordHash,
    })
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);
  if (!member) throw new NotFoundError('Member not found');

  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  if (normalisedNew === member.email.toLowerCase()) {
    throw new ValidationError('New email matches current email');
  }

  const [existingByEmail] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.email, normalisedNew), eq(members.isActive, true)))
    .limit(1);
  if (existingByEmail) {
    throw new ConflictError('Email already in use');
  }

  // Cancel any prior pending request for this member so the partial unique
  // index doesn't trip.
  await db
    .update(emailChangeRequests)
    .set({ status: 'expired', isActive: false })
    .where(
      and(
        eq(emailChangeRequests.memberId, auth.memberId),
        eq(emailChangeRequests.status, 'pending'),
        eq(emailChangeRequests.isActive, true),
      ),
    );

  const confirmToken = randomTokenHex(32);
  const undoToken = randomTokenHex(32);
  const confirmTokenHash = await hashPassword(confirmToken);
  const undoTokenHash = await hashPassword(undoToken);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MS);

  const row: NewEmailChangeRequest = {
    memberId: auth.memberId,
    oldEmail: member.email,
    newEmail: normalisedNew,
    confirmTokenHash,
    undoTokenHash,
    status: 'pending',
    expiresAt,
  };
  await db.insert(emailChangeRequests).values(row);

  const base = frontendUrl();
  const confirmLink = `${base}/confirm-email?token=${confirmToken}`;
  const undoLink = `${base}/revert-email?token=${undoToken}`;

  await sendEmailChangeConfirmEmail(normalisedNew, member.firstName, confirmLink);
  await sendEmailChangedAlertEmail(member.email, member.firstName, normalisedNew, undoLink);

  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.EmailChangeRequested,
    outcome: AuditOutcome.Success,
    metadata: { newEmail: normalisedNew, oldEmail: member.email },
  });
}

/**
 * Step 2 — user clicks the confirmation link sent to the NEW email. Bumps
 * members.email to the new address and marks the request confirmed.
 */
export async function confirmEmailChange(db: Database, token: string): Promise<void> {
  const candidates = await db
    .select()
    .from(emailChangeRequests)
    .where(
      and(
        eq(emailChangeRequests.status, 'pending'),
        eq(emailChangeRequests.isActive, true),
        gt(emailChangeRequests.expiresAt, new Date()),
      ),
    )
    .limit(50);

  let matched: typeof candidates[number] | undefined;
  for (const r of candidates) {
    if (await verifyPassword(token, r.confirmTokenHash)) {
      matched = r;
      break;
    }
  }
  if (!matched) throw new UnauthorizedError('Invalid or expired confirmation token');

  const [stillFree] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.email, matched.newEmail), eq(members.isActive, true)))
    .limit(1);
  if (stillFree) throw new ConflictError('Email already in use');

  await db
    .update(members)
    .set({ email: matched.newEmail })
    .where(eq(members.id, matched.memberId));

  await db
    .update(emailChangeRequests)
    .set({ status: 'confirmed', confirmedAt: new Date() })
    .where(eq(emailChangeRequests.id, matched.id));

  await recordAuditEvent(db, {
    actorMemberId: matched.memberId,
    action: AuditAction.EmailChangeConfirmed,
    outcome: AuditOutcome.Success,
    metadata: { newEmail: matched.newEmail, oldEmail: matched.oldEmail },
  });
}

/**
 * Step 3 — user clicks "this wasn't me" on the alert sent to the OLD email.
 * Reverts the email (if already swapped), forces a password reset by minting
 * a reset token, and records an audit event. Returns the reset token so the
 * /revert-email page can redirect straight to /reset-password.
 */
export async function undoEmailChange(
  db: Database,
  token: string,
): Promise<{ resetToken: string }> {
  const candidates = await db
    .select()
    .from(emailChangeRequests)
    .where(eq(emailChangeRequests.isActive, true))
    .limit(100);

  let matched: typeof candidates[number] | undefined;
  for (const r of candidates) {
    if (r.status === 'reverted' || r.status === 'expired') continue;
    if (await verifyPassword(token, r.undoTokenHash)) {
      matched = r;
      break;
    }
  }
  if (!matched) throw new UnauthorizedError('Invalid or expired undo token');

  const resetToken = randomTokenHex(32);
  const resetHash = await hashPassword(resetToken);
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(members)
    .set({
      email: matched.oldEmail,
      mustChangePassword: true,
      passwordResetToken: resetHash,
      passwordResetExpiry: resetExpiry,
    })
    .where(eq(members.id, matched.memberId));

  await db
    .update(emailChangeRequests)
    .set({ status: 'reverted', revertedAt: new Date() })
    .where(eq(emailChangeRequests.id, matched.id));

  await recordAuditEvent(db, {
    actorMemberId: matched.memberId,
    action: AuditAction.EmailChangeReverted,
    outcome: AuditOutcome.Success,
    metadata: { newEmail: matched.newEmail, revertedTo: matched.oldEmail },
  });

  return { resetToken };
}
