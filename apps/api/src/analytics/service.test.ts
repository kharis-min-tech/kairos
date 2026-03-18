import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminStats, getBranchStats, getMemberStats } from './service';
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

const adminAuth: AuthContext = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin', branchId };
const memberAuth: AuthContext = { memberId, email: 'member@test.com', systemRole: 'member', branchId };

beforeEach(() => {
  vi.clearAllMocks();
  selectCallIndex = 0;
  selectResults.length = 0;
});

// ── getAdminStats ──────────────────────────────────────────

describe('getAdminStats', () => {
  it('returns church-wide stats for admin', async () => {
    setupSelectSequence(
      [{ value: 5 }],    // branches count
      [{ value: 100 }],  // members count
      [{ value: 12 }],   // fellowships count
      [{ status: 'approved', count: 85 }, { status: 'pending', count: 15 }], // approval stats
      [{ type: 'K-Groups', count: 6 }, { type: 'Kharis Express', count: 4 }], // fellowship types
    );

    const result = await getAdminStats(mockDb, adminAuth);
    expect(result.totalBranches).toBe(5);
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
      [{ value: 25 }],   // members
      [{ value: 3 }],    // fellowships
      [{ value: 8 }],    // recent meetings
      [{ value: 2 }],    // pending approvals
    );

    const result = await getBranchStats(mockDb, memberAuth);
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
      [{ status: 'Present', count: 3 }, { status: 'Absent', count: 1 }],
    );

    const result = await getMemberStats(mockDb, memberAuth);
    expect(result.fellowshipsJoined).toBe(1);
    expect(result.fellowships).toHaveLength(1);
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
