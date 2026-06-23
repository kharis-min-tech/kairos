import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';
import { FunctionalRole, type Grant } from '@kairos/types';

// RBAC Phase 1: authMiddleware calls resolveGrants on every request.
// Router tests use partial-mock DBs, so we stub the resolver. Hoisted via
// vi.hoisted so individual tests can override the return value when they
// need to simulate a member holding a specific grant (BSA/BDA/etc.).
const { resolveGrantsMock } = vi.hoisted(() => ({
  resolveGrantsMock: vi.fn(async (): Promise<Grant[]> => []),
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
  // Transactions invoke the callback with the same chainable mock — tests
  // queue their `.select` / `.update` returns against mockDb regardless of
  // whether the production code wraps the work in `db.transaction(...)`.
  transaction: vi.fn(async (cb: (tx: typeof mockDb) => unknown) => await cb(mockDb)),
};

vi.mock('../db', () => ({ db: mockDb }));

function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning', 'for']) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self;
}

const { createApp } = await import('../app');
const app = createApp();

const adminToken = signTestToken({ systemRole: 'admin' });
const pastorToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.pastorId });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

const sampleRegion = {
  id: TEST_IDS.regionId,
  regionName: 'United Kingdom',
  country: 'United Kingdom',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleBranch = {
  id: TEST_IDS.branchId,
  branchName: 'Kharis London Central',
  regionId: TEST_IDS.regionId,
  regionName: 'United Kingdom',
  branchType: 'Main',
  address: '142 Kingsway',
  city: 'London',
  postalCode: 'WC2B 6NH',
  phone: '+442071234567',
  email: 'london@kharischurch.org',
  establishedDate: '2008-03-15',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleLeadership = {
  id: TEST_IDS.leadershipId,
  branchId: TEST_IDS.branchId,
  memberId: TEST_IDS.pastorId,
  memberFirstName: 'James',
  memberLastName: 'Okonkwo',
  role: 'Main Pastor',
  startDate: '2024-01-01',
  endDate: null,
  isCurrent: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/branches/regions ──────────────────────────────

describe('GET /api/branches/regions', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/branches/regions');
    expect(res.status).toBe(401);
  });

  it('should return regions list', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleRegion]));

    const res = await app.request('/api/branches/regions', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].regionName).toBe('United Kingdom');
  });
});

// ── POST /api/branches/regions ─────────────────────────────

describe('POST /api/branches/regions', () => {
  it('should return 401 for non-admin', async () => {
    const res = await app.request('/api/branches/regions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ regionName: 'Test', country: 'UK' }),
    });

    expect(res.status).toBe(401);
  });

  it('should create a region for admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([]));
    mockDb.insert.mockReturnValueOnce(chainTo([sampleRegion]));

    const res = await app.request('/api/branches/regions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ regionName: 'United Kingdom', country: 'United Kingdom' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.regionName).toBe('United Kingdom');
  });
});

// ── GET /api/branches ──────────────────────────────────────

describe('GET /api/branches', () => {
  it('should return all branches for admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranch]));

    const res = await app.request('/api/branches', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('should scope branches for regular member', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranch]));

    const res = await app.request('/api/branches', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(200);
  });
});

// ── GET /api/branches/:id ──────────────────────────────────

