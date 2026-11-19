import { and, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  auditLog,
  emailChangeRequests,
  oauthAuthorizationCodes,
  souls,
} from '@kairos/database';
import { AuditAction } from '@kairos/types';
import { readRetentionPolicy, type RetentionPolicy } from './retention-policy';

/**
 * Retention enforcement.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The privacy notice tells members "Sign-in logs and error reports are kept
 * for up to 90 days, then automatically deleted". Until this file, nothing
 * deleted anything: `audit_log` was append-only, no code issued an UPDATE or
 * a DELETE against it, and no migration did either. The published sentence
 * was therefore false — a statement to data subjects that the controller was
 * not honouring, which is an Article 5(1)(a) transparency problem before it
 * is a retention one. `docs/security/data-retention.md` records the finding.
 *
 * ── Why the audit log still loses so little ───────────────────────────────
 *
 * This implements the split, and NOT a blanket 90-day purge, which would have
 * been the obvious reading of "build the purger" and would have been actively
 * harmful.
 *
 * `audit_log` holds the only evidence from which a data-exfiltration incident
 * can be scoped. `member_updated`, `member_exported`, `submissions_exported`
 * and `donor_register_exported` exist for precisely that reason. Role grants,
 * guardian links and the OAuth authorization events are the same kind of
 * evidence. Deleting those at 90 days would mean a breach discovered in month
 * four has nothing to investigate, and it would have removed that capability
 * silently, months after anyone remembered this job was running.
 *
 * So the audit purge is scoped to `SIGNIN_ACTIONS` and nothing else.
 *
 * ── The property this breaks, stated plainly ──────────────────────────────
 *
 * `audit_log` was append-only in practice, and `docs/security/incident-
 * response.md` §4 leans on that. This file is the first code that deletes
 * from it, so that claim is now narrower: the log is append-only EXCEPT for
 * sign-in rows past their period. That is a deliberate trade the controller
 * made, not an oversight, and the narrowness is the mitigation — one action
 * filter, no UPDATE path at all.
 *
 * ── Everything else is off until somebody chooses a number ────────────────
 *
 * The other categories here enforce periods read from the environment, and
 * every one of them defaults to "keep". See `retention-policy.ts` for why the
 * default is off rather than a middle value, and `docs/security/
 * data-retention.md` for the questions the church's adviser is being asked.
 *
 * A category with no configured period is reported in `unset` rather than as
 * a zero, because "nothing to delete" and "nobody has decided" look identical
 * in a log otherwise and mean entirely different things to an auditor.
 */

/**
 * The only audit actions this job will ever delete. Deliberately a literal
 * list rather than a prefix match on `signin_`: a future action named
 * `signin_mfa_challenge` should have to be added here on purpose, by someone
 * who has thought about whether it is evidence.
 */
export const SIGNIN_ACTIONS: readonly string[] = [
  AuditAction.SigninSuccess,
  AuditAction.SigninFailure,
];

const DAY_MS = 86_400_000;

export interface RetentionSummary {
  signinRowsDeleted: number;
  /** ISO timestamp; sign-in rows older than this were removed. */
  cutoff: string;
  /** Rows removed, per category the policy switched on. */
  purged: Record<string, number>;
  /** Categories with no configured period, named so the gap stays visible. */
  unset: string[];
}

function cutoffFor(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/**
 * Delete personal data past its retention period.
 *
 * Throws on a database failure rather than swallowing it. The caller runs
 * this alongside the lifecycle cron and is responsible for isolating the
 * failure; a summary that reported zero deletions when the delete had in fact
 * failed would make a broken retention job indistinguishable from a quiet
 * one, and the whole point here is being able to show the promise is kept.
 */
export async function runRetentionCron(
  db: Database,
  env?: Record<string, unknown>,
  policyOverride?: RetentionPolicy,
): Promise<RetentionSummary> {
  const policy = policyOverride ?? readRetentionPolicy(env);
  const cutoff = cutoffFor(policy.signinDays);
  const purged: Record<string, number> = {};
  const unset: string[] = [];

  const deleted = await db
    .delete(auditLog)
    .where(and(inArray(auditLog.action, [...SIGNIN_ACTIONS]), lt(auditLog.createdAt, cutoff)))
    .returning({ id: auditLog.id });

  // ── Outreach contacts ───────────────────────────────────────────────────
  //
  // People who gave their details at an outreach event, never became members,
  // and have had no activity since. They have no account and may not know a
  // record exists, which is why this is the category the adviser is asked
  // about first.
  //
  // Two exclusions, both load-bearing. A contact who converted is kept
  // whatever their age: deleting them would erase the conversion this
  // ministry exists to record, and they are a member now, so the member rules
  // govern them instead. And the clock runs on updatedAt, not createdAt, so
  // somebody contacted again last month is not deleted for having first been
  // met three years ago.
  //
  // follow_ups cascades, which is right: a follow-up note about a person
  // whose record has gone is a note about nobody.
  if (policy.outreachContactDays === null) {
    unset.push('outreachContacts');
  } else {
    const soulCutoff = cutoffFor(policy.outreachContactDays);
    const rows = await db
      .delete(souls)
      .where(and(isNull(souls.convertedToMemberId), lt(souls.updatedAt, soulCutoff)))
      .returning({ id: souls.id });
    purged['outreachContacts'] = rows.length;
  }

  // ── Email change requests ───────────────────────────────────────────────
  //
  // Each row holds BOTH the old and the new address, so a finished request is
  // a stored pair of personal identifiers kept for no remaining purpose. Only
  // finished ones go: a pending request inside its window is live state.
  if (policy.emailChangeRequestDays === null) {
    unset.push('emailChangeRequests');
  } else {
    const ecrCutoff = cutoffFor(policy.emailChangeRequestDays);
    const rows = await db
      .delete(emailChangeRequests)
      .where(
        and(
          lt(emailChangeRequests.createdAt, ecrCutoff),
          or(
            isNotNull(emailChangeRequests.confirmedAt),
            isNotNull(emailChangeRequests.revertedAt),
            lt(emailChangeRequests.expiresAt, new Date()),
          ),
        ),
      )
      .returning({ id: emailChangeRequests.id });
    purged['emailChangeRequests'] = rows.length;
  }

  // ── OAuth authorization codes ───────────────────────────────────────────
  //
  // Spent or expired codes, useless the moment either is true, and currently
  // accumulating forever. Operational residue rather than personal data,
  // included because an unbounded table is its own small liability.
  if (policy.oauthCodeDays === null) {
    unset.push('oauthCodes');
  } else {
    const codeCutoff = cutoffFor(policy.oauthCodeDays);
    const rows = await db
      .delete(oauthAuthorizationCodes)
      .where(
        and(
          lt(oauthAuthorizationCodes.createdAt, codeCutoff),
          or(
            isNotNull(oauthAuthorizationCodes.consumedAt),
            lt(oauthAuthorizationCodes.expiresAt, new Date()),
          ),
        ),
      )
      .returning({ id: oauthAuthorizationCodes.id });
    purged['oauthCodes'] = rows.length;
  }

  return {
    signinRowsDeleted: deleted.length,
    cutoff: cutoff.toISOString(),
    purged,
    unset,
  };
}
