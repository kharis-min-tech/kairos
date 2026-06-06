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
const pastorToken = signTestToken({ systemRole: 'pastor', memberId: TEST_IDS.pastorId, branchId: TEST_IDS.branchId });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/reports/member-growth ─────────────────────────

describe('GET /api/reports/member-growth', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/reports/member-growth');
    expect(res.status).toBe(401);
  });

  it('should allow member role (branch-scoped)', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([{ month: '2024-04', newSignups: 2 }]));

    const res = await app.request('/api/reports/member-growth', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('should return member growth data for admin', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { month: '2024-01', newSignups: 5 },
        { month: '2024-02', newSignups: 8 },
      ]),
    );

    const res = await app.request('/api/reports/member-growth', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].month).toBe('2024-01');
  });

  it('should return member growth data for pastor', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([{ month: '2024-03', newSignups: 3 }]),
    );

    const res = await app.request('/api/reports/member-growth', {
      headers: { Authorization: `Bearer ${pastorToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

// ── GET /api/reports/attendance-trend ──────────────────────

describe('GET /api/reports/attendance-trend', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/reports/attendance-trend');
    expect(res.status).toBe(401);
  });

  it('should allow member role (branch-scoped)', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([{ week: '2024-05-27', total: 10, present: 8 }]));

    const res = await app.request('/api/reports/attendance-trend', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('should return attendance trend data for admin', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { week: '2024-05-27', total: 20, present: 17 },
        { week: '2024-06-03', total: 18, present: 15 },
      ]),
    );

    const res = await app.request('/api/reports/attendance-trend', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].week).toBe('2024-05-27');
    expect(body.data[0].rate).toBe(85);
  });
});

// ── GET /api/reports/fellowship-activity ───────────────────

describe('GET /api/reports/fellowship-activity', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/reports/fellowship-activity');
    expect(res.status).toBe(401);
  });

  it('should allow member role (branch-scoped)', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([{ fellowshipName: 'Grace K-Group', meetingCount: 4, totalAttendees: 32 }]));

    const res = await app.request('/api/reports/fellowship-activity', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('should return fellowship activity data for admin', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([
        { fellowshipName: 'Grace K-Group', meetingCount: 10, totalAttendees: 80 },
        { fellowshipName: 'Youth Express', meetingCount: 5, totalAttendees: 30 },
      ]),
    );

    const res = await app.request('/api/reports/fellowship-activity', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].fellowshipName).toBe('Grace K-Group');
    expect(body.data[0].avgAttendees).toBe(8);
  });
});
