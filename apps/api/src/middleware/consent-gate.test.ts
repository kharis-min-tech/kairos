import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';

// The middleware imports db + service functions that touch the real DB.
// Mock them at module boundary so the middleware test doesn't need a live
// Postgres connection.
const mockHasPrivilegedRole = vi.fn();
const mockListConsentStatuses = vi.fn();

vi.mock('../db', () => ({ db: {} }));
vi.mock('../me/service', () => ({
  hasPrivilegedRole: (...args: unknown[]) => mockHasPrivilegedRole(...args),
}));
vi.mock('../consent/service', () => ({
  listConsentStatuses: (...args: unknown[]) => mockListConsentStatuses(...args),
}));
vi.mock('../lib/auth-secrets', () => ({
  getAuthSecrets: () => ({
    accessSecret: 'test-access-secret-32-bytes-long-string!',
    refreshSecret: 'test-refresh-secret',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  }),
}));

import { consentGateMiddleware } from './consent-gate';

const ACCESS_SECRET = 'test-access-secret-32-bytes-long-string!';

async function makeBearer(payload: Record<string, unknown>): Promise<string> {
  const key = new TextEncoder().encode(ACCESS_SECRET);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
  return `Bearer ${token}`;
}

function buildApp() {
  const app = new Hono();
  app.use('/api/*', consentGateMiddleware);
  app.get('/api/protected', (c) => c.json({ ok: true }));
  app.get('/api/me', (c) => c.json({ ok: 'me' }));
  app.get('/api/members/me', (c) => c.json({ ok: 'members-me' }));
  app.get('/api/me/consent', (c) => c.json({ ok: 'consent-list' }));
  app.post('/api/me/consent', (c) => c.json({ ok: 'consent-record' }));
  app.get('/api/auth/login', (c) => c.json({ ok: 'auth' }));
  app.get('/api/public/branches', (c) => c.json({ ok: 'public' }));
  return app;
}

beforeEach(() => {
  process.env['ENABLE_CONSENT_GATE'] = 'true';
  mockHasPrivilegedRole.mockReset();
  mockListConsentStatuses.mockReset();
});

afterEach(() => {
  delete process.env['ENABLE_CONSENT_GATE'];
});

describe('consentGateMiddleware', () => {
  it('lets /api/auth/* and /api/public/* through without checking consents', async () => {
    const app = buildApp();
    const authRes = await app.request('/api/auth/login');
    const publicRes = await app.request('/api/public/branches');
    expect(authRes.status).toBe(200);
    expect(publicRes.status).toBe(200);
    expect(mockListConsentStatuses).not.toHaveBeenCalled();
  });

  it('lets requests without an Authorization header fall through to downstream auth', async () => {
    const app = buildApp();
    const res = await app.request('/api/protected');
    // No bearer → middleware defers; the (mock) downstream returns 200 with { ok }.
    // In production, the module authMiddleware would 401 here.
    expect(res.status).toBe(200);
    expect(mockListConsentStatuses).not.toHaveBeenCalled();
  });

  it('403s with CONSENT_REQUIRED when the caller has pending required consent', async () => {
    mockHasPrivilegedRole.mockResolvedValueOnce(false);
    mockListConsentStatuses.mockResolvedValueOnce([
      {
        consentType: 'acceptable_use',
        currentVersion: '2026-07-v1',
        required: true,
        needsAccept: true,
      },
    ]);
    const app = buildApp();
    const auth = await makeBearer({ memberId: 'member-1' });
    const res = await app.request('/api/protected', {
      headers: { Authorization: auth },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string; pending: unknown[] } };
    expect(body.error.code).toBe('CONSENT_REQUIRED');
    expect(body.error.pending).toHaveLength(1);
  });

  it('lets the request through when nothing is pending', async () => {
    mockHasPrivilegedRole.mockResolvedValueOnce(false);
    mockListConsentStatuses.mockResolvedValueOnce([
      {
        consentType: 'acceptable_use',
        currentVersion: '2026-07-v1',
        required: true,
        needsAccept: false,
      },
    ]);
    const app = buildApp();
    const auth = await makeBearer({ memberId: 'member-1' });
    const res = await app.request('/api/protected', {
      headers: { Authorization: auth },
    });
    expect(res.status).toBe(200);
  });

  it('allowlists /api/me and the consent flow endpoints even when consent is pending', async () => {
    // Middleware should NOT query for these paths — they need to be reachable
    // so the client can complete the accept flow.
    const app = buildApp();
    const auth = await makeBearer({ memberId: 'member-1' });
    for (const path of ['/api/me', '/api/members/me', '/api/me/consent']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await app.request(path, { headers: { Authorization: auth } });
      expect(res.status).toBe(200);
    }
    const post = await app.request('/api/me/consent', {
      method: 'POST',
      headers: { Authorization: auth },
    });
    expect(post.status).toBe(200);
    expect(mockListConsentStatuses).not.toHaveBeenCalled();
  });

  it('checks the privileged flag before listing consents so admin_confidentiality is enforced', async () => {
    mockHasPrivilegedRole.mockResolvedValueOnce(true);
    mockListConsentStatuses.mockResolvedValueOnce([]);
    const app = buildApp();
    const auth = await makeBearer({ memberId: 'admin-1' });
    await app.request('/api/protected', { headers: { Authorization: auth } });
    expect(mockHasPrivilegedRole).toHaveBeenCalledOnce();
    expect(mockListConsentStatuses).toHaveBeenCalledWith(
      expect.any(Object),
      'admin-1',
      true,
    );
  });
});
