// Property-based tests for dashboard data authorization (Task 21.4)
// **Property: Dashboard Data Authorization**
// For any pastor role, the dashboard should ALWAYS return only their branch data (never cross-branch).
// For any admin role, the dashboard should ALWAYS succeed regardless of branch.
//
// **Validates: Req 21.1, 21.2, 21.3**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import fc from 'fast-check';

const mockGetDb = vi.fn();

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => mockGetDb(),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

vi.mock('@kairos/database', () => ({
  members: { memberId: 'member_id', homeBranchId: 'home_branch_id', isActive: 'is_active', createdAt: 'created_at' },
  donations: { donationId: 'donation_id', branchId: 'branch_id', amount: 'amount', donationPurpose: 'donation_purpose', donationDate: 'donation_date', isAnonymous: 'is_anonymous', status: 'status' },
  souls: { soulId: 'soul_id', status: 'status', createdAt: 'created_at', branchId: 'branch_id', assignedMemberId: 'assigned_member_id', updatedAt: 'updated_at' },
  services: { serviceId: 'service_id', branchId: 'branch_id', serviceDate: 'service_date', serviceType: 'service_type' },
  serviceAttendance: { serviceId: 'service_id', memberId: 'member_id', attendanceStatus: 'attendance_status' },
  branches: { branchId: 'branch_id', branchName: 'branch_name', isActive: 'is_active' },
  departments: { departmentId: 'department_id', departmentName: 'department_name' },
  fellowships: { fellowshipId: 'fellowship_id', fellowshipName: 'fellowship_name', branchId: 'branch_id' },
  departmentMembers: { memberId: 'member_id', branchDepartmentId: 'branch_department_id', isActive: 'is_active', leaveDate: 'leave_date' },
  fellowshipMembers: { fellowshipId: 'fellowship_id', memberId: 'member_id', isActive: 'is_active' },
  outreachPrograms: { outreachId: 'outreach_id', branchId: 'branch_id' },
  followUps: { followUpId: 'follow_up_id', soulId: 'soul_id', contactDate: 'contact_date' },
  branchDepartments: { branchDepartmentId: 'branch_department_id', branchId: 'branch_id', departmentId: 'department_id', leadMemberId: 'lead_member_id' },
  notificationRecipients: { notificationId: 'notification_id', memberId: 'member_id' },
}));

import { handler as adminDashboardHandler } from '../reports-get-admin-dashboard';
import { handler as pastorDashboardHandler } from '../reports-get-pastor-dashboard';

function createEvent(
  queryParams?: Record<string, string>,
  auth?: { memberId?: number; branchId?: number; roles?: string[] }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/reports/dashboard',
    pathParameters: null,
    queryStringParameters: queryParams || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {
        member_id: String(ctx.memberId),
        branch_id: String(ctx.branchId),
        roles: JSON.stringify(ctx.roles),
        email: 'test@kairos.church',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'GET',
      identity: {} as never,
      path: '',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
  } as unknown as APIGatewayProxyEvent;
}

function chain(result: unknown[]) {
  const obj: Record<string, unknown> = {};
  obj.from = vi.fn().mockReturnValue(obj);
  obj.where = vi.fn().mockReturnValue(obj);
  obj.innerJoin = vi.fn().mockReturnValue(obj);
  obj.leftJoin = vi.fn().mockReturnValue(obj);
  obj.groupBy = vi.fn().mockReturnValue(obj);
  obj.orderBy = vi.fn().mockReturnValue(obj);
  obj.limit = vi.fn().mockReturnValue(obj);
  obj.then = (resolve: (v: unknown) => void) => resolve(result);
  return obj;
}

function setupPastorDb() {
  const selectMock = vi.fn()
    .mockReturnValueOnce(chain([{ count: 50 }]))
    .mockReturnValueOnce(chain([{ total: '3000.00' }]))
    .mockReturnValueOnce(chain([{ count: 8 }]))
    .mockReturnValueOnce(chain([]))
    .mockReturnValueOnce(chain([{ count: 1 }]));
  mockGetDb.mockReturnValue({ select: selectMock });
  return selectMock;
}

