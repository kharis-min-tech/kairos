// Unit tests for the Members Delete Lambda handler
// Tests soft delete behavior, data preservation, and access control
//
// **Validates: Requirements 3.8**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
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

import { handler } from '../members-delete';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  memberId: string,
  authContext?: {
    memberId?: number;
    branchId?: number;
    roles?: string[];
  }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: authContext?.memberId ?? 1,
    branchId: authContext?.branchId ?? 1,
    roles: authContext?.roles ?? ['Admin', 'Member'],
  };

  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: `/v1/members/${memberId}`,
    pathParameters: { memberId },
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
      httpMethod: 'DELETE',
      identity: {} as any,
      path: `/v1/members/${memberId}`,
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: 'staging',
    },
  } as APIGatewayProxyEvent;
}

const activeMember = {
  memberId: 42,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+447700900001',
  homeBranchId: 1,
  isActive: true,
};

function setupDbChain(existingMember?: typeof activeMember | null) {
  // select chain: select().from().where().limit()
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue(existingMember ? [existingMember] : []);

  // update chain: update().set().where().returning()
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdateWhere.mockReturnValue({ returning: mockReturning });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Members Delete Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test: Deactivated member has is_active=FALSE
  it('should set is_active=false when soft-deleting a member', async () => {
    setupDbChain(activeMember);

    let capturedSetValues: Record<string, unknown> = {};
    mockSet.mockImplementation((vals: Record<string, unknown>) => {
      capturedSetValues = vals;
      return { where: mockUpdateWhere };
    });
    mockReturning.mockResolvedValue([{ ...activeMember, isActive: false }]);

    const event = createEvent('42');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    // Verify the update set isActive to false
    expect(capturedSetValues.isActive).toBe(false);
    const body = JSON.parse(result.body);
    expect(body.member.isActive).toBe(false);
  });

  // Test: Historical data preserved after deactivation
  // The handler only updates is_active, it does NOT delete the record or related data
  it('should preserve the member record (soft delete, not hard delete)', async () => {
    setupDbChain(activeMember);

    let capturedSetValues: Record<string, unknown> = {};
    mockSet.mockImplementation((vals: Record<string, unknown>) => {
      capturedSetValues = vals;
      return { where: mockUpdateWhere };
    });
    mockReturning.mockResolvedValue([{ ...activeMember, isActive: false }]);

    const event = createEvent('42');
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    // Only isActive should be changed — no other fields modified
    expect(Object.keys(capturedSetValues)).toEqual(['isActive']);
    expect(capturedSetValues.isActive).toBe(false);

    // The member record is returned (not deleted)
    const body = JSON.parse(result.body);
    expect(body.member.memberId).toBe(42);
    expect(body.member.firstName).toBe('John');
    expect(body.member.email).toBe('john@example.com');
  });

  // Test: Member not found returns 404
  it('should return 404 when member does not exist', async () => {
    setupDbChain(null);

    const event = createEvent('999');
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  // Test: Regular member cannot deactivate others
  it('should return 403 when regular member tries to deactivate', async () => {
    setupDbChain(activeMember);

    const event = createEvent('42', {
      memberId: 10,
      branchId: 1,
      roles: ['Member'],
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });

  // Test: Pastor can only deactivate members in their branch
  it('should return 403 when pastor tries to deactivate member in another branch', async () => {
    const otherBranchMember = { ...activeMember, homeBranchId: 2 };
    setupDbChain(otherBranchMember);

    const event = createEvent('42', {
      memberId: 5,
      branchId: 1,
      roles: ['Pastor', 'Member'],
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });

  // Test: Admin can deactivate any member
  it('should allow admin to deactivate member in any branch', async () => {
    const otherBranchMember = { ...activeMember, homeBranchId: 99 };
    setupDbChain(otherBranchMember);
    mockReturning.mockResolvedValue([{ ...otherBranchMember, isActive: false }]);

    const event = createEvent('42', {
      memberId: 1,
      branchId: 1,
      roles: ['Admin', 'Member'],
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  // Test: Invalid memberId returns 404
  it('should return 404 for invalid memberId path parameter', async () => {
    const event = createEvent('abc');
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });
});
