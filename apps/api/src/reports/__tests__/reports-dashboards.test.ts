// Unit tests for reports dashboard Lambdas (Task 21.4)
// Tests admin, pastor, and leader dashboard handlers
//
// **Validates: Req 21.1, 21.2, 21.3**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

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
import { handler as leaderDashboardHandler } from '../reports-get-leader-dashboard';

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
        email: 'admin@kairos.church',
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

/**
 * Creates a chainable mock that resolves on the terminal method call.
 * All methods return `this` so the chain is fully traversable.
 * The chain itself is a thenable (has `.then`) so `await` resolves to the result.
 */
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

describe('reports-get-admin-dashboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all admin dashboard metrics (200)', async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce(chain([{ count: 500 }]))       // totalMembers
      .mockReturnValueOnce(chain([{ count: 5 }]))         // totalBranches
      .mockReturnValueOnce(chain([{ count: 20 }]))        // totalDepartments
      .mockReturnValueOnce(chain([{ count: 10 }]))        // totalFellowships
      .mockReturnValueOnce(chain([{ total: '15000.00' }])) // donationsLast30Days
      .mockReturnValueOnce(chain([{ count: 25 }]))        // soulsLast30Days
      .mockReturnValueOnce(chain([                         // attendanceData (last 4 weeks)
        { weekStart: '2026-02-03', presentCount: 120, totalCount: 150 },
        { weekStart: '2026-02-10', presentCount: 130, totalCount: 155 },
      ]))
      .mockReturnValueOnce(chain([                         // attendanceTrend (last 8 weeks)
        { weekStart: '2025-12-22', presentCount: 100, totalCount: 140 },
        { weekStart: '2025-12-29', presentCount: 110, totalCount: 145 },
        { weekStart: '2026-01-05', presentCount: 115, totalCount: 148 },
        { weekStart: '2026-01-12', presentCount: 118, totalCount: 150 },
        { weekStart: '2026-01-19', presentCount: 120, totalCount: 150 },
        { weekStart: '2026-01-26', presentCount: 125, totalCount: 152 },
        { weekStart: '2026-02-03', presentCount: 120, totalCount: 150 },
        { weekStart: '2026-02-10', presentCount: 130, totalCount: 155 },
      ]))
      .mockReturnValueOnce(chain([                         // recentMembers
        { type: 'member_registered', description: 'John Doe registered', timestamp: new Date('2026-02-10') },
      ]))
      .mockReturnValueOnce(chain([                         // recentDonations
        { type: 'donation_received', description: 'Donation of £100 (Tithe) received', timestamp: new Date('2026-02-09') },
      ]))
      .mockReturnValueOnce(chain([                         // recentSouls
        { type: 'soul_captured', description: 'Jane Smith captured', timestamp: new Date('2026-02-08') },
      ]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(undefined, { roles: ['Admin', 'Member'] });
    const result = await adminDashboardHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.totalMembers).toBe(500);
    expect(body.totalBranches).toBe(5);
    expect(body.totalDepartments).toBe(20);
    expect(body.totalFellowships).toBe(10);
    expect(body.donationsLast30Days).toBe(15000);
    expect(body.soulsLast30Days).toBe(25);
    expect(body.attendancePercentage).toBeDefined();
    expect(body.attendanceTrends).toHaveLength(8);
    expect(body.attendanceTrends[0].week).toBe('2025-12-22');
    expect(body.attendanceTrends[0].percentage).toBeDefined();
    expect(body.recentActivity).toHaveLength(3);
    expect(body.recentActivity[0].action).toBeDefined();
    expect(body.recentActivity[0].actor).toBeDefined();
    expect(body.recentActivity[0].timestamp).toBeDefined();
  });

  it('should return 403 for non-admin users', async () => {
    const event = createEvent(undefined, { roles: ['Member'] });
    const result = await adminDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });
});

describe('reports-get-pastor-dashboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return branch-scoped pastor dashboard data (200)', async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce(chain([{ count: 80 }]))        // branchMemberCount
      .mockReturnValueOnce(chain([{ total: '5000.00' }]))  // branchDonationsLast30Days
      .mockReturnValueOnce(chain([{ count: 12 }]))         // branchSouls
      .mockReturnValueOnce(chain([                          // branchAttendanceTrends
        { weekStart: '2026-02-03', presentCount: 60, totalCount: 75 },
      ]))
      .mockReturnValueOnce(chain([{ count: 3 }]));         // overdueFollowups

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(undefined, { memberId: 5, branchId: 10, roles: ['Pastor', 'Member'] });
    const result = await pastorDashboardHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.branchMemberCount).toBe(80);
    expect(body.branchDonationsLast30Days).toBe(5000);
    expect(body.branchSouls).toBe(12);
    expect(body.branchAttendanceTrends).toHaveLength(1);
    expect(body.branchAttendanceTrends[0].week).toBeDefined();
    expect(body.branchAttendanceTrends[0].percentage).toBeDefined();
    expect(body.overdueFollowups).toBe(3);
  });

  it('should return 403 when pastor tries to view another branch', async () => {
    const event = createEvent(
      { branchId: '20' },
      { memberId: 5, branchId: 10, roles: ['Pastor', 'Member'] }
    );
    const result = await pastorDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });

  it('should allow admin to access pastor dashboard for any branch', async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce(chain([{ count: 40 }]))
      .mockReturnValueOnce(chain([{ total: '2000.00' }]))
      .mockReturnValueOnce(chain([{ count: 5 }]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([{ count: 0 }]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { branchId: '99' },
      { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] }
    );
    const result = await pastorDashboardHandler(event);

    expect(result.statusCode).toBe(200);
  });

  it('should return 403 for regular members', async () => {
    const event = createEvent(undefined, { roles: ['Member'] });
    const result = await pastorDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });
});

