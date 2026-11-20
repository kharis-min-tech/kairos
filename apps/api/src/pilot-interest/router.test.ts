import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';
import { PILOT_REQUIREMENTS } from '@kairos/types';

vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return { ...actual, resolveGrants: vi.fn(async () => []) };
});

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
vi.mock('../db', () => ({ db: mockDb }));

vi.mock('./service', () => ({
  submitPilotInterest: vi.fn(),
  listPilotInterest: vi.fn(),
  updatePilotInterest: vi.fn(),
}));

const service = await import('./service');
const { createApp } = await import('../app');
const app = createApp();

const allTicked = Object.fromEntries(PILOT_REQUIREMENTS.map((r) => [r.key, true]));

const valid = {
  fullName: 'Grace Mensah',
  roleAtBranch: 'branch_pastor',
  email: 'grace@example.org',
  branchName: 'Kharis London Central',
  fellowshipCount: 6,
  departmentCount: 4,
  safeguardingLeadInPost: true,
  safeguardingLeadName: 'Tobi Balogun',
  acknowledgements: allTicked,
};

const post = (body: unknown) =>
  app.request('/api/public/pilot-interest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe('POST /api/public/pilot-interest', () => {
  it('accepts a complete submission without a signed-in user', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({
      id: 'abc',
      submittedAt: new Date('2026-11-20T10:00:00Z'),
    } as never);

    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(service.submitPilotInterest).toHaveBeenCalledOnce();
  });

  // The whole point of the page is that nobody volunteers without reading
  // what the rollout plan asks of them, so an unticked box is not a
  // submission that can be stored and chased up later.
  it.each(PILOT_REQUIREMENTS.map((r) => r.key))(
    'rejects a submission with %s not confirmed',
    async (key) => {
      const res = await post({
        ...valid,
        acknowledgements: { ...allTicked, [key]: false },
      });
      expect(res.status).toBe(400);
      expect(service.submitPilotInterest).not.toHaveBeenCalled();
    },
  );

  it('rejects a claimed safeguarding lead with no name', async () => {
    const res = await post({ ...valid, safeguardingLeadName: undefined });
    expect(res.status).toBe(400);
  });

  // Saying there is no safeguarding lead is a valid answer. The plan uses it
  // to choose, not to filter out.
  it('accepts a branch that has no safeguarding lead yet', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({ id: 'x' } as never);
    const res = await post({
      ...valid,
      safeguardingLeadInPost: false,
      safeguardingLeadName: undefined,
    });
    expect(res.status).toBe(201);
  });

  it('requires a role description when the role is "other"', async () => {
    const res = await post({ ...valid, roleAtBranch: 'other' });
    expect(res.status).toBe(400);
  });

  it('requires a branch name', async () => {
    const res = await post({ ...valid, branchName: '   ' });
    expect(res.status).toBe(400);
  });

  // A blank count is the one answer that cannot be read either way: it could
  // mean none, or it could mean unanswered, and the plan picks on the mix.
  it.each(['fellowshipCount', 'departmentCount'])('requires %s', async (key) => {
    const { [key]: _omitted, ...rest } = valid as Record<string, unknown>;
    const res = await post(rest);
    expect(res.status).toBe(400);
    expect(service.submitPilotInterest).not.toHaveBeenCalled();
  });

  // Zero is a real answer and must not be read as missing.
  it('accepts a branch with no departments yet', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({ id: 'z' } as never);
    const res = await post({ ...valid, departmentCount: 0 });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/public/pilot-interest/requirements', () => {
  it('serves the commitments and the version they belong to', async () => {
    const res = await app.request('/api/public/pilot-interest/requirements');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { requirements: unknown[]; version: string };
    };
    expect(body.data.requirements).toHaveLength(PILOT_REQUIREMENTS.length);
    expect(body.data.version).toBeTruthy();
  });
});

describe('the admin queue', () => {
  it('refuses an anonymous caller', async () => {
    const res = await app.request('/api/pilot-interest');
    expect(res.status).toBe(401);
    expect(service.listPilotInterest).not.toHaveBeenCalled();
  });

  // Who else has volunteered is not a branch's business, so an ordinary
  // member - including one with branch grants - cannot read the queue.
  it('refuses a signed-in member who is not a platform admin', async () => {
    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'member' });
    const res = await app.request('/api/pilot-interest', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    expect(service.listPilotInterest).not.toHaveBeenCalled();
  });

  it('serves a platform admin', async () => {
    vi.mocked(service.listPilotInterest).mockResolvedValue({ rows: [], total: 0 } as never);
    const token = await signTestToken({ memberId: TEST_IDS.memberId, systemRole: 'admin' });
    const res = await app.request('/api/pilot-interest', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(service.listPilotInterest).toHaveBeenCalledOnce();
  });
});
