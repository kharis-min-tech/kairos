/**
 * Kairos — Full Staging Walkthrough
 *
 * A single end-to-end narrative that proves the platform works against
 * a real database.  Run after `docker compose up -d`, `npm run db:migrate`,
 * and `npm run db:seed`.
 *
 * npx playwright test e2e/staging-walkthrough.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, PASSWORD, login, getToken, authGet, authPost, authPatch, authDelete } from './helpers';

// ── Health ─────────────────────────────────────────────────

test('Health check returns ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});

// ── Auth: Login with every seed role ───────────────────────

for (const [label, account] of Object.entries(ACCOUNTS)) {
  if (label === 'pending' || label === 'unverified') continue;
  test(`Login succeeds for ${label} (${account.email})`, async ({ request }) => {
    const { status, body } = await login(request, account.email);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeTruthy();
    expect(body.data.member.email).toBe(account.email);
  });
}

test('Login fails for pending member', async ({ request }) => {
  const { status, body } = await login(request, ACCOUNTS.pending.email);
  expect(status).toBe(400);
  expect(body.success).toBe(false);
  expect(body.message).toContain('pending approval');
});

test('Login fails for unverified member', async ({ request }) => {
  const { status, body } = await login(request, ACCOUNTS.unverified.email);
  expect(status).toBe(400);
  expect(body.success).toBe(false);
  expect(body.message).toContain('not verified');
});

test('Login fails with wrong password', async ({ request }) => {
  const { status, body } = await login(request, ACCOUNTS.admin.email, 'WrongPassword1!');
  expect(status).toBe(401);
  expect(body.success).toBe(false);
});

// ── Auth: Protected route without token ────────────────────

test('Protected route rejects unauthenticated request', async ({ request }) => {
  const res = await request.get('/api/members/me');
  expect(res.status()).toBe(401);
});

// ── Auth: /me returns profile ──────────────────────────────

test('GET /api/auth/me returns authenticated profile', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/auth/me', token);
  expect(status).toBe(200);
  expect(body.data.email).toBe(ACCOUNTS.admin.email);
  expect(body.data.systemRole).toBe('admin');
});

// ── Branches ───────────────────────────────────────────────

test('Admin can list all branches', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/branches', token);
  expect(status).toBe(200);
  expect(body.data.length).toBeGreaterThanOrEqual(5);
});

test('Pastor sees only their own branch', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.pastorLondon.email);
  const { status, body } = await authGet(request, '/api/branches', token);
  expect(status).toBe(200);
  // Non-admin users are restricted to their own branch
  expect(body.data.length).toBe(1);
  expect(body.data[0].branchName).toBe('Kharis London Central');
});

// ── Regions ────────────────────────────────────────────────

test('Admin can list regions', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/branches/regions', token);
  expect(status).toBe(200);
  expect(body.data.length).toBeGreaterThanOrEqual(3);
});

// ── Members ────────────────────────────────────────────────

test('Admin can list members', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/members', token);
  expect(status).toBe(200);
  expect(body.data.data.length).toBeGreaterThanOrEqual(5);
  expect(body.data.pagination.total).toBeGreaterThanOrEqual(10);
});

test('GET /api/members/me returns own profile', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.memberLondon.email);
  const { status, body } = await authGet(request, '/api/members/me', token);
  expect(status).toBe(200);
  expect(body.data.email).toBe(ACCOUNTS.memberLondon.email);
});

// ── Fellowships ────────────────────────────────────────────

test('Admin can list fellowships', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/fellowships', token);
  expect(status).toBe(200);
  expect(body.data.data.length).toBeGreaterThanOrEqual(4);
});

test('Pastor can list fellowship members', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.pastorLondon.email);
  // First get a fellowship ID from London
  const { body: fBody } = await authGet(request, '/api/fellowships', token);
  const fellowshipId = fBody.data.data[0].id;
  const { status, body } = await authGet(request, `/api/fellowships/${fellowshipId}/members`, token);
  expect(status).toBe(200);
  expect(Array.isArray(body.data)).toBe(true);
});

// ── Analytics ──────────────────────────────────────────────

test('Admin analytics dashboard returns church-wide stats', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.admin.email);
  const { status, body } = await authGet(request, '/api/analytics/admin', token);
  expect(status).toBe(200);
  expect(body.data.totalBranches).toBeGreaterThanOrEqual(5);
  expect(body.data.totalMembers).toBeGreaterThanOrEqual(10);
  expect(body.data.totalFellowships).toBeGreaterThanOrEqual(4);
  expect(Array.isArray(body.data.membersByApproval)).toBe(true);
  expect(Array.isArray(body.data.fellowshipsByType)).toBe(true);
});

test('Branch analytics returns scoped stats', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.pastorLondon.email);
  const { status, body } = await authGet(request, '/api/analytics/branch', token);
  expect(status).toBe(200);
  expect(body.data.totalMembers).toBeGreaterThanOrEqual(1);
  expect(body.data.totalFellowships).toBeGreaterThanOrEqual(1);
});

test('Member analytics returns personal stats', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.memberLondon.email);
  const { status, body } = await authGet(request, '/api/analytics/member', token);
  expect(status).toBe(200);
  expect(body.data).toHaveProperty('fellowshipsJoined');
  expect(body.data).toHaveProperty('recentAttendance');
});

// ── RBAC enforcement ───────────────────────────────────────

test('Member cannot access admin analytics', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.memberLondon.email);
  const { status } = await authGet(request, '/api/analytics/admin', token);
  expect(status).toBe(403);
});

test('Member cannot create a branch', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.memberLondon.email);
  const { status } = await authPost(request, '/api/branches', token, {
    branchName: 'Unauthorized Branch',
    regionId: '00000000-0000-0000-0000-000000000000',
  });
  expect(status).toBe(401);
});

test('Member cannot approve another member', async ({ request }) => {
  const token = await getToken(request, ACCOUNTS.memberLondon.email);
  // Try to approve the pending member — should fail
  const { status } = await authPost(request, '/api/members/fake-id/approve', token, { approved: true });
  // 401 from requireRole check
  expect(status).toBe(401);
});
