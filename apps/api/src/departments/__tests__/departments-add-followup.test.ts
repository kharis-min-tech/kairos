// Unit tests for departments-add-followup Lambda
// Tests follow-up note visibility to all department leaders
//
// **Validates: Req 8.3, 8.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@kairos/database', () => ({
  branchDepartments: { branchDepartmentId: 'branch_department_id', branchId: 'branch_id', leadMemberId: 'lead_member_id', deputyMemberId: 'deputy_member_id' },
  departmentMembers: { departmentMemberId: 'department_member_id', branchDepartmentId: 'branch_department_id', memberId: 'member_id', isActive: 'is_active', updatedAt: 'updated_at' },
  members: { memberId: 'member_id', firstName: 'first_name', lastName: 'last_name' },
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
    createdResponse: vi.fn((data: unknown) => ({
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })),
    validateOrThrow: vi.fn((_schema: unknown, data: unknown) => data),
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

import { handler } from '../departments-add-followup';
import { resolveAuthContext, isAdmin, getDb } from '@kairos/utils';

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
    path: '/v1/departments/followup',
    pathParameters: null,
    queryStringParameters: null,
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

function setupDb(queryResults: { select: unknown[][]; update?: unknown[][] }) {
  const selectCallIndex = { value: 0 };
  const updateCallIndex = { value: 0 };

  const selectResults = queryResults.select;
  const updateResults = queryResults.update || [];

  const chainableSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      const idx = selectCallIndex.value++;
      return Promise.resolve(selectResults[idx] || []);
    }),
  };

  const chainableUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => {
      const idx = updateCallIndex.value++;
      return Promise.resolve(updateResults[idx] || []);
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
    update: vi.fn().mockReturnValue(chainableUpdate),
  };

  mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  return db;
}

// ============================================================================
// Tests
// ============================================================================

describe('departments-add-followup Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test: Department lead can add follow-up notes
  it('should allow department lead to add follow-up note', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 5, // lead member
      branchId: 10,
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    const now = new Date();
    setupDb({
      select: [
        // department member record
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: true }],
        // branch department
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6 }],
        // member info
        [{ firstName: 'John', lastName: 'Doe' }],
      ],
      update: [
        [{ departmentMemberId: 1, updatedAt: now }],
      ],
    });

    const event = createEvent({
      department_member_id: 1,
      notes: 'Called member, they are doing well.',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body.notes).toBe('Called member, they are doing well.');
    expect(body.member_name).toBe('John Doe');
    expect(body.added_by).toBe(5);
  });

  // Test: Deputy can also add follow-up notes (collaboration)
  it('should allow department deputy to add follow-up note', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 6, // deputy member
      branchId: 10,
      roles: ['Leader', 'Member'],
      email: 'deputy@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    const now = new Date();
    setupDb({
      select: [
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: true }],
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6 }],
        [{ firstName: 'Jane', lastName: 'Smith' }],
      ],
      update: [
        [{ departmentMemberId: 1, updatedAt: now }],
      ],
    });

    const event = createEvent({
      department_member_id: 1,
      notes: 'Deputy follow-up: member attended midweek service.',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body.added_by).toBe(6);
  });

  // Test: Admin can add follow-up notes
  it('should allow admin to add follow-up note', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 1,
      branchId: 10,
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(true);

    const now = new Date();
    setupDb({
      select: [
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: true }],
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6 }],
        [{ firstName: 'John', lastName: 'Doe' }],
      ],
      update: [
        [{ departmentMemberId: 1, updatedAt: now }],
      ],
    });

    const event = createEvent({
      department_member_id: 1,
      notes: 'Admin follow-up note.',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(201);
  });

  // Test: Non-leader, non-admin cannot add follow-up notes
  it('should reject follow-up from non-leader, non-admin member', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 99, // not a leader of this department
      branchId: 10,
      roles: ['Member'],
      email: 'member@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    setupDb({
      select: [
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: true }],
        [{ branchDepartmentId: 100, branchId: 10, leadMemberId: 5, deputyMemberId: 6 }],
      ],
    });

    const event = createEvent({
      department_member_id: 1,
      notes: 'Unauthorized follow-up attempt.',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(403);

    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('Only department leaders');
  });

  // Test: Cannot add follow-up for inactive department member
  it('should reject follow-up for inactive department member', async () => {
    mockedResolveAuthContext.mockResolvedValue({
      memberId: 5,
      branchId: 10,
      roles: ['Leader', 'Member'],
      email: 'leader@kairos.church',
    });
    mockedIsAdmin.mockReturnValue(false);

    setupDb({
      select: [
        [{ departmentMemberId: 1, branchDepartmentId: 100, memberId: 42, isActive: false }],
      ],
    });

    const event = createEvent({
      department_member_id: 1,
      notes: 'Follow-up for inactive member.',
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);

    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('inactive');
  });
});
