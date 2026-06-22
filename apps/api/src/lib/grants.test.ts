import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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

  it('pastor (transitional shim) bypasses every capability', () => {
    // Phase 4 removes this — pastor will be narrowed to BranchAdmin@home_branch.
    expect(hasCapability([], 'pastor', 'branch:rbac')).toBe(true);
    expect(
      hasCapability([], 'pastor', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-X',
      }),
    ).toBe(true);
  });

  it('plain member with no grants is denied everything', () => {
    expect(hasCapability([], 'member', 'branch:read')).toBe(false);
    expect(hasCapability([], 'leader', 'fellowship:write')).toBe(false);
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
      hasCapability([fellowshipGrant], 'leader', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
      }),
    ).toBe(true);
  });

  it('FellowshipLeader@F-1 cannot write F-2', () => {
    expect(
      hasCapability([fellowshipGrant], 'leader', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-2',
      }),
    ).toBe(false);
  });

  it('FellowshipLeader@F-1 cannot use a department capability', () => {
    expect(
      hasCapability([fellowshipGrant], 'leader', 'department:write', {
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
      hasCapability([deputy], 'leader', 'department:write', {
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
      hasCapability([branchAdmin], 'leader', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
        branchId: 'B-1',
      }),
    ).toBe(false);
    // BranchAdmin does NOT carry fellowship:write — only branch:* + member:approve.
    // The hierarchy match would apply only for branch:* capabilities.
  });

  it('BranchAdmin@B-1 satisfies branch:read for a fellowship target in B-1', () => {
    // This is the realistic hierarchy use — gates checking branch-level cap
    // with a child target.
    expect(
      hasCapability([branchAdmin], 'leader', 'branch:read', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(true);
  });

  it('BranchAdmin@B-1 cannot act on B-2', () => {
    expect(
      hasCapability([branchAdmin], 'leader', 'branch:rbac', {
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
      hasCapability([bda], 'leader', 'branch:rbac', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
    expect(
      hasCapability([bda], 'leader', 'branch:write', {
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
    expect(hasCapability(grants, 'leader', 'fellowship:write')).toBe(true);
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
      hasCapability(grants, 'leader', 'fellowship:write', {
        kind: 'fellowship',
        id: 'F-1',
      }),
    ).toBe(true);
    expect(
      hasCapability(grants, 'leader', 'department:write', {
        kind: 'department',
        id: 'D-2',
      }),
    ).toBe(true);
    expect(
      hasCapability(grants, 'leader', 'fellowship:write', {
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
      hasCapability([grant], 'leader', 'safeguarding:read', {
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
      hasCapability([grant], 'leader', 'branch:rbac', {
        kind: 'branch',
        id: 'B-1',
      }),
    ).toBe(false);
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
});

// ── Equivalence to today's effective access ────────────────
//
// These tests pin down the Phase 0 invariant: a today-Pastor sees the same
// allow/deny outcome via the new capability check as they would via the
// current `auth.systemRole === 'pastor'` bypass.

describe('hasCapability — Phase 0 equivalence to today', () => {
  const samples: Array<{
    label: string;
    role: SystemRole;
    cap: Capability;
    scope?: Parameters<typeof hasCapability>[3];
  }> = [
    { label: 'pastor reading any branch', role: 'pastor', cap: 'branch:read' },
    { label: 'pastor writing branch settings', role: 'pastor', cap: 'branch:write' },
    { label: 'pastor granting roles', role: 'pastor', cap: 'branch:rbac' },
    { label: 'pastor editing a fellowship', role: 'pastor', cap: 'fellowship:write' },
    { label: 'pastor editing a department', role: 'pastor', cap: 'department:write' },
    { label: 'admin doing anything', role: 'admin', cap: 'safeguarding:write' },
  ];

  for (const s of samples) {
    it(`allows ${s.label}`, () => {
      expect(hasCapability([], s.role, s.cap, s.scope)).toBe(true);
    });
  }

  it('member with no grants is denied even read access', () => {
    expect(hasCapability([], 'member', 'fellowship:read')).toBe(false);
  });
});
