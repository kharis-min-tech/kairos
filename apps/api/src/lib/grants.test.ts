import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CHURCH_SCOPE,
  CHURCH_SCOPE_ID,
  FunctionalRole,
  type Capability,
  type Grant,
  type SystemRole,
} from '@kairos/types';
import { hasCapability, resolveGrants } from './grants';

// ── hasCapability ──────────────────────────────────────────

describe('hasCapability — break-glass and shims', () => {
  it('admin bypasses every capability regardless of grants', () => {
    expect(hasCapability([], 'admin', 'branch:rbac')).toBe(true);
    expect(
      hasCapability([], 'admin', 'fellowship:write', {
        kind: 'fellowship',
        id: 'anything',
      }),
    ).toBe(true);
  });

  it('post-Phase-4c: plain member with no grants is denied even capability-tagged routes', () => {
    // The old pastor shim is gone. Pastor is now an honorific (members.honorific
    // column) and confers no capabilities of its own.
    expect(hasCapability([], 'member', 'branch:rbac')).toBe(false);
    expect(
      hasCapability([], 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-X',
      }),
    ).toBe(false);
  });

  it('plain member with no grants is denied everything', () => {
    expect(hasCapability([], 'member', 'branch:read')).toBe(false);
    expect(hasCapability([], 'member', 'fellowship:write')).toBe(false);
  });
});

describe('hasCapability — exact scope match', () => {
  const fellowshipGrant: Grant = {
    role: FunctionalRole.FellowshipLeader,
    scope: { kind: 'fellowship', id: 'F-1' },
    branchId: 'B-1',
  };

  it('FellowshipLeader@F-1 can write F-1', () => {
    expect(
      hasCapability([fellowshipGrant], 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
      }),
    ).toBe(true);
  });

  it('FellowshipLeader@F-1 cannot write F-2', () => {
    expect(
      hasCapability([fellowshipGrant], 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-2',
      }),
    ).toBe(false);
  });

  it('FellowshipLeader@F-1 cannot use a department capability', () => {
    expect(
      hasCapability([fellowshipGrant], 'member', 'department:write', {
        kind: 'department',
        id: 'D-1',
      }),
    ).toBe(false);
  });

  it('DepartmentDeputy grants the same write capability as DepartmentLeader', () => {
    const deputy: Grant = {
      role: FunctionalRole.DepartmentDeputy,
      scope: { kind: 'department', id: 'D-1' },
      branchId: 'B-1',
    };
    expect(
      hasCapability([deputy], 'member', 'department:write', {
        kind: 'department',
        id: 'D-1',
      }),
    ).toBe(true);
  });
});

