// Unit tests for attendance-record-service Lambda
// Tests duplicate prevention, branch isolation, bulk recording
//
// **Validates: Req 10.1-10.8**

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
  services: {
    serviceId: 'service_id',
    branchId: 'branch_id',
    serviceDate: 'service_date',
    serviceType: 'service_type',
    serviceTitle: 'service_title',
    preacherId: 'preacher_id',
    topic: 'topic',
    notes: 'notes',
    expectedAttendance: 'expected_attendance',
  },
  serviceAttendance: {
    serviceId: 'service_id',
    memberId: 'member_id',
    attendanceStatus: 'attendance_status',
    isFirstTimeVisitor: 'is_first_time_visitor',
    notes: 'notes',
    recordedBy: 'recorded_by',
  },
}));

import { handler } from '../attendance-record-service';
import { getAuthContext, getDb, enforceBranchAccess, ForbiddenError } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedEnforceBranchAccess = vi.mocked(enforceBranchAccess);

function createEvent(body: Record<string, unknown>, auth?: Partial<{ memberId: number; branchId: number; roles: string[] }>): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/attendance/service',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: String(ctx.memberId),
        branch_id: String(ctx.branchId),
        roles: JSON.stringify(ctx.roles),
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('attendance-record-service handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 1,
      branchId: 10,
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation(() => {});
  });

  it('should create a service and return 201', async () => {
    const createdService = {
      serviceId: 1,
      branchId: 10,
      serviceDate: new Date('2026-02-08'),
      serviceType: 'Sunday Service',
      serviceTitle: 'Morning Worship',
    };

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Duplicate check — no existing service
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdService]),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      branch_id: 10,
      service_date: '2026-02-08',
      service_type: 'Sunday Service',
      service_title: 'Morning Worship',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.serviceId).toBe(1);
  });

  it('should record bulk attendance for existing service', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Service lookup
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ serviceId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Existing attendance check — none
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([]),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { serviceId: 1, memberId: 100, attendanceStatus: 'Present' },
            { serviceId: 1, memberId: 101, attendanceStatus: 'Virtual' },
          ]),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      service_id: 1,
      records: [
        { member_id: 100, attendance_status: 'Present' },
        { member_id: 101, attendance_status: 'Virtual' },
      ],
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.recordsCreated).toBe(2);
  });

  it('should reject duplicate attendance for same member and service', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ serviceId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Existing attendance — member 100 already recorded
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ memberId: 100 }]),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      service_id: 1,
      records: [
        { member_id: 100, attendance_status: 'Present' },
      ],
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('already recorded');
  });

  it('should reject duplicate member_id within same request', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ serviceId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      service_id: 1,
      records: [
        { member_id: 100, attendance_status: 'Present' },
        { member_id: 100, attendance_status: 'Absent' },
      ],
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(409);
  });

  it('should enforce branch isolation for pastor', async () => {
    mockedGetAuthContext.mockReturnValue({
      memberId: 5,
      branchId: 10,
      roles: ['Pastor', 'Member'],
      email: 'pastor@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation((ctx, branchId) => {
      if (ctx.branchId !== branchId) {
        throw new ForbiddenError('Access denied');
      }
    });

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ serviceId: 1, branchId: 20 }]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      service_id: 1,
      records: [{ member_id: 100, attendance_status: 'Present' }],
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(403);
  });

  it('should return 409 for duplicate service', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([{ serviceId: 99 }]),
          }),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      branch_id: 10,
      service_date: '2026-02-08',
      service_type: 'Sunday Service',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(409);
  });

  it('should return 422 for invalid service type', async () => {
    const event = createEvent({
      branch_id: 10,
      service_date: '2026-02-08',
      service_type: 'Invalid Type',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(422);
  });
});
