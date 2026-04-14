// Unit tests for attendance-get-trends Lambda
// Tests trend data for 8-week window and branch isolation
//
// **Validates: Req 12.1, 12.2**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    ForbiddenError: actual.ForbiddenError,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setContext: vi.fn(),
    }),
    getDb: vi.fn(),
  };
});

vi.mock('@kairos/database', () => ({
  services: { serviceId: 'service_id', branchId: 'branch_id', serviceDate: 'service_date', serviceType: 'service_type', serviceTitle: 'service_title' },
  serviceAttendance: { serviceId: 'service_id', memberId: 'member_id', attendanceStatus: 'attendance_status' },
  members: { memberId: 'member_id', homeBranchId: 'home_branch_id', isActive: 'is_active' },
}));

import { handler } from '../attendance-get-trends';
import { resolveAuthContext, getDb } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);

function createEvent(queryParams?: Record<string, string>, auth?: Partial<{ memberId: string; branchId: string; roles: string[] }>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/attendance/trends',
    pathParameters: null,
    queryStringParameters: queryParams || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: String(auth?.memberId ?? 1),
        branch_id: String(auth?.branchId ?? 10),
        roles: JSON.stringify(auth?.roles ?? ['Admin', 'Member']),
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('attendance-get-trends handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-1',
      branchId: 'test-branch-10',
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
  });

  it('should return trend data with attendance percentages', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Member count
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ count: 50 }]),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Trend data
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue([
                  { serviceId: 'test-service-1', serviceDate: '2026-01-04', serviceType: 'Sunday Service', presentCount: 40, virtualCount: 5, totalRecorded: 50 },
                  { serviceId: 'test-service-2', serviceDate: '2026-01-11', serviceType: 'Sunday Service', presentCount: 35, virtualCount: 3, totalRecorded: 45 },
                ]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.totalMembers).toBe(50);
    expect(body.trends).toHaveLength(2);
    expect(body.trends[0].attendancePercentage).toBe(80); // 40/50 = 80%
    expect(body.trends[1].attendancePercentage).toBe(70); // 35/50 = 70%
  });

  it('should enforce branch isolation for pastor', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Pastor', 'Member'],
      email: 'pastor@kairos.church',
    });

    const event = createEvent({ branchId: '20' });
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });

  it('should allow pastor to see their own branch trends', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Pastor', 'Member'],
      email: 'pastor@kairos.church',
    });

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ count: 20 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue([]),
            }),
          }),
        };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({ branchId: 'test-branch-10' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  it('should return 0% when no members in branch', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ count: 0 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue([
                { serviceId: 'test-service-1', serviceDate: '2026-01-04', serviceType: 'Sunday Service', presentCount: 0, virtualCount: 0, totalRecorded: 0 },
              ]),
            }),
          }),
        };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.trends[0].attendancePercentage).toBe(0);
  });
});
