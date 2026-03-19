/**
 * Kairos — Admin Walkthrough
 *
 * Demonstrates every admin-level operation: region/branch CRUD,
 * member approval, role assignment, leadership, fellowship management.
 *
 * npx playwright test e2e/walkthrough-admin.spec.ts
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, getToken, authGet, authPost, authPatch, authDelete } from './helpers';

let adminToken: string;

test.beforeAll(async ({ request }) => {
  adminToken = await getToken(request, ACCOUNTS.admin.email);
});

// ── Region CRUD ────────────────────────────────────────────

test.describe('Regions', () => {
  test('Create a new region', async ({ request }) => {
    const { status, body } = await authPost(request, '/api/branches/regions', adminToken, {
      regionName: 'East Africa',
      country: 'Kenya',
    });
    expect(status).toBe(201);
    expect(body.data.regionName).toBe('East Africa');
  });

  test('List regions includes the new region', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/branches/regions', adminToken);
    expect(status).toBe(200);
    const names = body.data.map((r: { regionName: string }) => r.regionName);
    expect(names).toContain('East Africa');
  });

  test('Duplicate region name is rejected', async ({ request }) => {
    const { status, body } = await authPost(request, '/api/branches/regions', adminToken, {
      regionName: 'United Kingdom',
      country: 'United Kingdom',
    });
    expect(status).toBe(409);
    expect(body.success).toBe(false);
  });
});

// ── Branch CRUD ────────────────────────────────────────────

test.describe('Branches', () => {
  let newBranchId: string;
  let regionId: string;

  test('Create a new branch in existing region', async ({ request }) => {
    // Get Ghana region
    const { body: regBody } = await authGet(request, '/api/branches/regions', adminToken);
    regionId = regBody.data.find((r: { regionName: string }) => r.regionName === 'Greater Accra').id;

    const { status, body } = await authPost(request, '/api/branches', adminToken, {
      branchName: 'Kharis Tema',
      regionId,
      branchType: 'Satellite',
      city: 'Tema',
    });
    expect(status).toBe(201);
    expect(body.data.branchName).toBe('Kharis Tema');
    newBranchId = body.data.id;
  });

  test('Get the new branch by ID', async ({ request }) => {
    const { status, body } = await authGet(request, `/api/branches/${newBranchId}`, adminToken);
    expect(status).toBe(200);
    expect(body.data.city).toBe('Tema');
  });

  test('Update the new branch', async ({ request }) => {
    const { status, body } = await authPatch(request, `/api/branches/${newBranchId}`, adminToken, {
      phone: '+233301234567',
      email: 'tema@kharischurch.org',
    });
    expect(status).toBe(200);
    expect(body.data.phone).toBe('+233301234567');
  });

  test('Delete (soft-delete) the new branch', async ({ request }) => {
    const { status, body } = await authDelete(request, `/api/branches/${newBranchId}`, adminToken);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ── Branch Leadership ──────────────────────────────────────

test.describe('Leadership', () => {
  test('List leadership for London', async ({ request }) => {
    const { body: bBody } = await authGet(request, '/api/branches', adminToken);
    const londonId = bBody.data.find((b: { branchName: string }) =>
      b.branchName === 'Kharis London Central',
    ).id;

    const { status, body } = await authGet(request, `/api/branches/${londonId}/leadership`, adminToken);
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(2); // Main Pastor + Elder
  });
});

// ── Member Approval ────────────────────────────────────────

test.describe('Member Approval', () => {
  test('List pending members', async ({ request }) => {
    const { status, body } = await authGet(
      request,
      '/api/members?approvalStatus=pending',
      adminToken,
    );
    expect(status).toBe(200);
    const pending = body.data.data;
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  test('Approve the pending member', async ({ request }) => {
    const { body: listBody } = await authGet(
      request,
      '/api/members?approvalStatus=pending',
      adminToken,
    );
    const pendingMember = listBody.data.data.find(
      (m: { email: string }) => m.email === 'new.applicant@kairos.local',
    );
    expect(pendingMember).toBeTruthy();

    const { status, body } = await authPost(
      request,
      `/api/members/${pendingMember.id}/approve`,
      adminToken,
      { approved: true },
    );
    expect(status).toBe(200);
    expect(body.data.approvalStatus).toBe('approved');
  });
});

// ── Member Roles ───────────────────────────────────────────

test.describe('Role Assignment', () => {
  test('Assign a role to a member', async ({ request }) => {
    // Get London branch ID
    const { body: bBody } = await authGet(request, '/api/branches', adminToken);
    const londonId = bBody.data.find((b: { branchName: string }) =>
      b.branchName === 'Kharis London Central',
    ).id;

    // Get member Emma Thompson
    const { body: mBody } = await authGet(request, '/api/members?search=Emma', adminToken);
    const emma = mBody.data.data[0];

    // Get the roles she already has
    const { body: existingRoles } = await authGet(
      request,
      `/api/members/${emma.id}/roles`,
      adminToken,
    );

    // Get the Worship Lead role ID (she doesn't have it)
    const { body: allMembers } = await authGet(request, '/api/members?search=Sarah', adminToken);
    const sarah = allMembers.data.data[0];
    const { body: sarahRoles } = await authGet(
      request,
      `/api/members/${sarah.id}/roles`,
      adminToken,
    );
    // Sarah has Worship Lead *and media team potentially*
    // We'll look for a role Emma doesn't have. Use Youth Coordinator.
    // Get all roles via a member who has it (David Appiah has Youth Coordinator)
    const { body: accraMembers } = await authGet(request, '/api/members?search=David', adminToken);
    const david = accraMembers.data.data[0];
    const { body: davidRoles } = await authGet(
      request,
      `/api/members/${david.id}/roles`,
      adminToken,
    );
    const youthCoordRole = davidRoles.data.find(
      (r: { roleName: string }) => r.roleName === 'Youth Coordinator',
    );

    // Assign Youth Coordinator to Emma in London
    const { status, body } = await authPost(
      request,
      `/api/members/${emma.id}/roles`,
      adminToken,
      { roleId: youthCoordRole.roleId, branchId: londonId },
    );
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });
});

// ── Full Signup → Verify → Login cycle ─────────────────────

test.describe('Signup Flow', () => {
  const newUser = {
    firstName: 'Test',
    lastName: 'Stakeholder',
    email: `stakeholder.${Date.now()}@kairos.local`,
    password: 'StakeHolder1!',
    homeBranchId: '', // filled in beforeAll
  };

  test('New user signs up, verifies email, gets approved, and logs in', async ({ request }) => {
    // Get London branch ID for signup
    const { body: bBody } = await authGet(request, '/api/branches', adminToken);
    const londonId = bBody.data.find((b: { branchName: string }) =>
      b.branchName === 'Kharis London Central',
    ).id;
    newUser.homeBranchId = londonId;

    // 1. Signup
    const signupRes = await request.post('/api/auth/signup', { data: newUser });
    expect(signupRes.status()).toBe(201);
    const signupBody = await signupRes.json();
    expect(signupBody.data.member.email).toBe(newUser.email);
    const memberId = signupBody.data.member.id;

    // 2. Verify email (MVP dev mode: token = member ID)
    const verifyRes = await request.post('/api/auth/verify-email', {
      data: { token: memberId },
    });
    expect(verifyRes.status()).toBe(200);

    // 3. Login fails — not yet approved
    const loginRes1 = await request.post('/api/auth/login', {
      data: { email: newUser.email, password: newUser.password },
    });
    expect(loginRes1.status()).toBe(400);

    // 4. Admin approves
    const approveRes = await authPost(
      request,
      `/api/members/${memberId}/approve`,
      adminToken,
      { approved: true },
    );
    expect(approveRes.status).toBe(200);

    // 5. Login succeeds
    const loginRes2 = await request.post('/api/auth/login', {
      data: { email: newUser.email, password: newUser.password },
    });
    expect(loginRes2.status()).toBe(200);
    const loginBody = await loginRes2.json();
    expect(loginBody.data.tokens.accessToken).toBeTruthy();
  });
});

// ── Analytics ──────────────────────────────────────────────

test.describe('Admin Analytics', () => {
  test('Admin dashboard shows church-wide data', async ({ request }) => {
    const { status, body } = await authGet(request, '/api/analytics/admin', adminToken);
    expect(status).toBe(200);
    expect(body.data.totalBranches).toBeGreaterThanOrEqual(5);
    expect(body.data.totalMembers).toBeGreaterThanOrEqual(10);
    expect(body.data.totalFellowships).toBeGreaterThanOrEqual(4);
  });
});
