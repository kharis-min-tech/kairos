import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { branches, pilotInterest } from '@kairos/database';
import {
  PILOT_REQUIREMENTS_VERSION,
  PILOT_ROLE_LABEL,
  type PilotInterestStatus,
} from '@kairos/types';
import { logger, NotFoundError, sendNotificationEmail } from '@kairos/utils';
import { renderLayout } from '../notifications/templates/_layout';
import type { SubmitPilotInterestInput } from './schemas';

/** Corroborating detail about the submission, not about the branch. */
export interface SubmissionContext {
  sourceIp: string | null;
  userAgent: string | null;
}

const blankToNull = (v: string | undefined | null) => {
  const t = v?.trim();
  return t ? t : null;
};

/**
 * Record a branch's offer to go first.
 *
 * Deliberately NOT idempotent and deliberately not de-duplicated by email.
 * Two leaders from the same branch both writing in is a signal worth seeing,
 * and the same person submitting twice usually means they thought of
 * something after the first one. Collapsing either would hide it. The admin
 * queue groups by branch rather than the database refusing the row.
 *
 * The branch id is resolved rather than trusted: the form is public, so the
 * id arrives from a dropdown the caller could have edited. A name typed by
 * hand is always kept exactly as typed, since the branch may not be seeded
 * yet -- the plan seeds a branch only after it has been chosen.
 */
