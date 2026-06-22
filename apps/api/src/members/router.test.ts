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
};

vi.mock('../db', () => ({ db: mockDb }));

function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning']) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self;
}

/** Special chainTo that returns parallel promises (for Promise.all in listMembers) */
function chainToParallel(listData: unknown[]) {
  const makeSelf = (data: unknown) => {
    const self: Record<string, unknown> = {};
    for (const m of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'innerJoin', 'leftJoin', 'set', 'values', 'returning']) {
      self[m] = vi.fn(() => self);
    }
    self.then = (resolve: (v: unknown) => unknown) => resolve(data);
    return self;
  };

  // The listMembers service calls db.select() twice in Promise.all
  // First call returns paginated results, second returns count
  mockDb.select
    .mockReturnValueOnce(makeSelf(listData))
    .mockReturnValueOnce(makeSelf([{ count: listData.length }]));
}

const { createApp } = await import('../app');
const app = createApp();

const adminToken = signTestToken({ systemRole: 'admin' });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

const sampleMember = {
  id: TEST_IDS.memberId,
  firstName: 'Emma',
  lastName: 'Thompson',
  middleName: null,
  dateOfBirth: null,
  gender: 'Female',
  email: 'emma@kairos.local',
  phone: '+441234567891',
  address: null,
  city: 'London',
  postalCode: null,
  homeBranchId: TEST_IDS.branchId,
  branchName: 'Kharis London Central',
  membershipDate: '2024-01-01',
  isActive: true,
  photoUrl: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  approvalStatus: 'approved',
  systemRole: 'member',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const pendingMember = {
  ...sampleMember,
  id: 'pending-member-id',
  approvalStatus: 'pending',
  isActive: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/members/me ────────────────────────────────────

describe('GET /api/members/me', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/members/me');
    expect(res.status).toBe(401);
  });

  it('should return own profile', async () => {
    const chain = chainTo([sampleMember]);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request('/api/members/me', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('emma@kairos.local');
  });
});

// ── GET /api/members ───────────────────────────────────────

describe('GET /api/members', () => {
  it('should return paginated members for admin', async () => {
    chainToParallel([sampleMember]);

    const res = await app.request('/api/members?page=1&limit=20', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.data).toBeDefined();
    expect(body.data.pagination).toBeDefined();
  });
});

// ── GET /api/members/:id ───────────────────────────────────

describe('GET /api/members/:id', () => {
  it('should return member for admin', async () => {
    const chain = chainTo([sampleMember]);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request(`/api/members/${TEST_IDS.memberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.firstName).toBe('Emma');
  });

  it('should allow member to view own profile', async () => {
    const chain = chainTo([sampleMember]);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request(`/api/members/${TEST_IDS.memberId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(200);
  });

  it('should return 403 when member views a profile in another branch', async () => {
    // Target member lives in a different branch from the requesting member.
    const otherBranchMember = { ...sampleMember, id: TEST_IDS.pastorId, homeBranchId: 'some-other-branch' };
    const chain = chainTo([otherBranchMember]);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request(`/api/members/${TEST_IDS.pastorId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    // Branch-scope gate in getMember rejects cross-branch reads.
    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent member', async () => {
    const chain = chainTo([]);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request(`/api/members/${TEST_IDS.adminId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/members/:id ─────────────────────────────────

describe('PATCH /api/members/:id', () => {
  it('should update own profile', async () => {
    // Check exists
    const existCheck = chainTo([{ id: TEST_IDS.memberId }]);
    mockDb.select.mockReturnValueOnce(existCheck);

    // Update
    const updated = { ...sampleMember, city: 'Manchester' };
    const updateChain = chainTo([updated]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const res = await app.request(`/api/members/${TEST_IDS.memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ city: 'Manchester' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── DELETE /api/members/:id ────────────────────────────────

describe('DELETE /api/members/:id', () => {
  it('should return 401 for non-admin', async () => {
    const res = await app.request(`/api/members/${TEST_IDS.memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(401);
  });
});

// ── POST /api/members/:id/approve ──────────────────────────

describe('POST /api/members/:id/approve', () => {
  it('should approve a pending member as admin', async () => {
    // Find member
    const findChain = chainTo([pendingMember]);
    mockDb.select.mockReturnValueOnce(findChain);

    // Update member
    const approved = { ...pendingMember, approvalStatus: 'approved' };
    const updateChain = chainTo([approved]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const res = await app.request(`/api/members/pending-member-id/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ approved: true }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('should return 401 for regular member', async () => {
    const res = await app.request(`/api/members/pending-member-id/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ approved: true }),
    });

    expect(res.status).toBe(401);
  });
});

// ── Health Records ─────────────────────────────────────────

describe('GET /api/members/:id/health-record', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request(`/api/members/${TEST_IDS.memberId}/health-record`);
    expect(res.status).toBe(401);
  });

  it('returns the record for an admin', async () => {
    // select 1: member lookup (admin → no SG prefetch); select 2: record
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: TEST_IDS.memberId, homeBranchId: TEST_IDS.branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: null }]))
      .mockReturnValueOnce(chainTo([{ id: 'hr-1', memberId: TEST_IDS.memberId, medicalConditions: 'Asthma' }]));

    const res = await app.request(`/api/members/${TEST_IDS.memberId}/health-record`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.medicalConditions).toBe('Asthma');
  });

  it('returns 403 when an unrelated in-branch member lacks safeguarding access', async () => {
    // select 1: member lookup; select 2: SG-Lead branches → none
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: 'someone-else', homeBranchId: TEST_IDS.branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: null }]))
      .mockReturnValueOnce(chainTo([]));

    const res = await app.request(`/api/members/someone-else/health-record`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/members/:id/health-record', () => {
  it('upserts a record as admin and stamps consent', async () => {
    // select 1: member lookup; select 2: existing record → none
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: TEST_IDS.memberId, homeBranchId: TEST_IDS.branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: null }]))
      .mockReturnValueOnce(chainTo([]));
    mockDb.insert.mockReturnValueOnce(chainTo([{ id: 'hr-1', memberId: TEST_IDS.memberId, photoMediaConsent: true }]));

    const res = await app.request(`/api/members/${TEST_IDS.memberId}/health-record`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ medicalConditions: 'Asthma', photoMediaConsent: true }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.photoMediaConsent).toBe(true);
  });
});

describe('GET /api/members/safeguarding/unguarded-minors', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/members/safeguarding/unguarded-minors');
    expect(res.status).toBe(401);
  });

  it('returns the list for an admin (not captured by /:id)', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([
      { id: 'minor-1', firstName: 'Lily', lastName: 'Thompson', dateOfBirth: '2016-01-01', branchName: 'London', guardianMemberId: null, guardianFirstName: null, guardianLastName: null },
    ]));

    const res = await app.request('/api/members/safeguarding/unguarded-minors', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data[0].guardianStatus).toBe('none');
  });

  it('returns 403 for a member without safeguarding access', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([])); // SG-Lead branches → none
    const res = await app.request('/api/members/safeguarding/unguarded-minors', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(403);
  });
});

// ── GET /api/members/:id/roles ─────────────────────────────

describe('GET /api/members/:id/roles', () => {
  it('should return roles for admin', async () => {
    const rolesData = [{ id: TEST_IDS.roleId, roleName: 'Worship Leader', branchId: TEST_IDS.branchId, isActive: true }];
    const chain = chainTo(rolesData);
    mockDb.select.mockReturnValueOnce(chain);

    const res = await app.request(`/api/members/${TEST_IDS.memberId}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});
