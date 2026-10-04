import { eq, and, isNotNull, lte, gte, desc, sql, notExists } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  memberFollowups,
  members,
  branches,
  fellowshipMembers,
  departmentMembers,
  formSubmissions,
} from '@kairos/database';
import { alias } from 'drizzle-orm/pg-core';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError } from '@kairos/utils';
import { authHasCapability } from '../lib/grants';
import type { CreateBranchFollowupInput, FollowupQueueQuery } from './schemas';

/**
 * Branch-context follow-ups, and the two queues of people who need one.
 *
 * The branch is the context that everybody has. People in no fellowship and no
 * department have only that one — before 0052 they could not be followed up at
 * all — and a pastor following up a member who IS in a group may still choose
 * it deliberately, because a pastoral visit is a branch-level act rather than
 * a fellowship one.
 *
 * Writing here requires `branch:write` on the target branch. That is what stops
 * a fellowship leader logging a branch-context row: they can only reach the
 * fellowship route, which stamps its own context.
 */

/** How recently someone must have visited to still count as a new first-timer. */
const FIRST_TIMER_WINDOW_DAYS = 60;

function enforceBranchWrite(auth: AuthContext, branchId: string) {
  if (auth.systemRole === 'admin') return;
  if (!authHasCapability(auth, 'branch:write', { kind: 'branch', id: branchId })) {
    throw new ForbiddenError('You cannot record branch follow-ups in this branch');
  }
}

/** Admins may name a branch; everyone else is pinned to their own. */
function resolveQueueBranch(auth: AuthContext, requested?: string): string {
  if (!requested) return auth.branchId;
  if (auth.systemRole === 'admin') return requested;
  if (requested !== auth.branchId) {
    throw new ForbiddenError('You can only read follow-up queues in your own branch');
  }
  return requested;
}

export async function createBranchFollowup(
  db: Database,
  auth: AuthContext,
  input: CreateBranchFollowupInput,
) {
  const [subject] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.id, input.memberId), eq(members.isActive, true)))
    .limit(1);
  if (!subject) throw new NotFoundError('Member not found');

  // The follow-up belongs to the subject's own branch, not the caller's — an
  // admin acting across branches must not file it under theirs.
  enforceBranchWrite(auth, subject.homeBranchId);

  const [created] = await db
    .insert(memberFollowups)
    .values({
      // Declared, never inferred. This row is branch-context even when the
      // subject also belongs to a fellowship or a department, because that is
      // the relationship the caller acted under.
      contextKind: 'branch',
      fellowshipId: null,
      departmentId: null,
      branchId: subject.homeBranchId,
      memberId: input.memberId,
      recordedById: auth.memberId,
      assignedToId: input.assignedToId ?? null,
      contactedAt: input.contactedAt ? new Date(input.contactedAt) : new Date(),
      contactMethod: input.contactMethod,
      contactStatus: input.contactStatus,
      type: input.type,
      methods: input.methods ?? null,
      contactReached: input.contactReached ?? null,
      interestLevel: input.interestLevel ?? null,
      visitKind: input.visitKind ?? null,
      visitAnnounced: input.visitAnnounced ?? null,
      visitArrivalAt: input.visitArrivalAt ? new Date(input.visitArrivalAt) : null,
      visitDepartureAt: input.visitDepartureAt ? new Date(input.visitDepartureAt) : null,
      visitOutcome: input.visitOutcome ?? null,
      companionMemberIds: input.companionMemberIds ?? null,
      welfareConcern: input.welfareConcern ?? false,
      safeguardingConcern: input.safeguardingConcern ?? false,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      nextFollowUpDate: input.nextFollowUpDate ?? null,
    })
    .returning();

  return created!;
}

export interface FollowupQueueRow {
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  memberType: string;
  branchName: string | null;
  /** When they first appeared, or null if unknown. */
  since: string | null;
  /** Who brought them, when the first-timer form recorded it. */
  invitedByName: string | null;
}

/**
 * First-timers nobody has contacted yet.
 *
 * Sourced from the first-timer form rather than from `member_type`, because
 * that is what actually marks an arrival — the form mints the member shell.
 * A visitor who walked in and one who came on an invite are both here; the
 * invite shows in `invitedByName`.
 *
 * This is a welcome motion on a short clock, which is why it is a separate
 * queue from the drift motion below rather than one "needs follow-up" list.
 */
