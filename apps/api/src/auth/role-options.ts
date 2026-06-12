import { and, eq, inArray, or } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branches,
  branchDepartments,
  departments,
  fellowships,
  memberRoles,
  roles,
} from '@kairos/database';
import type { RoleOption, RoleScope, SystemRole } from '@kairos/types';

interface ComputeAvailableRolesInput {
  memberId: string;
  systemRole: SystemRole;
  homeBranchId: string;
}

interface LeadershipFootprint {
  branchSystemAdminBranchIds: string[];
  branchDataAdminBranchIds: string[];
  leadFellowships: { id: string; fellowshipName: string }[];
  coLeadFellowships: { id: string; fellowshipName: string }[];
  leadDepartments: { id: string; departmentName: string }[];
  deputyDepartments: { id: string; departmentName: string }[];
}

/**
 * Pull every leadership-bearing relationship for a member in parallel:
 *   - Branch System Admin (member_roles → roles WHERE roleName='Branch System Admin')
 *   - Branch Data Admin (branch_departments → departments WHERE departmentName='Admin'
 *                        + member is lead or deputy)
 *   - Fellowship leader / co-leader
 *   - Branch-department lead / deputy
 *
 * Returned as raw rows so `computeAvailableRoles` can format display labels
 * after the branch-name lookup.
 */
