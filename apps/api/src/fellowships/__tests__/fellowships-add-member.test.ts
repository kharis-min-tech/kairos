// Unit tests for the fellowships-add-member Lambda handler
// Tests the single fellowship membership constraint and add-member flow
//
// **Validates: Requirements 9.5, 9.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock @kairos/utils
vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>(
    '@kairos/utils'
  );
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

import { handler } from '../fellowships-add-member';
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedEnforceBranchAccess = vi.mocked(enforceBranchAccess);

/** Helper to create a minimal API Gateway proxy event */
function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/fellowships/members',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '1',
        branch_id: '1',
        roles: '["Admin","Member"]',
        email: 'admin@kairos.church',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

/** Creates a mock DB with chainable query methods */
function createMockDb() {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsertInto = vi.fn().mockReturnValue({ values: mockValues });

  const mockLimit = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    select: mockSelect,
    insert: mockInsertInto,
    mockFrom,
    mockWhere,
    mockLimit,
    mockValues,
    mockReturning,
  };
}

describe('fellowships-add-member handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 'test-member-1',
      branchId: 'test-branch-1',
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation(() => {});
  });

  it('should return 409 when member is already in another active fellowship', async () => {
    const mockDb = createMockDb();

    // First select: fellowship exists
    // Second select: member already in a fellowship
    let selectCallCount = 0;
    mockDb.mockLimit
      .mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Fellowship exists
          return [{ fellowshipId: 'test-fellowship-10', branchId: 'test-branch-1', isActive: true }];
        }
        // Member already in fellowship
        return [{ fellowshipMemberId: 'test-fm-99', fellowshipId: 'test-fellowship-5' }];
      });

    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_id: '00000000-0000-4000-8000-000000000010',
      member_id: '00000000-0000-4000-8000-000000000042',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('already belongs to a fellowship');
  });

  it('should return 201 when member is not in any fellowship', async () => {
    const mockDb = createMockDb();

    let selectCallCount = 0;
    mockDb.mockLimit
      .mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Fellowship exists
          return [{ fellowshipId: 'test-fellowship-10', branchId: 'test-branch-1', isActive: true }];
        }
        // No existing membership
        return [];
      });

    mockDb.mockReturning.mockResolvedValue([
      {
        fellowshipMemberId: 'test-fm-1',
        fellowshipId: 'test-fellowship-10',
        memberId: 'test-member-42',
        joinDate: '2025-01-01',
        isActive: true,
        notes: null,
      },
    ]);

    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_id: '00000000-0000-4000-8000-000000000010',
      member_id: '00000000-0000-4000-8000-000000000042',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.fellowshipId).toBe('test-fellowship-10');
    expect(body.memberId).toBe('test-member-42');
  });

  it('should return 404 when fellowship does not exist', async () => {
    const mockDb = createMockDb();

    mockDb.mockLimit.mockReturnValue([]);

    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_id: '00000000-0000-4000-8000-000000000999',
      member_id: '00000000-0000-4000-8000-000000000042',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 422 when required fields are missing', async () => {
    const event = createEvent({});

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });

  it('should return 422 when fellowship_id is not a positive integer', async () => {
    const event = createEvent({
      fellowship_id: -1,
      member_id: 42,
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });
});
