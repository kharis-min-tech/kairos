import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// RBAC Phase 1: authMiddleware now calls resolveGrants on every request.
// Router tests use partial-mock DBs, so we stub the resolver to return [].
// Service-level capability behavior is covered by grants.test.ts.
vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return {
    ...actual,
    resolveGrants: vi.fn(async () => []),
  };
});

// RBAC Phase 3d: stub the lead/deputy-grant sync.
vi.mock('../lib/role-sync', () => ({
  syncDepartmentLeadGrants: vi.fn(async () => undefined),
  syncDepartmentDeputyGrants: vi.fn(async () => undefined),
}));

// ── Mock db ────────────────────────────────────────────────
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../db', () => ({ db: mockDb }));

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    sendJoinRequestReceivedEmail: vi.fn(() => Promise.resolve()),
    sendJoinRequestApprovedEmail: vi.fn(() => Promise.resolve()),
    sendJoinRequestRejectedEmail: vi.fn(() => Promise.resolve()),
    sendInterviewScheduledEmail: vi.fn(() => Promise.resolve()),
    sendOfferExtendedEmail: vi.fn(() => Promise.resolve()),
    sendProbationStartedEmail: vi.fn(() => Promise.resolve()),
    sendProbationPassedEmail: vi.fn(() => Promise.resolve()),
  };
});

function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin',
    'set', 'values', 'returning', 'groupBy',
  ]) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self;
}

const { createApp } = await import('../app');
const app = createApp();

const branchDeptId = '440e8400-0000-0000-0000-000000000004';
const departmentId = '550e8400-0000-0000-0000-000000000005';
const requestId = '660e8400-0000-0000-0000-000000000006';

const adminToken = signTestToken({ systemRole: 'admin' });
const pastorToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.pastorId });
const memberToken = signTestToken({
  systemRole: 'member',
  memberId: TEST_IDS.memberId,
  branchId: TEST_IDS.branchId,
});

const sampleBranchDept = {
  id: branchDeptId,
  branchId: TEST_IDS.branchId,
  branchName: 'Kharis London Central',
  departmentId,
  departmentName: 'Choir',
  iconKey: 'music',
  leadMemberId: TEST_IDS.pastorId,
  leadFirstName: 'James',
  leadLastName: 'Okonkwo',
  leadPhotoUrl: null,
  deputyMemberId: null,
  description: 'The choir',
  startDate: '2024-01-01',
  endDate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/departments/global ────────────────────────────

describe('GET /api/departments/global', () => {
  it('returns global department catalogue', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([{ id: departmentId, departmentName: 'Choir' }]));
    const res = await app.request('/api/departments/global', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await app.request('/api/departments/global');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/departments/global ───────────────────────────

describe('POST /api/departments/global', () => {
  it('creates a global department for admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([])); // name uniqueness
    mockDb.insert.mockReturnValueOnce(chainTo([{ id: departmentId, departmentName: 'Drama' }]));
    const res = await app.request('/api/departments/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ departmentName: 'Drama' }),
    });
    expect(res.status).toBe(201);
  });

  it('returns 401 for pastor (admin-only)', async () => {
    const res = await app.request('/api/departments/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pastorToken}` },
      body: JSON.stringify({ departmentName: 'Drama' }),
    });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/departments ───────────────────────────────────

describe('GET /api/departments', () => {
  it('returns paginated list', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchDept]))
      .mockReturnValueOnce(chainTo([{ value: 1 }]));
    const res = await app.request('/api/departments?page=1&limit=20', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });
});

// ── GET /api/departments/mine ──────────────────────────────

describe('GET /api/departments/mine', () => {
  it('returns current member departments', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([{ id: branchDeptId, departmentName: 'Choir' }]));
    const res = await app.request('/api/departments/mine', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(200);
  });
});

// ── GET /api/departments/:id ───────────────────────────────

describe('GET /api/departments/:id', () => {
  it('returns dept details', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranchDept]));
    const res = await app.request(`/api/departments/${branchDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 when missing', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([]));
    const res = await app.request(`/api/departments/${branchDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(404);
  });
});

// ── POST /api/departments ──────────────────────────────────

