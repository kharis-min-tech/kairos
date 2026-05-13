/**
 * Kairos — Leader Walkthrough
 *
 * Demonstrates leader-level operations: view branch data, manage
 * own fellowship meetings, record attendance, view analytics.
 *
 * npx playwright test e2e/walkthrough-leader.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, getToken, authGet, authPost, authPatch, authDelete } from './helpers';

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

// ── Departments (Sarah leads Choir@London) ─────────────────

test.describe('Departments', () => {
  let choirLondonId: string;
  let priscillaId: string;

  test.beforeAll(async ({ request }) => {
    // Resolve Choir@London id (Sarah leads it per seed).
    const depts = await authGet(request, '/api/departments', leaderToken);
    expect(depts.status).toBe(200);
    const choir = depts.body.data.data.find(
      (d: { departmentName: string }) => d.departmentName === 'Choir',
    );
    if (!choir) throw new Error('Seed mismatch: Choir@London not found for leader');
    choirLondonId = choir.id;

    // Resolve Priscilla's member id from the dept roster.
    const roster = await authGet(request, `/api/departments/${choirLondonId}/members`, leaderToken);
    expect(roster.status).toBe(200);
    const priscilla = roster.body.data.find(
      (m: { memberFirstName: string }) => m.memberFirstName === 'Priscilla',
    );
    if (!priscilla) throw new Error('Seed mismatch: Priscilla not in Choir@London');
    priscillaId = priscilla.memberId;
  });

  test('Lists global departments catalogue', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/departments/global', leaderToken);
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(13);
    expect(
      body.data.find((d: { departmentName: string }) => d.departmentName === 'Choir'),
    ).toBeDefined();
  });

  test('Lists branch departments and finds Choir@London', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/departments', leaderToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(
      body.data.data.find((d: { departmentName: string }) => d.departmentName === 'Choir'),
    ).toBeDefined();
  });

  test('Lists Choir members including Priscilla', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/members`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(4);
    expect(
      body.data.find((m: { memberFirstName: string }) => m.memberFirstName === 'Priscilla'),
    ).toBeDefined();
  });

  test('Sees overdue followups (Priscilla last contacted >30d ago)', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/followups/overdue?days=14`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.some((m: { memberId: string }) => m.memberId === priscillaId)).toBe(true);
  });

  test('Logs a fresh followup against Priscilla', async ({ request }) => {
    const { status, body } = await authPost(
      request,
      `/api/departments/${choirLondonId}/members/${priscillaId}/followups`,
      leaderToken,
      {
        contactMethod: 'Phone Call',
        contactStatus: 'Successful',
        durationMinutes: 10,
        notes: 'E2E followup — confirmed availability for Sunday rehearsal.',
        contactedAt: new Date().toISOString(),
      },
    );
    expect(status).toBe(201);
    expect(body.data.contactStatus).toBe('Successful');
  });

  // ── Uniform ──────────────────────────────────────────────

  test('Lists outfit gallery', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/uniforms`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('Sees uniform schedule upcoming entries', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/uniform-schedule/upcoming`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Schedules an outfit for a future Sunday and removes it', async ({ request }) => {
    const { body: outfits } = await authGet(
      request,
      `/api/departments/${choirLondonId}/uniforms`,
      leaderToken,
    );
    const outfitId = outfits.data[0].id;
    // Pick a far-future Sunday to avoid clashing with seed (May 3, 10, 17 already taken).
    const futureSunday = '2026-08-30';

    const { status, body } = await authPost(
      request,
      `/api/departments/${choirLondonId}/uniform-schedule`,
      leaderToken,
      { outfitId, serviceDate: futureSunday, notes: 'E2E scheduled outfit.' },
    );
    expect(status).toBe(201);
    const assignmentId = body.data.id;

    const { status: delStatus } = await authDelete(
      request,
      `/api/departments/${choirLondonId}/uniform-schedule/${assignmentId}`,
      leaderToken,
    );
    expect(delStatus).toBe(200);
  });

  // ── Rota ─────────────────────────────────────────────────

  test('Lists rota templates and finds Sunday Worship', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-templates`,
      leaderToken,
    );
    expect(status).toBe(200);
    const sunday = body.data.find((t: { name: string }) => t.name === 'Sunday Worship');
    expect(sunday).toBeDefined();
    expect(sunday.weekday).toBe(0);
  });

  test('Lists rota instances within window and finds the published one', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-instances?from=2026-05-01&to=2026-05-31`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data.some((i: { status: string }) => i.status === 'Published')).toBe(true);
  });

  test('Member-facing rota shows Sarah upcoming duties', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      '/api/me/rota?from=2026-05-01&to=2026-05-31',
      leaderToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Generates 4 weeks of rota from a future date', async ({ request }) => {
    const { body: templates } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-templates`,
      leaderToken,
    );
    const templateId = templates.data.find(
      (t: { name: string }) => t.name === 'Sunday Worship',
    ).id;

    // Pick a Sunday far enough out to avoid colliding with seeded May 10/17 instances.
    const { status, body } = await authPost(
      request,
      `/api/departments/${choirLondonId}/rota-templates/${templateId}/generate`,
      leaderToken,
      { startDate: '2026-09-06', weeks: 4 },
    );
    expect(status).toBe(200);
    expect(body.data.instanceCount).toBe(4);
    expect(body.data.assignmentCount).toBeGreaterThan(0);
  });

  test('Creates a swap request on a published assignment then admin approves', async ({ request }) => {
    const { body: instances } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-instances?from=2026-05-01&to=2026-05-31`,
      leaderToken,
    );
    const published = instances.data.find((i: { status: string }) => i.status === 'Published');
    expect(published).toBeDefined();

    const { body: detail } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-instances/${published.id}`,
      leaderToken,
    );
    // Find Sarah's own assignment (she's seeded as Lead Vocal).
    const ownAssignment = detail.data.assignments.find(
      (a: { slotRoleName: string }) => a.slotRoleName === 'Lead Vocal',
    );
    expect(ownAssignment).toBeDefined();

    const { status, body } = await authPost(
      request,
      `/api/departments/${choirLondonId}/rota-instances/${published.id}/assignments/${ownAssignment.id}/swap-requests`,
      leaderToken,
      { reason: 'E2E — unavailable that Sunday.' },
    );
    expect(status).toBe(201);
    const swapId = body.data.id;
    expect(body.data.status).toBe('pending');

    // Admin reviews and approves.
    const adminToken = await getToken(request, ACCOUNTS.admin.email);
    const { status: reviewStatus, body: reviewed } = await authPatch(
      request,
      `/api/departments/${choirLondonId}/rota-swap-requests/${swapId}`,
      adminToken,
      { decision: 'approved', reviewNotes: 'Approved — find a sub.' },
    );
    expect(reviewStatus).toBe(200);
    expect(reviewed.data.status).toBe('approved');
  });

  test('Lists swap requests filtered by status', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/departments/${choirLondonId}/rota-swap-requests?status=approved`,
      leaderToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