describe('GET /api/branches/:id', () => {
  it('should return branch details for admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleBranch]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.branchName).toBe('Kharis London Central');
  });

  it('should return 404 for non-existent branch', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/branches ─────────────────────────────────────

describe('POST /api/branches', () => {
  it('should return 401 for non-admin', async () => {
    const res = await app.request('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ branchName: 'Test', regionId: TEST_IDS.regionId }),
    });

    expect(res.status).toBe(401);
  });

  it('should create branch as admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleRegion]));
    mockDb.insert.mockReturnValueOnce(chainTo([sampleBranch]));

    const res = await app.request('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ branchName: 'Kharis London Central', regionId: TEST_IDS.regionId }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── DELETE /api/branches/:id ───────────────────────────────

describe('DELETE /api/branches/:id', () => {
  it('should return 401 for non-admin', async () => {
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pastorToken}` },
    });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/branches/:id/leadership ───────────────────────

describe('GET /api/branches/:id/leadership', () => {
  it('should return leadership for admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleLeadership]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].role).toBe('Main Pastor');
  });
});

// ── POST /api/branches/:id/leadership ──────────────────────
// Migrated to requireBranchSystemAdmin('id'). Branch Data Admin alone is
// not enough; Branch System Admin OR system admin is required.

describe('POST /api/branches/:id/leadership (BSA-gated)', () => {
  const sampleBranchRow = { id: TEST_IDS.branchId, isActive: true };
  const sampleMemberRow = {
    id: TEST_IDS.memberId,
    firstName: 'Test',
    lastName: 'Pastor',
    email: 't@x',
    isActive: true,
  };

  it('rejects a plain member with 401', async () => {
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId, role: 'Main Pastor' }),
    });
    expect(res.status).toBe(401);
  });

  it('allows system admin to assign Main Pastor', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchRow]))
      .mockReturnValueOnce(chainTo([sampleMemberRow]))
      .mockReturnValueOnce(chainTo([])); // existing duplicate check (none)
    mockDb.update.mockReturnValueOnce(chainTo([])); // deactivate previous Main Pastor
    mockDb.insert.mockReturnValueOnce(chainTo([sampleLeadership]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId, role: 'Main Pastor' }),
    });
    expect(res.status).toBe(201);
  });

  it('allows branch system admin of the requested branch', async () => {
    const bsaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branchId,
      branchSystemAdminBranchIds: [TEST_IDS.branchId],
    });
    // Post-Phase-3f: BSA authority comes from explicit grants, not the
    // legacy array. Mirror the token's BSA-on-this-branch into a grant.
    resolveGrantsMock.mockResolvedValueOnce([
      {
        role: FunctionalRole.BranchAdmin,
        scope: { kind: 'branch', id: TEST_IDS.branchId },
        branchId: TEST_IDS.branchId,
      },
    ]);
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchRow]))
      .mockReturnValueOnce(chainTo([sampleMemberRow]))
      .mockReturnValueOnce(chainTo([]));
    mockDb.update.mockReturnValueOnce(chainTo([]));
    mockDb.insert.mockReturnValueOnce(chainTo([sampleLeadership]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bsaToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId, role: 'Main Pastor' }),
    });
    expect(res.status).toBe(201);
  });

  it('rejects branch DATA admin alone (BSA is required)', async () => {
    const bdaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branchId,
      branchDataAdminBranchIds: [TEST_IDS.branchId],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bdaToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId, role: 'Main Pastor' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects branch system admin of a DIFFERENT branch', async () => {
    const otherBsaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branch2Id,
      branchSystemAdminBranchIds: [TEST_IDS.branch2Id],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/leadership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherBsaToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId, role: 'Main Pastor' }),
    });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/branches/:id/roles ────────────────────────────
// Lists Branch System Admin assignments — gated by requireBranchAdmin
// (any branch admin, system or data, can view).

const sampleRoleAssignment = {
  id: 'cc0e8400-0000-0000-0000-000000000005',
  memberId: TEST_IDS.memberId,
  memberFirstName: 'Sarah',
  memberLastName: 'Okeke',
  memberEmail: 'sarah@kairos.local',
  roleName: 'Branch System Admin',
  assignedDate: '2026-01-01',
  isActive: true,
};

describe('GET /api/branches/:id/roles', () => {
  it('returns 401 for plain member', async () => {
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('returns assignments for system admin', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleRoleAssignment]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].roleName).toBe('Branch System Admin');
    expect(body.data[0].member.firstName).toBe('Sarah');
  });

  it('returns assignments for branch DATA admin of that branch (view-only is allowed)', async () => {
    const bdaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branchId,
      branchDataAdminBranchIds: [TEST_IDS.branchId],
    });
    // Post-Phase-3f: BDA authority comes from explicit grants.
    resolveGrantsMock.mockResolvedValueOnce([
      {
        role: FunctionalRole.BranchDataAdmin,
        scope: { kind: 'branch', id: TEST_IDS.branchId },
        branchId: TEST_IDS.branchId,
      },
    ]);
    mockDb.select.mockReturnValueOnce(chainTo([sampleRoleAssignment]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      headers: { Authorization: `Bearer ${bdaToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('returns 401 for branch system admin of OTHER branch', async () => {
    const otherBsaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branch2Id,
      branchSystemAdminBranchIds: [TEST_IDS.branch2Id],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      headers: { Authorization: `Bearer ${otherBsaToken}` },
    });
    expect(res.status).toBe(401);
  });
});

// ── POST /api/branches/:id/roles ───────────────────────────
// Grants Branch System Admin — gated by requireBranchSystemAdmin.

describe('POST /api/branches/:id/roles', () => {
  const sampleBranchRow = { id: TEST_IDS.branchId, isActive: true };
  const sampleMemberRow = {
    id: TEST_IDS.memberId,
    firstName: 'Sarah',
    lastName: 'Okeke',
    email: 'sarah@kairos.local',
    isActive: true,
  };
  const sampleRoleRow = { id: TEST_IDS.roleId };
  const insertedRow = {
    id: 'cc0e8400-0000-0000-0000-000000000006',
    memberId: TEST_IDS.memberId,
    roleId: TEST_IDS.roleId,
    branchId: TEST_IDS.branchId,
    assignedDate: '2026-06-12',
    isActive: true,
  };

  it('rejects plain member with 401', async () => {
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects branch DATA admin alone (BSA is required to grant)', async () => {
    const bdaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branchId,
      branchDataAdminBranchIds: [TEST_IDS.branchId],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bdaToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(401);
  });

  it('allows system admin to assign', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchRow]))    // branch lookup
      .mockReturnValueOnce(chainTo([sampleMemberRow]))    // member lookup
      .mockReturnValueOnce(chainTo([sampleRoleRow]))      // role lookup
      .mockReturnValueOnce(chainTo([]));                  // duplicate check
    mockDb.insert.mockReturnValueOnce(chainTo([insertedRow]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.data.memberId).toBe(TEST_IDS.memberId);
    expect(body.data.roleName).toBe('Branch System Admin');
  });

  it('returns 409 when member already holds the role for this branch', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleBranchRow]))
      .mockReturnValueOnce(chainTo([sampleMemberRow]))
      .mockReturnValueOnce(chainTo([sampleRoleRow]))
      .mockReturnValueOnce(chainTo([{ id: 'existing' }])); // duplicate exists

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects branch system admin of OTHER branch', async () => {
    const otherBsaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branch2Id,
      branchSystemAdminBranchIds: [TEST_IDS.branch2Id],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherBsaToken}` },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/branches/:id/roles/:assignmentId ───────────

describe('DELETE /api/branches/:id/roles/:assignmentId', () => {
  const assignmentId = 'cc0e8400-0000-0000-0000-000000000007';
  const sampleRoleRow = { id: TEST_IDS.roleId };
  const sampleAssignment = {
    id: assignmentId,
    memberId: TEST_IDS.memberId,
    branchId: TEST_IDS.branchId,
    roleId: TEST_IDS.roleId,
    isActive: true,
    assignedDate: '2026-01-01',
  };
  const sampleMemberRow = {
    id: TEST_IDS.memberId,
    firstName: 'Sarah',
    lastName: 'Okeke',
    email: 'sarah@kairos.local',
  };
  const revokedRow = { ...sampleAssignment, isActive: false };

  it('rejects plain member', async () => {
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects branch DATA admin alone', async () => {
    const bdaToken = signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: TEST_IDS.branchId,
      branchDataAdminBranchIds: [TEST_IDS.branchId],
    });
    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bdaToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects revocation of the LAST active Branch System Admin (lockout guard)', async () => {
    // Service queries inside db.transaction: role lookup, then a single
    // FOR-UPDATE select of all active BSA rows in this branch+role.
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleRoleRow]))                                                    // role lookup
      .mockReturnValueOnce(chainTo([{ id: assignmentId, memberId: sampleAssignment.memberId, assignedDate: '2026-01-01' }])); // only one active row, locked

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.message || body.error).toMatch(/last active/i);
  });

  it('allows revocation when more than one active BSA exists', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleRoleRow]))                                                    // role lookup
      .mockReturnValueOnce(chainTo([                                                                    // FOR UPDATE — two active rows
        { id: assignmentId, memberId: sampleAssignment.memberId, assignedDate: '2026-01-01' },
        { id: 'dd0e8400-0000-0000-0000-000000000008', memberId: 'other-member', assignedDate: '2026-01-02' },
      ]))
      .mockReturnValueOnce(chainTo([sampleMemberRow]));                                                 // member info for envelope
    mockDb.update.mockReturnValueOnce(chainTo([revokedRow]));

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.isActive).toBe(false);
  });

  it('returns 404 when assignment does not exist', async () => {
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleRoleRow])) // role lookup
      .mockReturnValueOnce(chainTo([]));             // no active rows match — assignment not found inside the transaction

    const res = await app.request(`/api/branches/${TEST_IDS.branchId}/roles/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(404);
  });
});
