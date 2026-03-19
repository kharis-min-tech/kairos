/**
 * Kairos — Member Walkthrough
 *
 * Demonstrates regular member operations: profile, fellowships,
 * personal analytics, and RBAC boundaries.
 *
 * npx playwright test e2e/walkthrough-member.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, getToken, authGet, authPatch, authPost, authDelete } from './helpers';

let memberToken: string;

test.beforeAll(async ({ request }) => {
  memberToken = await getToken(request, ACCOUNTS.memberLondon.email);
});

// ── Profile ────────────────────────────────────────────────

test.describe('Profile', () => {
  test('View own profile', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members/me', memberToken);
    expect(status).toBe(200);
    expect(body.data.email).toBe(ACCOUNTS.memberLondon.email);
    expect(body.data.firstName).toBe('Emma');
  });

  test('Update own profile', async ({ request }) => {
    // Get own member ID first (no PATCH /me — use PATCH /members/:id)
    const { body: profile } = await authGet(request, '/api/members/me', memberToken);
    const memberId = profile.data.id;
    const { status, body } = await authPatch(request, `/api/members/${memberId}`, memberToken, {
      phone: '+447700900333',
    });
    expect(status).toBe(200);
    expect(body.data.phone).toBe('+447700900333');
  });
});

// ── Fellowships ────────────────────────────────────────────

test.describe('Fellowships', () => {
  test('View available fellowships', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/fellowships', memberToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Get fellowship details', async ({ request }) => {
    const { body } = await authGet(request, '/api/fellowships', memberToken);
    const fellowship = body.data.data[0];

    const { status, body: detail } = await authGet(
      request,
      `/api/fellowships/${fellowship.id}`,
      memberToken,
    );
    expect(status).toBe(200);
    expect(detail.data.fellowshipName).toBeDefined();
  });

  test('View fellowship members', async ({ request }) => {
    const { body } = await authGet(request, '/api/fellowships', memberToken);
    const fellowship = body.data.data[0];

    const { status, body: members } = await authGet(
      request,
      `/api/fellowships/${fellowship.id}/members`,
      memberToken,
    );
    expect(status).toBe(200);
    expect(members.data.length).toBeGreaterThanOrEqual(1);
  });

  test('View fellowship meetings', async ({ request }) => {
    const { body } = await authGet(request, '/api/fellowships', memberToken);
    const fellowship = body.data.data[0];

    const { status, body: meetings } = await authGet(
      request,
      `/api/fellowships/${fellowship.id}/meetings`,
      memberToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(meetings.data)).toBe(true);
  });
});

// ── Members ────────────────────────────────────────────────

test.describe('Members', () => {
  test('Member can list members in their branch', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members', memberToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Analytics ──────────────────────────────────────────────

test.describe('Member Analytics', () => {
  test('Personal analytics dashboard', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/analytics/member', memberToken);
    expect(status).toBe(200);
    expect(body.data).toBeDefined();
  });
});

// ── RBAC Boundaries ────────────────────────────────────────

test.describe('RBAC', () => {
  test('Member cannot access admin analytics', async ({ request }) => {
    const { status } = await authGet(request, '/api/analytics/admin', memberToken);
    expect(status).toBe(403);
  });

  test('Member can view branch analytics (scoped to their branch)', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/analytics/branch', memberToken);
    expect(status).toBe(200);
    expect(body.data.totalMembers).toBeGreaterThanOrEqual(1);
  });

  test('Member cannot create a branch', async ({ request }) => {
    const { status } = await authPost(request, '/api/branches', memberToken, {
      branchName: 'Nope',
      regionId: '00000000-0000-0000-0000-000000000000',
    });
    expect(status).toBe(401);
  });

  test('Member cannot create a fellowship', async ({ request }) => {
    const { status } = await authPost(request, '/api/fellowships', memberToken, {
      fellowshipName: 'Nope',
      branchId: '00000000-0000-0000-0000-000000000000',
      fellowshipType: 'K-Groups',
    });
    // Either 401 or 403 depending on middleware chain
    expect([401, 403]).toContain(status);
  });

  test('Member cannot approve other members', async ({ request }) => {
    const { status } = await authPost(
      request,
      '/api/members/00000000-0000-0000-0000-000000000000/approve',
      memberToken,
      { approved: true },
    );
    expect([401, 403, 404]).toContain(status);
  });

  test('Member cannot create a region', async ({ request }) => {
    const { status } = await authPost(request, '/api/branches/regions', memberToken, {
      regionName: 'Unauthorized',
    });
    expect(status).toBe(401);
  });

  test('Member cannot delete a branch', async ({ request }) => {
    const { status } = await authDelete(
      request,
      '/api/branches/00000000-0000-0000-0000-000000000000',
      memberToken,
    );
    expect(status).toBe(401);
  });
});
