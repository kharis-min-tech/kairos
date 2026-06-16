import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate',
    'update', 'set', 'delete', 'groupBy',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectIdx: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectIdx = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectIdx] ?? selectResults[selectResults.length - 1];
    selectIdx++;
    return createChain(r);
  });
}

function setupInsert(result: unknown) {
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

function setupUpdate(result: unknown = undefined) {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

function setupDelete(result: unknown = undefined) {
  (mockDb.delete as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

const branchId = '220e8400-0000-0000-0000-000000000002';
const branchDeptId = '440e8400-0000-0000-0000-000000000004';
const outfitId = '770e8400-0000-0000-0000-000000000077';
const assignmentId = '880e8400-0000-0000-0000-000000000088';

const adminAuth = { memberId: '000-admin', email: 'a@x', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const memberAuth = { memberId: '000-member', email: 'm@x', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const otherBranchAuth = { memberId: '000-o', email: 'o@x', systemRole: 'leader' as const, branchId: 'other-branch', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const leaderAuth = { memberId: '000-leader', email: 'l@x', systemRole: 'leader' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };

const sampleBd = {
  id: branchDeptId,
  branchId,
  leadMemberId: leaderAuth.memberId,
  deputyMemberId: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

import {
  listOutfits,
  createOutfit,
  updateOutfit,
  deactivateOutfit,
  listSchedule,
  assignSchedule,
  removeAssignment,
  listUpcomingAssignments,
} from './uniform-service';

// ── Outfits ───────────────────────────────────────────────

describe('listOutfits', () => {
  it('returns active outfits by default', async () => {
    const rows = [{ id: outfitId, name: 'Sunday Whites', isActive: true }];
    setupSelectSequence([sampleBd], rows);
    const result = await listOutfits(mockDb, adminAuth, branchDeptId);
    expect(result).toEqual(rows);
  });

  it('throws ForbiddenError for cross-branch viewer', async () => {
    setupSelectSequence([sampleBd]);
    await expect(listOutfits(mockDb, otherBranchAuth, branchDeptId)).rejects.toThrow(
      'You can only access departments in your branch',
    );
  });
});

describe('createOutfit', () => {
  it('lets lead upload outfit', async () => {
    setupSelectSequence([sampleBd]);
    setupInsert([{ id: outfitId, name: 'Sunday Whites' }]);
    const result = await createOutfit(mockDb, leaderAuth, branchDeptId, {
      name: 'Sunday Whites',
      imageUrl: 'https://example.com/x.jpg',
    });
    expect(result.id).toBe(outfitId);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      createOutfit(mockDb, memberAuth, branchDeptId, {
        name: 'X',
        imageUrl: 'https://example.com/x.jpg',
      }),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError when dept missing', async () => {
    setupSelectSequence([]);
    await expect(
      createOutfit(mockDb, adminAuth, 'missing', {
        name: 'X',
        imageUrl: 'https://example.com/x.jpg',
      }),
    ).rejects.toThrow('Department not found');
  });
});

describe('updateOutfit', () => {
  it('updates an existing outfit', async () => {
    setupSelectSequence([sampleBd], [{ id: outfitId, branchDepartmentId: branchDeptId }]);
    setupUpdate([{ id: outfitId, name: 'Renamed' }]);
    const result = await updateOutfit(mockDb, adminAuth, branchDeptId, outfitId, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });

  it('throws NotFoundError when outfit missing', async () => {
    setupSelectSequence([sampleBd], []);
    await expect(
      updateOutfit(mockDb, adminAuth, branchDeptId, outfitId, { name: 'X' }),
    ).rejects.toThrow('Outfit not found');
  });

  it('throws NotFoundError when outfit belongs to another dept', async () => {
    setupSelectSequence([sampleBd], [{ id: outfitId, branchDepartmentId: 'other-bd' }]);
    await expect(
      updateOutfit(mockDb, adminAuth, branchDeptId, outfitId, { name: 'X' }),
    ).rejects.toThrow('Outfit not found');
  });
});

describe('deactivateOutfit', () => {
  it('soft-deletes (sets isActive=false)', async () => {
    setupSelectSequence([sampleBd], [{ id: outfitId, branchDepartmentId: branchDeptId }]);
    setupUpdate([{ id: outfitId, isActive: false }]);
    const result = await deactivateOutfit(mockDb, adminAuth, branchDeptId, outfitId);
    expect(result.isActive).toBe(false);
  });
});

// ── Schedule ──────────────────────────────────────────────

describe('listSchedule', () => {
  it('returns scheduled assignments enriched with affectsCount', async () => {
    const rows = [
      { id: assignmentId, serviceDate: '2026-05-10', genderTarget: 'Unisex' },
      { id: 'b', serviceDate: '2026-05-17', genderTarget: 'Male' },
      { id: 'c', serviceDate: '2026-05-24', genderTarget: 'Female' },
    ];
    setupSelectSequence(
      [sampleBd],
      rows,
      [
        { gender: 'Male', count: 6 },
        { gender: 'Female', count: 4 },
      ],
    );
    const result = await listSchedule(mockDb, adminAuth, branchDeptId, {
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ genderTarget: 'Unisex', affectsCount: 10 });
    expect(result[1]).toMatchObject({ genderTarget: 'Male', affectsCount: 6 });
    expect(result[2]).toMatchObject({ genderTarget: 'Female', affectsCount: 4 });
  });

  it('returns empty array when no schedule rows', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await listSchedule(mockDb, adminAuth, branchDeptId, {});
    expect(result).toEqual([]);
  });

  it('throws ForbiddenError for cross-branch viewer', async () => {
    setupSelectSequence([sampleBd]);
    await expect(listSchedule(mockDb, otherBranchAuth, branchDeptId, {})).rejects.toThrow(
      'You can only access departments in your branch',
    );
  });
});

describe('assignSchedule', () => {
  it('creates assignment for active outfit', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: outfitId, branchDepartmentId: branchDeptId, isActive: true }],
      [], // no conflict
    );
    setupInsert([{ id: assignmentId, serviceDate: '2026-05-10' }]);
    const result = await assignSchedule(mockDb, leaderAuth, branchDeptId, {
      outfitId,
      serviceDate: '2026-05-10',
    });
    expect(result.id).toBe(assignmentId);
  });

  it('throws ConflictError when slot already assigned', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: outfitId, branchDepartmentId: branchDeptId, isActive: true }],
      [{ id: 'existing-assignment' }],
    );
    await expect(
      assignSchedule(mockDb, leaderAuth, branchDeptId, {
        outfitId,
        serviceDate: '2026-05-10',
        genderTarget: 'Unisex',
      }),
    ).rejects.toThrow('already assigned');
  });

  it('throws ConflictError when outfit is archived', async () => {
    setupSelectSequence(
      [sampleBd],
      [{ id: outfitId, branchDepartmentId: branchDeptId, isActive: false }],
    );
    await expect(
      assignSchedule(mockDb, adminAuth, branchDeptId, {
        outfitId,
        serviceDate: '2026-05-10',
      }),
    ).rejects.toThrow('archived outfit');
  });

  it('throws NotFoundError when outfit not in this dept', async () => {
    setupSelectSequence([sampleBd], [{ id: outfitId, branchDepartmentId: 'other-bd', isActive: true }]);
    await expect(
      assignSchedule(mockDb, adminAuth, branchDeptId, {
        outfitId,
        serviceDate: '2026-05-10',
      }),
    ).rejects.toThrow('Outfit not found');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      assignSchedule(mockDb, memberAuth, branchDeptId, {
        outfitId,
        serviceDate: '2026-05-10',
      }),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('removeAssignment', () => {
  it('deletes the assignment', async () => {
    setupSelectSequence([sampleBd], [{ id: assignmentId, branchDepartmentId: branchDeptId }]);
    setupDelete();
    const result = await removeAssignment(mockDb, adminAuth, branchDeptId, assignmentId);
    expect(result.id).toBe(assignmentId);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('throws NotFoundError when assignment missing', async () => {
    setupSelectSequence([sampleBd], []);
    await expect(
      removeAssignment(mockDb, adminAuth, branchDeptId, assignmentId),
    ).rejects.toThrow('Assignment not found');
  });

  it('throws ForbiddenError for member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      removeAssignment(mockDb, memberAuth, branchDeptId, assignmentId),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('listUpcomingAssignments', () => {
  it('returns the earliest upcoming assignment per gender target', async () => {
    const rows = [
      { id: 'a1', outfitId, outfitName: 'White', outfitImageUrl: 'x', serviceDate: '2026-05-10', genderTarget: 'Male', notes: null },
      { id: 'a2', outfitId, outfitName: 'White', outfitImageUrl: 'x', serviceDate: '2026-05-10', genderTarget: 'Female', notes: null },
      { id: 'a3', outfitId, outfitName: 'White', outfitImageUrl: 'x', serviceDate: '2026-05-17', genderTarget: 'Male', notes: null }, // dup gender, later date — excluded
      { id: 'a4', outfitId, outfitName: 'Blue', outfitImageUrl: 'x', serviceDate: '2026-05-24', genderTarget: 'Unisex', notes: null },
    ];
    setupSelectSequence([sampleBd], rows);
    const result = await listUpcomingAssignments(mockDb, adminAuth, branchDeptId);
    expect(result.map((r) => r.id).sort()).toEqual(['a1', 'a2', 'a4'].sort());
  });

  it('returns empty when nothing scheduled', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await listUpcomingAssignments(mockDb, adminAuth, branchDeptId);
    expect(result).toEqual([]);
  });

  it('throws ForbiddenError for cross-branch viewer', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      listUpcomingAssignments(mockDb, otherBranchAuth, branchDeptId),
    ).rejects.toThrow('You can only access departments in your branch');
  });
});
