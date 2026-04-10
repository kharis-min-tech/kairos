// Property-based tests for department assignment
// Tests Department Join Request Workflow and Lead/Deputy Uniqueness
//
// **Validates: Req 7.4, 7.6, 7.7, 7.9**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

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
    ConflictError,
  };
});

import { handler } from '../departments-assign-member';
import { resolveAuthContext, isAdmin, getDb } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedIsAdmin = vi.mocked(isAdmin);
const mockedGetDb = vi.mocked(getDb);

// ============================================================================
// Smart Generators
// ============================================================================

const memberIdArb = fc.integer({ min: 1, max: 10_000 });
const branchIdArb = fc.integer({ min: 1, max: 500 });
const branchDeptIdArb = fc.integer({ min: 1, max: 10_000 });
const deptCountArb = fc.integer({ min: 0, max: 10 });

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

function setupDb(queryResults: { select: unknown[][]; insert?: unknown[][] }) {
  const selectCallIndex = { value: 0 };
  const insertCallIndex = { value: 0 };

  const selectResults = queryResults.select;
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
// Property Tests
// ============================================================================

describe('Property-Based Tests: Department Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 14: Department Join Request Workflow
  // **Validates: Requirements 7.4, 7.6, 7.7**
  // =========================================================================
  describe('Property 14: Department Join Request Workflow', () => {
    it('for any member already in 2+ departments, non-admin assignment ALWAYS fails without override', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          memberIdArb,
          branchIdArb,
          memberIdArb,
          memberIdArb,
          deptCountArb.filter(c => c >= 2),
          async (branchDeptId, memberId, branchId, leadId, deputyId, currentDeptCount) => {
            // Ensure lead, deputy, and member are all different
            fc.pre(memberId !== leadId && memberId !== deputyId && leadId !== deputyId);

            mockedResolveAuthContext.mockResolvedValue({
              memberId: leadId,
              branchId,
              roles: ['Leader', 'Member'],
              email: 'leader@kairos.church',
            });
            mockedIsAdmin.mockReturnValue(false);

            setupDb({
              select: [
                [{ branchDepartmentId: branchDeptId, branchId, leadMemberId: leadId, deputyMemberId: deputyId, isActive: true }],
                [{ memberId, homeBranchId: branchId, isActive: true }],
                [], // no existing assignment
                [{ count: currentDeptCount }],
              ],
            });

            const event = createEvent({
              branch_department_id: branchDeptId,
              member_id: memberId,
              admin_override: false,
            });

            const result = await handler(event);

            // Non-admin with 2+ departments and no override ALWAYS gets 400
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error.message).toContain('Admin override required');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('for any member already in 2+ departments, admin assignment ALWAYS succeeds with warning', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          memberIdArb,
          branchIdArb,
          memberIdArb,
          memberIdArb,
          deptCountArb.filter(c => c >= 2),
          async (branchDeptId, memberId, branchId, leadId, deputyId, currentDeptCount) => {
            fc.pre(memberId !== leadId && memberId !== deputyId && leadId !== deputyId);

            mockedResolveAuthContext.mockResolvedValue({
              memberId: 1,
              branchId,
              roles: ['Admin', 'Member'],
              email: 'admin@kairos.church',
            });
            mockedIsAdmin.mockReturnValue(true);

            setupDb({
              select: [
                [{ branchDepartmentId: branchDeptId, branchId, leadMemberId: leadId, deputyMemberId: deputyId, isActive: true }],
                [{ memberId, homeBranchId: branchId, isActive: true }],
                [], // no existing assignment
                [{ count: currentDeptCount }],
              ],
              insert: [
                [{ departmentMemberId: 999, branchDepartmentId: branchDeptId, memberId, isActive: true }],
              ],
            });

            const event = createEvent({
              branch_department_id: branchDeptId,
              member_id: memberId,
            });

            const result = await handler(event);

            // Admin ALWAYS succeeds
            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            // ALWAYS has a warning about exceeding recommended max
            expect(body.warning).toBeDefined();
            expect(body.warning).toContain('departments');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('for any member in fewer than 2 departments, assignment ALWAYS succeeds without warning', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          memberIdArb,
          branchIdArb,
          memberIdArb,
          deptCountArb.filter(c => c < 2),
          async (branchDeptId, memberId, branchId, leadId, currentDeptCount) => {
            fc.pre(memberId !== leadId);

            mockedResolveAuthContext.mockResolvedValue({
              memberId: leadId,
              branchId,
              roles: ['Leader', 'Member'],
              email: 'leader@kairos.church',
            });
            mockedIsAdmin.mockReturnValue(false);

            setupDb({
              select: [
                [{ branchDepartmentId: branchDeptId, branchId, leadMemberId: leadId, deputyMemberId: null, isActive: true }],
                [{ memberId, homeBranchId: branchId, isActive: true }],
                [], // no existing assignment
                [{ count: currentDeptCount }],
              ],
              insert: [
                [{ departmentMemberId: 999, branchDepartmentId: branchDeptId, memberId, isActive: true }],
              ],
            });

            const event = createEvent({
              branch_department_id: branchDeptId,
              member_id: memberId,
            });

            const result = await handler(event);

            // ALWAYS succeeds without warning
            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.warning).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // =========================================================================
  // Property 15: Lead and Deputy Uniqueness
  // **Validates: Requirements 7.9**
  // =========================================================================
  describe('Property 15: Lead and Deputy Uniqueness', () => {
    it('the branchDepartmentCreateSchema ALWAYS rejects same lead and deputy', async () => {
      // This property is enforced at the schema level (branchDepartmentCreateSchema)
      // and at the database level (CHECK constraint). We test the schema validation.
      const { branchDepartmentCreateSchema } = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');

      return fc.assert(
        fc.property(
          memberIdArb,
          branchIdArb,
          fc.integer({ min: 1, max: 10_000 }),
          (memberId, branchId, departmentId) => {
            // When lead and deputy are the same member
            const result = branchDepartmentCreateSchema.safeParse({
              branch_id: branchId,
              department_id: departmentId,
              lead_member_id: memberId,
              deputy_member_id: memberId, // same as lead
            });

            // ALWAYS rejected
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('the branchDepartmentCreateSchema ALWAYS accepts different lead and deputy', async () => {
      const { branchDepartmentCreateSchema } = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');

      return fc.assert(
        fc.property(
          memberIdArb,
          memberIdArb,
          branchIdArb,
          fc.integer({ min: 1, max: 10_000 }),
          (leadId, deputyId, branchId, departmentId) => {
            // Ensure they are different
            fc.pre(leadId !== deputyId);

            const result = branchDepartmentCreateSchema.safeParse({
              branch_id: branchId,
              department_id: departmentId,
              lead_member_id: leadId,
              deputy_member_id: deputyId,
            });

            // ALWAYS accepted
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
