import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// RBAC Phase 1: authMiddleware calls resolveGrants on every request. Router
// tests use partial-mock DBs, so the resolver is stubbed — but configurably,
// because these three routes are gated on a real capability now and a test
// has to be able to hand a caller the grant that carries it.
const { resolveGrantsMock } = vi.hoisted(() => ({
  resolveGrantsMock: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return {
    ...actual,
    resolveGrants: resolveGrantsMock,
  };
});

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

const adminToken = await signTestToken({ systemRole: 'admin' });
const pastorToken = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.pastorId, branchId: TEST_IDS.branchId });
const memberToken = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

/** A BranchAdmin grant over the test branch — this is what carries branch:read. */
function grantBranchRead() {
  resolveGrantsMock.mockResolvedValueOnce([
    {
      role: 'BranchAdmin',
      scope: { kind: 'branch', id: TEST_IDS.branchId },
      branchId: TEST_IDS.branchId,
    },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveGrantsMock.mockResolvedValue([]);
});

// ── GET /api/reports/member-growth ─────────────────────────

describe('GET /api/reports/member-growth', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/reports/member-growth');
    expect(res.status).toBe(401);
  });

  it('refuses a plain member — this is a branch-wide aggregate', async () => {
    // The old gate was requireRole('admin','pastor','leader','member'), which
    // passed for everyone because systemRole only has two possible values and
    // both were listed. A member's own figures live on /api/me/*.
    const res = await app.request('/api/reports/member-growth', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('allows a caller holding branch:read on their own branch', async () => {
    grantBranchRead();
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

  it('refuses a pastor who holds no grant — the honorific carries nothing', async () => {
    // 'pastor' stopped being a systemRole in Phase 4a. Authority comes from a
    // BranchAdmin grant, so a pastor without one reads nothing branch-wide.
    const res = await app.request('/api/reports/member-growth', {
      headers: { Authorization: `Bearer ${pastorToken}` },
    });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/reports/attendance-trend ──────────────────────

describe('GET /api/reports/attendance-trend', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/reports/attendance-trend');
    expect(res.status).toBe(401);
  });

  it('refuses a plain member — this is a branch-wide aggregate', async () => {
    const res = await app.request('/api/reports/attendance-trend', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(403);
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

  it('refuses a plain member — this is a branch-wide aggregate', async () => {
    const res = await app.request('/api/reports/fellowship-activity', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(403);
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
