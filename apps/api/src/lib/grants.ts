import { eq, and } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { memberRoles, roles } from '@kairos/database';
import {
  type AuthContext,
  type Capability,
  type Grant,
  type RoleScope,
  type SystemRole,
  CHURCH_SCOPE,
  FunctionalRole,
  matchesCapability,
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
  'Membership Admin': FunctionalRole.MembershipAdmin,
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
    if (
      scopeKind !== 'branch' &&
      scopeKind !== 'fellowship' &&
      scopeKind !== 'department' &&
      scopeKind !== 'church'
    ) {
      continue;
    }
    // A church grant's stored scope_id is the nil-UUID sentinel and its
    // branch_id is only the grantee's home branch (a query handle, not the
    // grant's reach). Normalising to CHURCH_SCOPE_ID here means a row that
    // somehow carries a real uuid still resolves to the one church scope
    // rather than a grant that matches nothing.
    const scope: RoleScope =
      scopeKind === 'church' ? CHURCH_SCOPE : { kind: scopeKind, id: row.scopeId };
    out.push({
      role: fnRole,
      scope,
      branchId: row.branchId,
    });
  }
  return out;
}

// ── hasCapability ──────────────────────────────────────────
//
// The API's name for `matchesCapability` from @kairos/types, which is where
// the matcher itself lives — beside the role/capability catalog it reads, so
// that this server and both clients gate on ONE implementation and a surface
// a client offers is exactly a surface this server will allow. The rules are
// documented there; this stays as the API-side name because it is called
// everywhere and the indirection is free.
//
// RBAC Phase 4c: the `'pastor'` shim is gone. Pastor is now a display-only
// honorific (members.honorific column), not a permission. A "Pastor" who
// holds no grants gets no admin access — see Phase 4a's migration for the
// systemRole collapse that drove this.

export function hasCapability(
  grants: readonly Grant[],
  systemRole: SystemRole,
  cap: Capability,
  scope?: RoleScope & { branchId?: string },
): boolean {
  return matchesCapability(grants, systemRole, cap, scope);
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
