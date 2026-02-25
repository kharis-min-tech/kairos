// Unit tests for souls-log-followup Lambda
// Tests follow-up date update after logging
//
// **Validates: Req 15.1-15.3, 15.7**

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
  souls: {
    soulId: 'soul_id',
    outreachId: 'outreach_id',
    updatedAt: 'updated_at',
  },
  followUps: {
    followUpId: 'follow_up_id',
    soulId: 'soul_id',
    memberId: 'member_id',
    followUpDate: 'follow_up_date',
    contactMethod: 'contact_method',
    contactStatus: 'contact_status',
    durationMinutes: 'duration_minutes',
    notes: 'notes',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
  },
}));

import { handler } from '../souls-log-followup';
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedEnforceBranchAccess = vi.mocked(enforceBranchAccess);

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/souls/followup',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '42',
        branch_id: '10',
        roles: '["Member"]',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('souls-log-followup handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 42,
      branchId: 10,
      roles: ['Member'],
      email: 'worker@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation(() => {});
  });

  it('should log follow-up and update soul updatedAt', async () => {
    const createdFollowUp = {
      followUpId: 1,
      soulId: 5,
      memberId: 42,
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
    };

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Soul lookup with branch
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([{ soulId: 5, outreachId: 1, branchId: 10 }]),
                }),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdFollowUp]),
        }),
      }),
      update: mockUpdate,
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      soul_id: 5,
      contact_date: '2026-02-10',
      contact_method: 'Phone Call',
      contact_status: 'Successful',
      notes: 'Good conversation',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);

    // Verify soul's updatedAt was updated
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should return 404 when soul does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      soul_id: 999,
      contact_date: '2026-02-10',
      contact_method: 'Phone Call',
      contact_status: 'Successful',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  it('should return 422 for invalid contact method', async () => {
    const event = createEvent({
      soul_id: 5,
      contact_date: '2026-02-10',
      contact_method: 'Carrier Pigeon',
      contact_status: 'Successful',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(422);
  });
});