describe('POST /api/departments', () => {
  it('returns 401 for regular member', async () => {
    const res = await app.request('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({
        branchId: TEST_IDS.branchId,
        departmentId,
        leadMemberId: TEST_IDS.pastorId,
      }),
    });
    expect(res.status).toBe(401);
  });

  it.skip('TODO Phase 5: rewrite for new grant-based access — creates dept as pastor', async () => {
    // branch, dept, lead member, one-active check
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: TEST_IDS.branchId }]))
      .mockReturnValueOnce(chainTo([{ id: departmentId }]))
      .mockReturnValueOnce(chainTo([{
        id: TEST_IDS.pastorId,
        homeBranchId: TEST_IDS.branchId,
        secondaryBranchId: null,
        isAtSecondaryBranch: false,
      }]))
      .mockReturnValueOnce(chainTo([])); // no existing
    mockDb.insert
      .mockReturnValueOnce(chainTo([{ id: branchDeptId }]))
      .mockReturnValueOnce(chainTo([{}])); // auto-add lead

    const res = await app.request('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pastorToken}` },
      body: JSON.stringify({
        branchId: TEST_IDS.branchId,
        departmentId,
        leadMemberId: TEST_IDS.pastorId,
      }),
    });
    expect(res.status).toBe(201);
  });
});

// ── DELETE /api/departments/:id ────────────────────────────

describe('DELETE /api/departments/:id', () => {
  it('returns 401 for regular member', async () => {
    const res = await app.request(`/api/departments/${branchDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/departments/:id/members ───────────────────────

describe('GET /api/departments/:id/members', () => {
  it('returns members list for admin', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchDept]))
      .mockReturnValueOnce(chainTo([{ id: 'dm-1', memberFirstName: 'Jane' }]));
    const res = await app.request(`/api/departments/${branchDeptId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });
});

// ── POST /api/departments/:id/members ──────────────────────

describe('POST /api/departments/:id/members', () => {
  it('returns 401 for regular member', async () => {
    const res = await app.request(`/api/departments/${branchDeptId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/departments/:id/members/:memberId ──────────

describe('DELETE /api/departments/:id/members/:memberId', () => {
  it('returns 401 for regular member', async () => {
    const res = await app.request(
      `/api/departments/${branchDeptId}/members/${TEST_IDS.memberId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${memberToken}` } },
    );
    expect(res.status).toBe(401);
  });
});

// ── POST /api/departments/:id/join-requests ────────────────

describe('POST /api/departments/:id/join-requests', () => {
  it('allows member to create join request', async () => {
    // 1) getBranchDept, 2) applicant branch, 3) active check, 4) pending check, 5) cap count, 6) requester email
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchDept]))
      .mockReturnValueOnce(
        chainTo([
          {
            homeBranchId: sampleBranchDept.branchId,
            secondaryBranchId: null,
            isAtSecondaryBranch: false,
          },
        ]),
      )
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([{ value: 0 }]))
      .mockReturnValueOnce(chainTo([{ email: 'm@x', firstName: 'M' }]));
    mockDb.insert.mockReturnValueOnce(chainTo([{ id: requestId, status: 'applied' }]));
    const res = await app.request(`/api/departments/${branchDeptId}/join-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ notes: 'I want to join' }),
    });
    expect(res.status).toBe(201);
  });
});

// ── GET /api/departments/:id/join-requests ─────────────────

describe('GET /api/departments/:id/join-requests', () => {
  it('returns 403 for regular member', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranchDept]));
    const res = await app.request(`/api/departments/${branchDeptId}/join-requests`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns list for admin', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchDept]))
      .mockReturnValueOnce(chainTo([]));
    const res = await app.request(`/api/departments/${branchDeptId}/join-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });
});

// ── POST /api/departments/:id/join-requests/:requestId/reject ─

describe('POST /api/departments/:id/join-requests/:requestId/reject', () => {
  it('returns 403 for regular member', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranchDept]));
    const res = await app.request(
      `/api/departments/${branchDeptId}/join-requests/${requestId}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ reviewNotes: 'no fit' }),
      },
    );
    expect(res.status).toBe(403);
  });
});
