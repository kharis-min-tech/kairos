import { describe, it, expect } from 'vitest';
import { CHURCH_SCOPE, type RoleScope } from './api';
import {
  FunctionalRole,
  RoleCapabilities,
  RoleScopeKind,
  matchesCapability,
  type Grant,
} from './rbac';

/**
 * The matcher the API enforces with and both clients gate on. It used to be
 * hand-copied into all three; these tests exist because the church scope
 * added a rule that any copy could have failed to learn.
 */

function grant(role: FunctionalRole, scope: RoleScope, branchId = 'B-1'): Grant {
  return { role, scope, branchId };
}

const branchAdmin = grant(FunctionalRole.BranchAdmin, { kind: 'branch', id: 'B-1' });
const membershipAdmin = grant(FunctionalRole.MembershipAdmin, CHURCH_SCOPE);
const safeguardingHead = grant(FunctionalRole.SafeguardingHead, CHURCH_SCOPE);
const safeguardingLead = grant(FunctionalRole.SafeguardingLead, { kind: 'branch', id: 'B-1' });
const branchPastor = grant(FunctionalRole.BranchPastor, { kind: 'branch', id: 'B-1' });

describe('matchesCapability — break-glass', () => {
  it('a platform admin bypasses every capability and scope', () => {
    expect(matchesCapability([], 'admin', 'branch:rbac')).toBe(true);
    expect(matchesCapability([], 'admin', 'membership:admin', CHURCH_SCOPE)).toBe(true);
  });

  it('a member with no grants is denied everything', () => {
    expect(matchesCapability([], 'member', 'branch:read')).toBe(false);
    expect(matchesCapability([], 'member', 'membership:admin', CHURCH_SCOPE)).toBe(false);
  });
});

