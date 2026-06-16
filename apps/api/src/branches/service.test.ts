import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Flexible Drizzle mock builder ─────────────────────────
// Each chainable method returns itself, `.then()` resolves configured result.
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'orderBy', 'limit',
    'insert', 'values', 'returning',
    'update', 'set',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain thenable so `await db.select()...` works
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResult: unknown;
let insertResult: unknown;
let updateResult: unknown;

// Second-call select results (for secondary lookups within the same function)
let selectResults: unknown[];
let selectCallIndex: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelect(result: unknown) {
  selectResult = result;
  selectResults = [result];
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(selectResult));
}

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  const fn = mockDb.select as ReturnType<typeof vi.fn>;
  fn.mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert(result: unknown) {
  insertResult = result;
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(insertResult));
}

function setupUpdate(result: unknown = undefined) {
  updateResult = result;
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(updateResult));
}

// ── Fixtures ──────────────────────────────────────────────

const regionId = '110e8400-0000-0000-0000-000000000001';
const branchId = '220e8400-0000-0000-0000-000000000002';
const memberId = '330e8400-0000-0000-0000-000000000003';
const leadershipId = '440e8400-0000-0000-0000-000000000004';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId: branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const memberAuth = { memberId: '000-member', email: 'member@test.com', systemRole: 'member' as const, branchId: branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const otherBranchAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch-id', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };

const sampleRegion = { id: regionId, regionName: 'North Region', country: 'Nigeria', createdAt: new Date(), updatedAt: new Date() };
const sampleBranch = {
  id: branchId, branchName: 'Lagos Branch', regionId, branchType: 'Main',
  address: '123 St', city: 'Lagos', postalCode: null, phone: null, email: null,
  establishedDate: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
};
const sampleLeadership = {
  id: leadershipId, branchId, memberId, role: 'Main Pastor',
  startDate: '2024-01-01', endDate: null, isCurrent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ── Region Tests ──────────────────────────────────────────

describe('listRegions', () => {
  it('should return all regions', async () => {
    const { listRegions } = await import('./service');
    setupSelect([sampleRegion]);
    const result = await listRegions(mockDb);
    expect(result).toEqual([sampleRegion]);
    expect(mockDb.select).toHaveBeenCalled();
  });
});

describe('createRegion', () => {
  it('should create a region when name is unique', async () => {
    const { createRegion } = await import('./service');
    // First select: check existing → empty; Insert: returns new region
    setupSelectSequence([]);
    setupInsert([sampleRegion]);

    const result = await createRegion(mockDb, { regionName: 'North Region', country: 'Nigeria' });
    expect(result).toEqual(sampleRegion);
  });

  it('should throw ConflictError for duplicate region name', async () => {
    const { createRegion } = await import('./service');
    setupSelectSequence([sampleRegion]);

    await expect(
      createRegion(mockDb, { regionName: 'North Region', country: 'Nigeria' }),
    ).rejects.toThrow('Region name already exists');
  });
});

// ── Branch CRUD Tests ─────────────────────────────────────

describe('listBranches', () => {
  it('should return all active branches for admin', async () => {
    const { listBranches } = await import('./service');
    const branchWithRegion = { ...sampleBranch, regionName: 'North Region' };
    setupSelect([branchWithRegion]);

    const result = await listBranches(mockDb, adminAuth);
    expect(result).toEqual([branchWithRegion]);
  });

  it('should return only own branch for non-admin', async () => {
    const { listBranches } = await import('./service');
    const branchWithRegion = { ...sampleBranch, regionName: 'North Region' };
    setupSelect([branchWithRegion]);

    const result = await listBranches(mockDb, memberAuth);
    expect(result).toEqual([branchWithRegion]);
  });
});

describe('getBranch', () => {
  it('should return branch for admin', async () => {
    const { getBranch } = await import('./service');
    const branchWithRegion = { ...sampleBranch, regionName: 'North Region' };
    setupSelect([branchWithRegion]);

    const result = await getBranch(mockDb, branchId, adminAuth);
    expect(result).toEqual(branchWithRegion);
  });

  it('should return branch for member of same branch', async () => {
    const { getBranch } = await import('./service');
    setupSelect([{ ...sampleBranch, regionName: 'North Region' }]);

    const result = await getBranch(mockDb, branchId, memberAuth);
    expect(result.id).toBe(branchId);
  });

  it('should throw ForbiddenError for member of different branch', async () => {
    const { getBranch } = await import('./service');

    await expect(
      getBranch(mockDb, branchId, otherBranchAuth),
    ).rejects.toThrow('Access denied to this branch');
  });

  it('should throw NotFoundError when branch does not exist', async () => {
    const { getBranch } = await import('./service');
    setupSelect([]);

    await expect(
      getBranch(mockDb, 'nonexistent-id', adminAuth),
    ).rejects.toThrow('Branch not found');
  });
});

describe('createBranch', () => {
  it('should create a branch when region exists', async () => {
    const { createBranch } = await import('./service');
    // First select: region exists; Insert: returns new branch
    setupSelectSequence([sampleRegion]);
    setupInsert([sampleBranch]);

    const result = await createBranch(mockDb, { branchName: 'Lagos Branch', regionId });
    expect(result).toEqual(sampleBranch);
  });

  it('should throw ValidationError for invalid region ID', async () => {
    const { createBranch } = await import('./service');
    setupSelectSequence([]);

    await expect(
      createBranch(mockDb, { branchName: 'Lagos Branch', regionId: 'bad-id' }),
    ).rejects.toThrow('Invalid region ID');
  });
});

describe('updateBranch', () => {
  it('should update a branch for admin', async () => {
    const { updateBranch } = await import('./service');
    // First select: branch exists
    setupSelectSequence([sampleBranch]);
    // Update returns updated branch
    const updated = { ...sampleBranch, branchName: 'Updated Branch' };
    setupUpdate([updated]);

    const result = await updateBranch(mockDb, branchId, { branchName: 'Updated Branch' }, adminAuth);
    expect(result).toEqual(updated);
  });

  it('should throw ForbiddenError for member of different branch', async () => {
    const { updateBranch } = await import('./service');

    await expect(
      updateBranch(mockDb, branchId, { branchName: 'Hack' }, otherBranchAuth),
    ).rejects.toThrow('Access denied to this branch');
  });

  it('should throw NotFoundError for non-existent branch', async () => {
    const { updateBranch } = await import('./service');
    setupSelectSequence([]);

    await expect(
      updateBranch(mockDb, 'nonexistent', { branchName: 'X' }, adminAuth),
    ).rejects.toThrow('Branch not found');
  });

  it('should validate regionId when changed', async () => {
    const { updateBranch } = await import('./service');
    // First select: branch exists; Second select: region not found
    setupSelectSequence([sampleBranch], []);

    await expect(
      updateBranch(mockDb, branchId, { regionId: 'bad-region' }, adminAuth),
    ).rejects.toThrow('Invalid region ID');
  });
});

describe('deleteBranch', () => {
  it('should soft-delete a branch with no active members', async () => {
    const { deleteBranch } = await import('./service');
    // First select: branch exists; Second select: member count = 0
    setupSelectSequence([sampleBranch], [{ count: 0 }]);
    setupUpdate([{ ...sampleBranch, isActive: false }]);

    const result = await deleteBranch(mockDb, branchId, adminAuth);
    expect(result!.isActive).toBe(false);
  });

  it('should throw NotFoundError for non-existent branch', async () => {
    const { deleteBranch } = await import('./service');
    setupSelectSequence([]);

    await expect(
      deleteBranch(mockDb, 'nonexistent', adminAuth),
    ).rejects.toThrow('Branch not found');
  });

  it('should throw ValidationError when branch has active members', async () => {
    const { deleteBranch } = await import('./service');
    setupSelectSequence([sampleBranch], [{ count: 5 }]);

    await expect(
      deleteBranch(mockDb, branchId, adminAuth),
    ).rejects.toThrow('Cannot deactivate branch with active members');
  });
});

// ── Leadership Tests ──────────────────────────────────────

describe('getBranchLeadership', () => {
  it('should return current leadership for branch', async () => {
    const { getBranchLeadership } = await import('./service');
    const leaderRow = { ...sampleLeadership, memberFirstName: 'John', memberLastName: 'Doe' };
    setupSelect([leaderRow]);

    const result = await getBranchLeadership(mockDb, branchId, adminAuth);
    expect(result).toEqual([leaderRow]);
  });

  it('should return all leadership including history when includeHistory is true', async () => {
    const { getBranchLeadership } = await import('./service');
    const currentLeader = { ...sampleLeadership, memberFirstName: 'John', memberLastName: 'Doe', isCurrent: true };
    const pastLeader = { ...sampleLeadership, id: 'past-id', memberFirstName: 'Jane', memberLastName: 'Smith', isCurrent: false, endDate: '2023-12-31' };
    setupSelect([currentLeader, pastLeader]);

    const result = await getBranchLeadership(mockDb, branchId, adminAuth, { includeHistory: true });
    expect(result).toHaveLength(2);
    expect(result).toEqual([currentLeader, pastLeader]);
  });

  it('should throw ForbiddenError for member of different branch', async () => {
    const { getBranchLeadership } = await import('./service');

    await expect(
      getBranchLeadership(mockDb, branchId, otherBranchAuth),
    ).rejects.toThrow('Access denied to this branch');
  });
});

describe('assignLeadership', () => {
  it('should assign leadership when member and branch exist', async () => {
    const { assignLeadership } = await import('./service');
    // Selects: branch exists, member exists, no existing assignment
    setupSelectSequence([sampleBranch], [{ id: memberId, isActive: true }], []);
    // Update for deactivating existing Main Pastor (no-op if none)
    setupUpdate(undefined);
    setupInsert([sampleLeadership]);

    const result = await assignLeadership(mockDb, branchId, { memberId, role: 'Main Pastor' }, adminAuth);
    expect(result).toEqual(sampleLeadership);
  });

  it('should throw NotFoundError when branch does not exist', async () => {
    const { assignLeadership } = await import('./service');
    setupSelectSequence([]);

    await expect(
      assignLeadership(mockDb, 'bad-branch', { memberId, role: 'Elder' }, adminAuth),
    ).rejects.toThrow('Branch not found');
  });

  it('should throw NotFoundError when member does not exist', async () => {
    const { assignLeadership } = await import('./service');
    setupSelectSequence([sampleBranch], []);

    await expect(
      assignLeadership(mockDb, branchId, { memberId: 'bad-member', role: 'Elder' }, adminAuth),
    ).rejects.toThrow('Member not found or inactive');
  });

  it('should throw ConflictError for duplicate assignment', async () => {
    const { assignLeadership } = await import('./service');
    // Branch exists, member exists, existing assignment found
    setupSelectSequence([sampleBranch], [{ id: memberId, isActive: true }], [sampleLeadership]);
    setupUpdate(undefined);

    await expect(
      assignLeadership(mockDb, branchId, { memberId, role: 'Main Pastor' }, adminAuth),
    ).rejects.toThrow('Member already holds this role in this branch');
  });
});

describe('removeLeadership', () => {
  it('should deactivate a leadership assignment', async () => {
    const { removeLeadership } = await import('./service');
    setupSelect([sampleLeadership]);
    const removed = { ...sampleLeadership, isCurrent: false, endDate: '2024-06-01' };
    setupUpdate([removed]);

    const result = await removeLeadership(mockDb, branchId, leadershipId, adminAuth);
    expect(result!.isCurrent).toBe(false);
  });

  it('should throw NotFoundError for non-existent leadership', async () => {
    const { removeLeadership } = await import('./service');
    setupSelect([]);

    await expect(
      removeLeadership(mockDb, branchId, 'bad-id', adminAuth),
    ).rejects.toThrow('Leadership assignment not found');
  });
});

// ── Phase 4: scope-aware enforceBranchAccess ──────────────
//
// A branch-admin who logs in with scope=branch:X is acting AS that branch.
// Even if they hold authority over multiple branches, this token narrows them
// to just X — any other branch in the URL is refused.

describe('scope=branch narrowing', () => {
  const otherBranchId = '220e8400-0000-0000-0000-000000000099';

  it('allows access when the URL branch matches the scope', async () => {
    const { getBranch } = await import('./service');
    setupSelect([sampleBranch]);
    const auth = {
      ...adminAuth,
      scope: { kind: 'branch' as const, id: branchId },
    };
    const result = await getBranch(mockDb, branchId, auth);
    expect(result).toEqual(sampleBranch);
  });

  it('refuses an admin acting on a different branch than their scope', async () => {
    // Even a system admin gets narrowed by scope. The "Branch System Admin —
    // London" picker option produces this exact token shape.
    const { getBranch } = await import('./service');
    const auth = {
      ...adminAuth,
      scope: { kind: 'branch' as const, id: branchId },
    };
    await expect(getBranch(mockDb, otherBranchId, auth)).rejects.toThrow(
      /outside your current branch scope/,
    );
  });

  it('refuses a branch-admin (BSA) acting on a different branch than their scope', async () => {
    const { updateBranch } = await import('./service');
    const auth = {
      memberId: '000-bsa',
      email: 'bsa@test.com',
      systemRole: 'leader' as const,
      branchId,
      branchSystemAdminBranchIds: [branchId, otherBranchId],
      branchDataAdminBranchIds: [],
      scope: { kind: 'branch' as const, id: branchId },
    };
    await expect(
      updateBranch(mockDb, otherBranchId, { branchName: 'Hack' }, auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  // Defense-in-depth: each of the five write functions middleware-gates on the
  // branch param. Phase-5 hardening adds a service-side scope re-check so that
  // a scope-bound session can't be tricked into writing to a different branch
  // even if a hypothetical router refactor severs the middleware tie.

  it('deleteBranch refuses cross-scope target', async () => {
    const { deleteBranch } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      deleteBranch(mockDb, otherBranchId, auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('assignLeadership refuses cross-scope target', async () => {
    const { assignLeadership } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      assignLeadership(mockDb, otherBranchId, { memberId, role: 'Elder' }, auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('removeLeadership refuses cross-scope target', async () => {
    const { removeLeadership } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      removeLeadership(mockDb, otherBranchId, leadershipId, auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('assignBranchSystemAdmin refuses cross-scope target', async () => {
    const { assignBranchSystemAdmin } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      assignBranchSystemAdmin(mockDb, otherBranchId, memberId, auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('revokeBranchSystemAdmin refuses cross-scope target', async () => {
    const { revokeBranchSystemAdmin } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      revokeBranchSystemAdmin(mockDb, otherBranchId, 'assign-1', auth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('deleteBranch permits in-scope target', async () => {
    const { deleteBranch } = await import('./service');
    const auth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    setupSelectSequence([sampleBranch], [{ count: 0 }]);
    setupUpdate([{ ...sampleBranch, isActive: false }]);
    const result = await deleteBranch(mockDb, branchId, auth);
    expect(result!.isActive).toBe(false);
  });
});
