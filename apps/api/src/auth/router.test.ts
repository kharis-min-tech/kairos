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

// ── Mock db module before importing app ────────────────────
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

// Import app AFTER mocking
const { createApp } = await import('../app');
const app = createApp();

const baseMember = {
  id: TEST_IDS.adminId,
  firstName: 'Admin',
  lastName: 'User',
  middleName: null,
  dateOfBirth: null,
  gender: 'Male',
  email: 'admin@kairos.local',
  phone: '+441234567890',
  address: null,
  city: 'London',
  postalCode: null,
  homeBranchId: TEST_IDS.branchId,
  membershipDate: '2024-01-01',
  isActive: true,
  photoUrl: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  passwordHash: '$2b$10$fakehashedpassword',
  emailVerified: true,
  approvalStatus: 'approved',
  systemRole: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Health Check ───────────────────────────────────────────

describe('GET /health', () => {
  it('should return ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('ok');
  });
});

// ── POST /api/auth/signup ──────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('should create a new member and return 201', async () => {
    // email check → no existing
    const emailCheck = chainTo([]);
    mockDb.select.mockReturnValueOnce(emailCheck);

    // phone check → no existing
    const phoneCheck = chainTo([]);
    mockDb.select.mockReturnValueOnce(phoneCheck);

    // insert → return created member
    const created = { ...baseMember, isActive: false, emailVerified: false, approvalStatus: 'pending' };
    const insertChain = chainTo([created]);
    mockDb.insert.mockReturnValueOnce(insertChain);

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@kairos.local',
        password: 'StrongPass123!',
        homeBranchId: TEST_IDS.branchId,
        phone: '+441234567890',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.member).toBeDefined();
    expect(body.data.verificationToken).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    // email check → found existing
    const emailCheck = chainTo([{ id: 'existing-id' }]);
    mockDb.select.mockReturnValueOnce(emailCheck);

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'admin@kairos.local',
        password: 'StrongPass123!',
        homeBranchId: TEST_IDS.branchId,
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});

// ── POST /api/auth/login ───────────────────────────────────

describe('POST /api/auth/login', () => {
  it('should return 400 for invalid request body', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 401 for non-existent email', async () => {
    const selectChain = chainTo([]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'Password1!' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});

// ── POST /api/auth/verify-email ────────────────────────────

describe('POST /api/auth/verify-email', () => {
  it('should return 400 for empty token', async () => {
    const res = await app.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 404 for invalid token', async () => {
    const selectChain = chainTo([]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const res = await app.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token-123' }),
    });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/auth/forgot-password ─────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('should always return success (prevents email enumeration)', async () => {
    const selectChain = chainTo([]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const res = await app.request('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});

// ── POST /api/auth/refresh ─────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('should return 401 for invalid refresh token', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid-token' }),
    });

    expect(res.status).toBe(401);
  });

  it('should return 400 for missing refresh token', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/auth/me (protected) ───────────────────────────

describe('GET /api/auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return member profile with valid token', async () => {
    const selectChain = chainTo([baseMember]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const token = signTestToken();
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe('Admin');
  });

  it('should return 401 with expired token', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiJ9.eyJtZW1iZXJJZCI6IjEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzeXN0ZW1Sb2xlIjoibWVtYmVyIiwiYnJhbmNoSWQiOiIxIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    expect(res.status).toBe(401);
  });
});
