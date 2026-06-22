import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// RBAC Phase 1: authMiddleware now calls resolveGrants on every request.
// Router tests use partial-mock DBs, so we stub the resolver to return [].
// Service-level capability behavior is covered by grants.test.ts.
vi.mock('../lib/grants', () => ({
  resolveGrants: vi.fn(async () => []),
  hasCapability: vi.fn(() => false),
  authHasCapability: vi.fn(() => false),
}));

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

// ── Fixtures ───────────────────────────────────────────────

const fellowshipId = 'f1f1f1f1-0000-0000-0000-000000000001';
const coLeadFellowshipId = 'f2f2f2f2-0000-0000-0000-000000000002';
const leadDeptId = 'd1d1d1d1-0000-0000-0000-000000000003';
const deputyDeptId = 'd2d2d2d2-0000-0000-0000-000000000004';
const branchA = TEST_IDS.branchId;
const branchB = TEST_IDS.branch2Id;

const fellowshipLeaderRow = {
  id: fellowshipId,
  fellowshipName: 'K-Group: Hackney',
  branchId: branchA,
  leaderId: TEST_IDS.memberId,
  coLeaderId: null as string | null,
};
const fellowshipCoLeadRow = {
  id: coLeadFellowshipId,
  fellowshipName: 'K-Group: Bow',
  branchId: branchA,
  leaderId: 'someone-else',
  coLeaderId: TEST_IDS.memberId,
};
const leadDeptRow = {
  id: leadDeptId,
  departmentName: 'Choir',
  branchId: branchA,
  leadMemberId: TEST_IDS.memberId,
  deputyMemberId: null as string | null,
};
const deputyDeptRow = {
  id: deputyDeptId,
  departmentName: 'Ushers',
  branchId: branchA,
  leadMemberId: 'someone-else',
  deputyMemberId: TEST_IDS.memberId,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/me/leadership ─────────────────────────────────

describe('GET /api/me/leadership', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/me/leadership');
    expect(res.status).toBe(401);
  });

  it('returns empty arrays for a plain member', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([])) // fellowships
      .mockReturnValueOnce(chainTo([])); // branch_departments

    const token = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: [],
      deputyDepartments: [],
    });
  });

  it('echoes branchSystemAdminBranchIds + branchDataAdminBranchIds for a branch system admin', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA],
      branchDataAdminBranchIds: [branchA],
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([branchA]);
    expect(body.data.branchDataAdminBranchIds).toEqual([branchA]);
  });

  it('splits fellowships into lead vs co-lead based on memberId match', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow, fellowshipCoLeadRow]))
      .mockReturnValueOnce(chainTo([]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.leadFellowships).toEqual([
      { id: fellowshipId, fellowshipName: 'K-Group: Hackney', branchId: branchA },
    ]);
    expect(body.data.coLeadFellowships).toEqual([
      { id: coLeadFellowshipId, fellowshipName: 'K-Group: Bow', branchId: branchA },
    ]);
  });

  it('splits branch_departments into lead vs deputy based on memberId match', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([leadDeptRow, deputyDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.leadDepartments).toEqual([
      { id: leadDeptId, departmentName: 'Choir', branchId: branchA },
    ]);
    expect(body.data.deputyDepartments).toEqual([
      { id: deputyDeptId, departmentName: 'Ushers', branchId: branchA },
    ]);
  });

  it('returns echoed arrays even for a system admin (their authority comes from systemRole)', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([]));

    const token = signTestToken({ systemRole: 'admin' });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([]);
    expect(body.data.branchDataAdminBranchIds).toEqual([]);
  });

  it('returns full shape with all four categories populated', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow, fellowshipCoLeadRow]))
      .mockReturnValueOnce(chainTo([leadDeptRow, deputyDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA, branchB],
      branchDataAdminBranchIds: [branchA],
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([branchA, branchB]);
    expect(body.data.branchDataAdminBranchIds).toEqual([branchA]);
    expect(body.data.leadFellowships).toHaveLength(1);
    expect(body.data.coLeadFellowships).toHaveLength(1);
    expect(body.data.leadDepartments).toHaveLength(1);
    expect(body.data.deputyDepartments).toHaveLength(1);
  });

  // ── Phase 4: scope-aware narrowing ───────────────────────
  //
  // When auth.scope is set, the response is narrowed to that one entity. The
  // dashboard + reports surfaces consume getMyLeadership as their source of
  // truth, so narrowing here is what produces a single-fellowship view for a
  // scope-bound leader without touching the UI.

  it('scope=fellowship:F filters to just that fellowship + empties other arrays', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow, fellowshipCoLeadRow]))
      .mockReturnValueOnce(chainTo([leadDeptRow, deputyDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA],
      branchDataAdminBranchIds: [branchA],
      scope: { kind: 'fellowship', id: fellowshipId },
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.leadFellowships).toEqual([
      { id: fellowshipId, fellowshipName: 'K-Group: Hackney', branchId: branchA },
    ]);
    expect(body.data.coLeadFellowships).toEqual([]);
    expect(body.data.leadDepartments).toEqual([]);
    expect(body.data.deputyDepartments).toEqual([]);
    expect(body.data.branchSystemAdminBranchIds).toEqual([]);
    expect(body.data.branchDataAdminBranchIds).toEqual([]);
  });

  it('scope=department:D filters to just that department + empties other arrays', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow, fellowshipCoLeadRow]))
      .mockReturnValueOnce(chainTo([leadDeptRow, deputyDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA],
      branchDataAdminBranchIds: [branchA],
      scope: { kind: 'department', id: deputyDeptId },
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.leadFellowships).toEqual([]);
    expect(body.data.coLeadFellowships).toEqual([]);
    expect(body.data.leadDepartments).toEqual([]);
    expect(body.data.deputyDepartments).toEqual([
      { id: deputyDeptId, departmentName: 'Ushers', branchId: branchA },
    ]);
    expect(body.data.branchSystemAdminBranchIds).toEqual([]);
    expect(body.data.branchDataAdminBranchIds).toEqual([]);
  });

  it('scope=branch:B narrows admin arrays to that branch + empties leadership arrays', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow]))
      .mockReturnValueOnce(chainTo([leadDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA, branchB],
      branchDataAdminBranchIds: [branchA, branchB],
      scope: { kind: 'branch', id: branchA },
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([branchA]);
    expect(body.data.branchDataAdminBranchIds).toEqual([branchA]);
    expect(body.data.leadFellowships).toEqual([]);
    expect(body.data.coLeadFellowships).toEqual([]);
    expect(body.data.leadDepartments).toEqual([]);
    expect(body.data.deputyDepartments).toEqual([]);
  });

  it('scope=branch:B drops admin assignments the user does not hold', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo([]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      // User holds BSA only on branchA — scope=branchB would yield nothing
      branchSystemAdminBranchIds: [branchA],
      branchDataAdminBranchIds: [], grants: [],
      scope: { kind: 'branch', id: branchB },
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([]);
    expect(body.data.branchDataAdminBranchIds).toEqual([]);
  });

  it('scope=undefined preserves legacy unfiltered behavior (regression)', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([fellowshipLeaderRow, fellowshipCoLeadRow]))
      .mockReturnValueOnce(chainTo([leadDeptRow, deputyDeptRow]));

    const token = signTestToken({
      systemRole: 'leader',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
      branchSystemAdminBranchIds: [branchA],
      branchDataAdminBranchIds: [branchA],
      // explicitly no `scope`
    });

    const res = await app.request('/api/me/leadership', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchSystemAdminBranchIds).toEqual([branchA]);
    expect(body.data.branchDataAdminBranchIds).toEqual([branchA]);
    expect(body.data.leadFellowships).toHaveLength(1);
    expect(body.data.coLeadFellowships).toHaveLength(1);
    expect(body.data.leadDepartments).toHaveLength(1);
    expect(body.data.deputyDepartments).toHaveLength(1);
  });
});
