// Unit tests for souls-update-status Lambda
// Tests valid/invalid transitions and Converted requirements
//
// **Validates: Req 16.1-16.4, 16.6**

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
    status: 'status',
    convertedToMemberId: 'converted_to_member_id',
    updatedAt: 'updated_at',
    assignedMemberId: 'assigned_member_id',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
  },
  members: {
    memberId: 'member_id',
    homeBranchId: 'home_branch_id',
  },
}));

import { handler } from '../souls-update-status';
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedEnforceBranchAccess = vi.mocked(enforceBranchAccess);

function createEvent(soulId: string, body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'PUT',
    isBase64Encoded: false,
    path: `/v1/souls/${soulId}/status`,
    pathParameters: { soulId },
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

function setupDbWithSoul(currentStatus: string) {
  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          soulId: 1,
          status: 'updated',
        }]),
      }),
    }),
  });

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([{
              soulId: 1,
              status: currentStatus,
              outreachBranchId: 10,
              assignedMemberId: 1,
            }]),
          }),
        }),
      }),
    }),
    update: mockUpdate,
  };
  mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);
  return { mockDb, mockUpdate };
}

describe('souls-update-status handler', () => {
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

  it('should accept valid transition: New → Following Up', async () => {
    setupDbWithSoul('New');
    const event = createEvent('1', { status: 'Following Up' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('should accept valid transition: Following Up → Interested', async () => {
    setupDbWithSoul('Following Up');
    const event = createEvent('1', { status: 'Interested' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('should accept valid transition: Following Up → Not Interested', async () => {
    setupDbWithSoul('Following Up');
    const event = createEvent('1', { status: 'Not Interested' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('should accept valid transition: Interested → Converted with member_id', async () => {
    setupDbWithSoul('Interested');
    const event = createEvent('1', { status: 'Converted', converted_to_member_id: 100 });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });

  it('should reject invalid transition: New → Converted', async () => {
    setupDbWithSoul('New');
    const event = createEvent('1', { status: 'Converted', converted_to_member_id: 100 });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('Invalid status transition');
  });

  it('should reject invalid transition: New → Interested', async () => {
    setupDbWithSoul('New');
    const event = createEvent('1', { status: 'Interested' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('should reject Converted without converted_to_member_id', async () => {
    setupDbWithSoul('Interested');
    const event = createEvent('1', { status: 'Converted' });
    const result = await handler(event);
    // Validation error from schema refine
    expect(result.statusCode).toBe(422);
  });

  it('should reject transitions from terminal states', async () => {
    setupDbWithSoul('Converted');
    const event = createEvent('1', { status: 'Following Up' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('should return 404 for non-existent soul', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      }),
    };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent('999', { status: 'Following Up' });
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });
});
