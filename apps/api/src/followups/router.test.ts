import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return { ...actual, resolveGrants: vi.fn(async () => []) };
});

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
vi.mock('../db', () => ({ db: mockDb }));

function chainTo(data: unknown) {
  const self: Record<string, unknown> = {};
  for (const m of [
    'select', 'from', 'where', 'limit', 'offset', 'orderBy',
    'innerJoin', 'leftJoin', 'set', 'values', 'returning', 'groupBy',
  ]) {
    self[m] = vi.fn(() => self);
  }
  self.then = (resolve: (v: unknown) => unknown) => resolve(data);
  return self;
}

const { createApp } = await import('../app');
const app = createApp();

const branchA = TEST_IDS.branchId;
const branchB = TEST_IDS.branch2Id;
const subjectId = 'aaaaaaaa-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/followups/queues/first-timers', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/followups/queues/first-timers');
    expect(res.status).toBe(401);
  });

  it('is forbidden for a plain member — these are leader queues', async () => {
    mockDb.select.mockReturnValue(chainTo([]));
    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups/queues/first-timers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns the queue for an admin, surfacing who invited them', async () => {
    mockDb.select.mockReturnValue(
      chainTo([
        {
          memberId: 'm-1',
          firstName: 'Ada',
          lastName: 'Okoro',
          phone: '07000 000000',
          email: 'ada@example.com',
          memberType: 'visitor',
          branchName: 'Kharis London',
          since: new Date('2026-09-28T10:00:00.000Z'),
          payload: { invitedBy: 'Grace Adeyemi', howDidYouHear: 'Invited by a member' },
        },
      ]),
    );
    const token = await signTestToken({
      systemRole: 'admin',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups/queues/first-timers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
    expect(body.data[0]).toMatchObject({
      memberId: 'm-1',
      memberType: 'visitor',
      invitedByName: 'Grace Adeyemi',
      since: '2026-09-28T10:00:00.000Z',
    });
  });

  it('reports no inviter rather than an empty string when the form left it blank', async () => {
    mockDb.select.mockReturnValue(
      chainTo([
        {
          memberId: 'm-2',
          firstName: 'Sam',
          lastName: 'Okafor',
          phone: null,
          email: 'sam@example.com',
          memberType: 'visitor',
          branchName: 'Kharis London',
          since: new Date('2026-09-28T10:00:00.000Z'),
          payload: { invitedBy: '   ' },
        },
      ]),
    );
    const token = await signTestToken({
      systemRole: 'admin',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups/queues/first-timers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
    expect(body.data[0]!.invitedByName).toBeNull();
  });

  it('refuses a non-admin asking for another branch', async () => {
    mockDb.select.mockReturnValue(chainTo([]));
    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request(`/api/followups/queues/first-timers?branchId=${branchB}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/followups/queues/no-group', () => {
  it('returns members with no fellowship and no department', async () => {
    mockDb.select.mockReturnValue(
      chainTo([
        {
          memberId: 'm-3',
          firstName: 'Tolu',
          lastName: 'Ade',
          phone: null,
          email: 'tolu@example.com',
          memberType: 'attendee',
          branchName: 'Kharis London',
          since: new Date('2026-08-01T10:00:00.000Z'),
        },
      ]),
    );
    const token = await signTestToken({
      systemRole: 'admin',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups/queues/no-group', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
    // This queue has no form behind it, so there is no inviter to report.
    expect(body.data[0]).toMatchObject({ memberId: 'm-3', invitedByName: null });
  });
});

describe('POST /api/followups', () => {
  it('files the follow-up against the SUBJECT branch, with branch context', async () => {
    mockDb.select.mockReturnValue(
      chainTo([{ id: subjectId, homeBranchId: branchA }]),
    );
    const insertChain = chainTo([{ id: 'fu-1' }]);
    mockDb.insert.mockReturnValue(insertChain);

    const token = await signTestToken({
      systemRole: 'admin',
      memberId: TEST_IDS.memberId,
      branchId: branchB, // caller is elsewhere — the record still belongs to A
    });
    const res = await app.request('/api/followups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: subjectId,
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
        notes: 'Welcomed her after Sunday.',
      }),
    });
    expect(res.status).toBe(201);

    const values = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(values).toMatchObject({
      contextKind: 'branch',
      fellowshipId: null,
      departmentId: null,
      branchId: branchA,
      memberId: subjectId,
    });
  });

  it('refuses a caller without branch:write on the subject branch', async () => {
    mockDb.select.mockReturnValue(chainTo([{ id: subjectId, homeBranchId: branchA }]));
    const token = await signTestToken({
      systemRole: 'member',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: subjectId,
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('404s for an unknown or inactive member', async () => {
    mockDb.select.mockReturnValue(chainTo([]));
    const token = await signTestToken({
      systemRole: 'admin',
      memberId: TEST_IDS.memberId,
      branchId: branchA,
    });
    const res = await app.request('/api/followups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: '11111111-1111-1111-1111-111111111111',
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
      }),
    });
    expect(res.status).toBe(404);
  });
});
