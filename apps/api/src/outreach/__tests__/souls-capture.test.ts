// Unit tests for souls-capture Lambda
// Tests automatic assignment, initial status, duplicate phone warning
//
// **Validates: Req 14.1-14.8**

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
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    gender: 'gender',
    ageRange: 'age_range',
    assignedMemberId: 'assigned_member_id',
    status: 'status',
    notes: 'notes',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
  },
}));

import { handler } from '../souls-capture';
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
    path: '/v1/souls',
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

describe('souls-capture handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 42,
      branchId: 10,
      roles: ['Member'],
      email: 'worker@kairos.church',
    });
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should automatically assign soul to capturing member', async () => {
    const createdSoul = {
      soulId: 1,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+447700900001',
      assignedMemberId: 42,
      status: 'New',
      outreachId: 1,
    };

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Program lookup
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ outreachId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Duplicate phone check — no duplicate
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSoul]),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      first_name: 'John',
      last_name: 'Doe',
      phone: '+447700900001',
      outreach_id: 1,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);

    // Soul should be assigned to the capturing member (42)
    expect(body.assignedMemberId).toBe(42);
  });

  it('should set initial status to "New"', async () => {
    const createdSoul = {
      soulId: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'New',
      assignedMemberId: 42,
      outreachId: 1,
    };

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ outreachId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSoul]),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '+447700900002',
      outreach_id: 1,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.status).toBe('New');
  });

  it('should allow duplicate phone with warning', async () => {
    const createdSoul = {
      soulId: 3,
      firstName: 'Bob',
      lastName: 'Doe',
      phone: '+447700900001',
      assignedMemberId: 42,
      status: 'New',
      outreachId: 1,
    };

    let selectCallCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ outreachId: 1, branchId: 10 }]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Duplicate phone found
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue([{ soulId: 1, firstName: 'John', lastName: 'Doe' }]),
              }),
            }),
          };
        }
        return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue([]) };
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdSoul]),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      first_name: 'Bob',
      last_name: 'Doe',
      phone: '+447700900001',
      outreach_id: 1,
    });

    const result = await handler(event);
    // Should still succeed (201) but include a warning
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.warning).toBeDefined();
    expect(body.warning).toContain('already captured');
  });

  it('should return 404 when outreach program does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      first_name: 'Test',
      last_name: 'Soul',
      phone: '+447700900099',
      outreach_id: 999,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  it('should return 422 for missing required fields', async () => {
    const event = createEvent({
      first_name: 'Test',
      // missing last_name, phone, outreach_id
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(422);
  });
});
