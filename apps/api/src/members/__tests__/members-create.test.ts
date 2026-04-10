// Unit tests for the Members Create Lambda handler
// Tests member creation, duplicate detection, validation, and branch authorization
//
// **Validates: Requirements 2.1, 2.5, 2.10**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
};

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => mockDb,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

vi.mock('@kairos/database', () => ({
  members: {
    memberId: 'member_id',
    email: 'email',
    phone: 'phone',
    isActive: 'is_active',
    firstName: 'first_name',
    lastName: 'last_name',
    homeBranchId: 'home_branch_id',
  },
}));

import { handler } from '../members-create';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(body: Record<string, unknown>, authContext?: {
  memberId?: number;
  branchId?: number;
  roles?: string[];
}): APIGatewayProxyEvent {
  const ctx = {
    memberId: authContext?.memberId ?? 1,
    branchId: authContext?.branchId ?? 1,
    roles: authContext?.roles ?? ['Admin', 'Member'],
  };

  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/members',
    pathParameters: null,
    queryStringParameters: null,
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
      httpMethod: 'POST',
      identity: {} as any,
      path: '/v1/members',
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: 'staging',
    },
  } as APIGatewayProxyEvent;
}

function setupDbChain() {
  // select chain: select().from().where().limit()
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue([]);

  // insert chain: insert().values().returning()
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
}

const validMemberInput = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+447700900001',
  home_branch_id: 1,
  gender: 'Male',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Members Create Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbChain();
  });

  // Test: Valid registration creates pending member
  it('should create a pending member with is_active=false for valid input', async () => {
    const createdMember = {
      memberId: 42,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+447700900001',
      homeBranchId: 1,
      isActive: false,
    };
    mockReturning.mockResolvedValue([createdMember]);

    const event = createEvent(validMemberInput);
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.isActive).toBe(false);
    expect(body.memberId).toBe(42);
  });

  // Test: Duplicate email among active members is rejected
  it('should reject duplicate email among active members with 409', async () => {
    // First select (email check) returns an existing member
    mockLimit.mockResolvedValueOnce([{ memberId: 99 }]);

    const event = createEvent(validMemberInput);
    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('email');
  });

  // Test: Duplicate phone among active members is rejected
  it('should reject duplicate phone among active members with 409', async () => {
    // First select (email check) returns empty
    mockLimit.mockResolvedValueOnce([]);
    // Second select (phone check) returns an existing member
    mockLimit.mockResolvedValueOnce([{ memberId: 88 }]);

    const event = createEvent(validMemberInput);
    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('phone');
  });

  // Test: Missing required fields returns 400/422
  it('should return 422 when first_name is missing', async () => {
    const { first_name: _, ...noFirstName } = validMemberInput;
    const event = createEvent(noFirstName);
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when last_name is missing', async () => {
    const { last_name: _, ...noLastName } = validMemberInput;
    const event = createEvent(noLastName);
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 422 when home_branch_id is missing', async () => {
    const { home_branch_id: _, ...noBranch } = validMemberInput;
    const event = createEvent(noBranch);
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // Test: Pastor cannot create member in another branch
  it('should return 403 when pastor tries to create member in another branch', async () => {
    const event = createEvent(
      { ...validMemberInput, home_branch_id: 99 },
      { memberId: 5, branchId: 1, roles: ['Pastor', 'Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });

  // Test: Admin can create member in any branch
  it('should allow admin to create member in any branch', async () => {
    const createdMember = {
      memberId: 50,
      firstName: 'Jane',
      lastName: 'Smith',
      homeBranchId: 99,
      isActive: false,
    };
    mockReturning.mockResolvedValue([createdMember]);

    const event = createEvent(
      { ...validMemberInput, home_branch_id: 99 },
      { memberId: 1, branchId: 1, roles: ['Admin', 'Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
  });
});
