import { and, eq, or } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { fellowships, branchDepartments, departments } from '@kairos/database';
import type { AuthContext, MeLeadershipResponse } from '@kairos/types';

/**
 * Build the caller's leadership footprint:
 *   - branch-admin authority arrays (echoed from AuthContext)
 *   - fellowships where the caller is the leader / co-leader
 *   - branch-departments where the caller is the lead / deputy
 *
 * The fellowships + departments queries are restricted to active rows so the
 * caller doesn't see entities they used to lead.
 *
 * ── Scope-aware filtering (Phase 4) ───────────────────────────────────
 *
 * When `auth.scope` is set, the user has picked a single role/entity at
 * /select-role and is acting through it. We narrow the response so the
 * dashboard + reports surfaces (which read this endpoint as their source of
 * truth) only see the chosen entity:
 *
 *   - scope=fellowship:F  → leadFellowships/coLeadFellowships filtered to F;
 *                          departments + branch-admin arrays emptied.
 *   - scope=department:D  → mirror: only D in leadDepartments/deputyDepartments,
 *                          others emptied.
 *   - scope=branch:B      → branchSystemAdminBranchIds/branchDataAdminBranchIds
 *                          filtered to just B (kept only if the user actually
 *                          holds it); fellowship/department arrays emptied.
 *   - scope=undefined     → unfiltered, legacy behavior.
 */
export async function getMyLeadership(
  db: Database,
  auth: AuthContext,
): Promise<MeLeadershipResponse> {
  const memberId = auth.memberId;

  const [fellowshipRows, departmentRows] = await Promise.all([
    db
      .select({
        id: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        leaderId: fellowships.leaderId,
        coLeaderId: fellowships.coLeaderId,
      })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          or(eq(fellowships.leaderId, memberId), eq(fellowships.coLeaderId, memberId)),
        ),
      ),
    db
      .select({
        id: branchDepartments.id,
        departmentName: departments.departmentName,
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          eq(branchDepartments.isActive, true),
          or(
            eq(branchDepartments.leadMemberId, memberId),
            eq(branchDepartments.deputyMemberId, memberId),
          ),
        ),
      ),
  ]);

  const leadFellowships = fellowshipRows
    .filter((r) => r.leaderId === memberId)
    .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName, branchId: r.branchId }));
  const coLeadFellowships = fellowshipRows
    .filter((r) => r.coLeaderId === memberId)
    .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName, branchId: r.branchId }));

  const leadDepartments = departmentRows
    .filter((r) => r.leadMemberId === memberId)
    .map((r) => ({ id: r.id, departmentName: r.departmentName, branchId: r.branchId }));
  const deputyDepartments = departmentRows
    .filter((r) => r.deputyMemberId === memberId)
    .map((r) => ({ id: r.id, departmentName: r.departmentName, branchId: r.branchId }));

  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = auth;

  // ── Scope-aware narrowing ────────────────────────────────────────────
  const scope = auth.scope;
  if (scope?.kind === 'fellowship') {
    return {
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      leadFellowships: leadFellowships.filter((f) => f.id === scope.id),
      coLeadFellowships: coLeadFellowships.filter((f) => f.id === scope.id),
      leadDepartments: [],
      deputyDepartments: [],
    };
  }
  if (scope?.kind === 'department') {
    return {
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: leadDepartments.filter((d) => d.id === scope.id),
      deputyDepartments: deputyDepartments.filter((d) => d.id === scope.id),
    };
  }
  if (scope?.kind === 'branch') {
    return {
      branchSystemAdminBranchIds: branchSystemAdminBranchIds.filter((b) => b === scope.id),
      branchDataAdminBranchIds: branchDataAdminBranchIds.filter((b) => b === scope.id),
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: [],
      deputyDepartments: [],
    };
  }

  return {
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    leadFellowships,
    coLeadFellowships,
    leadDepartments,
    deputyDepartments,
  };
}
