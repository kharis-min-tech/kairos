import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate',
    'update', 'set', 'delete', 'groupBy',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (value: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectIndex: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const result = selectResults[selectIndex] ?? selectResults[selectResults.length - 1];
    selectIndex++;
    return createChain(result);
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
const fellowshipId = '440e8400-0000-0000-0000-000000000004';
const memberAId = '111-mem-a';
const memberBId = '222-mem-b';
const followupId = '660e8400-0000-0000-0000-000000000099';

const adminAuth = { memberId: '000-admin', email: 'a@x', systemRole: 'admin' as const, branchId };
const pastorAuth = { memberId: '000-pastor', email: 'p@x', systemRole: 'pastor' as const, branchId };
const memberAuth = { memberId: memberAId, email: 'm@x', systemRole: 'member' as const, branchId };
const otherBranchLeaderAuth = { memberId: '000-o', email: 'o@x', systemRole: 'leader' as const, branchId: 'other-branch' };
const leaderAuth = { memberId: '000-leader', email: 'l@x', systemRole: 'leader' as const, branchId };
const nonFellowshipLeaderAuth = { memberId: '000-other-leader', email: 'ol@x', systemRole: 'leader' as const, branchId };

const sampleFellowship = {
  id: fellowshipId,
  branchId,
  leaderId: leaderAuth.memberId,
  coLeaderId: null,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

import {
  createFellowshipFollowup,
  updateFellowshipFollowup,
  deleteFellowshipFollowup,
  listFellowshipFollowupsForMember,
  listFellowshipFollowups,
  listOverdueFellowshipFollowups,
} from './followups-service';

describe('createFellowshipFollowup', () => {
  it('logs followup for an active fellowship member', async () => {
    setupSelectSequence([sampleFellowship], [{ id: 'fm-1' }]);
    setupInsert([{ id: followupId, memberId: memberAId }]);

    const result = await createFellowshipFollowup(mockDb, adminAuth, fellowshipId, memberAId, {
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
      durationMinutes: 15,
      notes: 'Caught up',
    });

    expect(result.id).toBe(followupId);
  });

  it('lets the fellowship leader log a followup', async () => {
    setupSelectSequence([sampleFellowship], [{ id: 'fm-1' }]);
    setupInsert([{ id: followupId }]);

    const result = await createFellowshipFollowup(mockDb, leaderAuth, fellowshipId, memberAId, {
      contactMethod: 'Email',
      contactStatus: 'Successful',
    });

    expect(result.id).toBe(followupId);
  });

  it('throws ForbiddenError for a regular member', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      createFellowshipFollowup(mockDb, memberAuth, fellowshipId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws ForbiddenError for a branch leader who does not lead the fellowship', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      createFellowshipFollowup(mockDb, nonFellowshipLeaderAuth, fellowshipId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError when fellowship missing', async () => {
    setupSelectSequence([]);

    await expect(
      createFellowshipFollowup(mockDb, adminAuth, 'bad', memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Fellowship not found');
  });

  it('throws ValidationError when member is not in the fellowship', async () => {
    setupSelectSequence([sampleFellowship], []);

    await expect(
      createFellowshipFollowup(mockDb, adminAuth, fellowshipId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    ).rejects.toThrow('Member is not part of this fellowship');
  });

  it('throws ValidationError on zero duration', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      createFellowshipFollowup(mockDb, adminAuth, fellowshipId, memberAId, {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
        durationMinutes: 0,
      }),
    ).rejects.toThrow('Duration must be at least 1 minute');
  });
});

describe('updateFellowshipFollowup', () => {
  it('updates an existing followup', async () => {
    setupSelectSequence([sampleFellowship], [{ id: followupId, fellowshipId }]);
    setupUpdate([{ id: followupId, notes: 'new' }]);

    const result = await updateFellowshipFollowup(mockDb, adminAuth, fellowshipId, followupId, {
      notes: 'new',
    });

    expect(result.notes).toBe('new');
  });

  it('throws NotFoundError when followup is missing', async () => {
    setupSelectSequence([sampleFellowship], []);

    await expect(
      updateFellowshipFollowup(mockDb, adminAuth, fellowshipId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Followup not found');
  });

  it('throws NotFoundError when followup belongs to another fellowship', async () => {
    setupSelectSequence([sampleFellowship], [{ id: followupId, fellowshipId: 'other-fellowship' }]);

    await expect(
      updateFellowshipFollowup(mockDb, adminAuth, fellowshipId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Followup not found');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      updateFellowshipFollowup(mockDb, memberAuth, fellowshipId, followupId, { notes: 'x' }),
    ).rejects.toThrow('Only fellowship leaders or above');
  });
});

describe('deleteFellowshipFollowup', () => {
  it('hard-deletes the followup', async () => {
    setupSelectSequence([sampleFellowship], [{ id: followupId, fellowshipId }]);
    setupDelete();

    const result = await deleteFellowshipFollowup(mockDb, adminAuth, fellowshipId, followupId);

    expect(result.id).toBe(followupId);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      deleteFellowshipFollowup(mockDb, memberAuth, fellowshipId, followupId),
    ).rejects.toThrow('Only fellowship leaders or above');
  });

  it('throws NotFoundError when missing', async () => {
    setupSelectSequence([sampleFellowship], []);

    await expect(
      deleteFellowshipFollowup(mockDb, adminAuth, fellowshipId, followupId),
    ).rejects.toThrow('Followup not found');
  });
});

describe('listFellowshipFollowupsForMember', () => {
  it('returns history for the fellowship leader', async () => {
    const rows = [{ id: followupId, memberId: memberAId, contactedAt: new Date() }];
    setupSelectSequence([sampleFellowship], rows);

    const result = await listFellowshipFollowupsForMember(mockDb, leaderAuth, fellowshipId, memberAId);

    expect(result).toEqual(rows);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      listFellowshipFollowupsForMember(mockDb, memberAuth, fellowshipId, memberAId),
    ).rejects.toThrow('Only fellowship leaders or above');
  });
});

describe('listFellowshipFollowups', () => {
  it('returns rows with default limit', async () => {
    const rows = [{ id: followupId, memberId: memberAId, contactedAt: new Date() }];
    setupSelectSequence([sampleFellowship], rows);

    const result = await listFellowshipFollowups(mockDb, adminAuth, fellowshipId, {});

    expect(result).toEqual(rows);
  });

  it('throws ForbiddenError for cross-branch leader', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      listFellowshipFollowups(mockDb, otherBranchLeaderAuth, fellowshipId, {}),
    ).rejects.toThrow('You can only access fellowships in your branch');
  });
});

describe('listOverdueFellowshipFollowups', () => {
  it('returns members with no followups and stale followups', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const roster = [
      { memberId: memberAId, firstName: 'A', lastName: 'A', photoUrl: null, email: 'a@x' },
      { memberId: memberBId, firstName: 'B', lastName: 'B', photoUrl: null, email: 'b@x' },
      { memberId: 'mem-c', firstName: 'C', lastName: 'C', photoUrl: null, email: 'c@x' },
    ];
    const lastFollowups = [
      { memberId: memberAId, lastContactedAt: tenDaysAgo },
      { memberId: 'mem-c', lastContactedAt: oneDayAgo },
    ];
    setupSelectSequence([sampleFellowship], roster, lastFollowups);

    const result = await listOverdueFellowshipFollowups(mockDb, adminAuth, fellowshipId, 7);

    expect(result.map((member) => member.memberId).sort()).toEqual([memberAId, memberBId].sort());
    expect(result[0]?.memberId).toBe(memberBId);
    expect(result[0]?.lastContactedAt).toBeNull();
    expect(result[0]?.daysSinceFollowup).toBeNull();
    const memberA = result.find((member) => member.memberId === memberAId);
    expect(memberA?.daysSinceFollowup).toBe(10);
    expect(memberA?.isOverdue).toBe(true);
  });

  it('returns empty array when fellowship has no roster', async () => {
    setupSelectSequence([sampleFellowship], []);

    const result = await listOverdueFellowshipFollowups(mockDb, adminAuth, fellowshipId);

    expect(result).toEqual([]);
  });

  it('uses default 7-day threshold when not specified', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const roster = [{ memberId: memberAId, firstName: 'A', lastName: 'A', photoUrl: null, email: 'a@x' }];
    const lastFollowups = [{ memberId: memberAId, lastContactedAt: fiveDaysAgo }];
    setupSelectSequence([sampleFellowship], roster, lastFollowups);

    const result = await listOverdueFellowshipFollowups(mockDb, pastorAuth, fellowshipId);

    expect(result).toEqual([]);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelectSequence([sampleFellowship]);

    await expect(
      listOverdueFellowshipFollowups(mockDb, memberAuth, fellowshipId),
    ).rejects.toThrow('Only fellowship leaders or above');
  });
});
