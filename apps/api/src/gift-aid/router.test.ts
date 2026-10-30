import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTestToken, TEST_IDS } from '../test-helpers';

// authMiddleware resolves grants on every request; router tests use a partial
// mock DB, so stub the resolver. Capability behaviour is covered in
// service.test.ts and grants.test.ts.
vi.mock('../lib/grants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/grants')>();
  return { ...actual, resolveGrants: vi.fn(async () => []) };
});

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
vi.mock('../db', () => ({ db: mockDb }));

vi.mock('./service', () => ({
  getMyGiftAidStatus: vi.fn(),
  declareMine: vi.fn(),
  withdrawMine: vi.fn(),
  submitPublicDeclaration: vi.fn(),
  listDeclarations: vi.fn(),
  getDeclaration: vi.fn(),
  captureDeclaration: vi.fn(),
  matchDeclaration: vi.fn(),
  recordWithdrawal: vi.fn(),
  markInvalid: vi.fn(),
  exportRegister: vi.fn(),
  registerToCsv: vi.fn(() => 'Title,Name\r\nMr,Ade Bolarinwa'),
}));

const service = await import('./service');
const { createApp } = await import('../app');
const app = createApp();

const declarant = {
  title: 'Mr',
  firstName: 'Ade',
  lastName: 'Bolarinwa',
  addressLine1: '12 High Street',
  city: 'London',
  postcode: 'SE1 2AB',
  countryCode: 'GB',
  coverage: 'past_and_future',
  confirmedDeclaration: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Public form ───────────────────────────────────────────

describe('POST /api/public/gift-aid/declarations', () => {
  it('accepts a submission with no token at all', async () => {
    (service.submitPublicDeclaration as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'new',
      declaredAt: '2026-10-30T10:00:00.000Z',
    });

    const res = await app.request('/api/public/gift-aid/declarations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...declarant, email: 'stranger@example.com' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe('new');
  });

  it('rejects a submission with the box unticked: the opt-in IS the declaration', async () => {
    const res = await app.request('/api/public/gift-aid/declarations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...declarant,
        email: 'stranger@example.com',
        confirmedDeclaration: false,
      }),
    });
    expect(res.status).toBe(400);
    expect(service.submitPublicDeclaration).not.toHaveBeenCalled();
  });

  it('rejects a UK address with no postcode', async () => {
    const res = await app.request('/api/public/gift-aid/declarations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...declarant,
        postcode: undefined,
        email: 'stranger@example.com',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects a postcode on an overseas address', async () => {
    const res = await app.request('/api/public/gift-aid/declarations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...declarant,
        countryCode: 'GH',
        city: 'Accra',
        email: 'stranger@example.com',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('passes the caller IP through as corroborating evidence', async () => {
    (service.submitPublicDeclaration as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'new',
      declaredAt: '2026-10-30T10:00:00.000Z',
    });

    await app.request('/api/public/gift-aid/declarations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '203.0.113.9',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({ ...declarant, email: 'stranger@example.com' }),
    });

    expect(service.submitPublicDeclaration).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ email: 'stranger@example.com' }),
      { sourceIp: '203.0.113.9', userAgent: 'vitest' },
    );
  });

  it('serves the declaration wording unauthenticated, from the one renderer', async () => {
    const res = await app.request('/api/public/gift-aid/declaration-text');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { charityName: string; charityNumber: string; texts: Record<string, string> };
    };
    expect(body.data.charityName).toBe('Kharis Ministries');
    expect(body.data.charityNumber).toBe('1139291');
    expect(body.data.texts.past_and_future).toContain('past 4 years');
    expect(body.data.texts.past_and_future).toContain('responsibility to pay the difference');
  });
});

// ── Authentication ────────────────────────────────────────

describe('authentication', () => {
  it('401s the member surface without a token', async () => {
    const res = await app.request('/api/gift-aid/me');
    expect(res.status).toBe(401);
  });

  it('401s the admin surface without a token', async () => {
    const res = await app.request('/api/gift-aid');
    expect(res.status).toBe(401);
  });

  it('403s, not 401s, a signed-in member who lacks the capability', async () => {
    const { ForbiddenError } = await import('@kairos/utils');
    (service.listDeclarations as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ForbiddenError('Only Gift Aid admins can administer Gift Aid declarations'),
    );
    const token = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId });
    const res = await app.request('/api/gift-aid', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

// ── Member surface ────────────────────────────────────────

describe('member surface', () => {
  it('returns the caller own status', async () => {
    (service.getMyGiftAidStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      active: null,
      history: [],
      canDeclare: true,
    });
    const token = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId });
    const res = await app.request('/api/gift-aid/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: { canDeclare: boolean } }).data.canDeclare).toBe(true);
  });

  it('201s a declaration made from the profile', async () => {
    (service.declareMine as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new' });
    const token = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId });
    const res = await app.request('/api/gift-aid/me', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(declarant),
    });
    expect(res.status).toBe(201);
  });

  it('withdraws without needing any capability', async () => {
    (service.withdrawMine as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'cancelled' });
    const token = await signTestToken({ systemRole: 'member', memberId: TEST_IDS.memberId });
    const res = await app.request('/api/gift-aid/me/withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Stopped paying tax' }),
    });
    expect(res.status).toBe(200);
    expect(service.withdrawMine).toHaveBeenCalledWith(mockDb, expect.anything(), 'Stopped paying tax');
  });
});

// ── Admin surface ─────────────────────────────────────────

describe('admin surface', () => {
  it('serves the register as a CSV attachment', async () => {
    (service.exportRegister as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const token = await signTestToken();
    const res = await app.request('/api/gift-aid/register.csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('gift-aid-register-');
  });

  it('routes /register before /:id', async () => {
    (service.exportRegister as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const token = await signTestToken();
    const res = await app.request('/api/gift-aid/register', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(service.exportRegister).toHaveBeenCalled();
    expect(service.getDeclaration).not.toHaveBeenCalled();
  });

  it('requires both a method and a reachable declaration to record a withdrawal', async () => {
    const token = await signTestToken();
    const res = await app.request(`/api/gift-aid/${TEST_IDS.memberId}/withdraw`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'no method given' }),
    });
    expect(res.status).toBe(400);
    expect(service.recordWithdrawal).not.toHaveBeenCalled();
  });

  it('refuses to capture a paper declaration with no scan attached', async () => {
    const token = await signTestToken();
    const res = await app.request('/api/gift-aid', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...declarant,
        channel: 'paper',
        declaredAt: '2026-01-05',
      }),
    });
    expect(res.status).toBe(400);
    expect(service.captureDeclaration).not.toHaveBeenCalled();
  });

  it('matches a declaration to a member', async () => {
    (service.matchDeclaration as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'd1' });
    const token = await signTestToken();
    const res = await app.request(`/api/gift-aid/${TEST_IDS.roleId}/match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: TEST_IDS.memberId }),
    });
    expect(res.status).toBe(200);
    expect(service.matchDeclaration).toHaveBeenCalledWith(
      mockDb,
      expect.anything(),
      TEST_IDS.roleId,
      TEST_IDS.memberId,
    );
  });
});
