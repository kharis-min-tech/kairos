import { eq, and, or, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branchDepartments,
  departmentMembers,
  fellowships,
  fellowshipMembers,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { authHasCapability, authHasAnyCapability } from './grants';

/**
 * Auto-narrow reports for fellowship/department leaders without branch:read.
 * Returns the union of member IDs across all fellowships and departments the
 * caller leads/co-leads in the target branch.
 *
 *   branch:read holders (admin / pastor)  → null  (no narrowing — branch-wide)
 *   fellowship:read / department:read     → array (members of led groups)
 *   leader with no active led groups      → empty array (visible scope = nothing)
 *
 * Mirrors the souls dashboard fix: a Youth Fellowship leader's attendance
 * report should be Youth's attendance, not the whole branch's.
 */
export async function resolveLeaderScopeMemberIds(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<string[] | null> {
  if (authHasCapability(auth, 'branch:read')) return null;
  // Plain members (no leadership cap) don't get auto-narrowed — they read
  // their branch's summary as-is. Only callers holding fellowship/department
  // read need narrowing because they'd otherwise see branch-wide data.
  if (!authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    return null;
  }

  const [ledFellowshipRows, ledDeptRows] = await Promise.all([
    db
      .select({ id: fellowships.id })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          eq(fellowships.branchId, branchId),
          or(
            eq(fellowships.leaderId, auth.memberId),
            eq(fellowships.coLeaderId, auth.memberId),
          )!,
        ),
      ),
    db
      .select({ id: branchDepartments.id })
      .from(branchDepartments)
      .where(
        and(
          eq(branchDepartments.isActive, true),
          eq(branchDepartments.branchId, branchId),
          or(
            eq(branchDepartments.leadMemberId, auth.memberId),
            eq(branchDepartments.deputyMemberId, auth.memberId),
          )!,
        ),
      ),
  ]);

  const ledFellowshipIds = ledFellowshipRows.map((r) => r.id);
  const ledDeptIds = ledDeptRows.map((r) => r.id);

  if (ledFellowshipIds.length === 0 && ledDeptIds.length === 0) return [];

  const memberIdSet = new Set<string>();
  if (ledFellowshipIds.length > 0) {
    const rows = await db
      .select({ memberId: fellowshipMembers.memberId })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.isActive, true),
          inArray(fellowshipMembers.fellowshipId, ledFellowshipIds),
        ),
      );
    rows.forEach((r) => memberIdSet.add(r.memberId));
  }
  if (ledDeptIds.length > 0) {
    const rows = await db
      .select({ memberId: departmentMembers.memberId })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.isActive, true),
          inArray(departmentMembers.branchDepartmentId, ledDeptIds),
        ),
      );
    rows.forEach((r) => memberIdSet.add(r.memberId));
  }
  return Array.from(memberIdSet);
}

/**
 * Compose the leader-scope and explicit-filter member IDs:
 *   admin/pastor + no explicit filter         → null (branch-wide)
 *   admin/pastor + explicit filter            → explicit filter IDs
 *   leader      + no explicit filter          → leader-scope IDs
 *   leader      + explicit filter             → intersection
 *
 * `[]` (empty array) means "scope resolved but contains no members" — the
 * caller short-circuits to an empty report rather than running a branch-wide
 * query.
 */
export function composeScopeMemberIds(
  leaderIds: string[] | null,
  filterIds: string[] | null,
): string[] | null {
  if (leaderIds === null && filterIds === null) return null;
  if (leaderIds === null) return filterIds;
  if (filterIds === null) return leaderIds;
  const filterSet = new Set(filterIds);
  return leaderIds.filter((id) => filterSet.has(id));
}

/**
 * The altitude a home/dashboard surface renders at. Derived from capabilities
 * only — never from `systemRole`, which carries no authority (see CLAUDE.md).
 *
 *   church     → system admin: church-wide totals, no personal agenda
 *   branch     → branch admin / pastor: branch pulse + queue + agenda
 *   group      → fellowship/department leader: agenda + queue, group-scoped
 *   personal   → everyone else, including Membership Champion
 *
 * Pulse is shown from `branch` upward. `church` inverts the section order so
 * the numbers lead, because a system admin has no personal duties.
 */
export type HomeAltitude = 'church' | 'branch' | 'group' | 'personal';

export function resolveHomeAltitude(auth: AuthContext): HomeAltitude {
  if (auth.systemRole === 'admin') return 'church';
  if (authHasCapability(auth, 'branch:read', { kind: 'branch', id: auth.branchId })) {
    return 'branch';
  }
  if (authHasAnyCapability(auth, 'fellowship:read', 'department:read')) return 'group';
  return 'personal';
}
