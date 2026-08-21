import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '@kairos/database';
import {
  fellowshipFollowups,
  fellowships,
  departmentFollowups,
  branchDepartments,
  departments,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { ForbiddenError, NotFoundError } from '@kairos/utils';
import { authHasCapability } from '../lib/grants';

/**
 * Follow-up history for a single member — unions fellowship_followups +
 * department_followups so a leader tapping a member sees every recorded
 * touchpoint across every scope in one timeline.
 *
 * Visibility: the member always sees their own history. Everyone else needs
 * branch:write on the member's home branch (Branch Admin territory). Narrower
 * grants like fellowship:write or department:write intentionally do NOT open
 * this — a fellowship leader shouldn't see follow-ups from a completely
 * separate department the member is also in. If that becomes a real need,
 * we'll narrow the query by scope, not widen the visibility gate.
 */
export interface MemberFollowupHistoryItem {
  id: string;
  source: 'fellowship' | 'department';
  scopeId: string;
  scopeName: string; // fellowship name OR department name
  memberId: string;
  recordedById: string;
  recordedByFirstName: string;
  recordedByLastName: string;
  contactedAt: string; // ISO timestamp
  notes: string | null;
  // Legacy + new shape both surfaced — clients can pick whichever they prefer
  contactMethod: string;
  contactStatus: string;
  type: string;
  methods: string[] | null;
  contactReached: boolean | null;
  interestLevel: string | null;
  visitKind: string | null;
  visitAnnounced: boolean | null;
  visitArrivalAt: string | null;
  visitDepartureAt: string | null;
  visitOutcome: string | null;
  companionMemberIds: string[] | null;
  welfareConcern: boolean;
  safeguardingConcern: boolean;
  nextFollowUpDate: string | null;
}

export async function getMemberFollowupHistory(
  db: Database,
  auth: AuthContext,
  memberId: string,
): Promise<MemberFollowupHistoryItem[]> {
  const [target] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!target) throw new NotFoundError('Member not found');

  const isSelf = auth.memberId === memberId;
  const isPrivileged =
    auth.systemRole === 'admin' ||
    authHasCapability(auth, 'branch:write', { kind: 'branch', id: target.homeBranchId });
  if (!isSelf && !isPrivileged) {
    throw new ForbiddenError('You cannot view this member’s follow-up history');
  }

  const recorder = alias(members, 'recorder');

  const [fellowshipRows, deptRows] = await Promise.all([
    db
      .select({
        id: fellowshipFollowups.id,
        scopeId: fellowshipFollowups.fellowshipId,
        scopeName: fellowships.fellowshipName,
        memberId: fellowshipFollowups.memberId,
        recordedById: fellowshipFollowups.recordedById,
        recordedByFirstName: recorder.firstName,
        recordedByLastName: recorder.lastName,
        contactedAt: fellowshipFollowups.contactedAt,
        notes: fellowshipFollowups.notes,
        contactMethod: fellowshipFollowups.contactMethod,
        contactStatus: fellowshipFollowups.contactStatus,
        type: fellowshipFollowups.type,
        methods: fellowshipFollowups.methods,
        contactReached: fellowshipFollowups.contactReached,
        interestLevel: fellowshipFollowups.interestLevel,
        visitKind: fellowshipFollowups.visitKind,
        visitAnnounced: fellowshipFollowups.visitAnnounced,
        visitArrivalAt: fellowshipFollowups.visitArrivalAt,
        visitDepartureAt: fellowshipFollowups.visitDepartureAt,
        visitOutcome: fellowshipFollowups.visitOutcome,
        companionMemberIds: fellowshipFollowups.companionMemberIds,
        welfareConcern: fellowshipFollowups.welfareConcern,
        safeguardingConcern: fellowshipFollowups.safeguardingConcern,
        nextFollowUpDate: fellowshipFollowups.nextFollowUpDate,
      })
      .from(fellowshipFollowups)
      .innerJoin(fellowships, eq(fellowshipFollowups.fellowshipId, fellowships.id))
      .innerJoin(recorder, eq(fellowshipFollowups.recordedById, recorder.id))
      .where(eq(fellowshipFollowups.memberId, memberId))
      .orderBy(desc(fellowshipFollowups.contactedAt)),
    db
      .select({
        id: departmentFollowups.id,
        scopeId: departmentFollowups.branchDepartmentId,
        scopeName: departments.departmentName,
        memberId: departmentFollowups.memberId,
        recordedById: departmentFollowups.recordedById,
        recordedByFirstName: recorder.firstName,
        recordedByLastName: recorder.lastName,
        contactedAt: departmentFollowups.contactedAt,
        notes: departmentFollowups.notes,
        contactMethod: departmentFollowups.contactMethod,
        contactStatus: departmentFollowups.contactStatus,
        type: departmentFollowups.type,
        methods: departmentFollowups.methods,
        contactReached: departmentFollowups.contactReached,
        interestLevel: departmentFollowups.interestLevel,
        visitKind: departmentFollowups.visitKind,
        visitAnnounced: departmentFollowups.visitAnnounced,
        visitArrivalAt: departmentFollowups.visitArrivalAt,
        visitDepartureAt: departmentFollowups.visitDepartureAt,
        visitOutcome: departmentFollowups.visitOutcome,
        companionMemberIds: departmentFollowups.companionMemberIds,
        welfareConcern: departmentFollowups.welfareConcern,
        safeguardingConcern: departmentFollowups.safeguardingConcern,
        nextFollowUpDate: departmentFollowups.nextFollowUpDate,
      })
      .from(departmentFollowups)
      .innerJoin(
        branchDepartments,
        eq(departmentFollowups.branchDepartmentId, branchDepartments.id),
      )
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .innerJoin(recorder, eq(departmentFollowups.recordedById, recorder.id))
      .where(eq(departmentFollowups.memberId, memberId))
      .orderBy(desc(departmentFollowups.contactedAt)),
  ]);

  const merged: MemberFollowupHistoryItem[] = [
    ...fellowshipRows.map((r) => ({
      ...r,
      source: 'fellowship' as const,
      contactedAt: r.contactedAt.toISOString(),
      visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
      visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
      methods: (r.methods as string[] | null) ?? null,
      companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    })),
    ...deptRows.map((r) => ({
      ...r,
      source: 'department' as const,
      contactedAt: r.contactedAt.toISOString(),
      visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
      visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
      methods: (r.methods as string[] | null) ?? null,
      companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    })),
  ];

  merged.sort((a, b) => b.contactedAt.localeCompare(a.contactedAt));
  return merged;
}

