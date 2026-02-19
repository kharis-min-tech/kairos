// Property-based tests for attendance-record-service Lambda
// **Property: Duplicate Attendance Prevention**
// **Validates: Req 10.8**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
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
        member_id: '1',
        branch_id: '10',
        roles: '["Admin","Member"]',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

function setupMocks() {
  mockedGetAuthContext.mockReturnValue({
    memberId: 1,
    branchId: 10,
    roles: ['Admin', 'Member'],
    email: 'admin@kairos.church',
  });
  vi.mocked(enforceBranchAccess).mockImplementation(() => {});
}

describe('Duplicate Attendance Prevention (Property)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('should always reject requests with duplicate member_ids in the same batch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(fc.constantFrom('Present', 'Absent', 'Virtual'), { minLength: 2, maxLength: 5 }),
        async (memberId, statuses) => {
          vi.clearAllMocks();
          setupMocks();

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

          const records = statuses.map(s => ({
            member_id: memberId,
            attendance_status: s,
          }));

          const event = createEvent({ service_id: 1, records });
          const result = await handler(event);
          expect(result.statusCode).toBe(409);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should always accept requests with unique member_ids when no DB duplicates exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 5 }),
        async (memberIds) => {
          vi.clearAllMocks();
          setupMocks();

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
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue([]),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue(
                  memberIds.map(id => ({ serviceId: 1, memberId: id, attendanceStatus: 'Present' }))
                ),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const records = memberIds.map(id => ({
            member_id: id,
            attendance_status: 'Present',
          }));

          const event = createEvent({ service_id: 1, records });
          const result = await handler(event);
          expect(result.statusCode).toBe(201);
        }
      ),
      { numRuns: 20 }
    );
  });
});
