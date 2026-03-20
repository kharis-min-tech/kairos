import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMemberGrowth, getAttendanceTrend, getFellowshipActivity } from './service';
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
const pastorAuth: AuthContext = { memberId, email: 'pastor@test.com', systemRole: 'pastor', branchId };

beforeEach(() => {
  vi.clearAllMocks();
  selectCallIndex = 0;
  selectResults.length = 0;
});

// ── getMemberGrowth ────────────────────────────────────────

describe('getMemberGrowth', () => {
  it('returns monthly signup data for admin (no branch filter)', async () => {
    const mockRows = [
      { month: '2024-01', newSignups: 5 },
      { month: '2024-02', newSignups: 8 },
    ];
    setupSelectSequence(mockRows);

    const result = await getMemberGrowth(mockDb, adminAuth);
    expect(result).toEqual(mockRows);
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it('returns scoped data for pastor (branch filter applied)', async () => {
    const mockRows = [{ month: '2024-03', newSignups: 3 }];
    setupSelectSequence(mockRows);

    const result = await getMemberGrowth(mockDb, pastorAuth);
    expect(result).toEqual(mockRows);
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no data', async () => {
    setupSelectSequence([]);

    const result = await getMemberGrowth(mockDb, adminAuth);
    expect(result).toEqual([]);
  });
});

// ── getAttendanceTrend ─────────────────────────────────────

describe('getAttendanceTrend', () => {
  it('returns weekly attendance rates', async () => {
    const mockRows = [
      { week: '2024-05-27', total: 20, present: 17 },
      { week: '2024-06-03', total: 18, present: 15 },
    ];
    setupSelectSequence(mockRows);

    const result = await getAttendanceTrend(mockDb, adminAuth);
    expect(result).toEqual([
      { week: '2024-05-27', rate: 85 },
      { week: '2024-06-03', rate: 83 },
    ]);
  });

  it('returns 0 rate when total is 0', async () => {
    const mockRows = [{ week: '2024-05-27', total: 0, present: 0 }];
    setupSelectSequence(mockRows);

    const result = await getAttendanceTrend(mockDb, adminAuth);
    expect(result).toEqual([{ week: '2024-05-27', rate: 0 }]);
  });

  it('returns empty array when no data', async () => {
    setupSelectSequence([]);

    const result = await getAttendanceTrend(mockDb, pastorAuth);
    expect(result).toEqual([]);
  });
});

// ── getFellowshipActivity ──────────────────────────────────

describe('getFellowshipActivity', () => {
  it('returns fellowship activity with average attendees', async () => {
    const mockRows = [
      { fellowshipName: 'Grace K-Group', meetingCount: 10, totalAttendees: 80 },
      { fellowshipName: 'Youth Express', meetingCount: 5, totalAttendees: 30 },
    ];
    setupSelectSequence(mockRows);

    const result = await getFellowshipActivity(mockDb, adminAuth);
    expect(result).toEqual([
      { fellowshipName: 'Grace K-Group', meetingCount: 10, avgAttendees: 8 },
      { fellowshipName: 'Youth Express', meetingCount: 5, avgAttendees: 6 },
    ]);
  });

  it('returns 0 avg when no meetings', async () => {
    const mockRows = [{ fellowshipName: 'Empty Group', meetingCount: 0, totalAttendees: 0 }];
    setupSelectSequence(mockRows);

    const result = await getFellowshipActivity(mockDb, adminAuth);
    expect(result).toEqual([{ fellowshipName: 'Empty Group', meetingCount: 0, avgAttendees: 0 }]);
  });

  it('returns empty array when no fellowships', async () => {
    setupSelectSequence([]);

    const result = await getFellowshipActivity(mockDb, pastorAuth);
    expect(result).toEqual([]);
  });
});
