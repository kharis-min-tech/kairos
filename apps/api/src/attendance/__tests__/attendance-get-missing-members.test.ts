// Unit tests for attendance-get-missing-members Lambda
// Tests consecutive absence detection
//
// **Validates: Req 12.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
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
  services: { serviceId: 'service_id', branchId: 'branch_id', serviceDate: 'service_date' },
  serviceAttendance: { serviceId: 'service_id', memberId: 'member_id', attendanceStatus: 'attendance_status' },
  members: { memberId: 'member_id', firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone', homeBranchId: 'home_branch_id', isActive: 'is_active' },
}));

import { handler } from '../attendance-get-missing-members';
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);

function createEvent(queryParams?: Record<string, string>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/attendance/missing',
    pathParameters: null,
    queryStringParameters: queryParams || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '1',
        branch_id: '10',
        roles: '["Admin","Member"]',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('attendance-get-missing-members handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 1,
      branchId: 10,
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should return members missing exactly 4 consecutive services', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Recent services
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([
                    { serviceId: 4, serviceDate: '2026-02-08' },
                    { serviceId: 3, serviceDate: '2026-02-01' },
                    { serviceId: 2, serviceDate: '2026-01-25' },
                    { serviceId: 1, serviceDate: '2026-01-18' },
                  ]),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Missing members (not present in any of last 4 services)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([
                { memberId: 200, firstName: 'Missing', lastName: 'Member', email: 'missing@test.com', phone: '+447700900001', lastAttendanceDate: '2025-12-28' },
              ]),
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
    expect(body.missingMembers).toHaveLength(1);
    expect(body.missingMembers[0].memberId).toBe(200);
    expect(body.missingMembers[0].lastAttendanceDate).toBe('2025-12-28');
  });

  it('should return empty when fewer than threshold services exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue([
                { serviceId: 1, serviceDate: '2026-02-08' },
                { serviceId: 2, serviceDate: '2026-02-01' },
              ]),
            }),
          }),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.missingMembers).toHaveLength(0);
    expect(body.message).toContain('Fewer than');
  });

  it('should not flag members with intermittent attendance', async () => {
    // If a member attended at least one of the last 4 services, they should NOT be flagged
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([
                    { serviceId: 4, serviceDate: '2026-02-08' },
                    { serviceId: 3, serviceDate: '2026-02-01' },
                    { serviceId: 2, serviceDate: '2026-01-25' },
                    { serviceId: 1, serviceDate: '2026-01-18' },
                  ]),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // No missing members (all attended at least once)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([]),
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
    expect(body.missingMembers).toHaveLength(0);
  });
});
