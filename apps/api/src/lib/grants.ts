import { eq, and } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberRoles, roles } from '@kairos/database';
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
  'Fellowship Leader': FunctionalRole.FellowshipLeader,
  'Department Lead': FunctionalRole.DepartmentLeader,
  'Department Deputy': FunctionalRole.DepartmentDeputy,
  'New Believers Mentor': FunctionalRole.NewBelieversMentor,
  'New Believers Teacher': FunctionalRole.NewBelieversTeacher,
};

// ── resolveGrants ──────────────────────────────────────────
//
// RBAC Phase 3f: `member_roles` is now the single source of truth. Each row
// carries (member_id, role_id, branch_id, scope_kind, scope_id, is_active)
// — together that's everything needed to mint a Grant. The legacy FK + Admin-
// dept derivations were removed in this phase; service-layer write-through
// (Phase 3c/3d) keeps `member_roles` in sync with fellowships.leaderId etc.
//
// Inactive rows (`is_active = false`) and unknown role names are excluded.
// Result is a flat list of (role, scope, branchId) triples ready for
// `hasCapability` lookup.

export async function resolveGrants(
  db: Database,
  memberId: string,
): Promise<Grant[]> {
  const rows = await db
    .select({
      roleName: roles.roleName,
      branchId: memberRoles.branchId,
      scopeKind: memberRoles.scopeKind,
      scopeId: memberRoles.scopeId,
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

  const out: Grant[] = [];
  for (const row of rows) {
    const fnRole = DB_ROLE_NAME_TO_FUNCTIONAL[row.roleName];
    if (!fnRole) continue;
    const scopeKind = row.scopeKind as RoleScope['kind'];
    if (scopeKind !== 'branch' && scopeKind !== 'fellowship' && scopeKind !== 'department') {
      continue;
    }
    out.push({
      role: fnRole,
      scope: { kind: scopeKind, id: row.scopeId },
      branchId: row.branchId,
    });
  }
  return out;
}

// ── hasCapability ──────────────────────────────────────────
//
// Pure capability lookup over a grant list. Single transitional shim:
//
//   - `systemRole === 'admin'` → always true. The break-glass platform owner
//     bypasses everything; matches today's escape-hatch semantics and
//     survives the rebuild.
//
// RBAC Phase 4c: the `'pastor'` shim is gone. Pastor is now a display-only
// honorific (members.honorific column), not a permission. A "Pastor" who
// holds no grants gets no admin access — see Phase 4a's migration for the
// systemRole collapse that drove this.
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

// RBAC Phase 3f: thin wrapper that reads `auth.grants` and delegates to
// `hasCapability`. The Phase 2 legacy-array fallback was removed in this
// phase — Phase 3e backfilled BSA/BDA into `member_roles`, so grants are
// now the authoritative signal.
export function authHasCapability(
  auth: AuthContext & { grants?: readonly Grant[] },
  cap: Capability,
  scope?: RoleScope & { branchId?: string },
): boolean {
  return hasCapability(auth.grants ?? [], auth.systemRole, cap, scope);
}

/**
 * Variadic OR over capabilities. Returns true if the caller holds ANY of the
 * supplied capabilities (any scope). Used by service-level checks that
 * accept "branch-tier OR fellowship-tier OR department-tier" leadership.
 */
export function authHasAnyCapability(auth: AuthContext, ...caps: Capability[]): boolean {
  for (const cap of caps) {
    if (authHasCapability(auth, cap)) return true;
  }
  return false;
}