export async function listFirstTimersNeedingFollowup(
  db: Database,
  auth: AuthContext,
  query: FollowupQueueQuery,
): Promise<FollowupQueueRow[]> {
  const branchId = resolveQueueBranch(auth, query.branchId);
  enforceBranchWrite(auth, branchId);

  const since = new Date(Date.now() - FIRST_TIMER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const inviter = alias(members, 'inviter');

  const rows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phone: members.phone,
      email: members.email,
      memberType: members.memberType,
      branchName: branches.branchName,
      since: formSubmissions.createdAt,
      payload: formSubmissions.payload,
      inviterFirstName: inviter.firstName,
      inviterLastName: inviter.lastName,
    })
    .from(formSubmissions)
    .innerJoin(members, eq(formSubmissions.subjectMemberId, members.id))
    .leftJoin(branches, eq(members.homeBranchId, branches.id))
    // The inviter is a real member reference on new submissions; older ones
    // only carry a typed name, which readInvitedBy falls back to.
    .leftJoin(
      inviter,
      sql`${inviter.id}::text = ${formSubmissions.payload}->>'invitedByMemberId'`,
    )
    .where(
      and(
        eq(formSubmissions.formType, 'first_time_visitor'),
        eq(formSubmissions.branchId, branchId),
        gte(formSubmissions.createdAt, since),
        eq(members.isActive, true),
        // Nobody has followed them up in any context yet.
        notExists(
          db
            .select({ one: sql`1` })
            .from(memberFollowups)
            .where(eq(memberFollowups.memberId, members.id)),
        ),
      ),
    )
    .orderBy(desc(formSubmissions.createdAt))
    .limit(query.limit);

  return rows.map((r) => ({
    memberId: r.memberId,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    email: r.email,
    memberType: r.memberType,
    branchName: r.branchName,
    since: (r.since as Date).toISOString(),
    invitedByName:
      r.inviterFirstName && r.inviterLastName
        ? `${r.inviterFirstName} ${r.inviterLastName}`
        : readInvitedBy(r.payload),
  }));
}

/** Legacy fallback: submissions made before the picker carry a typed name. */
function readInvitedBy(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as Record<string, unknown>).invitedBy;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Members who belong to no fellowship and no department.
 *
 * A retention motion on a long clock: these people are already part of the
 * church and are drifting, as opposed to the first-timers above who are
 * arriving. Same record, different urgency, so a different queue.
 */
export async function listMembersWithoutGroup(
  db: Database,
  auth: AuthContext,
  query: FollowupQueueQuery,
): Promise<FollowupQueueRow[]> {
  const branchId = resolveQueueBranch(auth, query.branchId);
  enforceBranchWrite(auth, branchId);

  const rows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phone: members.phone,
      email: members.email,
      memberType: members.memberType,
      branchName: branches.branchName,
      since: members.createdAt,
    })
    .from(members)
    .leftJoin(branches, eq(members.homeBranchId, branches.id))
    .where(
      and(
        eq(members.homeBranchId, branchId),
        eq(members.isActive, true),
        // Children are followed up through their guardian, not directly.
        sql`${members.memberType} <> 'child'`,
        notExists(
          db
            .select({ one: sql`1` })
            .from(fellowshipMembers)
            .where(
              and(
                eq(fellowshipMembers.memberId, members.id),
                eq(fellowshipMembers.isActive, true),
              ),
            ),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(departmentMembers)
            .where(
              and(
                eq(departmentMembers.memberId, members.id),
                eq(departmentMembers.isActive, true),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(members.createdAt))
    .limit(query.limit);

  return rows.map((r) => ({
    memberId: r.memberId,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    email: r.email,
    memberType: r.memberType,
    branchName: r.branchName,
    since: (r.since as Date).toISOString(),
    invitedByName: null,
  }));
}

export interface DueFollowupRow {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  contextKind: string;
  nextFollowUpDate: string | null;
  assignedToId: string | null;
}

/**
 * Follow-ups whose next contact date has come due, across every context the
 * caller can see. Feeds the control centre's "Needs you" row.
 */
export async function listDueFollowups(
  db: Database,
  auth: AuthContext,
  query: FollowupQueueQuery,
): Promise<DueFollowupRow[]> {
  const branchId = resolveQueueBranch(auth, query.branchId);
  enforceBranchWrite(auth, branchId);

  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: memberFollowups.id,
      memberId: memberFollowups.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      contextKind: memberFollowups.contextKind,
      nextFollowUpDate: memberFollowups.nextFollowUpDate,
      assignedToId: memberFollowups.assignedToId,
    })
    .from(memberFollowups)
    .innerJoin(members, eq(memberFollowups.memberId, members.id))
    .where(
      and(
        eq(memberFollowups.branchId, branchId),
        isNotNull(memberFollowups.nextFollowUpDate),
        lte(memberFollowups.nextFollowUpDate, today),
        eq(members.isActive, true),
      ),
    )
    .orderBy(desc(memberFollowups.nextFollowUpDate))
    .limit(query.limit);

  return rows;
}
