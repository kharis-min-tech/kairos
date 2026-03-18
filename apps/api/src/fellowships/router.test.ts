import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// ── Mock db ────────────────────────────────────────────────
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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
const pastorToken = signTestToken({ systemRole: 'pastor', memberId: TEST_IDS.pastorId });
const memberToken = signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId, branchId: TEST_IDS.branchId });

const sampleFellowship = {
  id: TEST_IDS.fellowshipId,
  fellowshipName: 'K-Group Alpha',
  fellowshipType: 'K-Groups',
  branchId: TEST_IDS.branchId,
  branchName: 'Kharis London Central',
  leaderId: TEST_IDS.pastorId,
  leaderFirstName: 'James',
  leaderLastName: 'Okonkwo',
  coLeaderId: null,
  meetingDay: 'Wednesday',
  meetingTime: '18:30',
  meetingLocation: 'Church Hall A',
  description: 'Young adults fellowship',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleMeeting = {
  id: 'meeting-001',
  fellowshipId: TEST_IDS.fellowshipId,
  meetingDate: '2024-06-15',
  topic: 'Prayer and Fasting',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/fellowships ───────────────────────────────────

describe('GET /api/fellowships', () => {
  it('should return 401 without auth', async () => {
    const res = await app.request('/api/fellowships');
    expect(res.status).toBe(401);
  });

  it('should return fellowships for admin', async () => {
    // listFellowships uses Promise.all: list query + count query
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleFellowship]))
      .mockReturnValueOnce(chainTo([{ value: 1 }]));

    const res = await app.request('/api/fellowships?page=1&limit=20', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── GET /api/fellowships/:id ───────────────────────────────

describe('GET /api/fellowships/:id', () => {
  it('should return fellowship details', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([sampleFellowship]));

    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.fellowshipName).toBe('K-Group Alpha');
  });

  it('should return 404 for non-existent fellowship', async () => {
    mockDb.select.mockReturnValueOnce(chainTo([]));

    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/fellowships ──────────────────────────────────

describe('POST /api/fellowships', () => {
  it('should return 401 for regular member', async () => {
    const res = await app.request('/api/fellowships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({
        fellowshipName: 'Test',
        fellowshipType: 'K-Groups',
        branchId: TEST_IDS.branchId,
        leaderId: TEST_IDS.pastorId,
      }),
    });

    expect(res.status).toBe(401);
  });

  it('should create fellowship as pastor', async () => {
    // createFellowship: validate branch → validate leader → insert fellowship → auto-join leader
    mockDb.select
      .mockReturnValueOnce(chainTo([{ id: TEST_IDS.branchId, isActive: true }]))   // branch exists
      .mockReturnValueOnce(chainTo([{ id: TEST_IDS.pastorId, isActive: true }]));   // leader exists
    mockDb.insert
      .mockReturnValueOnce(chainTo([sampleFellowship]))  // insert fellowship
      .mockReturnValueOnce(chainTo([{}]));                 // auto-join leader as member

    const res = await app.request('/api/fellowships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pastorToken}` },
      body: JSON.stringify({
        fellowshipName: 'K-Group Alpha',
        fellowshipType: 'K-Groups',
        branchId: TEST_IDS.branchId,
        leaderId: TEST_IDS.pastorId,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── DELETE /api/fellowships/:id ────────────────────────────

describe('DELETE /api/fellowships/:id', () => {
  it('should return 401 for regular member', async () => {
    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/fellowships/:id/members ───────────────────────

describe('GET /api/fellowships/:id/members', () => {
  it('should return fellowship members', async () => {
    // listFellowshipMembers: first calls getFellowship (select), then its own select
    const membersData = [
      { id: TEST_IDS.memberId, firstName: 'Emma', lastName: 'Thompson', joinDate: '2024-01-15', isActive: true },
    ];
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleFellowship]))  // getFellowship lookup
      .mockReturnValueOnce(chainTo(membersData));          // actual members query

    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

// ── GET /api/fellowships/:id/meetings ──────────────────────

describe('GET /api/fellowships/:id/meetings', () => {
  it('should return meetings list', async () => {
    // listMeetings: first calls getFellowship (select), then its own select
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleFellowship]))  // getFellowship lookup
      .mockReturnValueOnce(chainTo([sampleMeeting]));      // actual meetings query

    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}/meetings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── POST /api/fellowships/:id/meetings ─────────────────────

describe('POST /api/fellowships/:id/meetings', () => {
  it('should return 401 for regular member', async () => {
    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ meetingDate: '2024-06-20', topic: 'Worship' }),
    });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/fellowships/:id/attendance/summary ────────────

describe('GET /api/fellowships/:id/attendance/summary', () => {
  it('should return attendance summary', async () => {
    // getAttendanceSummary: first calls getFellowship (select), then its own select
    const summaryData = [
      { meetingId: 'meeting-001', meetingDate: '2024-06-15', total: 10, present: 8, absent: 1, excused: 1, late: 0 },
    ];
    mockDb.select
      .mockReturnValueOnce(chainTo([sampleFellowship]))  // getFellowship lookup
      .mockReturnValueOnce(chainTo(summaryData));          // actual attendance query

    const res = await app.request(`/api/fellowships/${TEST_IDS.fellowshipId}/attendance/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});
