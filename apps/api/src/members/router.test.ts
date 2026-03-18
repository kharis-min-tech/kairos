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

  it('should return 403 when member views another profile', async () => {
    const res = await app.request(`/api/members/${TEST_IDS.pastorId}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    // ForbiddenError thrown by enforceMemberAccess
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