function setupAdminDb() {
  const selectMock = vi.fn()
    .mockReturnValueOnce(chain([{ count: 500 }]))
    .mockReturnValueOnce(chain([{ count: 5 }]))
    .mockReturnValueOnce(chain([{ count: 20 }]))
    .mockReturnValueOnce(chain([{ count: 10 }]))
    .mockReturnValueOnce(chain([{ total: '15000.00' }]))
    .mockReturnValueOnce(chain([{ count: 25 }]))
    .mockReturnValueOnce(chain([]))   // attendanceLast4Weeks
    .mockReturnValueOnce(chain([]))   // attendanceTrendLast8Weeks
    .mockReturnValueOnce(chain([]))   // recentMembers
    .mockReturnValueOnce(chain([]))   // recentDonations
    .mockReturnValueOnce(chain([]));  // recentSouls
  mockGetDb.mockReturnValue({ select: selectMock });
  return selectMock;
}

describe('Dashboard Data Authorization (Property)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pastor dashboard should ALWAYS reject cross-branch access for any pastor branchId/requestedBranchId pair', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),  // pastorBranchId
        fc.integer({ min: 1, max: 1000 }),  // requestedBranchId
        fc.integer({ min: 1, max: 10000 }), // memberId
        async (pastorBranchId, requestedBranchId, memberId) => {
          if (pastorBranchId === requestedBranchId) return; // skip same-branch (valid case)

          vi.clearAllMocks();

          const event = createEvent(
            { branchId: String(requestedBranchId) },
            { memberId, branchId: pastorBranchId, roles: ['Pastor', 'Member'] }
          );
          const result = await pastorDashboardHandler(event);

          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('pastor dashboard should ALWAYS succeed when accessing own branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),  // branchId
        fc.integer({ min: 1, max: 10000 }), // memberId
        async (branchId, memberId) => {
          vi.clearAllMocks();
          setupPastorDb();

          const event = createEvent(
            { branchId: String(branchId) },
            { memberId, branchId, roles: ['Pastor', 'Member'] }
          );
          const result = await pastorDashboardHandler(event);

          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          expect(body.branchId).toBe(branchId);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('admin dashboard should ALWAYS succeed for any admin regardless of branchId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),  // branchId
        fc.integer({ min: 1, max: 10000 }), // memberId
        async (branchId, memberId) => {
          vi.clearAllMocks();
          setupAdminDb();

          const event = createEvent(
            undefined,
            { memberId, branchId, roles: ['Admin', 'Member'] }
          );
          const result = await adminDashboardHandler(event);

          expect(result.statusCode).toBe(200);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('admin should ALWAYS be able to access pastor dashboard for any branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),  // adminBranchId
        fc.integer({ min: 1, max: 1000 }),  // targetBranchId
        fc.integer({ min: 1, max: 10000 }), // memberId
        async (adminBranchId, targetBranchId, memberId) => {
          vi.clearAllMocks();
          setupPastorDb();

          const event = createEvent(
            { branchId: String(targetBranchId) },
            { memberId, branchId: adminBranchId, roles: ['Admin', 'Member'] }
          );
          const result = await pastorDashboardHandler(event);

          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          expect(body.branchId).toBe(targetBranchId);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('non-admin non-pastor should ALWAYS be rejected from admin dashboard', async () => {
    const nonPrivilegedRoles = [
      ['Member'],
      ['Leader', 'Member'],
      ['Member', 'Leader'],
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.constantFrom(...nonPrivilegedRoles),
        async (branchId, memberId, roles) => {
          vi.clearAllMocks();

          const event = createEvent(
            undefined,
            { memberId, branchId, roles }
          );
          const result = await adminDashboardHandler(event);

          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 30 }
    );
  });
});
