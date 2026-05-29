import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// ── Mock the service layer ─────────────────────────────────
const svc = {
  createService: vi.fn(),
  listServices: vi.fn(),
  getService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
  getServiceRoster: vi.fn(),
  recordAttendance: vi.fn(),
  listAttendance: vi.fn(),
  getAttendanceTrends: vi.fn(),
  getMissingMembers: vi.fn(),
  getAttendanceByBranch: vi.fn(),
};

vi.mock('./service', () => svc);
vi.mock('../db', () => ({ db: {} }));

const { createApp } = await import('../app');
const app = createApp();

const adminToken = signTestToken({ systemRole: 'admin' });
const leaderToken = signTestToken({ systemRole: 'leader', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

const serviceId = '770e8400-e29b-41d4-a716-446655440010';
const branchId = TEST_IDS.branchId;

const sampleService = {
  id: serviceId,
  branchId,
  serviceDate: new Date('2026-05-24T09:00:00Z'),
  serviceType: 'Sunday',
  serviceTitle: null,
  topic: 'Faith',
  preacherId: null,
  expectedAttendance: 200,
  createdBy: TEST_IDS.adminId,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth gating ────────────────────────────────────────────

describe('auth', () => {
  it('returns 401 without a token', async () => {
    const res = await app.request('/api/attendance/services');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/attendance/services ───────────────────────────

describe('GET /api/attendance/services', () => {
  it('returns 200 with a paginated envelope for admin', async () => {
    svc.listServices.mockResolvedValue({
      data: [sampleService],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const res = await app.request('/api/attendance/services?page=1&limit=20', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(1);
  });
});

// ── POST /api/attendance/services ──────────────────────────

describe('POST /api/attendance/services', () => {
  it('creates a service for admin (201)', async () => {
    svc.createService.mockResolvedValue(sampleService);
    const res = await app.request('/api/attendance/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceDate: '2026-05-24T09:00:00Z', serviceType: 'Sunday' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(serviceId);
  });

  it('allows a leader to create a service', async () => {
    svc.createService.mockResolvedValue(sampleService);
    const res = await app.request('/api/attendance/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceDate: '2026-05-24T09:00:00Z', serviceType: 'Sunday' }),
    });
    expect(res.status).toBe(201);
  });

  it('rejects a plain member with 401 (requireRole)', async () => {
    const res = await app.request('/api/attendance/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceDate: '2026-05-24T09:00:00Z', serviceType: 'Sunday' }),
    });
    expect(res.status).toBe(401);
    expect(svc.createService).not.toHaveBeenCalled();
  });

  it('rejects a Special service with no title (422 validation)', async () => {
    const res = await app.request('/api/attendance/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceDate: '2026-05-24T09:00:00Z', serviceType: 'Special' }),
    });
    expect(res.status).toBe(400);
    expect(svc.createService).not.toHaveBeenCalled();
  });
});

// ── GET /api/attendance/services/:id ───────────────────────

describe('GET /api/attendance/services/:id', () => {
  it('returns a single service with detail', async () => {
    svc.getService.mockResolvedValue({ ...sampleService, preacherName: null, recordedCount: 5 });
    const res = await app.request(`/api/attendance/services/${serviceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.recordedCount).toBe(5);
  });
});

// ── PATCH / DELETE ─────────────────────────────────────────

describe('PATCH /api/attendance/services/:id', () => {
  it('updates a service for a leader', async () => {
    svc.updateService.mockResolvedValue({ ...sampleService, topic: 'Hope' });
    const res = await app.request(`/api/attendance/services/${serviceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${leaderToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Hope' }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects a plain member', async () => {
    const res = await app.request(`/api/attendance/services/${serviceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Hope' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/attendance/services/:id', () => {
  it('soft-deletes for admin', async () => {
    svc.deleteService.mockResolvedValue({ ...sampleService, isActive: false });
    const res = await app.request(`/api/attendance/services/${serviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('rejects a plain member', async () => {
    const res = await app.request(`/api/attendance/services/${serviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(401);
  });
});

// ── Roster + records ───────────────────────────────────────

describe('GET /api/attendance/services/:id/roster', () => {
  it('returns the roster (any authed user)', async () => {
    svc.getServiceRoster.mockResolvedValue({
      data: [{ memberId: TEST_IDS.memberId, firstName: 'Ada', lastName: 'Obi', photoUrl: null, status: 'Present' }],
      meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    const res = await app.request(`/api/attendance/services/${serviceId}/roster?search=Ada`, {
      headers: { Authorization: `Bearer ${leaderToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.data[0].status).toBe('Present');
  });
});

describe('POST /api/attendance/services/:id/records', () => {
  it('records attendance for a leader (201)', async () => {
    svc.recordAttendance.mockResolvedValue({ recorded: 1 });
    const res = await app.request(`/api/attendance/services/${serviceId}/records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [{ memberId: TEST_IDS.memberId, status: 'Present' }] }),
    });
    expect(res.status).toBe(201);
  });

  it('rejects a plain member', async () => {
    const res = await app.request(`/api/attendance/services/${serviceId}/records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [{ memberId: TEST_IDS.memberId, status: 'Present' }] }),
    });
    expect(res.status).toBe(401);
    expect(svc.recordAttendance).not.toHaveBeenCalled();
  });

  it('accepts a visitor entry shape', async () => {
    svc.recordAttendance.mockResolvedValue({ recorded: 1 });
    const res = await app.request(`/api/attendance/services/${serviceId}/records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [{ visitor: { firstName: 'V', lastName: 'Guest' }, status: 'Present' }] }),
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/attendance/services/:id/records', () => {
  it('lists recorded attendance', async () => {
    svc.listAttendance.mockResolvedValue([
      { memberId: TEST_IDS.memberId, memberFirstName: 'Ada', memberLastName: 'Obi', attendanceStatus: 'Present' },
    ]);
    const res = await app.request(`/api/attendance/services/${serviceId}/records`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });
});

// ── Reports ────────────────────────────────────────────────

describe('reports', () => {
  it('GET /reports/trends returns 200 for a leader', async () => {
    svc.getAttendanceTrends.mockResolvedValue([{ weekStart: '2026-05-18', attendees: 120, serviceCount: 2 }]);
    const res = await app.request('/api/attendance/reports/trends?weeks=4', {
      headers: { Authorization: `Bearer ${leaderToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('GET /reports/missing-members rejects a plain member', async () => {
    const res = await app.request('/api/attendance/reports/missing-members', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('GET /reports/by-branch returns 200 for admin', async () => {
    svc.getAttendanceByBranch.mockResolvedValue([
      { branchId, branchName: 'London', activeMembers: 100, distinctAttendees: 80, attendanceRate: 0.8 },
    ]);
    const res = await app.request('/api/attendance/reports/by-branch', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });
});
