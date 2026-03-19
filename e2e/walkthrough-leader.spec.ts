/**
 * Kairos — Leader Walkthrough
 *
 * Demonstrates leader-level operations: view branch data, manage
 * own fellowship meetings, record attendance, view analytics.
 *
 * npx playwright test e2e/walkthrough-leader.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, getToken, authGet, authPost, authPatch } from './helpers';

let leaderToken: string;

test.beforeAll(async ({ request }) => {
  leaderToken = await getToken(request, ACCOUNTS.leaderLondon.email);
});

// ── Profile ────────────────────────────────────────────────

test.describe('Leader Profile', () => {
  test('View own profile', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members/me', leaderToken);
    expect(status).toBe(200);
    expect(body.data.email).toBe(ACCOUNTS.leaderLondon.email);
    expect(body.data.firstName).toBe('Sarah');
  });
});

// ── Branch View ────────────────────────────────────────────

test.describe('Branch', () => {
  test('Leader sees their branch', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/branches', leaderToken);
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    // Leaders see branches similar to pastors — scoped
    expect(body.data[0].branchName).toBe('Kharis London Central');
  });
});

// ── Fellowships ────────────────────────────────────────────

test.describe('Fellowships', () => {
  let fellowshipId: string;

  test('List fellowships', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/fellowships', leaderToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('Get specific fellowship details', async ({ request }) => {
    const { body } = await authGet(request, '/api/fellowships', leaderToken);
    const graceKGroup = body.data.data.find(
      (f: { fellowshipName: string }) => f.fellowshipName === 'Grace K-Group',
    );
    fellowshipId = graceKGroup.id;

    const { status, body: detail } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(detail.data.fellowshipName).toBe('Grace K-Group');
  });

  test('List fellowship members', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/members`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('List fellowship meetings', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/meetings`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Leader cannot create meetings (requires pastor role)', async ({ request }) => {
    const { status } = await authPost(
      request,
      `/api/fellowships/${fellowshipId}/meetings`,
      leaderToken,
      {
        meetingDate: new Date().toISOString(),
        meetingTitle: 'Leader-Created Meeting',
        meetingTopic: 'Small Group Study',
        location: 'Community Room',
        durationMinutes: 60,
      },
    );
    expect(status).toBe(401);
  });

  test('Get attendance summary', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/attendance/summary`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ── Members ────────────────────────────────────────────────

test.describe('Members', () => {
  test('Leader can list members', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members', leaderToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Analytics ──────────────────────────────────────────────

test.describe('Leader Analytics', () => {
  test('Member analytics dashboard', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/analytics/member', leaderToken);
    expect(status).toBe(200);
    expect(body.data).toBeDefined();
  });
});

// ── RBAC Boundaries ────────────────────────────────────────

test.describe('RBAC', () => {
  test('Leader cannot access admin analytics', async ({ request }) => {
    const { status } = await authGet(request, '/api/analytics/admin', leaderToken);
    expect(status).toBe(403);
  });

  test('Leader cannot create a region', async ({ request }) => {
    const { status } = await authPost(request, '/api/branches/regions', leaderToken, {
      regionName: 'Unauthorized Region',
    });
    expect(status).toBe(401);
  });

  test('Leader cannot create a branch', async ({ request }) => {
    const { status } = await authPost(request, '/api/branches', leaderToken, {
      branchName: 'Unauthorized Branch',
      regionId: '00000000-0000-0000-0000-000000000000',
    });
    expect(status).toBe(401);
  });
});
