import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { branches, pilotInterest } from '@kairos/database';
import { PILOT_REQUIREMENTS_VERSION, type PilotInterestStatus } from '@kairos/types';
import { NotFoundError } from '@kairos/utils';
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

  const a = input.acknowledgements;

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
      ackDailyApprovals: a.dailyApprovals,
      ackAttendanceEveryService: a.attendanceEveryService,
      ackNoHistoryImport: a.noHistoryImport,
      ackPilotFeedback: a.pilotFeedback,
      ackTraining: a.training,
      ackRetireOldSystem: a.retireOldSystem,

      whyThisBranch: blankToNull(input.whyThisBranch),
      notes: blankToNull(input.notes),

      sourceIp: ctx.sourceIp,
      userAgent: ctx.userAgent,
    })
    .returning({ id: pilotInterest.id, submittedAt: pilotInterest.submittedAt });

  // An insert with .returning() yields exactly one row or throws, but the
  // type is an array, so this is a type narrowing rather than a real case.
  if (!row) throw new Error('pilot interest insert returned no row');

  // Nothing about other submissions goes back to a public caller: who else
  // has volunteered is not theirs to see.
  return { id: row.id, submittedAt: row.submittedAt };
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