async function fetchLeadershipFootprint(
  db: Database,
  memberId: string,
): Promise<LeadershipFootprint> {
  const [bsaRows, bdaRows, fellowshipRows, departmentRows] = await Promise.all([
    db
      .select({ branchId: memberRoles.branchId })
      .from(memberRoles)
      .innerJoin(roles, eq(memberRoles.roleId, roles.id))
      .where(
        and(
          eq(memberRoles.memberId, memberId),
          eq(memberRoles.isActive, true),
          eq(roles.roleName, 'Branch System Admin'),
        ),
      ),
    db
      .select({
        branchId: branchDepartments.branchId,
        leadMemberId: branchDepartments.leadMemberId,
        deputyMemberId: branchDepartments.deputyMemberId,
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          eq(branchDepartments.isActive, true),
          eq(departments.departmentName, 'Admin'),
          or(
            eq(branchDepartments.leadMemberId, memberId),
            eq(branchDepartments.deputyMemberId, memberId),
          ),
        ),
      ),
    db
      .select({
        id: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
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

  return {
    branchSystemAdminBranchIds: Array.from(new Set(bsaRows.map((r) => r.branchId))),
    // Branch Data Admin = lead OR deputy of the Admin department. Both
    // tiers get pastor-equivalent authority within their branch (see
    // requireBranchAdmin middleware).
    branchDataAdminBranchIds: Array.from(new Set(bdaRows.map((r) => r.branchId))),
    leadFellowships: fellowshipRows
      .filter((r) => r.leaderId === memberId)
      .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName })),
    coLeadFellowships: fellowshipRows
      .filter((r) => r.coLeaderId === memberId)
      .map((r) => ({ id: r.id, fellowshipName: r.fellowshipName })),
    leadDepartments: departmentRows
      .filter((r) => r.leadMemberId === memberId)
      .map((r) => ({ id: r.id, departmentName: r.departmentName })),
    deputyDepartments: departmentRows
      .filter((r) => r.deputyMemberId === memberId)
      .map((r) => ({ id: r.id, departmentName: r.departmentName })),
  };
}

/** Build a stable key for a role option — the client echoes it back on finalize. */
export function roleOptionKey(activeRole: SystemRole, scope?: RoleScope): string {
  if (!scope) return activeRole;
  return `${activeRole}:${scope.kind}:${scope.id}`;
}

/**
 * Compute every role the member is eligible to act as, with server-formatted
 * display labels. Order: admin-tier > pastor-tier > leader-tier > member.
 * Deduped by `key` — a member can't have two identical options.
 *
 * The mapping below is the contract between Phase 1 (this) and Phase 4
 * (scope-aware enforcement). If you change it, also update the comment on
 * `RoleScope` in `packages/types/src/api.ts`.
 */
export async function computeAvailableRoles(
  db: Database,
  input: ComputeAvailableRolesInput,
): Promise<RoleOption[]> {
  const { memberId, systemRole, homeBranchId } = input;
  const footprint = await fetchLeadershipFootprint(db, memberId);

  // Collect every branch ID we need a display name for, in one round trip.
  const branchIdsNeeded = new Set<string>();
  if (systemRole === 'pastor') branchIdsNeeded.add(homeBranchId);
  for (const id of footprint.branchSystemAdminBranchIds) branchIdsNeeded.add(id);
  for (const id of footprint.branchDataAdminBranchIds) branchIdsNeeded.add(id);

  const branchNameById = new Map<string, string>();
  if (branchIdsNeeded.size > 0) {
    const branchRows = await db
      .select({ id: branches.id, branchName: branches.branchName })
      .from(branches)
      .where(inArray(branches.id, Array.from(branchIdsNeeded)));
    for (const row of branchRows) {
      branchNameById.set(row.id, row.branchName);
    }
  }

  const options: RoleOption[] = [];
  const seenKeys = new Set<string>();

  function push(option: RoleOption): void {
    if (seenKeys.has(option.key)) return;
    seenKeys.add(option.key);
    options.push(option);
  }

  // ── Admin tier ───────────────────────────────────────────
  if (systemRole === 'admin') {
    push({
      activeRole: 'admin',
      displayLabel: 'Administrator',
      key: roleOptionKey('admin'),
    });
  }

  // Branch System Admin maps to activeRole='admin' WITH a branch scope —
  // pastor-equivalent + role-management authority on that branch only.
  for (const branchId of footprint.branchSystemAdminBranchIds) {
    const name = branchNameById.get(branchId) ?? 'Unknown branch';
    push({
      activeRole: 'admin',
      scope: { kind: 'branch', id: branchId },
      displayLabel: `Branch System Admin — ${name}`,
      key: roleOptionKey('admin', { kind: 'branch', id: branchId }),
    });
  }

  // ── Pastor tier ──────────────────────────────────────────
  if (systemRole === 'pastor') {
    const name = branchNameById.get(homeBranchId) ?? 'Unknown branch';
    push({
      activeRole: 'pastor',
      scope: { kind: 'branch', id: homeBranchId },
      displayLabel: `Pastor — ${name}`,
      key: roleOptionKey('pastor', { kind: 'branch', id: homeBranchId }),
    });
  }

  // Branch Data Admin maps to activeRole='pastor' WITH a branch scope —
  // pastoral-tier authority over branch data, no role management.
  for (const branchId of footprint.branchDataAdminBranchIds) {
    const name = branchNameById.get(branchId) ?? 'Unknown branch';
    push({
      activeRole: 'pastor',
      scope: { kind: 'branch', id: branchId },
      displayLabel: `Branch Data Admin — ${name}`,
      key: roleOptionKey('pastor', { kind: 'branch', id: branchId }),
    });
  }

  // ── Leader tier ──────────────────────────────────────────
  for (const f of footprint.leadFellowships) {
    push({
      activeRole: 'leader',
      scope: { kind: 'fellowship', id: f.id },
      displayLabel: `Fellowship Leader — ${f.fellowshipName}`,
      key: roleOptionKey('leader', { kind: 'fellowship', id: f.id }),
    });
  }
  for (const f of footprint.coLeadFellowships) {
    push({
      activeRole: 'leader',
      scope: { kind: 'fellowship', id: f.id },
      displayLabel: `Fellowship Co-Leader — ${f.fellowshipName}`,
      key: roleOptionKey('leader', { kind: 'fellowship', id: f.id }),
    });
  }
  for (const d of footprint.leadDepartments) {
    push({
      activeRole: 'leader',
      scope: { kind: 'department', id: d.id },
      displayLabel: `Department Lead — ${d.departmentName}`,
      key: roleOptionKey('leader', { kind: 'department', id: d.id }),
    });
  }
  for (const d of footprint.deputyDepartments) {
    push({
      activeRole: 'leader',
      scope: { kind: 'department', id: d.id },
      displayLabel: `Department Deputy — ${d.departmentName}`,
      key: roleOptionKey('leader', { kind: 'department', id: d.id }),
    });
  }

  // ── Member tier ──────────────────────────────────────────
  // Every authenticated user can drop down to plain-member view.
  push({
    activeRole: 'member',
    displayLabel: 'Member',
    key: roleOptionKey('member'),
  });

  return options;
}