describe('reports-get-leader-dashboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return department dashboard data for leader (200)', async () => {
    const selectMock = vi.fn()
      // 1st call: verify leader access (branchDepartments lookup)
      .mockReturnValueOnce(chain([{ leadMemberId: 5 }]))
      // 2nd call: groupMemberCount
      .mockReturnValueOnce(chain([{ count: 15 }]))
      // 3rd call: get branchId for department
      .mockReturnValueOnce(chain([{ branchId: 10 }]))
      // 4th call: recentAttendance
      .mockReturnValueOnce(chain([
        { serviceId: 1, serviceDate: '2026-03-01', presentCount: 40, totalCount: 50 },
        { serviceId: 2, serviceDate: '2026-02-22', presentCount: 38, totalCount: 48 },
      ]))
      // 5th call: pendingJoinRequests
      .mockReturnValueOnce(chain([{ count: 2 }]))
      // 6th call: membersNeedingFollowup
      .mockReturnValueOnce(chain([{ count: 4 }]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { departmentId: '3' },
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.groupMemberCount).toBe(15);
    expect(body.recentAttendance).toHaveLength(2);
    expect(body.recentAttendance[0].date).toBeDefined();
    expect(body.recentAttendance[0].present).toBeDefined();
    expect(body.recentAttendance[0].total).toBeDefined();
    expect(body.pendingJoinRequests).toBe(2);
    expect(body.membersNeedingFollowup).toBe(4);
  });

  it('should return fellowship dashboard data for leader (200)', async () => {
    const selectMock = vi.fn()
      // 1st call: verify leader access (fellowshipMembers lookup)
      .mockReturnValueOnce(chain([{ memberId: 5 }]))
      // 2nd call: groupMemberCount
      .mockReturnValueOnce(chain([{ count: 8 }]))
      // 3rd call: recentAttendance
      .mockReturnValueOnce(chain([
        { serviceId: 10, serviceDate: '2026-03-01', presentCount: 6, totalCount: 8 },
      ]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { fellowshipId: '7' },
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.groupMemberCount).toBe(8);
    expect(body.recentAttendance).toHaveLength(1);
    expect(body.recentAttendance[0].date).toBeDefined();
    expect(body.recentAttendance[0].present).toBeDefined();
    expect(body.recentAttendance[0].total).toBeDefined();
  });

  it('should return 403 when leader tries to view another department', async () => {
    // Leader is member 5, but department lead is member 99
    const selectMock = vi.fn()
      .mockReturnValueOnce(chain([{ leadMemberId: 99 }]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { departmentId: '3' },
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });

  it('should return 403 when leader tries to view another fellowship', async () => {
    // Leader is member 5, but not a member of fellowship 7
    const selectMock = vi.fn()
      .mockReturnValueOnce(chain([])); // no membership found

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { fellowshipId: '7' },
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });

  it('should allow admin to access leader dashboard for any department', async () => {
    const selectMock = vi.fn()
      // Admin skips leader check, goes straight to member count
      .mockReturnValueOnce(chain([{ count: 25 }]))
      // branchId lookup
      .mockReturnValueOnce(chain([{ branchId: 10 }]))
      // recentAttendance
      .mockReturnValueOnce(chain([]))
      // pendingJoinRequests
      .mockReturnValueOnce(chain([{ count: 0 }]))
      // membersNeedingFollowUp
      .mockReturnValueOnce(chain([{ count: 0 }]));

    mockGetDb.mockReturnValue({ select: selectMock });

    const event = createEvent(
      { departmentId: '99' },
      { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.groupMemberCount).toBe(25);
  });

  it('should return 400 when neither departmentId nor fellowshipId provided', async () => {
    const event = createEvent(
      undefined,
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 for regular members', async () => {
    const event = createEvent(
      { departmentId: '3' },
      { roles: ['Member'] }
    );
    const result = await leaderDashboardHandler(event);

    expect(result.statusCode).toBe(403);
  });
});
