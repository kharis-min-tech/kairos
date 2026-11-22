import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PILOT_BRANCHES, PILOT_REQUIREMENTS } from '@kairos/types';

vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return { ...actual, resolveGrants: vi.fn(async () => []) };
});

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
vi.mock('../db', () => ({ db: mockDb }));

vi.mock('./service', () => ({ submitPilotInterest: vi.fn() }));

const service = await import('./service');
const { createApp } = await import('../app');
const app = createApp();

const valid = {
  firstName: 'Grace',
  lastName: 'Mensah',
  email: 'grace@example.org',
  branchName: 'London',
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
      submittedAt: '2026-11-20T10:00:00.000Z',
    });

    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(service.submitPilotInterest).toHaveBeenCalledOnce();
  });

  // The commitments are read, not ticked, so there is nothing to confirm in
  // the payload. A submission that carries no acknowledgements is complete.
  it('does not require any per-commitment confirmation', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({ submittedAt: 'x' });
    const res = await post(valid);
    expect(res.status).toBe(201);
  });

  it.each(['firstName', 'lastName'])('requires %s', async (key) => {
    const res = await post({ ...valid, [key]: '   ' });
    expect(res.status).toBe(400);
    expect(service.submitPilotInterest).not.toHaveBeenCalled();
  });

  it('rejects an address that is not an email', async () => {
    const res = await post({ ...valid, email: 'grace.example.org' });
    expect(res.status).toBe(400);
  });

  // The form offers a dropdown, so a branch outside the list did not come
  // from the form.
  it('rejects a branch that is not one of ours', async () => {
    const res = await post({ ...valid, branchName: 'Atlantis' });
    expect(res.status).toBe(400);
    expect(service.submitPilotInterest).not.toHaveBeenCalled();
  });

  it('accepts every branch on the list', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({ submittedAt: 'x' });
    for (const branchName of PILOT_BRANCHES) {
      const res = await post({ ...valid, branchName });
      expect(res.status, branchName).toBe(201);
    }
  });

  it('accepts a submission that leaves the member count blank', async () => {
    vi.mocked(service.submitPilotInterest).mockResolvedValue({ submittedAt: 'z' });
    const res = await post(valid);
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

// The queue is an inbox now. Nothing persists, so there is nothing to read
// back, and the admin routes that used to serve it are gone rather than
// merely unlinked.
describe('the retired admin queue', () => {
  it.each([
    ['GET', '/api/pilot-interest'],
    ['PATCH', '/api/pilot-interest/some-id'],
  ])('%s %s is no longer routed', async (method, path) => {
    const res = await app.request(path, { method });
    expect(res.status).toBe(404);
  });
});
