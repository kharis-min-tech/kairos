import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminStats, getBranchStats, getMemberStats, getFellowshipStats } from './service';
import type { AuthContext } from '@kairos/types';

// ── Mock DB helper ─────────────────────────────────────────

function createChain(resolvedData?: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin',
    'groupBy', 'orderBy', 'limit', 'offset',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedData ?? []);
  return chain;
}

let selectCallIndex = 0;
const selectResults: unknown[] = [];

function setupSelectSequence(...results: unknown[]) {
  selectCallIndex = 0;
  selectResults.length = 0;
  selectResults.push(...results);
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return createChain(result);
  });
}

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as ReturnType<typeof import('@kairos/database').createDb>;

const branchId = '110e8400-0000-0000-0000-000000000001';
const memberId = '330e8400-0000-0000-0000-000000000003';

const adminAuth: AuthContext = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin', branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth: AuthContext = { memberId, email: 'member@test.com', systemRole: 'member', branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

beforeEach(() => {
  vi.clearAllMocks();
  selectCallIndex = 0;
  selectResults.length = 0;
});

// ── getAdminStats ──────────────────────────────────────────

describe('getAdminStats', () => {
  it('returns church-wide stats for admin', async () => {
    // Phase 2 follow-up: loadMemberBreakdown fires 5 selects (confirmed,
    // returners, visitors, children, total) between branchCount and the
    // remaining Promise.all members.
    setupSelectSequence(
      [{ value: 5 }],     // branches count
      [{ value: 100 }],   // breakdown.confirmedRow (members)
      [{ value: 20 }],    // breakdown.returnersRow
      [{ value: 12 }],    // breakdown.visitorsRow
      [{ value: 3 }],     // breakdown.childrenRow
      [{ value: 135 }],   // breakdown.totalRow
      [{ value: 12 }],    // fellowships count
      [{ status: 'approved', count: 85 }, { status: 'pending', count: 15 }],
      [{ type: 'K-Groups', count: 6 }, { type: 'Kharis Express', count: 4 }],
    );

    const result = await getAdminStats(mockDb, adminAuth);
    expect(result.totalBranches).toBe(5);
    expect(result.totalRoll).toBe(135);
    expect(result.memberBreakdown).toEqual({ members: 100, returners: 20, visitors: 12, children: 3 });
    expect(result.totalMembers).toBe(100);
    expect(result.totalFellowships).toBe(12);
    expect(result.membersByApproval).toHaveLength(2);
    expect(result.fellowshipsByType).toHaveLength(2);
  });

  it('throws ForbiddenError for non-admin', async () => {
    await expect(getAdminStats(mockDb, memberAuth)).rejects.toThrow('Only admins');
  });
});

// ── getBranchStats ─────────────────────────────────────────

describe('getBranchStats', () => {
  it('returns branch stats', async () => {
    setupSelectSequence(
      [{ value: 25 }],   // breakdown.confirmedRow (members)
      [{ value: 7 }],    // breakdown.returnersRow
      [{ value: 4 }],    // breakdown.visitorsRow
      [{ value: 1 }],    // breakdown.childrenRow
      [{ value: 37 }],   // breakdown.totalRow
      [{ value: 3 }],    // fellowships
      [{ value: 8 }],    // recent meetings
      [{ value: 2 }],    // pending approvals
    );

    const result = await getBranchStats(mockDb, memberAuth);
    expect(result.totalRoll).toBe(37);
    expect(result.memberBreakdown).toEqual({ members: 25, returners: 7, visitors: 4, children: 1 });
    expect(result.totalMembers).toBe(25);
    expect(result.totalFellowships).toBe(3);
    expect(result.recentMeetings).toBe(8);
    expect(result.pendingApprovals).toBe(2);
  });
});

// ── getMemberStats ─────────────────────────────────────────

describe('getMemberStats', () => {
  it('returns personal stats with attendance', async () => {
    setupSelectSequence(
      [{ fellowshipId: 'f1', fellowshipName: 'Grace K-Group', fellowshipType: 'K-Groups' }],
      [{ homeBranchId: 'b1', secondaryBranchId: null }],
      [{ id: 'b1', branchName: 'London' }],
      [{ status: 'Present', count: 3 }, { status: 'Absent', count: 1 }],
    );

    const result = await getMemberStats(mockDb, memberAuth);
    expect(result.fellowshipsJoined).toBe(1);
    expect(result.fellowships).toHaveLength(1);
    expect(result.branchCount).toBe(1);
    expect(result.branches[0]?.isHome).toBe(true);
    expect(result.recentAttendance.total).toBe(4);
    expect(result.recentAttendance.present).toBe(3);
    expect(result.recentAttendance.rate).toBe(75);
  });

  it('handles zero attendance', async () => {
    setupSelectSequence([], []);

    const result = await getMemberStats(mockDb, memberAuth);
    expect(result.fellowshipsJoined).toBe(0);
    expect(result.recentAttendance.rate).toBe(0);
  });
});

// ── getFellowshipStats ─────────────────────────────────────
// Selects in order: branchCount, memberCount, fellowshipCount (Promise.all),
// then the attendance breakdown, then the recent-meeting count.

describe('getFellowshipStats', () => {
  it('aggregates counts + attendance rate and classifies engagement as High', async () => {
    setupSelectSequence(
      [{ value: 3 }],     // branchCount
      [{ value: 150 }],   // breakdown.confirmedRow (members)
      [{ value: 30 }],    // breakdown.returnersRow
      [{ value: 18 }],    // breakdown.visitorsRow
      [{ value: 2 }],     // breakdown.childrenRow
      [{ value: 200 }],   // breakdown.totalRow
      [{ value: 20 }],    // fellowshipCount
      [{ total: 100, present: 70, late: 10, absent: 15, excused: 5 }],
      [{ value: 80 }],    // recent meetings
    );

    const result = await getFellowshipStats(mockDb, adminAuth);
    expect(result.totalBranches).toBe(3);
    expect(result.totalRoll).toBe(200);
    expect(result.memberBreakdown).toEqual({ members: 150, returners: 30, visitors: 18, children: 2 });
    expect(result.totalMembers).toBe(150);
    expect(result.totalFellowships).toBe(20);
    expect(result.attendanceRate).toBe(70);
    expect(result.attendanceBreakdown).toMatchObject({ present: 70, late: 10, absent: 15, excused: 5, total: 100 });
    expect(result.engagement).toBe('High');
  });

  it('classifies engagement as Low when attendance and meeting frequency are poor', async () => {
    setupSelectSequence(
      [{ value: 3 }],
      [{ value: 150 }],
      [{ value: 30 }],
      [{ value: 18 }],
      [{ value: 2 }],
      [{ value: 200 }],
      [{ value: 20 }],
      [{ total: 100, present: 40, late: 10, absent: 45, excused: 5 }],
      [{ value: 10 }],
    );

    const result = await getFellowshipStats(mockDb, adminAuth);
    expect(result.attendanceRate).toBe(40);
    expect(result.engagement).toBe('Low');
  });
});
