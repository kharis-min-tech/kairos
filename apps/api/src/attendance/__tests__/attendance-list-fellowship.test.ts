// Unit tests for attendance-list-fellowship Lambda
// Tests attendance percentage calculation across multiple meetings
//
// **Validates: Req 11.7**

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
  fellowships: { fellowshipId: 'fellowship_id', branchId: 'branch_id', fellowshipName: 'fellowship_name' },
  fellowshipMeetings: { meetingId: 'meeting_id', fellowshipId: 'fellowship_id', meetingDate: 'meeting_date', meetingTitle: 'meeting_title', meetingTopic: 'meeting_topic', location: 'location' },
  fellowshipMeetingAttendance: { meetingId: 'meeting_id', memberId: 'member_id', attendanceStatus: 'attendance_status' },
  fellowshipMembers: { fellowshipId: 'fellowship_id', memberId: 'member_id', isActive: 'is_active' },
  members: { memberId: 'member_id', firstName: 'first_name', lastName: 'last_name' },
}));

import { handler } from '../attendance-list-fellowship';
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
    path: '/v1/attendance/fellowship',
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

describe('attendance-list-fellowship handler', () => {
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

  it('should return 400 when fellowshipId is missing', async () => {
    const event = createEvent();
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('should return fellowship meetings and member attendance percentages', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Fellowship lookup
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{
                  fellowshipId: 1,
                  branchId: 10,
                  fellowshipName: 'K-Group Alpha',
                }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Meetings list
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue([
                      { meetingId: 1, meetingDate: '2026-02-01', presentCount: 3, totalRecords: 5 },
                      { meetingId: 2, meetingDate: '2026-02-08', presentCount: 4, totalRecords: 5 },
                    ]),
                  }),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          // Total meeting count
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ count: 2 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          // Member attendance stats
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([
                  { memberId: 100, firstName: 'John', lastName: 'Doe', presentCount: 2 },
                  { memberId: 101, firstName: 'Jane', lastName: 'Smith', presentCount: 1 },
                ]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({ fellowshipId: '1' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    expect(body.fellowship.fellowshipName).toBe('K-Group Alpha');
    expect(body.meetings).toHaveLength(2);
    expect(body.memberAttendance).toHaveLength(2);

    // John: 2/2 = 100%
    const john = body.memberAttendance.find((m: { memberId: number }) => m.memberId === 100);
    expect(john.attendancePercentage).toBe(100);

    // Jane: 1/2 = 50%
    const jane = body.memberAttendance.find((m: { memberId: number }) => m.memberId === 101);
    expect(jane.attendancePercentage).toBe(50);
  });

  it('should return 0% attendance when no meetings exist', async () => {
    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{
                  fellowshipId: 1,
                  branchId: 10,
                  fellowshipName: 'K-Group Alpha',
                }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockReturnValue([]),
                  }),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 3) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue([{ count: 0 }]),
            }),
          };
        }
        if (selectCallCount === 4) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue([
                  { memberId: 100, firstName: 'John', lastName: 'Doe', presentCount: 0 },
                ]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({ fellowshipId: '1' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    const john = body.memberAttendance[0];
    expect(john.attendancePercentage).toBe(0);
  });
});
