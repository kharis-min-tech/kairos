import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '@kairos/database';
import {
  fellowships,
  memberFollowups,
  branchDepartments,
  departments,
  members,
} from '@kairos/database';
import { CHURCH_SCOPE, type AuthContext } from '@kairos/types';
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
  /**
   * The follow-up's declared context. 'branch' is a pastoral follow-up made
   * outside any group — the only context available for someone in no
   * fellowship and no department, and a deliberate choice for a pastor
   * following up a member who is in one. It carries no scope id or name.
   */
  source: 'fellowship' | 'department' | 'branch';
  scopeId: string | null;
  scopeName: string | null; // fellowship name OR department name; null for branch
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

  // One query over one table. It used to be two, inner-joined to fellowships
  // and to branch_departments — which silently dropped every branch-context
  // row, since those have both ids NULL. That is the gap 0052 closes, so the
  // joins are LEFT and the context comes from the row itself.
  const rows = await db
    .select({
      id: memberFollowups.id,
      contextKind: memberFollowups.contextKind,
      fellowshipId: memberFollowups.fellowshipId,
      fellowshipName: fellowships.fellowshipName,
      departmentId: memberFollowups.departmentId,
      departmentName: departments.departmentName,
      memberId: memberFollowups.memberId,
      recordedById: memberFollowups.recordedById,
      recordedByFirstName: recorder.firstName,
      recordedByLastName: recorder.lastName,
      contactedAt: memberFollowups.contactedAt,
      notes: memberFollowups.notes,
      contactMethod: memberFollowups.contactMethod,
      contactStatus: memberFollowups.contactStatus,
      type: memberFollowups.type,
      methods: memberFollowups.methods,
      contactReached: memberFollowups.contactReached,
      interestLevel: memberFollowups.interestLevel,
      visitKind: memberFollowups.visitKind,
      visitAnnounced: memberFollowups.visitAnnounced,
      visitArrivalAt: memberFollowups.visitArrivalAt,
      visitDepartureAt: memberFollowups.visitDepartureAt,
      visitOutcome: memberFollowups.visitOutcome,
      companionMemberIds: memberFollowups.companionMemberIds,
      welfareConcern: memberFollowups.welfareConcern,
      safeguardingConcern: memberFollowups.safeguardingConcern,
      nextFollowUpDate: memberFollowups.nextFollowUpDate,
    })
    .from(memberFollowups)
    .leftJoin(fellowships, eq(memberFollowups.fellowshipId, fellowships.id))
    .leftJoin(branchDepartments, eq(memberFollowups.departmentId, branchDepartments.id))
    .leftJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .innerJoin(recorder, eq(memberFollowups.recordedById, recorder.id))
    .where(eq(memberFollowups.memberId, memberId))
    .orderBy(desc(memberFollowups.contactedAt))
    .limit(200);

  const merged: MemberFollowupHistoryItem[] = rows.map((r) => ({
    id: r.id,
    source: r.contextKind as MemberFollowupHistoryItem['source'],
    scopeId: r.fellowshipId ?? r.departmentId ?? null,
    scopeName: r.fellowshipName ?? r.departmentName ?? null,
    memberId: r.memberId,
    recordedById: r.recordedById,
    recordedByFirstName: r.recordedByFirstName,
    recordedByLastName: r.recordedByLastName,
    contactedAt: r.contactedAt.toISOString(),
    notes: r.notes,
    contactMethod: r.contactMethod,
    contactStatus: r.contactStatus,
    type: r.type,
    methods: (r.methods as string[] | null) ?? null,
    contactReached: r.contactReached,
    interestLevel: r.interestLevel,
    visitKind: r.visitKind,
    visitAnnounced: r.visitAnnounced,
    visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
    visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
    visitOutcome: r.visitOutcome,
    companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    welfareConcern: r.welfareConcern,
    safeguardingConcern: r.safeguardingConcern,
    nextFollowUpDate: r.nextFollowUpDate,
  }));

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
  // Two queues, two capabilities, deliberately in different hands.
  //
  // Welfare is pastoral care: `welfare:read`, which only BranchAdmin carries.
  // Safeguarding is protection and belongs to someone independent of branch
  // leadership: the branch Safeguarding Lead, the church-wide Safeguarding
  // Head, or the Main Pastor through the derived BranchPastor grant — but
  // not a Minister, who holds the same BranchAdmin grant as the pastor and
  // nothing more.
  //
  // Both used to read `branch:write`, which BranchAdmin and BranchDataAdmin
  // both hold, so a pure data-ops role could read every safeguarding case in
  // its branch.
  const isAdmin = auth.systemRole === 'admin';
  const branchId = auth.branchId;
  const cap = kind === 'welfare' ? 'welfare:read' : 'safeguarding:read';
  const canSee =
    isAdmin || (!!branchId && authHasCapability(auth, cap, { kind: 'branch', id: branchId }));
  if (!canSee) {
    throw new ForbiddenError(
      kind === 'welfare'
        ? 'You cannot see the welfare inbox'
        : 'You cannot see the safeguarding inbox',
    );
  }

  // A church-scoped grant reaches every branch, so the Safeguarding Head's
  // inbox is church-wide rather than their home branch's — same unscoped
  // read a platform admin gets, but only for safeguarding.
  const readsEveryBranch = isAdmin || authHasCapability(auth, cap, CHURCH_SCOPE);

  const flagCol = (t: typeof memberFollowups | typeof memberFollowups) =>
    kind === 'welfare' ? t.welfareConcern : t.safeguardingConcern;

  const recorder = alias(members, 'recorder');
  const subject = alias(members, 'subject');


  // Scoping reads member_followups.branch_id directly rather than hopping
  // through a container join, so it is correct for all three contexts — a
  // welfare concern about a member in no group reaches this inbox.
  const rows = await db
    .select({
      id: memberFollowups.id,
      contextKind: memberFollowups.contextKind,
      fellowshipId: memberFollowups.fellowshipId,
      fellowshipName: fellowships.fellowshipName,
      departmentId: memberFollowups.departmentId,
      departmentName: departments.departmentName,
      memberId: memberFollowups.memberId,
      recordedById: memberFollowups.recordedById,
      recordedByFirstName: recorder.firstName,
      recordedByLastName: recorder.lastName,
      contactedAt: memberFollowups.contactedAt,
      notes: memberFollowups.notes,
      contactMethod: memberFollowups.contactMethod,
      contactStatus: memberFollowups.contactStatus,
      type: memberFollowups.type,
      methods: memberFollowups.methods,
      contactReached: memberFollowups.contactReached,
      interestLevel: memberFollowups.interestLevel,
      visitKind: memberFollowups.visitKind,
      visitAnnounced: memberFollowups.visitAnnounced,
      visitArrivalAt: memberFollowups.visitArrivalAt,
      visitDepartureAt: memberFollowups.visitDepartureAt,
      visitOutcome: memberFollowups.visitOutcome,
      companionMemberIds: memberFollowups.companionMemberIds,
      welfareConcern: memberFollowups.welfareConcern,
      safeguardingConcern: memberFollowups.safeguardingConcern,
      nextFollowUpDate: memberFollowups.nextFollowUpDate,
      memberFirstName: subject.firstName,
      memberLastName: subject.lastName,
    })
    .from(memberFollowups)
    .leftJoin(fellowships, eq(memberFollowups.fellowshipId, fellowships.id))
    .leftJoin(branchDepartments, eq(memberFollowups.departmentId, branchDepartments.id))
    .leftJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .innerJoin(recorder, eq(memberFollowups.recordedById, recorder.id))
    .innerJoin(subject, eq(memberFollowups.memberId, subject.id))
    .where(
      readsEveryBranch
        ? eq(flagCol(memberFollowups), true)
        : and(eq(flagCol(memberFollowups), true), eq(memberFollowups.branchId, branchId)),
    )
    .orderBy(desc(memberFollowups.contactedAt))
    .limit(200);

  const merged: ConcernInboxItem[] = rows.map((r) => ({
    id: r.id,
    source: r.contextKind as MemberFollowupHistoryItem['source'],
    scopeId: r.fellowshipId ?? r.departmentId ?? null,
    scopeName: r.fellowshipName ?? r.departmentName ?? null,
    memberId: r.memberId,
    recordedById: r.recordedById,
    recordedByFirstName: r.recordedByFirstName,
    recordedByLastName: r.recordedByLastName,
    contactedAt: r.contactedAt.toISOString(),
    notes: r.notes,
    contactMethod: r.contactMethod,
    contactStatus: r.contactStatus,
    type: r.type,
    methods: (r.methods as string[] | null) ?? null,
    contactReached: r.contactReached,
    interestLevel: r.interestLevel,
    visitKind: r.visitKind,
    visitAnnounced: r.visitAnnounced,
    visitArrivalAt: r.visitArrivalAt ? new Date(r.visitArrivalAt).toISOString() : null,
    visitDepartureAt: r.visitDepartureAt ? new Date(r.visitDepartureAt).toISOString() : null,
    visitOutcome: r.visitOutcome,
    companionMemberIds: (r.companionMemberIds as string[] | null) ?? null,
    welfareConcern: r.welfareConcern,
    safeguardingConcern: r.safeguardingConcern,
    nextFollowUpDate: r.nextFollowUpDate,
    memberFirstName: r.memberFirstName,
    memberLastName: r.memberLastName,
  }));

  merged.sort((a, b) => b.contactedAt.localeCompare(a.contactedAt));
  return merged;
}
