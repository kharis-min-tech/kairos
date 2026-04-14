// Unit tests for departments-get-alerts Lambda
// Tests follow-up alert threshold logic
//
// **Validates: Req 8.4, 8.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@kairos/database', () => ({
  branchDepartments: { branchDepartmentId: 'branch_department_id', branchId: 'branch_id', leadMemberId: 'lead_member_id', deputyMemberId: 'deputy_member_id', isActive: 'is_active' },
  departmentMembers: { departmentMemberId: 'department_member_id', branchDepartmentId: 'branch_department_id', memberId: 'member_id', isActive: 'is_active', updatedAt: 'updated_at' },
  members: { memberId: 'member_id', firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone' },
}));

vi.mock('@kairos/utils', () => {
  const ForbiddenError = class extends Error {
    statusCode = 403;
    code = 'FORBIDDEN';
    constructor(msg: string) { super(msg); this.name = 'ForbiddenError'; }
    toResponse() { return { error: { code: this.code, message: this.message } }; }
  };
  const BadRequestError = class extends Error {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    constructor(msg: string) { super(msg); this.name = 'BadRequestError'; }
    toResponse() { return { error: { code: this.code, message: this.message } }; }
  };
  const NotFoundError = class extends Error {
    statusCode = 404;
    code = 'NOT_FOUND';
    constructor(resource: string, id?: string) {
      super(id ? `${resource} with ID '${id}' not found` : `${resource} not found`);
      this.name = 'NotFoundError';
    }
    toResponse() { return { error: { code: this.code, message: this.message } }; }
  };

  return {
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    isAdmin: vi.fn(),
    handleError: vi.fn((error: unknown) => {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const e = error as { statusCode: number; toResponse: () => unknown };
        return {
          statusCode: e.statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(e.toResponse()),
        };
      }
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }),
      };
    }),
    successResponse: vi.fn((data: unknown) => ({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    getDb: vi.fn(),
    ForbiddenError,
    BadRequestError,
    NotFoundError,
  };
});

import { handler } from '../departments-get-alerts';
import { resolveAuthContext, isAdmin, getDb } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedIsAdmin = vi.mocked(isAdmin);
const mockedGetDb = vi.mocked(getDb);

// ============================================================================
// Helpers
// ============================================================================

function createEvent(queryParams: Record<string, string>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/departments/alerts',
    pathParameters: null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '5',
        branch_id: '10',
        roles: '["Leader","Member"]',
        email: 'leader@kairos.church',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

function setupDb(queryResults: { select: unknown[][] }) {
  const selectCallIndex = { value: 0 };
  const selectResults = queryResults.select;

  const chainableSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      const idx = selectCallIndex.value++;
      return Promise.resolve(selectResults[idx] || []);
    }),
    innerJoin: vi.fn().mockReturnThis(),
  };

  // For the overdue members query (no .limit() call)
  chainableSelect.where.mockImplementation((..._args: unknown[]) => {
    // After the first select (branch dept lookup with limit), subsequent selects
    // that use innerJoin are the overdue members query
    return chainableSelect;
  });

  // Override innerJoin to return the overdue members directly
  chainableSelect.innerJoin.mockImplementation(() => {
    return {
      where: vi.fn().mockImplementation(() => {
        const idx = selectCallIndex.value++;
        return Promise.resolve(selectResults[idx] || []);
      }),
    };
  });

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
  };

  mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  return db;
}

// ============================================================================
// Tests
// ============================================================================

describe('departments-get-alerts Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test: Members past 7-day threshold appear in alerts
  it('should return members past the default 7-day threshold', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    setupDb({
      select: [
        // branch department lookup
        [{ branchDepartmentId: 'test-branch-dept-100', branchId: 'test-branch-10', leadMemberId: 'test-member-5', deputyMemberId: 'test-member-6', isActive: true }],
        // overdue members
        [
          {
            departmentMemberId: 'test-dept-member-1',
            memberId: 'test-member-42',
            joinDate: '2025-01-01',
            lastFollowupAt: tenDaysAgo,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+447123456789',
          },
        ],
      ],
    });

    const event = createEvent({
      branch_department_id: '100',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].memberName).toBe('John Doe');
    expect(body.data[0].daysSinceFollowup).toBeGreaterThanOrEqual(10);
    expect(body.threshold_days).toBe(7);
  });

  // Test: Custom threshold respected when configured
  it('should respect custom threshold_days parameter', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    setupDb({
      select: [
        [{ branchDepartmentId: 'test-branch-dept-100', branchId: 'test-branch-10', leadMemberId: 'test-member-5', deputyMemberId: 'test-member-6', isActive: true }],
        [], // no overdue members with 14-day threshold
      ],
    });

    const event = createEvent({
      branch_department_id: '100',
      threshold_days: '14',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.threshold_days).toBe(14);
    expect(body.total_alerts).toBe(0);
  });

  // Test: Missing branch_department_id returns 400
  it('should return 400 when branch_department_id is missing', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });

    const event = createEvent({});

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  // Test: Non-leader, non-admin cannot view alerts
  it('should reject alerts request from non-leader, non-admin', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-99',
      branchId: 'test-branch-10',
      roles: ['Member'],
      email: 'member@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    setupDb({
      select: [
        [{ branchDepartmentId: 'test-branch-dept-100', branchId: 'test-branch-10', leadMemberId: 'test-member-5', deputyMemberId: 'test-member-6', isActive: true }],
      ],
    });

    const event = createEvent({
      branch_department_id: '100',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(403);
  });

  // Test: Non-existent branch department returns 404
  it('should return 404 for non-existent branch department', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });

    setupDb({
      select: [
        [], // no branch department found
      ],
    });

    const event = createEvent({
      branch_department_id: '999',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });
});