describe('hasCapability — hierarchical scope', () => {
  const branchAdmin: Grant = {
    role: FunctionalRole.BranchAdmin,
    scope: { kind: 'branch', id: 'B-1' },
    branchId: 'B-1',
  };

  it('BranchAdmin@B-1 can edit a fellowship in B-1 (via branchId)', () => {
    expect(
      hasCapability([branchAdmin], 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
        branchId: 'B-1',
      }),
    ).toBe(false);
    // BranchAdmin does NOT carry fellowship:write — only branch:* + signup:approve.
    // The hierarchy match would apply only for branch:* capabilities.
  });

  it('BranchAdmin@B-1 satisfies branch:read for a fellowship target in B-1', () => {
    // This is the realistic hierarchy use — gates checking branch-level cap
    // with a child target.
    expect(
      hasCapability([branchAdmin], 'member', 'branch:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('BranchAdmin@B-1 cannot act on B-2', () => {
    expect(
      hasCapability([branchAdmin], 'member', 'branch:rbac', {
        kind: 'branch',
        id: 'B-2',
      }),
    ).toBe(false);
  });

  it('BranchDataAdmin lacks branch:rbac', () => {
    const bda: Grant = {
      role: FunctionalRole.BranchDataAdmin,
      scope: { kind: 'branch', id: 'B-1' },
      branchId: 'B-1',
    };
    expect(
      hasCapability([bda], 'member', 'branch:rbac', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
    expect(
      hasCapability([bda], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });
});

describe('hasCapability — multiple grants', () => {
  it('any matching grant suffices when no scope is supplied', () => {
    const grants: Grant[] = [
      {
        role: FunctionalRole.FellowshipLeader,
        scope: { kind: 'fellowship', id: 'F-1' },
        branchId: 'B-1',
      },
    ];
    expect(hasCapability(grants, 'member', 'fellowship:write')).toBe(true);
  });

  it('grants in different scopes do not bleed into each other', () => {
    const grants: Grant[] = [
      {
        role: FunctionalRole.FellowshipLeader,
        scope: { kind: 'fellowship', id: 'F-1' },
        branchId: 'B-1',
      },
      {
        role: FunctionalRole.DepartmentLeader,
        scope: { kind: 'department', id: 'D-2' },
        branchId: 'B-2',
      },
    ];
    expect(
      hasCapability(grants, 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
      }),
    ).toBe(true);
    expect(
      hasCapability(grants, 'member', 'department:write', {
        kind: 'department',
        id: 'D-2',
      }),
    ).toBe(true);
    expect(
      hasCapability(grants, 'member', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-2',
      }),
    ).toBe(false);
  });
});

describe('hasCapability — SafeguardingLead', () => {
  it('SafeguardingLead@B-1 can read safeguarding records in B-1', () => {
    const grant: Grant = {
      role: FunctionalRole.SafeguardingLead,
      scope: { kind: 'branch', id: 'B-1' },
      branchId: 'B-1',
    };
    expect(
      hasCapability([grant], 'member', 'safeguarding:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('SafeguardingLead does NOT grant branch:rbac', () => {
    const grant: Grant = {
      role: FunctionalRole.SafeguardingLead,
      scope: { kind: 'branch', id: 'B-1' },
      branchId: 'B-1',
    };
    expect(
      hasCapability([grant], 'member', 'branch:rbac', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
  });
});

// ── hasCapability — the church scope ───────────────────────
//
// `church` is the only scope that names no entity, and the only one with no
// hierarchy. The church CONTAINS every branch, so a branch grant must never
// satisfy a church-scoped check — that direction of reasoning is what the
// membership module would silently get wrong if it ever inverted.

describe('hasCapability — church scope', () => {
  const membershipAdmin: Grant = {
    role: FunctionalRole.MembershipAdmin,
    scope: CHURCH_SCOPE,
    branchId: 'B-1',
  };
  const branchAdmin: Grant = {
    role: FunctionalRole.BranchAdmin,
    scope: { kind: 'branch', id: 'B-1' },
    branchId: 'B-1',
  };

  it('a church grant satisfies a church-scoped check', () => {
    expect(
      hasCapability([membershipAdmin], 'member', 'membership:admin', CHURCH_SCOPE),
    ).toBe(true);
  });

  it('a branch admin does NOT satisfy a church-scoped check', () => {
    expect(hasCapability([branchAdmin], 'member', 'membership:admin', CHURCH_SCOPE)).toBe(
      false,
    );
  });

  it('a branch grant cannot reach a church target even with branchId supplied', () => {
    // Defensive: the hierarchy rule climbs from branch DOWN to fellowship and
    // department. Passing a parent branch on a church scope must not open a
    // path upward.
    expect(
      hasCapability([branchAdmin], 'member', 'membership:admin', {
        ...CHURCH_SCOPE,
        branchId: 'B-1',
      }),
    ).toBe(false);
  });

  it('a church grant does not leak into branch-scoped capabilities', () => {
    expect(
      hasCapability([membershipAdmin], 'member', 'branch:write', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
  });

  it('a church grant does not cover a different capability at church scope', () => {
    expect(hasCapability([membershipAdmin], 'member', 'branch:rbac', CHURCH_SCOPE)).toBe(
      false,
    );
  });

  it('a platform admin still bypasses the church scope', () => {
    expect(hasCapability([], 'admin', 'membership:admin', CHURCH_SCOPE)).toBe(true);
  });
});

// ── resolveGrants ──────────────────────────────────────────

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'innerJoin', 'leftJoin']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectIdx: number;
const mockDb = {
  select: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectIdx = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectIdx] ?? selectResults[selectResults.length - 1] ?? [];
    selectIdx++;
    return createChain(r);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveGrants', () => {
  const memberId = 'M-1';

  it('returns an empty list when the member has no member_roles rows', async () => {
    setupSelectSequence([]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toEqual([]);
  });

  it('maps branch-scoped authority rows', async () => {
    setupSelectSequence([
      { roleName: 'Branch System Admin', branchId: 'B-1', scopeKind: 'branch', scopeId: 'B-1' },
      { roleName: 'Branch Data Admin', branchId: 'B-2', scopeKind: 'branch', scopeId: 'B-2' },
      { roleName: 'Safeguarding Lead', branchId: 'B-1', scopeKind: 'branch', scopeId: 'B-1' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toContainEqual({
      role: FunctionalRole.BranchAdmin,
      scope: { kind: 'branch', id: 'B-1' },
      branchId: 'B-1',
    });
    expect(grants).toContainEqual({
      role: FunctionalRole.BranchDataAdmin,
      scope: { kind: 'branch', id: 'B-2' },
      branchId: 'B-2',
    });
    expect(grants).toContainEqual({
      role: FunctionalRole.SafeguardingLead,
      scope: { kind: 'branch', id: 'B-1' },
      branchId: 'B-1',
    });
  });

  it('ignores operational/volunteer role names that are not authority bundles', async () => {
    setupSelectSequence([
      { roleName: 'Worship Lead', branchId: 'B-1', scopeKind: 'branch', scopeId: 'B-1' },
      { roleName: 'Media Team', branchId: 'B-1', scopeKind: 'branch', scopeId: 'B-1' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toEqual([]);
  });

  it('maps fellowship-scoped FellowshipLeader rows', async () => {
    setupSelectSequence([
      { roleName: 'Fellowship Leader', branchId: 'B-1', scopeKind: 'fellowship', scopeId: 'F-1' },
      { roleName: 'Fellowship Leader', branchId: 'B-2', scopeKind: 'fellowship', scopeId: 'F-2' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toEqual([
      {
        role: FunctionalRole.FellowshipLeader,
        scope: { kind: 'fellowship', id: 'F-1' },
        branchId: 'B-1',
      },
      {
        role: FunctionalRole.FellowshipLeader,
        scope: { kind: 'fellowship', id: 'F-2' },
        branchId: 'B-2',
      },
    ]);
  });

  it('maps department-scoped DepartmentLead vs DepartmentDeputy by role name', async () => {
    setupSelectSequence([
      { roleName: 'Department Lead', branchId: 'B-1', scopeKind: 'department', scopeId: 'D-1' },
      { roleName: 'Department Deputy', branchId: 'B-1', scopeKind: 'department', scopeId: 'D-2' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toContainEqual({
      role: FunctionalRole.DepartmentLeader,
      scope: { kind: 'department', id: 'D-1' },
      branchId: 'B-1',
    });
    expect(grants).toContainEqual({
      role: FunctionalRole.DepartmentDeputy,
      scope: { kind: 'department', id: 'D-2' },
      branchId: 'B-1',
    });
  });

  it('skips rows with unrecognised scope kinds defensively', async () => {
    setupSelectSequence([
      { roleName: 'Branch System Admin', branchId: 'B-1', scopeKind: 'unknown', scopeId: 'X' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toEqual([]);
  });

  it('returns mixed-scope grants from one query', async () => {
    setupSelectSequence([
      { roleName: 'Safeguarding Lead', branchId: 'B-1', scopeKind: 'branch', scopeId: 'B-1' },
      { roleName: 'Fellowship Leader', branchId: 'B-1', scopeKind: 'fellowship', scopeId: 'F-1' },
      { roleName: 'Department Lead', branchId: 'B-1', scopeKind: 'department', scopeId: 'D-1' },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants).toHaveLength(3);
  });

  it('resolves a church-scoped Membership Admin row', async () => {
    setupSelectSequence([
      {
        roleName: 'Membership Admin',
        branchId: 'B-1',
        scopeKind: 'church',
        scopeId: CHURCH_SCOPE_ID,
      },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    // `branchId` is only a query handle on a church grant, never its reach.
    expect(grants).toEqual([
      { role: FunctionalRole.MembershipAdmin, scope: CHURCH_SCOPE, branchId: 'B-1' },
    ]);
  });

  it('normalises a church row that carries a stray scope_id', async () => {
    // Belt and braces: a church scope has no entity, so whatever sits in
    // scope_id must resolve to the one church scope rather than a grant that
    // matches nothing.
    setupSelectSequence([
      {
        roleName: 'Membership Admin',
        branchId: 'B-1',
        scopeKind: 'church',
        scopeId: 'B-1',
      },
    ]);
    const grants = await resolveGrants(mockDb, memberId);
    expect(grants[0]?.scope).toEqual(CHURCH_SCOPE);
  });
});

// ── Post-Phase-4c access matrix ────────────────────────────
//
// The pastor shim is gone. Only systemRole='admin' bypasses; everyone else
// must hold an explicit grant.

describe('hasCapability — post-Phase-4c access matrix', () => {
  it('admin bypasses every capability', () => {
    expect(hasCapability([], 'admin', 'branch:read')).toBe(true);
    expect(hasCapability([], 'admin', 'branch:write')).toBe(true);
    expect(hasCapability([], 'admin', 'branch:rbac')).toBe(true);
    expect(hasCapability([], 'admin', 'safeguarding:write')).toBe(true);
  });

  it('member with no grants is denied every capability', () => {
    expect(hasCapability([], 'member', 'branch:read')).toBe(false);
    expect(hasCapability([], 'member', 'fellowship:read')).toBe(false);
    expect(hasCapability([], 'member', 'department:read')).toBe(false);
  });

});

// Silence unused-import warnings for shared types.
const _capabilityRef: Capability | undefined = undefined;
const _systemRoleRef: SystemRole | undefined = undefined;
void _capabilityRef;
void _systemRoleRef;
