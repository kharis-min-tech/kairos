import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// ── Mock db ────────────────────────────────────────────────
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock('../db', () => ({ db: mockDb }));

function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning', 'groupBy']) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self;
}

const { createApp } = await import('../app');
const app = createApp();

const adminToken = signTestToken({ systemRole: 'admin' });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/analytics/admin ───────────────────────────────

describe('GET /api/analytics/admin', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/analytics/admin');
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin', async () => {
    const res = await app.request('/api/analytics/admin', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(403);
  });

  it('should return admin stats', async () => {
    // Promise.all: branches count, members count, fellowships count
    mockDb.select
      .mockReturnValueOnce(chainTo([{ value: 5 }]))
      .mockReturnValueOnce(chainTo([{ value: 120 }]))
      .mockReturnValueOnce(chainTo([{ value: 15 }]));

    // approvalStats
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { status: 'approved', count: 100 },
        { status: 'pending', count: 20 },
      ]),
    );

    // fellowshipsByType
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { type: 'K-Groups', count: 8 },
        { type: 'New Breeds', count: 7 },
      ]),
    );

    const res = await app.request('/api/analytics/admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.totalBranches).toBe(5);
    expect(body.data.totalMembers).toBe(120);
    expect(body.data.totalFellowships).toBe(15);
  });
});

// ── GET /api/analytics/branch ──────────────────────────────

describe('GET /api/analytics/branch', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/analytics/branch');
    expect(res.status).toBe(401);
  });

  it('should return branch stats', async () => {
    // Promise.all: memberCount, fellowshipCount, recentMeetingCount
    mockDb.select
      .mockReturnValueOnce(chainTo([{ value: 35 }]))
      .mockReturnValueOnce(chainTo([{ value: 4 }]))
      .mockReturnValueOnce(chainTo([{ value: 12 }]));

    // pendingCount
    mockDb.select.mockReturnValueOnce(chainTo([{ value: 3 }]));

    // attendanceTrend (weekly stats, last 8 weeks)
    mockDb.select.mockReturnValueOnce(
      chainTo([{ week: '2024-06-03', total: 20, present: 17 }]),
    );

    const res = await app.request('/api/analytics/branch', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.totalMembers).toBe(35);
    expect(body.data.totalFellowships).toBe(4);
    expect(body.data.pendingApprovals).toBe(3);
    expect(body.data.attendanceTrend).toHaveLength(1);
    expect(body.data.attendanceTrend[0].rate).toBe(85);
  });
});

// ── GET /api/analytics/member ──────────────────────────────

describe('GET /api/analytics/member', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/analytics/member');
    expect(res.status).toBe(401);
  });

  it('should return member stats', async () => {
    // myFellowships
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { fellowshipId: TEST_IDS.fellowshipId, fellowshipName: 'K-Group A', fellowshipType: 'K-Groups' },
      ]),
    );

    // attendanceRecords
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { status: 'Present', count: 8 },
        { status: 'Absent', count: 2 },
      ]),
    );

    const res = await app.request('/api/analytics/member', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.fellowshipsJoined).toBe(1);
    expect(body.data.recentAttendance.total).toBe(10);
    expect(body.data.recentAttendance.present).toBe(8);
    expect(body.data.recentAttendance.rate).toBe(80);
  });
});
