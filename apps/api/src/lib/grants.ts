import { eq, and, or } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  memberRoles,
  roles,
  fellowships,
  branchDepartments,
} from '@kairos/database';
import {
  type AuthContext,
  type Capability,
  type Grant,
  type RoleScope,
  type SystemRole,
  FunctionalRole,
  RoleCapabilities,
} from '@kairos/types';

// ── DB role-name → FunctionalRole mapping ──────────────────
//
// Authority-bearing rows in the `roles` table use these display names.
// Operational/volunteer roles in the same table (e.g. "Worship Lead",
// "Media Team") aren't authority bundles — they're skipped here.

const DB_ROLE_NAME_TO_FUNCTIONAL: Record<string, FunctionalRole> = {
  'Branch System Admin': FunctionalRole.BranchAdmin,
  'Branch Data Admin': FunctionalRole.BranchDataAdmin,
  'Safeguarding Lead': FunctionalRole.SafeguardingLead,
};

// ── resolveGrants ──────────────────────────────────────────
//
// Builds the active grant list for a member from three data sources:
//   1. `member_roles JOIN roles` — explicit authority assignments
//      (BranchAdmin / BranchDataAdmin / SafeguardingLead).
//   2. `fellowships.leaderId` / `coLeaderId` — derived FellowshipLeader
//      grants. Phase 3 will move these into member_roles via service-layer
//      write-through; until then, the FK is the source of truth.
//   3. `branch_departments.leadMemberId` / `deputyMemberId` — derived
//      DepartmentLeader / DepartmentDeputy grants. Same Phase 3 caveat.
//
// Inactive rows (`is_active = false`) are excluded. The result is a flat
// list of (role, scope, branchId) triples ready for `hasCapability` lookup.

export async function resolveGrants(
  db: Database,
  memberId: string,
): Promise<Grant[]> {
  const out: Grant[] = [];

  // 1) member_roles JOIN roles
  const explicitRows = await db
    .select({
      roleName: roles.roleName,
      branchId: memberRoles.branchId,
    })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(
      and(
        eq(memberRoles.memberId, memberId),
        eq(memberRoles.isActive, true),
        eq(roles.isActive, true),
      ),
    );

  for (const row of explicitRows) {
    const fnRole = DB_ROLE_NAME_TO_FUNCTIONAL[row.roleName];
    if (!fnRole) continue;
    out.push({
      role: fnRole,
      scope: { kind: 'branch', id: row.branchId },
      branchId: row.branchId,
    });
  }

  // 2) Fellowship leadership FKs
  const fellowshipRows = await db
    .select({
      id: fellowships.id,
      branchId: fellowships.branchId,
    })
    .from(fellowships)
    .where(
      and(
        eq(fellowships.isActive, true),
        or(
          eq(fellowships.leaderId, memberId),
          eq(fellowships.coLeaderId, memberId),
        ),
      ),
    );

  for (const row of fellowshipRows) {
    out.push({
      role: FunctionalRole.FellowshipLeader,
      scope: { kind: 'fellowship', id: row.id },
      branchId: row.branchId,
    });
  }

  // 3) Department leadership FKs
  const deptRows = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
    })
    .from(branchDepartments)
    .where(
      and(
        eq(branchDepartments.isActive, true),
        or(
          eq(branchDepartments.leadMemberId, memberId),
          eq(branchDepartments.deputyMemberId, memberId),
        ),
      ),
    );

  for (const row of deptRows) {
    const role =
      row.leadMemberId === memberId
        ? FunctionalRole.DepartmentLeader
        : FunctionalRole.DepartmentDeputy;
    out.push({
      role,
      scope: { kind: 'department', id: row.id },
      branchId: row.branchId,
    });
  }

  return out;
}

// ── hasCapability ──────────────────────────────────────────
//
// Pure capability lookup over a grant list. Two transitional shims:
//
//   - `systemRole === 'admin'` → always true. The break-glass platform owner
//     bypasses everything; matches today's escape-hatch semantics and
//     survives the rebuild.
//   - `systemRole === 'pastor'` → always true. Phase 0/1/2 keep pastor's
//     branch-scope-bypass behavior unchanged so gates can flip to capability
//     checks without changing the effective access matrix. Phase 4 narrows
//     pastors to `BranchAdmin@home_branch` via migration and removes this
//     shim.
//
// Scope matching:
//   - No `scope` arg → any grant of `cap` suffices.
//   - Exact match → grant.scope.{kind,id} === scope.{kind,id}.
//   - Hierarchical match → a `branch`-scoped grant covers fellowship/
//     department targets in the same branch, provided the caller passes
//     the target's parent `branchId` on the scope object.

export function hasCapability(
  grants: readonly Grant[],
  systemRole: SystemRole,
  cap: Capability,
  scope?: RoleScope & { branchId?: string },
): boolean {
  if (systemRole === 'admin') return true;
  if (systemRole === 'pastor') return true;

  const targetBranchId =
    scope?.kind === 'branch' ? scope.id : scope?.branchId;

  for (const grant of grants) {
    const caps = RoleCapabilities[grant.role];
    if (!caps.includes(cap)) continue;
    if (!scope) return true;
    if (grant.scope.kind === scope.kind && grant.scope.id === scope.id) {
      return true;
    }
    if (
      grant.scope.kind === 'branch' &&
      targetBranchId &&
      grant.scope.id === targetBranchId
    ) {
      return true;
    }
  }
  return false;
}

// Convenience wrapper for AuthContext consumers post-Phase-1 (when grants
// live on the auth payload). Phase 0 callers can still call hasCapability
// directly with explicit grants.
export function authHasCapability(
  auth: AuthContext & { grants?: readonly Grant[] },
  cap: Capability,
  scope?: RoleScope & { branchId?: string },
): boolean {
  return hasCapability(auth.grants ?? [], auth.systemRole, cap, scope);
}
