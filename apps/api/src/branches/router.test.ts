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

const { createApp } = await import('../app');
const app = createApp();

const adminToken = signTestToken({ systemRole: 'admin' });
const pastorToken = signTestToken({ systemRole: 'pastor', memberId: TEST_IDS.pastorId });
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
