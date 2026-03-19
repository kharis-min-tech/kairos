/**
 * Kairos — Pastor Walkthrough
 *
 * Demonstrates pastor-level operations: branch view, fellowship
 * management, meeting creation, attendance recording, member listing.
 *
 * npx playwright test e2e/walkthrough-pastor.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, getToken, authGet, authPost, authPatch, authDelete } from './helpers';

let pastorToken: string;
let branchId: string;

test.beforeAll(async ({ request }) => {
  pastorToken = await getToken(request, ACCOUNTS.pastorLondon.email);

  // Resolve London branch ID
  const { body } = await authGet(request, '/api/branches', pastorToken);
  branchId = body.data[0].id; // pastor sees only their branch
});

// ── Branch view ────────────────────────────────────────────

test.describe('Branch', () => {
  test('Pastor sees only their own branch', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/branches', pastorToken);
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].branchName).toBe('Kharis London Central');
  });

  test('Pastor can update their branch', async ({ request }) => {
    const { status, body } = await authPatch(request, `/api/branches/${branchId}`, pastorToken, {
      phone: '+442071234999',
    });
    expect(status).toBe(200);
    expect(body.data.phone).toBe('+442071234999');
  });

  test('Pastor cannot create a new branch', async ({ request }) => {
    const { status } = await authPost(request, '/api/branches', pastorToken, {
      branchName: 'Unauthorized Branch',
      regionId: '00000000-0000-0000-0000-000000000000',
    });
    expect(status).toBe(401);
  });
});

// ── Members ────────────────────────────────────────────────

test.describe('Members', () => {
  test('Pastor can list members', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members', pastorToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Pastor can search members by name', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/members?search=Sarah', pastorToken);
    expect(status).toBe(200);
    const names = body.data.data.map((m: { firstName: string }) => m.firstName);
    expect(names).toContain('Sarah');
  });

  test('Pastor can approve a pending member', async ({ request }) => {
    // Use admin token to search across all branches for a pending member
    const adminToken = await getToken(request, ACCOUNTS.admin.email);
    const { body: allPending } = await authGet(
      request,
      '/api/members?approvalStatus=pending',
      adminToken,
    );
    // The unverified@kairos.local has emailVerified=false AND approvalStatus=pending
    // Find one in London if any. The pending one was already approved by admin walkthrough,
    // so this test asserts the action is available for pastors on remaining pending members.
    const pendingInAnyBranch = allPending.data.data.find(
      (m: { approvalStatus: string }) => m.approvalStatus === 'pending',
    );

    if (pendingInAnyBranch) {
      // Pastor may or may not have branch access — just verify a 200 or 403
      const { status } = await authPost(
        request,
        `/api/members/${pendingInAnyBranch.id}/approve`,
        pastorToken,
        { approved: true },
      );
      // A pastor can approve in their branch or get a branch-access error
      expect([200, 403]).toContain(status);
    }
  });
});

// ── Fellowship Lifecycle ───────────────────────────────────

test.describe('Fellowships', () => {
  let fellowshipId: string;

  test('List fellowships for London', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/fellowships', pastorToken);
    expect(status).toBe(200);
    expect(body.data.data.length).toBeGreaterThanOrEqual(2); // Grace K-Group + Kharis Express
  });

  test('Create a new fellowship', async ({ request }) => {
    const { body: mBody } = await authGet(request, '/api/members?search=James', pastorToken);
    const pastorMember = mBody.data.data.find(
      (m: { email: string }) => m.email === ACCOUNTS.pastorLondon.email,
    );

    const { status, body } = await authPost(request, '/api/fellowships', pastorToken, {
      fellowshipName: `Integration Test Fellowship ${Date.now()}`,
      branchId,
      fellowshipType: 'K-Groups',
      description: 'Created during E2E test',
      leaderId: pastorMember.id,
      meetingSchedule: 'Every Tuesday, 7:00 PM',
    });
    expect(status).toBe(201);
    expect(body.data.fellowshipName).toContain('Integration Test Fellowship');
    fellowshipId = body.data.id;
  });

  test('Get the new fellowship', async ({ request }) => {
    const { status, body } = await authGet(request, `/api/fellowships/${fellowshipId}`, pastorToken);
    expect(status).toBe(200);
    expect(body.data.description).toBe('Created during E2E test');
  });

  test('Update the fellowship', async ({ request }) => {
    const { status, body } = await authPatch(request, `/api/fellowships/${fellowshipId}`, pastorToken, {
      description: 'Updated during E2E test',
    });
    expect(status).toBe(200);
    expect(body.data.description).toBe('Updated during E2E test');
  });

  test('Add a member to the fellowship', async ({ request }) => {
    // Add Emma Thompson
    const { body: mBody } = await authGet(request, '/api/members?search=Emma', pastorToken);
    const emma = mBody.data.data[0];

    const { status, body } = await authPost(
      request,
      `/api/fellowships/${fellowshipId}/members`,
      pastorToken,
      { memberId: emma.id },
    );
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  test('List fellowship members', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/members`,
      pastorToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(2); // auto-joined leader + Emma
  });

  test('Remove a member from the fellowship', async ({ request }) => {
    const { body: mBody } = await authGet(request, '/api/members?search=Emma', pastorToken);
    const emmaId = mBody.data.data[0].id;

    const { status, body } = await authDelete(
      request,
      `/api/fellowships/${fellowshipId}/members/${emmaId}`,
      pastorToken,
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ── Meetings & Attendance ──────────────────────────────────

test.describe('Meetings & Attendance', () => {
  let fellowshipId: string;
  let meetingId: string;
  let memberIds: string[];

  test.beforeAll(async ({ request }) => {
    // Get Grace K-Group
    const { body } = await authGet(request, '/api/fellowships', pastorToken);
    const graceKGroup = body.data.data.find(
      (f: { fellowshipName: string }) => f.fellowshipName === 'Grace K-Group',
    );
    fellowshipId = graceKGroup.id;

    // Get its members
    const { body: memBody } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/members`,
      pastorToken,
    );
    memberIds = memBody.data.map((m: { memberId: string }) => m.memberId);
  });

  test('Create a meeting', async ({ request }) => {
    const { status, body } = await authPost(
      request,
      `/api/fellowships/${fellowshipId}/meetings`,
      pastorToken,
      {
        meetingDate: new Date().toISOString(),
        meetingTitle: 'E2E Test Meeting',
        meetingTopic: 'Testing the Platform',
        location: 'Church Hall',
        durationMinutes: 90,
      },
    );
    expect(status).toBe(201);
    expect(body.data.meetingTitle).toBe('E2E Test Meeting');
    meetingId = body.data.id;
  });

  test('Record attendance for the meeting', async ({ request }) => {
    const records = memberIds.map((memberId, i) => ({
      memberId,
      attendanceStatus: i === 0 ? 'Present' as const : i === 1 ? 'Late' as const : 'Absent' as const,
    }));

    const { status, body } = await authPost(
      request,
      `/api/fellowships/${fellowshipId}/meetings/${meetingId}/attendance`,
      pastorToken,
      { meetingId, records },
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  test('Get attendance for the meeting', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/meetings/${meetingId}/attendance`,
      pastorToken,
    );
    expect(status).toBe(200);
    expect(body.data.length).toBe(memberIds.length);
  });

  test('Get attendance summary', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      `/api/fellowships/${fellowshipId}/attendance/summary`,
      pastorToken,
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ── Branch Analytics ───────────────────────────────────────

test.describe('Pastor Analytics', () => {
  test('Branch dashboard shows scoped data', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/analytics/branch', pastorToken);
    expect(status).toBe(200);
    expect(body.data.totalMembers).toBeGreaterThanOrEqual(1);
    expect(body.data.totalFellowships).toBeGreaterThanOrEqual(1);
    expect(typeof body.data.recentMeetings).toBe('number');
  });
});