export async function submitPilotInterest(
  db: Database,
  input: SubmitPilotInterestInput,
  ctx: SubmissionContext,
) {
  let branchId: string | null = null;
  if (input.branchId) {
    const [hit] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, input.branchId), eq(branches.isActive, true)))
      .limit(1);
    branchId = hit?.id ?? null;
  }

  const [row] = await db
    .insert(pilotInterest)
    .values({
      fullName: input.fullName.trim(),
      roleAtBranch: input.roleAtBranch,
      roleOther: blankToNull(input.roleOther),
      email: input.email.trim().toLowerCase(),
      phone: blankToNull(input.phone),

      branchId,
      branchName: input.branchName.trim(),
      fellowshipCount: input.fellowshipCount,
      departmentCount: input.departmentCount,
      approxMembers: input.approxMembers ?? null,

      headOfAdminName: blankToNull(input.headOfAdminName),
      headOfAdminEmail: blankToNull(input.headOfAdminEmail)?.toLowerCase() ?? null,
      safeguardingLeadInPost: input.safeguardingLeadInPost,
      safeguardingLeadName: blankToNull(input.safeguardingLeadName),
      earliestStart: input.earliestStart ?? null,

      // The version the submitter was shown, not whatever the page says now.
      requirementsVersion: PILOT_REQUIREMENTS_VERSION,

      whyThisBranch: blankToNull(input.whyThisBranch),
      notes: blankToNull(input.notes),

      sourceIp: ctx.sourceIp,
      userAgent: ctx.userAgent,
    })
    .returning({ id: pilotInterest.id, submittedAt: pilotInterest.submittedAt });

  // An insert with .returning() yields exactly one row or throws, but the
  // type is an array, so this is a type narrowing rather than a real case.
  if (!row) throw new Error('pilot interest insert returned no row');

  // The row is saved either way. A submission that stored cleanly but could
  // not be announced is a notification problem, not the branch leader's, and
  // failing their request would invite them to send it again.
  await notifyPilotInterest(input, row.id).catch((err) => {
    logger.error('pilot interest: notification failed', {
      submissionId: row.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // Nothing about other submissions goes back to a public caller: who else
  // has volunteered is not theirs to see.
  return { id: row.id, submittedAt: row.submittedAt };
}

/**
 * Where a new submission is announced.
 *
 * The rollout plan turns on hearing back quickly -- the announcement goes out
 * before the app is ready "because nothing else can be arranged until we know
 * which branch is first" -- and a row sitting unread in an admin queue nobody
 * has opened is the same as no row at all. Overridable by env for staging,
 * which should not mail the real inbox.
 */
function notifyAddress(): string {
  return process.env['PILOT_INTEREST_NOTIFY_TO']?.trim() || 'tech@kharis.org';
}

async function notifyPilotInterest(
  input: SubmitPilotInterestInput,
  submissionId: string,
): Promise<void> {
  const role =
    input.roleAtBranch === 'other'
      ? (input.roleOther?.trim() || 'Another role at the branch')
      : PILOT_ROLE_LABEL[input.roleAtBranch];

  const rows: Array<[string, string]> = [
    ['Name', input.fullName.trim()],
    ['Role', role],
    ['Email', input.email.trim().toLowerCase()],
    ['Phone', input.phone?.trim() || 'Not given'],
    ['Branch', input.branchName.trim()],
    ['Fellowships', String(input.fellowshipCount)],
    ['Departments', String(input.departmentCount)],
    ['Approx members', input.approxMembers == null ? 'Not given' : String(input.approxMembers)],
    ['Head of admin', input.headOfAdminName?.trim() || 'Not named'],
    ['Head of admin email', input.headOfAdminEmail?.trim() || 'Not given'],
    [
      'Safeguarding lead',
      input.safeguardingLeadInPost
        ? (input.safeguardingLeadName?.trim() || 'In post')
        : 'Not in post',
    ],
    ['Earliest start', input.earliestStart || 'Not given'],
    ['Commitments version', PILOT_REQUIREMENTS_VERSION],
  ];

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#111827;">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const freeText = ([
    ['Why their branch should go first', input.whyThisBranch],
    ['Anything we should know', input.notes],
  ] as Array<[string, string | undefined]>)
    .filter(([, value]) => value?.trim())
    .map(
      ([heading, value]) =>
        `<h3 style="margin:24px 0 4px;font-size:14px;color:#111827;">${escapeHtml(heading)}</h3>` +
        `<p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(value!.trim())}</p>`,
    )
    .join('');

  const html = renderLayout({
    heading: 'A branch has put itself forward',
    bodyHtml:
      `<p>${escapeHtml(input.branchName.trim())} offered to run the pilot.</p>` +
      `<table style="border-collapse:collapse;font-size:14px;">${table}</table>` +
      freeText +
      `<p style="font-size:12px;color:#6b7280;margin-top:24px;">Submission ${escapeHtml(submissionId)}</p>`,
    footerLine: 'Sent by iKharis because a pilot interest form was submitted.',
  });

  await sendNotificationEmail(
    notifyAddress(),
    `Pilot interest: ${input.branchName.trim()}`,
    html,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function listPilotInterest(
  db: Database,
  query: { status?: PilotInterestStatus; limit: number; offset: number },
) {
  const where = query.status ? eq(pilotInterest.status, query.status) : undefined;

  const rows = await db
    .select({
      id: pilotInterest.id,
      fullName: pilotInterest.fullName,
      roleAtBranch: pilotInterest.roleAtBranch,
      roleOther: pilotInterest.roleOther,
      email: pilotInterest.email,
      phone: pilotInterest.phone,
      branchId: pilotInterest.branchId,
      branchName: pilotInterest.branchName,
      fellowshipCount: pilotInterest.fellowshipCount,
      departmentCount: pilotInterest.departmentCount,
      approxMembers: pilotInterest.approxMembers,
      headOfAdminName: pilotInterest.headOfAdminName,
      headOfAdminEmail: pilotInterest.headOfAdminEmail,
      safeguardingLeadInPost: pilotInterest.safeguardingLeadInPost,
      safeguardingLeadName: pilotInterest.safeguardingLeadName,
      earliestStart: pilotInterest.earliestStart,
      requirementsVersion: pilotInterest.requirementsVersion,
      whyThisBranch: pilotInterest.whyThisBranch,
      notes: pilotInterest.notes,
      status: pilotInterest.status,
      reviewNotes: pilotInterest.reviewNotes,
      submittedAt: pilotInterest.submittedAt,
    })
    .from(pilotInterest)
    .where(where)
    .orderBy(desc(pilotInterest.submittedAt))
    .limit(query.limit)
    .offset(query.offset);

  const counted = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pilotInterest)
    .where(where);

  return { rows, total: counted[0]?.count ?? 0 };
}

export async function updatePilotInterest(
  db: Database,
  id: string,
  patch: { status: PilotInterestStatus; reviewNotes?: string },
) {
  const [row] = await db
    .update(pilotInterest)
    .set({
      status: patch.status,
      reviewNotes: blankToNull(patch.reviewNotes),
      updatedAt: new Date(),
    })
    .where(eq(pilotInterest.id, id))
    .returning({ id: pilotInterest.id, status: pilotInterest.status });

  if (!row) throw new NotFoundError('Pilot interest submission not found');
  return row;
}
