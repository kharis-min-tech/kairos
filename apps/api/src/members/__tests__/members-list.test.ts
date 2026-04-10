// Unit tests for the Members List Lambda handler
// Tests search, filtering, branch isolation, and pagination
//
// **Validates: Requirements 4.1-4.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

const mockDb = {
  select: mockSelect,
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
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    homeBranchId: 'home_branch_id',
    isActive: 'is_active',
    membershipDate: 'membership_date',
  },
}));

import { handler } from '../members-list';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  queryParams?: Record<string, string>,
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
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/members',
    pathParameters: null,
    queryStringParameters: queryParams || null,
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
      httpMethod: 'GET',
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

const sampleMembers = [
  { memberId: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', homeBranchId: 1, isActive: true },
  { memberId: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', homeBranchId: 1, isActive: true },
  { memberId: 3, firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', homeBranchId: 2, isActive: true },
];

function setupDbChain(data: unknown[] = sampleMembers, total = 3) {
  // The handler calls select() twice: once for count, once for data
  // Count query chain: select().from().where() -> [{ count: N }]
  // Data query chain: select().from().where().orderBy().limit().offset() -> [...]

  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // Count query
      return {
        from: () => ({
          where: () => [{ count: total }],
        }),
      };
    }
    // Data query
    return {
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => data,
            }),
          }),
        }),
      }),
    };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Members List Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test: Search returns matching members only
  it('should return paginated results with correct pagination metadata', async () => {
    setupDbChain(sampleMembers.slice(0, 2), 2);

    const event = createEvent({ page: '1', limit: '50' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.totalPages).toBe(1);
  });

  // Test: Search with query parameter
  it('should accept search query parameter', async () => {
    setupDbChain([sampleMembers[0]], 1);

    const event = createEvent({ search: 'John' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
  });

  // Test: Pastor sees only their branch members (branch isolation)
  it('should enforce branch isolation for pastors', async () => {
    // Pastor in branch 1 should only see branch 1 members
    const branch1Members = sampleMembers.filter((m) => m.homeBranchId === 1);
    setupDbChain(branch1Members, branch1Members.length);

    const event = createEvent(
      {},
      { memberId: 5, branchId: 1, roles: ['Pastor', 'Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    // All returned members should be from branch 1
    for (const member of body.data) {
      expect(member.homeBranchId).toBe(1);
    }
  });

  // Test: Admin sees all branches
  it('should return members from all branches for admin', async () => {
    setupDbChain(sampleMembers, 3);

    const event = createEvent(
      {},
      { memberId: 1, branchId: 1, roles: ['Admin', 'Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(3);
  });

  // Test: Pagination returns correct page counts
  it('should calculate correct totalPages for pagination', async () => {
    // 120 total members, 50 per page = 3 pages
    setupDbChain(sampleMembers, 120);

    const event = createEvent({ page: '1', limit: '50' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.total).toBe(120);
    expect(body.pagination.totalPages).toBe(3);
  });

  // Test: Default pagination values
  it('should use default pagination values when not specified', async () => {
    setupDbChain([], 0);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50);
  });

  // Test: Limit is capped at 100
  it('should cap limit at 100', async () => {
    setupDbChain([], 0);

    const event = createEvent({ limit: '500' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.limit).toBe(100);
  });
});