// ── Concerns inbox (welfare + safeguarding) ─────────────────
//
// 0046 companion feature. Any follow-up flagged `welfare_concern=true` or
// `safeguarding_concern=true` surfaces here for branch admins / safeguarding
// leads to triage. Kept in this file (not /me/service) so the joins can share
// the same query shape as the member history view above.

export interface ConcernInboxItem extends MemberFollowupHistoryItem {
  memberFirstName: string;
  memberLastName: string;
}

export type ConcernKind = 'welfare' | 'safeguarding';

export async function listConcernFollowups(
  db: Database,
  auth: AuthContext,
  kind: ConcernKind,
): Promise<ConcernInboxItem[]> {
  // Gate: welfare = branch:write on caller's branch. Safeguarding =
  // safeguarding:read or branch:write. System admins pass everywhere.
  const isAdmin = auth.systemRole === 'admin';
  const branchId = auth.branchId;
  const canSeeWelfare =
    isAdmin || (!!branchId && authHasCapability(auth, 'branch:write', { kind: 'branch', id: branchId }));
  const canSeeSafeguarding =
    isAdmin ||
    (!!branchId && authHasCapability(auth, 'safeguarding:read', { kind: 'branch', id: branchId })) ||
    (!!branchId && authHasCapability(auth, 'branch:write', { kind: 'branch', id: branchId }));
  if (kind === 'welfare' && !canSeeWelfare) {
    throw new ForbiddenError('You cannot see the welfare inbox');
  }
  if (kind === 'safeguarding' && !canSeeSafeguarding) {
    throw new ForbiddenError('You cannot see the safeguarding inbox');
  }

  const flagCol = (t: typeof fellowshipFollowups | typeof departmentFollowups) =>
    kind === 'welfare' ? t.welfareConcern : t.safeguardingConcern;

  const recorder = alias(members, 'recorder');
  const subject = alias(members, 'subject');

  // Scope narrowing: non-admins see rows in their own branch only. System
  // admins see everything.
  const fellowshipBranchScope = isAdmin
    ? undefined
    : eq(fellowships.branchId, branchId);
  const deptBranchScope = isAdmin
    ? undefined
    : eq(branchDepartments.branchId, branchId);

  const [fellowshipRows, deptRows] = await Promise.all([
    db
      .select({
        id: fellowshipFollowups.id,
        scopeId: fellowshipFollowups.fellowshipId,
        scopeName: fellowships.fellowshipName,
        memberId: fellowshipFollowups.memberId,
        memberFirstName: subject.firstName,
        memberLastName: subject.lastName,
        recordedById: fellowshipFollowups.recordedById,
        recordedByFirstName: recorder.firstName,
        recordedByLastName: recorder.lastName,
        contactedAt: fellowshipFollowups.contactedAt,
        notes: fellowshipFollowups.notes,
        contactMethod: fellowshipFollowups.contactMethod,
        contactStatus: fellowshipFollowups.contactStatus,
        type: fellowshipFollowups.type,
        methods: fellowshipFollowups.methods,
        contactReached: fellowshipFollowups.contactReached,
        interestLevel: fellowshipFollowups.interestLevel,
        visitKind: fellowshipFollowups.visitKind,
        visitAnnounced: fellowshipFollowups.visitAnnounced,
        visitArrivalAt: fellowshipFollowups.visitArrivalAt,
        visitDepartureAt: fellowshipFollowups.visitDepartureAt,
        visitOutcome: fellowshipFollowups.visitOutcome,
        companionMemberIds: fellowshipFollowups.companionMemberIds,
        welfareConcern: fellowshipFollowups.welfareConcern,
        safeguardingConcern: fellowshipFollowups.safeguardingConcern,
        nextFollowUpDate: fellowshipFollowups.nextFollowUpDate,
      })
      .from(fellowshipFollowups)
      .innerJoin(fellowships, eq(fellowshipFollowups.fellowshipId, fellowships.id))
      .innerJoin(recorder, eq(fellowshipFollowups.recordedById, recorder.id))
      .innerJoin(subject, eq(fellowshipFollowups.memberId, subject.id))
      .where(
        fellowshipBranchScope
          ? and(eq(flagCol(fellowshipFollowups), true), fellowshipBranchScope)
          : eq(flagCol(fellowshipFollowups), true),
      )
      .orderBy(desc(fellowshipFollowups.contactedAt))
      .limit(200),
    db
      .select({
        id: departmentFollowups.id,
        scopeId: departmentFollowups.branchDepartmentId,
        scopeName: departments.departmentName,
        memberId: departmentFollowups.memberId,
        memberFirstName: subject.firstName,
        memberLastName: subject.lastName,
        recordedById: departmentFollowups.recordedById,
        recordedByFirstName: recorder.firstName,
        recordedByLastName: recorder.lastName,
        contactedAt: departmentFollowups.contactedAt,
        notes: departmentFollowups.notes,
        contactMethod: departmentFollowups.contactMethod,
        contactStatus: departmentFollowups.contactStatus,
        type: departmentFollowups.type,
        methods: departmentFollowups.methods,
        contactReached: departmentFollowups.contactReached,
        interestLevel: departmentFollowups.interestLevel,
        visitKind: departmentFollowups.visitKind,
        visitAnnounced: departmentFollowups.visitAnnounced,
        visitArrivalAt: departmentFollowups.visitArrivalAt,
        visitDepartureAt: departmentFollowups.visitDepartureAt,
        visitOutcome: departmentFollowups.visitOutcome,
        companionMemberIds: departmentFollowups.companionMemberIds,
        welfareConcern: departmentFollowups.welfareConcern,
        safeguardingConcern: departmentFollowups.safeguardingConcern,
        nextFollowUpDate: departmentFollowups.nextFollowUpDate,
      })
      .from(departmentFollowups)
      .innerJoin(
        branchDepartments,
        eq(departmentFollowups.branchDepartmentId, branchDepartments.id),
      )
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .innerJoin(recorder, eq(departmentFollowups.recordedById, recorder.id))
      .innerJoin(subject, eq(departmentFollowups.memberId, subject.id))
      .where(
        deptBranchScope
          ? and(eq(flagCol(departmentFollowups), true), deptBranchScope)
          : eq(flagCol(departmentFollowups), true),
      )
      .orderBy(desc(departmentFollowups.contactedAt))
      .limit(200),
  ]);

  const merged: ConcernInboxItem[] = [
    ...fellowshipRows.map((r) => ({
      ...r,
      source: 'fellowship' as const,
      contactedAt: r.contactedAt.toISOString(),
      visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
      visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
      methods: (r.methods as string[] | null) ?? null,
      companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    })),
    ...deptRows.map((r) => ({
      ...r,
      source: 'department' as const,
      contactedAt: r.contactedAt.toISOString(),
      visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
      visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
      methods: (r.methods as string[] | null) ?? null,
      companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    })),
  ];

  merged.sort((a, b) => b.contactedAt.localeCompare(a.contactedAt));
  return merged;
}
