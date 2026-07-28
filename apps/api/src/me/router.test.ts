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

// ── Mock db ────────────────────────────────────────────────
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../db', () => ({ db: mockDb }));

// Delete-account verifies the caller's password via @kairos/utils. Stub only
// verifyPassword so the rest of the utils surface (successResponse, errors,
// randomTokenHex) keeps working.
vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kairos/utils')>();
  return {
    ...actual,
    verifyPassword: vi.fn(async () => true),
  };
});
const utils = await import('@kairos/utils');
const mockVerifyPassword = utils.verifyPassword as unknown as ReturnType<typeof vi.fn>;

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

    const token = await signTestToken({
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({ systemRole: 'admin' });

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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

    const token = await signTestToken({
      systemRole: 'member',
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

// ── POST /api/me/delete-account ────────────────────────────

describe('POST /api/me/delete-account', () => {
  beforeEach(() => {
    mockVerifyPassword.mockReset();
    mockVerifyPassword.mockResolvedValue(true);
  });

  it('returns 401 without an auth header', async () => {
    const res = await app.request('/api/me/delete-account', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when currentPassword is missing', async () => {
    const token = await signTestToken({ memberId: TEST_IDS.memberId });
    const res = await app.request('/api/me/delete-account', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 when the password is wrong', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([{ id: TEST_IDS.memberId, passwordHash: '$2b$10$stub', isActive: true }]),
    );
    mockVerifyPassword.mockResolvedValueOnce(false);
    const token = await signTestToken({ memberId: TEST_IDS.memberId });
    const res = await app.request('/api/me/delete-account', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: 'nope' }),
    });
    expect(res.status).toBe(401);
  });

  it('scrubs PII and returns 200 on success', async () => {
    mockDb.select.mockReturnValueOnce(
      chainTo([{ id: TEST_IDS.memberId, passwordHash: '$2b$10$stub', isActive: true }]),
    );
    const updateChain = chainTo([]);
    mockDb.update.mockReturnValueOnce(updateChain);
    mockDb.delete.mockReturnValueOnce(chainTo([]));

    const token = await signTestToken({ memberId: TEST_IDS.memberId });
    const res = await app.request('/api/me/delete-account', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: 'right' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { deleted: boolean } };
    expect(body.data.deleted).toBe(true);
    // The scrub call ran with the anonymising fields.
    const setCall = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Record<string, unknown>;
    expect(setCall['firstName']).toBe('Deleted');
    expect(setCall['lastName']).toBe('User');
    expect(setCall['isActive']).toBe(false);
    expect(setCall['email']).toMatch(/^deleted-.*@deleted\.kairos\.local$/);
    expect(setCall['photoUrl']).toBeNull();
    expect(setCall['phone']).toBeNull();
    // And notification preferences were purged.
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

// ── GET /api/me/consent ────────────────────────────────────
//
// The consent endpoint routes through hasPrivilegedRole → listConsentStatuses.
// We assert the two branches that matter for the confidentiality gate:
//   • plain member → admin_confidentiality.required=false
//   • privileged (systemRole=admin) → admin_confidentiality.required=true

describe('GET /api/me/consent', () => {
  beforeEach(() => {
    delete process.env['CONSENT_VERSION_ADMIN_CONFIDENTIALITY'];
  });

  it('returns 401 without an auth header', async () => {
    const res = await app.request('/api/me/consent');
    expect(res.status).toBe(401);
  });

  it('marks admin_confidentiality as NOT required for a plain member', async () => {
    // hasPrivilegedRole checks fellowships + branch_departments (both empty)
    // then listConsentStatuses reads consent rows (also empty).
    mockDb.select
      .mockReturnValueOnce(chainTo([])) // fellowships leader query
      .mockReturnValueOnce(chainTo([])) // branch_departments lead query
      .mockReturnValueOnce(chainTo([])); // consent_records rows

    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
    });
    const res = await app.request('/api/me/consent', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { statuses: Array<{ consentType: string; required: boolean; needsAccept: boolean }> };
    };
    const conf = body.data.statuses.find((s) => s.consentType === 'admin_confidentiality')!;
    expect(conf.required).toBe(false);
    expect(conf.needsAccept).toBe(false);
    // But acceptable_use IS required for everyone
    const aup = body.data.statuses.find((s) => s.consentType === 'acceptable_use')!;
    expect(aup.required).toBe(true);
    expect(aup.needsAccept).toBe(true);
  });

  it('marks admin_confidentiality as REQUIRED for a system admin', async () => {
    // systemRole=admin short-circuits hasPrivilegedRole — no DB check needed
    // for privilege. So only listConsentStatuses's select runs.
    mockDb.select.mockReturnValueOnce(chainTo([])); // consent_records rows

    const token = await signTestToken({ systemRole: 'admin' });
    const res = await app.request('/api/me/consent', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { statuses: Array<{ consentType: string; required: boolean; needsAccept: boolean }> };
    };
    const conf = body.data.statuses.find((s) => s.consentType === 'admin_confidentiality')!;
    expect(conf.required).toBe(true);
    expect(conf.needsAccept).toBe(true);
  });

  it('marks admin_confidentiality as REQUIRED for a BranchAdmin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([])); // consent_records rows

    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchSystemAdminBranchIds: [TEST_IDS.branchId],
    });
    const res = await app.request('/api/me/consent', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { statuses: Array<{ consentType: string; required: boolean }> };
    };
    const conf = body.data.statuses.find((s) => s.consentType === 'admin_confidentiality')!;
    expect(conf.required).toBe(true);
  });

  it('marks admin_confidentiality as REQUIRED when the caller leads a fellowship', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: 'fellowship-1' }])) // fellowships leader query returns a row
      .mockReturnValueOnce(chainTo([])) // branch_departments empty
      .mockReturnValueOnce(chainTo([])); // consent_records rows

    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
    });
    const res = await app.request('/api/me/consent', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { statuses: Array<{ consentType: string; required: boolean }> };
    };
    const conf = body.data.statuses.find((s) => s.consentType === 'admin_confidentiality')!;
    expect(conf.required).toBe(true);
  });
});

// ── GET /api/me/export ─────────────────────────────────────

describe('GET /api/me/export', () => {
  it('returns 401 without an auth header', async () => {
    const res = await app.request('/api/me/export');
    expect(res.status).toBe(401);
  });

  it('returns the caller data blob and never leaks the password hash', async () => {
    const memberRow = {
      id: TEST_IDS.memberId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      passwordHash: '$2b$10$SECRET_HASH_DO_NOT_LEAK',
      passwordResetToken: 'reset-token-secret',
      isActive: true,
    };
    mockDb.select.mockReturnValueOnce(chainTo([memberRow]));
    // The remaining 8 selects in Promise.all get empty defaults.
    mockDb.select.mockReturnValue(chainTo([]));

    const token = await signTestToken({ memberId: TEST_IDS.memberId });
    const res = await app.request('/api/me/export', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { exportedAt: string; member: Record<string, unknown> } };
    expect(body.data.exportedAt).toBeTruthy();
    expect(body.data.member['firstName']).toBe('Ada');
    expect(body.data.member['passwordHash']).toBeUndefined();
    expect(body.data.member['passwordResetToken']).toBeUndefined();
  });
});
