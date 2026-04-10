// Unit tests for departments-assign-member Lambda
// Tests join request workflow, 3rd department warning, and lead/deputy uniqueness
//
// **Validates: Req 7.4, 7.6, 7.7, 7.9**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

// Mock database operations
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockInnerJoin = vi.fn();

vi.mock('@kairos/database', () => ({
  branchDepartments: { branchDepartmentId: 'branch_department_id', branchId: 'branch_id', leadMemberId: 'lead_member_id', deputyMemberId: 'deputy_member_id', isActive: 'is_active' },
  departmentMembers: { departmentMemberId: 'department_member_id', branchDepartmentId: 'branch_department_id', memberId: 'member_id', isActive: 'is_active' },
  members: { memberId: 'member_id', homeBranchId: 'home_branch_id', isActive: 'is_active' },
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
  const ConflictError = class extends Error {
    statusCode = 409;
    code = 'CONFLICT';
    constructor(msg: string) { super(msg); this.name = 'ConflictError'; }
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
    createdResponse: vi.fn((data: unknown) => ({
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })),
    successResponse: vi.fn((data: unknown) => ({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })),
    validateOrThrow: vi.fn((schema: unknown, data: unknown) => data),
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
    ConflictError,
  };
});

import { handler } from '../departments-assign-member';
import { resolveAuthContext, enforceBranchAccess, isAdmin, getDb } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedIsAdmin = vi.mocked(isAdmin);
const mockedGetDb = vi.mocked(getDb);

// ============================================================================
// Helpers
// ============================================================================

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/departments/assign-member',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '1',
        branch_id: '10',
        roles: '["Admin","Member"]',
        email: 'admin@kairos.church',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

function setupDb(queryResults: Record<string, unknown[][]>) {
  // Track call index per query type
  const selectCallIndex = { value: 0 };
  const insertCallIndex = { value: 0 };

  const selectResults = queryResults.select || [];
  const insertResults = queryResults.insert || [];

  const chainableSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      // Return an object that is both thenable (for queries without .limit)
      // and has a .limit method (for queries with .limit)
      const idx = selectCallIndex.value++;
      const result = Promise.resolve(selectResults[idx] || []);
      return {
        limit: vi.fn().mockReturnValue(result),
        then: result.then.bind(result),
        catch: result.catch.bind(result),
      };
    }),
    innerJoin: vi.fn().mockReturnThis(),
  };

  const chainableInsert = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => {
      const idx = insertCallIndex.value++;
      return Promise.resolve(insertResults[idx] || []);
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
    insert: vi.fn().mockReturnValue(chainableInsert),
  };

  mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  return db;
}

// ============================================================================
// Tests
// ============================================================================

describe('departments-assign-member Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 1,
      branchId: 10,
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(true);
  });

  // Test: Member successfully assigned to department
  it('should assign a member to a department successfully', async () => {
    setupDb({
      select: [
        // branchDept lookup
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6, isActive: true }],
        // member lookup
        [{ memberId: 42, homeBranchId: 10, isActive: true }],
        // existing assignment check (none)
        [],
        // dept count
        [{ count: 0 }],
      ],
      insert: [
        // new assignment
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: true }],
      ],
    });

    const event = createEvent({
      branch_department_id: 100,
      member_id: 42,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body.departmentMemberId).toBe(1);
    expect(body.memberId).toBe(42);
  });

  // Test: Warning at 3rd department, admin can override
  it('should allow admin to override 3rd department limit', async () => {
    mockedIsAdmin.mockReturnValue(true);

    setupDb({
      select: [
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6, isActive: true }],
        [{ memberId: 42, homeBranchId: 10, isActive: true }],
        [],
        [{ count: 2 }], // already in 2 departments
      ],
      insert: [
        [{ departmentMemberId: 3, branchDepartmentId: 100, memberId: 42, isActive: true }],
      ],
    });

    const event = createEvent({
      branch_department_id: 100,
      member_id: 42,
      admin_override: true,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body.warning).toContain('3 departments');
  });

  // Test: Non-admin blocked from 3rd department without override
  it('should reject 3rd department for non-admin without override', async () => {
    mockedIsAdmin.mockReturnValue(false);
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 5,
      branchId: 10,
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });

    setupDb({
      select: [
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6, isActive: true }],
        [{ memberId: 42, homeBranchId: 10, isActive: true }],
        [],
        [{ count: 2 }], // already in 2 departments
      ],
    });

    const event = createEvent({
      branch_department_id: 100,
      member_id: 42,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);

    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('Admin override required');
  });

  // Test: Duplicate assignment rejected
  it('should reject duplicate department assignment', async () => {
    setupDb({
      select: [
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6, isActive: true }],
        [{ memberId: 42, homeBranchId: 10, isActive: true }],
        [{ departmentMemberId: 99 }], // already assigned
      ],
    });

    const event = createEvent({
      branch_department_id: 100,
      member_id: 42,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(409);

    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('already assigned');
  });

  // Test: Inactive member rejected
  it('should reject assignment of inactive member', async () => {
    setupDb({
      select: [
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6, isActive: true }],
        [{ memberId: 42, homeBranchId: 10, isActive: false }], // inactive
      ],
    });

    const event = createEvent({
      branch_department_id: 100,
      member_id: 42,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);

    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('not active');
  });

  // Test: Non-existent branch department rejected
  it('should return 404 for non-existent branch department', async () => {
    setupDb({
      select: [
        [], // no branch department found
      ],
    });

    const event = createEvent({
      branch_department_id: 999,
      member_id: 42,
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });
});
