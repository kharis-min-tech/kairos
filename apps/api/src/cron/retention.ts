import { and, inArray, lt } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { auditLog } from '@kairos/database';
import { AuditAction } from '@kairos/types';

/**
 * Retention enforcement for the audit log.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The privacy notice tells members "Sign-in logs and error reports are kept
 * for up to 90 days, then automatically deleted". Until this file, nothing
 * deleted anything: `audit_log` was append-only, no code issued an UPDATE or
 * a DELETE against it, and no migration did either. The published sentence
 * was therefore false — a statement to data subjects that the controller was
 * not honouring, which is an Article 5(1)(a) transparency problem before it
 * is a retention one. `docs/security/data-retention.md` §"Audit log" records
 * the finding and the three ways out of it.
 *
 * ── Why it deletes so little ──────────────────────────────────────────────
 *
 * This implements option (c) from that document — the split — and NOT option
 * (b), the blanket 90-day purge, which would have been the obvious reading of
 * "build the purger" and would have been actively harmful.
 *
 * `audit_log` holds the only evidence from which a data-exfiltration incident
 * can be scoped. Four of its actions exist for precisely that reason and were
 * added in November 2026 by the same security review that found this gap:
 * `member_updated`, `member_exported`, `submissions_exported` and
 * `donor_register_exported`. Role grants, guardian links and the OAuth
 * authorization events are the same kind of evidence. Deleting those at 90
 * days would mean a breach discovered in month four has nothing to
 * investigate, which is the opposite of what the incident-response capability
 * needs — and it would have removed that capability silently, months after
 * anyone remembered this job was running.
 *
 * So the purge is scoped to `SIGNIN_ACTIONS` and nothing else. Those are the
 * high-volume rows, they are what the published sentence actually describes,
 * and they are the ones carrying `attempted_email`.
 *
 * ── The property this breaks, stated plainly ──────────────────────────────
 *
 * `audit_log` was append-only in practice, and `docs/security/incident-
 * response.md` §4 leans on that. This file is the first code that deletes
 * from it, so that claim is now narrower: the log is append-only EXCEPT for
 * sign-in rows past 90 days. That is a deliberate trade the controller made,
 * not an oversight, and the narrowness is the mitigation — one function, one
 * action filter, no UPDATE path at all.
 *
 * A 30-day scrub of `attempted_email` (which holds addresses typed by people
 * who have no account and no relationship with the church) was considered and
 * deliberately NOT bundled here. It would need an UPDATE rather than a
 * DELETE, which is a larger change to the table's character than this is, and
 * it deserves its own decision rather than riding along. The rows go at 90
 * days either way.
 */

/**
 * The only actions this job will ever delete. Deliberately a literal list
 * rather than a prefix match on `signin_`: a future action named
 * `signin_mfa_challenge` should have to be added here on purpose, by someone
 * who has thought about whether it is evidence.
 */
export const SIGNIN_ACTIONS: readonly string[] = [
  AuditAction.SigninSuccess,
  AuditAction.SigninFailure,
];

/** Matches the period published in the privacy notice. Changing one without the other reintroduces the defect this file closes. */
export const SIGNIN_RETENTION_DAYS = 90;

const DAY_MS = 86_400_000;

export interface RetentionSummary {
  signinRowsDeleted: number;
  /** ISO timestamp; rows older than this were removed. Logged so a reader of Workers Logs can see the window without recomputing it. */
  cutoff: string;
}

/**
 * Delete sign-in audit rows older than the published retention period.
 *
 * Throws on a database failure rather than swallowing it. The caller runs
 * this alongside the lifecycle cron and is responsible for isolating the
 * failure; a summary that reported zero deletions when the delete had in fact
 * failed would make a broken retention job indistinguishable from a quiet
 * one, and the whole point here is being able to show the promise is kept.
 */
export async function runRetentionCron(db: Database): Promise<RetentionSummary> {
  const cutoff = new Date(Date.now() - SIGNIN_RETENTION_DAYS * DAY_MS);

  const deleted = await db
    .delete(auditLog)
    .where(and(inArray(auditLog.action, [...SIGNIN_ACTIONS]), lt(auditLog.createdAt, cutoff)))
    .returning({ id: auditLog.id });

  return {
    signinRowsDeleted: deleted.length,
    cutoff: cutoff.toISOString(),
  };
}
