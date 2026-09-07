// ── RBAC catalog ──────────────────────────────────────────
//
// Named functional role bundles + the capability strings each grants.
// Roles are scoped: BranchAdmin@<branchId>, FellowshipLeader@<fellowshipId>,
// etc. Capabilities are the verbs gates check (`branch:write`,
// `fellowship:read`...). This file is the SINGLE place to add a new
// functional role or capability; the rest of the codebase reads from here.

import type { RoleScope } from './api';
import type { SystemRole } from './enums';

export const FunctionalRole = {
  BranchAdmin: 'BranchAdmin',
  BranchDataAdmin: 'BranchDataAdmin',
  FellowshipLeader: 'FellowshipLeader',
  DepartmentLeader: 'DepartmentLeader',
  DepartmentDeputy: 'DepartmentDeputy',
  SafeguardingLead: 'SafeguardingLead',
  NewBelieversMentor: 'NewBelieversMentor',
  NewBelieversTeacher: 'NewBelieversTeacher',
  // The only church-scoped role. Runs the membership class programme end to
  // end: cohorts, sessions, the interest pool, admission, marking, graduation.
  // Deliberately NOT branch-scoped — cohorts are church-wide, so a branch
  // grant could not describe authority over one.
  MembershipAdmin: 'MembershipAdmin',
} as const;
export type FunctionalRole = (typeof FunctionalRole)[keyof typeof FunctionalRole];

export const Capability = {
  BranchRead: 'branch:read',
  BranchWrite: 'branch:write',
  BranchRbac: 'branch:rbac',
  FellowshipRead: 'fellowship:read',
  FellowshipWrite: 'fellowship:write',
  DepartmentRead: 'department:read',
  DepartmentWrite: 'department:write',
  SafeguardingRead: 'safeguarding:read',
  SafeguardingWrite: 'safeguarding:write',
  SignupApprove: 'signup:approve',
  NewBelieversMentor: 'newbelievers:mentor',
  NewBelieversTeach: 'newbelievers:teach',
  // Everything on the membership class programme is one capability. There is
  // no read/write split: the member-facing surfaces (browse cohorts, express
  // interest, see your own progress) need no capability at all, so anything
  // this gates is administration.
  MembershipAdmin: 'membership:admin',
} as const;
export type Capability = (typeof Capability)[keyof typeof Capability];

export const RoleCapabilities: Record<FunctionalRole, readonly Capability[]> = {
  // Branch System Admin (DB role: "Branch System Admin") — the RBAC gatekeeper
  // for a branch. Can grant/revoke roles AND edit branch data, but does NOT
  // bypass fellowship/department scope (that's pastor-equivalent power, which
  // Phase 4 will narrow away).
  BranchAdmin: ['branch:read', 'branch:write', 'branch:rbac', 'signup:approve'],
  // Branch Data Admin — branch ops without RBAC. Promoted from "Admin
  // department lead" in the prior model.
  BranchDataAdmin: ['branch:read', 'branch:write', 'signup:approve'],
  FellowshipLeader: ['fellowship:read', 'fellowship:write'],
  DepartmentLeader: ['department:read', 'department:write'],
  DepartmentDeputy: ['department:read', 'department:write'],
  SafeguardingLead: ['safeguarding:read', 'safeguarding:write'],
  NewBelieversMentor: ['newbelievers:mentor'],
  NewBelieversTeacher: ['newbelievers:teach'],
  MembershipAdmin: ['membership:admin'],
};

// Which scope kind each role's `scope.kind` field must be. Used by
// resolveGrants to construct correctly-shaped grants and by hasCapability
// for hierarchy resolution.
export const RoleScopeKind: Record<FunctionalRole, RoleScope['kind']> = {
  BranchAdmin: 'branch',
  BranchDataAdmin: 'branch',
  FellowshipLeader: 'fellowship',
  DepartmentLeader: 'department',
  DepartmentDeputy: 'department',
  SafeguardingLead: 'branch',
  NewBelieversMentor: 'branch',
  NewBelieversTeacher: 'branch',
  MembershipAdmin: 'church',
};

// A single role assignment with its scope. For fellowship/department grants,
// `branchId` carries the parent branch so hierarchy-aware capability checks
// (a BranchAdmin@B implicitly grants on fellowships in B) don't need a
// second DB hop.
export interface Grant {
  role: FunctionalRole;
  scope: RoleScope;
  branchId: string;
}

/**
 * The capability matcher. THE one implementation.
 *
 * The API enforces with it and both clients gate UI affordances with it, so
 * that a surface a client offers is exactly a surface the server will allow.
 * It lived in three hand-copied places until the church scope arrived and
 * added a rule that all three would have had to learn separately; the copies
 * are gone. Keep it pure, and keep it here beside the catalog it reads.
 *
 * Rules:
 *   - `systemRole === 'admin'` → always true. The break-glass platform owner
 *     bypasses everything.
 *   - No `scope` argument → any grant carrying `cap` suffices.
 *   - Exact match → grant.scope.{kind,id} equals scope.{kind,id}.
 *   - Hierarchical match → a `branch` grant covers fellowship and department
 *     targets in the same branch, provided the caller passes the target's
 *     parent `branchId` on the scope object.
 *   - `church` targets take NO hierarchical match. The church contains every
 *     branch, not the other way round, so a branch grant must never satisfy a
 *     church-scoped check — only a church grant, or a platform admin, does.
 */
export function matchesCapability(
  grants: readonly Grant[],
  systemRole: SystemRole,
  cap: Capability,
  scope?: RoleScope & { branchId?: string },
): boolean {
  if (systemRole === 'admin') return true;

  // A church target is never reachable by climbing the branch hierarchy, so
  // it contributes no parent branch even if a caller passes one.
  const targetBranchId =
    scope?.kind === 'church'
      ? undefined
      : scope?.kind === 'branch'
        ? scope.id
        : scope?.branchId;

  for (const grant of grants) {
    const caps: readonly Capability[] = RoleCapabilities[grant.role] ?? [];
    if (!caps.includes(cap)) continue;
    if (!scope) return true;
    if (grant.scope.kind === scope.kind && grant.scope.id === scope.id) return true;
    if (grant.scope.kind === 'branch' && targetBranchId && grant.scope.id === targetBranchId) {
      return true;
    }
  }
  return false;
}
