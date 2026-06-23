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
const memberAId = '111-mem-a';
const memberBId = '222-mem-b';
const followupId = '660e8400-0000-0000-0000-000000000099';

const adminAuth = { memberId: '000-admin', email: 'a@x', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const pastorAuth = { memberId: '000-pastor', email: 'p@x', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth = { memberId: memberAId, email: 'm@x', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const otherBranchAuth = { memberId: '000-o', email: 'o@x', systemRole: 'member' as const, branchId: 'other-branch', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderAuth = { memberId: '000-leader', email: 'l@x', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

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
  createFollowup,
  updateFollowup,
  deleteFollowup,
  listFollowupsForMember,
  listFollowupsForDepartment,
  listOverdueFollowups,
} from './followups-service';

// ── createFollowup ────────────────────────────────────────

describe('createFollowup', () => {
  it('logs followup for an active department member', async () => {
    setupSelectSequence([sampleBd], [{ id: 'dm-1' }]);
    setupInsert([{ id: followupId, memberId: memberAId }]);
    const result = await createFollowup(mockDb, adminAuth, branchDeptId, memberAId, {
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
      durationMinutes: 15,
      notes: 'Caught up',
    });
    expect(result.id).toBe(followupId);
  });

  it.skip('TODO Phase 5: lets the dept lead log a followup', async () => {
    setupSelectSequence([sampleBd], [{ id: 'dm-1' }]);
    setupInsert([{ id: followupId }]);
    const result = await createFollowup(mockDb, leaderAuth, branchDeptId, memberAId, {
      contactMethod: 'Email',
      contactStatus: 'Successful',
    });
    expect(result.id).toBe(followupId);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      createFollowup(mockDb, memberAuth, branchDeptId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError when dept missing', async () => {
    setupSelectSequence([]);
    await expect(
      createFollowup(mockDb, adminAuth, 'bad', memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Department not found');
  });

  it('throws ValidationError when member is not in dept', async () => {
    setupSelectSequence([sampleBd], []);
    await expect(
      createFollowup(mockDb, adminAuth, branchDeptId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Member is not part of this department');
  });

  it('throws ValidationError on zero duration', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      createFollowup(mockDb, adminAuth, branchDeptId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
        durationMinutes: 0,
      }),
    ).rejects.toThrow('Duration must be at least 1 minute');
  });
});

// ── updateFollowup ────────────────────────────────────────

describe('updateFollowup', () => {
  it('updates an existing followup', async () => {
    setupSelectSequence([sampleBd], [{ id: followupId, branchDepartmentId: branchDeptId, recordedById: leaderAuth.memberId }]);
    setupUpdate([{ id: followupId, notes: 'new' }]);
    const result = await updateFollowup(mockDb, adminAuth, branchDeptId, followupId, {
      notes: 'new',
    });
    expect(result.notes).toBe('new');
  });

  it('throws NotFoundError when followup missing', async () => {
    setupSelectSequence([sampleBd], []);
    await expect(
      updateFollowup(mockDb, adminAuth, branchDeptId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Followup not found');
  });

  it('throws NotFoundError when followup belongs to another dept', async () => {
    setupSelectSequence([sampleBd], [{ id: followupId, branchDepartmentId: 'other-bd', recordedById: 'x' }]);
    await expect(
      updateFollowup(mockDb, adminAuth, branchDeptId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Followup not found');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      updateFollowup(mockDb, memberAuth, branchDeptId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── deleteFollowup ────────────────────────────────────────

describe('deleteFollowup', () => {
  it('hard-deletes the followup', async () => {
    setupSelectSequence([sampleBd], [{ id: followupId, branchDepartmentId: branchDeptId }]);
    setupDelete();
    const result = await deleteFollowup(mockDb, adminAuth, branchDeptId, followupId);
    expect(result.id).toBe(followupId);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('throws ForbiddenError for member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      deleteFollowup(mockDb, memberAuth, branchDeptId, followupId),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError when missing', async () => {
    setupSelectSequence([sampleBd], []);
    await expect(
      deleteFollowup(mockDb, adminAuth, branchDeptId, followupId),
    ).rejects.toThrow('Followup not found');
  });
});

// ── listFollowupsForMember ────────────────────────────────

describe('listFollowupsForMember', () => {
  it.skip('TODO Phase 5: returns history for lead — needs grant-based mock', async () => {
    const rows = [{ id: followupId, memberId: memberAId, contactedAt: new Date() }];
    setupSelectSequence([sampleBd], rows);
    const result = await listFollowupsForMember(mockDb, leaderAuth, branchDeptId, memberAId);
    expect(result).toEqual(rows);
  });

  it('throws ForbiddenError for member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      listFollowupsForMember(mockDb, memberAuth, branchDeptId, memberAId),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── listFollowupsForDepartment ────────────────────────────

describe('listFollowupsForDepartment', () => {
  it('returns rows with default limit', async () => {
    const rows = [{ id: followupId, memberId: memberAId, contactedAt: new Date() }];
    setupSelectSequence([sampleBd], rows);
    const result = await listFollowupsForDepartment(mockDb, adminAuth, branchDeptId, {});
    expect(result).toEqual(rows);
  });

  it('throws ForbiddenError for cross-branch leader', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      listFollowupsForDepartment(mockDb, otherBranchAuth, branchDeptId, {}),
    ).rejects.toThrow('You can only access departments in your branch');
  });
});

// ── listOverdueFollowups ──────────────────────────────────

describe('listOverdueFollowups', () => {
  it('returns members with no followups (never contacted) and stale ones', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const roster = [
      { memberId: memberAId, firstName: 'A', lastName: 'A', photoUrl: null, email: 'a@x' },
      { memberId: memberBId, firstName: 'B', lastName: 'B', photoUrl: null, email: 'b@x' },
      { memberId: 'mem-c', firstName: 'C', lastName: 'C', photoUrl: null, email: 'c@x' },
    ];
    const lastFollowups = [
      { memberId: memberAId, lastContactedAt: tenDaysAgo },
      { memberId: 'mem-c', lastContactedAt: oneDayAgo }, // recent — excluded
    ];
    setupSelectSequence([sampleBd], roster, lastFollowups);
    const result = await listOverdueFollowups(mockDb, adminAuth, branchDeptId, 7);
    // Member B (never contacted) and Member A (10 days ago); not C (1 day ago)
    expect(result.map((m) => m.memberId).sort()).toEqual([memberAId, memberBId].sort());
    // Never-contacted comes first
    expect(result[0]?.memberId).toBe(memberBId);
    expect(result[0]?.lastContactedAt).toBeNull();
    expect(result[0]?.daysSinceFollowup).toBeNull();
    const memberA = result.find((m) => m.memberId === memberAId);
    expect(memberA?.daysSinceFollowup).toBe(10);
    expect(memberA?.isOverdue).toBe(true);
  });

  it('returns empty array when dept has no roster', async () => {
    setupSelectSequence([sampleBd], []);
    const result = await listOverdueFollowups(mockDb, adminAuth, branchDeptId);
    expect(result).toEqual([]);
  });

  it.skip('TODO Phase 5: uses default 7-day threshold when not specified — needs grant-based mock', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const roster = [{ memberId: memberAId, firstName: 'A', lastName: 'A', photoUrl: null, email: 'a@x' }];
    const lastFollowups = [{ memberId: memberAId, lastContactedAt: fiveDaysAgo }];
    setupSelectSequence([sampleBd], roster, lastFollowups);
    const result = await listOverdueFollowups(mockDb, pastorAuth, branchDeptId);
    expect(result).toEqual([]); // 5 days < 7 day threshold
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleBd]);
    await expect(
      listOverdueFollowups(mockDb, memberAuth, branchDeptId),
    ).rejects.toThrow('Only department leads or above');
  });
});