describe('matchesCapability — scope matching', () => {
  it('matches an exact scope', () => {
    expect(
      matchesCapability([branchAdmin], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('does not match a different id of the same kind', () => {
    expect(
      matchesCapability([branchAdmin], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-2',
      }),
    ).toBe(false);
  });

  it('lets a branch grant reach a fellowship in the same branch', () => {
    expect(
      matchesCapability([branchAdmin], 'member', 'branch:read', {
        kind: 'fellowship',
        id: 'F-1',
        branchId: 'B-1',
      }),
    ).toBe(true);
  });

  it('any grant of the capability suffices when no scope is given', () => {
    expect(matchesCapability([branchAdmin], 'member', 'branch:write')).toBe(true);
  });
});

// ── The church scope ──────────────────────────────────────
//
// The one scope naming no entity, and the one with no hierarchy. The church
// CONTAINS every branch, not the reverse, so reasoning upward from a branch
// grant must never reach it.

describe('matchesCapability — church scope', () => {
  it('a church grant satisfies a church-scoped check', () => {
    expect(
      matchesCapability([membershipAdmin], 'member', 'membership:admin', CHURCH_SCOPE),
    ).toBe(true);
  });

  it('a branch admin does NOT satisfy a church-scoped check', () => {
    expect(
      matchesCapability([branchAdmin], 'member', 'membership:admin', CHURCH_SCOPE),
    ).toBe(false);
  });

  it('a branch grant cannot climb to a church target even with branchId supplied', () => {
    // The hierarchy rule descends from branch to fellowship and department.
    // Passing a parent branch on a church scope must not open a path upward.
    expect(
      matchesCapability([branchAdmin], 'member', 'membership:admin', {
        ...CHURCH_SCOPE,
        branchId: 'B-1',
      }),
    ).toBe(false);
  });

  it('a church grant does not leak into branch-scoped capabilities', () => {
    expect(
      matchesCapability([membershipAdmin], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
  });

  it('a church grant covers only its own capability at church scope', () => {
    expect(matchesCapability([membershipAdmin], 'member', 'branch:rbac', CHURCH_SCOPE)).toBe(
      false,
    );
  });
});

// ── Catalog integrity ─────────────────────────────────────

describe('the RBAC catalog', () => {
  it('gives every functional role a capability bundle and a scope kind', () => {
    // A role missing from either map silently grants nothing, or constructs a
    // grant with the wrong scope shape that then matches nothing.
    for (const role of Object.values(FunctionalRole)) {
      expect(RoleCapabilities[role], `${role} has no capabilities`).toBeDefined();
      expect(RoleScopeKind[role], `${role} has no scope kind`).toBeDefined();
    }
  });

  it('scopes MembershipAdmin to the church, never to a branch', () => {
    // A branch scope cannot describe a church-wide cohort. This is the whole
    // reason the church scope exists, so pin it.
    expect(RoleScopeKind.MembershipAdmin).toBe('church');
  });

  it('scopes SafeguardingHead to the church, so it can reach every branch', () => {
    // A concern raised in one branch may need to escape that branch. A branch
    // grant could not describe that reach.
    expect(RoleScopeKind.SafeguardingHead).toBe('church');
  });

  it('keeps welfare and safeguarding in different hands', () => {
    // The whole point of the split: a Branch Data Admin is branch ops with no
    // pastoral standing and must see neither queue, and a Safeguarding Lead
    // is independent of branch leadership and must not inherit welfare.
    expect(RoleCapabilities.BranchDataAdmin).not.toContain('welfare:read');
    expect(RoleCapabilities.BranchDataAdmin).not.toContain('safeguarding:read');
    expect(RoleCapabilities.BranchAdmin).toContain('welfare:read');
    expect(RoleCapabilities.SafeguardingLead).not.toContain('welfare:read');
    expect(RoleCapabilities.SafeguardingHead).not.toContain('welfare:read');
  });

  it('gives BranchPastor safeguarding sight and nothing else', () => {
    // It is derived from branch_leadership, not granted, and exists purely to
    // separate a Main Pastor from a Minister holding the same BranchAdmin
    // grant. Anything else it carried would be invisible authority.
    expect(RoleCapabilities.BranchPastor).toEqual(['safeguarding:read', 'safeguarding:write']);
  });
});

// ── Church reach ──────────────────────────────────────────

describe('a church grant', () => {
  it('reaches a branch target', () => {
    expect(
      matchesCapability([safeguardingHead], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-9',
      }),
    ).toBe(true);
  });

  it('reaches a fellowship and a department target', () => {
    expect(
      matchesCapability([safeguardingHead], 'member', 'safeguarding:read', {
        kind: 'fellowship',
        id: 'F-1',
        branchId: 'B-9',
      }),
    ).toBe(true);
    expect(
      matchesCapability([safeguardingHead], 'member', 'safeguarding:write', {
        kind: 'department',
        id: 'D-1',
        branchId: 'B-9',
      }),
    ).toBe(true);
  });

  it('still carries only its own capabilities down', () => {
    // Reach is not power. The head reaches every branch, but only ever for
    // safeguarding.
    expect(
      matchesCapability([safeguardingHead], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-9',
      }),
    ).toBe(false);
  });
});

describe('a branch safeguarding grant', () => {
  it('covers its own branch', () => {
    expect(
      matchesCapability([safeguardingLead], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('does not cover another branch', () => {
    expect(
      matchesCapability([safeguardingLead], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-2',
      }),
    ).toBe(false);
  });

  it('never satisfies a church-scoped check', () => {
    // The head's reach is not reachable by climbing. A lead is not a head.
    expect(
      matchesCapability([safeguardingLead], 'member', 'safeguarding:read', CHURCH_SCOPE),
    ).toBe(false);
  });
});

describe('the pastor / minister split', () => {
  it('lets a Main Pastor read their branch safeguarding queue', () => {
    expect(
      matchesCapability([branchAdmin, branchPastor], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('denies it to a Minister holding the same BranchAdmin grant', () => {
    // This is the case the role→capability map alone cannot express: both
    // carry BranchAdmin, and only one carries the derived BranchPastor.
    expect(
      matchesCapability([branchAdmin], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
  });

  it('still gives both of them welfare', () => {
    expect(
      matchesCapability([branchAdmin], 'member', 'welfare:read', { kind: 'branch', id: 'B-1' }),
    ).toBe(true);
  });
});
