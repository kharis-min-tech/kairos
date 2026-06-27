// ── RBAC catalog ──────────────────────────────────────────
//
// Named functional role bundles + the capability strings each grants.
// Roles are scoped: BranchAdmin@<branchId>, FellowshipLeader@<fellowshipId>,
// etc. Capabilities are the verbs gates check (`branch:write`,
// `fellowship:read`...). This file is the SINGLE place to add a new
// functional role or capability; the rest of the codebase reads from here.

import type { RoleScope } from './api';

export const FunctionalRole = {
  BranchAdmin: 'BranchAdmin',
  BranchDataAdmin: 'BranchDataAdmin',
  FellowshipLeader: 'FellowshipLeader',
  DepartmentLeader: 'DepartmentLeader',
  DepartmentDeputy: 'DepartmentDeputy',
  SafeguardingLead: 'SafeguardingLead',
  NewBelieversMentor: 'NewBelieversMentor',
  NewBelieversTeacher: 'NewBelieversTeacher',
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
