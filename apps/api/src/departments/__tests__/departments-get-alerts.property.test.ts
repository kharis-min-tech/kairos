// Property-based tests for follow-up alerts
// Tests Follow-up Alert Threshold property
//
// **Validates: Req 8.4, 8.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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
// Smart Generators
// ============================================================================

const branchDeptIdArb = fc.integer({ min: 1, max: 10_000 });
const branchIdArb = fc.integer({ min: 1, max: 500 });
const memberIdArb = fc.integer({ min: 1, max: 10_000 });
const thresholdDaysArb = fc.integer({ min: 1, max: 90 });
const daysSinceFollowupArb = fc.integer({ min: 0, max: 365 });

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
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        const idx = selectCallIndex.value++;
        return Promise.resolve(selectResults[idx] || []);
      }),
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chainableSelect),
  };

  mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  return db;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property-Based Tests: Follow-up Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 16: Follow-up Alert Threshold
  // **Validates: Requirements 8.4, 8.5**
  // =========================================================================
  describe('Property 16: Follow-up Alert Threshold', () => {
    it('for any valid threshold, the response ALWAYS includes the configured threshold_days', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          branchIdArb,
          memberIdArb,
          thresholdDaysArb,
          async (branchDeptId, branchId, leadId, thresholdDays) => {
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
                [], // no overdue members
              ],
            });

            const event = createEvent({
              branch_department_id: String(branchDeptId),
              threshold_days: String(thresholdDays),
            });

            const result = await handler(event);
            expect(result.statusCode).toBe(200);

            const body = JSON.parse(result.body);
            // The response ALWAYS reflects the configured threshold
            expect(body.threshold_days).toBe(thresholdDays);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('for any overdue member, daysSinceFollowup ALWAYS >= threshold', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          branchIdArb,
          memberIdArb,
          memberIdArb,
          thresholdDaysArb,
          daysSinceFollowupArb.filter(d => d >= 1), // at least 1 day overdue
          async (branchDeptId, branchId, leadId, memberId, thresholdDays, daysSince) => {
            fc.pre(leadId !== memberId);
            // Ensure the member is actually overdue (daysSince > threshold)
            fc.pre(daysSince > thresholdDays);

            mockedResolveAuthContext.mockResolvedValue({
              memberId: leadId,
              branchId,
              roles: ['Leader', 'Member'],
              email: 'leader@kairos.church',
            });
            mockedIsAdmin.mockReturnValue(false);

            const lastFollowup = new Date();
            lastFollowup.setDate(lastFollowup.getDate() - daysSince);

            setupDb({
              select: [
                [{ branchDepartmentId: branchDeptId, branchId, leadMemberId: leadId, deputyMemberId: null, isActive: true }],
                [{
                  departmentMemberId: 1,
                  memberId,
                  joinDate: '2025-01-01',
                  lastFollowupAt: lastFollowup,
                  firstName: 'Test',
                  lastName: 'Member',
                  email: 'test@example.com',
                  phone: '+447000000000',
                }],
              ],
            });

            const event = createEvent({
              branch_department_id: String(branchDeptId),
              threshold_days: String(thresholdDays),
            });

            const result = await handler(event);
            expect(result.statusCode).toBe(200);

            const body = JSON.parse(result.body);
            // Every returned member ALWAYS has daysSinceFollowup >= threshold
            for (const alert of body.data) {
              expect(alert.daysSinceFollowup).toBeGreaterThanOrEqual(thresholdDays);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('when no threshold_days is specified, default of 7 days is ALWAYS used', () => {
      return fc.assert(
        fc.asyncProperty(
          branchDeptIdArb,
          branchIdArb,
          memberIdArb,
          async (branchDeptId, branchId, leadId) => {
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
                [],
              ],
            });

            const event = createEvent({
              branch_department_id: String(branchDeptId),
            });

            const result = await handler(event);
            expect(result.statusCode).toBe(200);

            const body = JSON.parse(result.body);
            // Default threshold ALWAYS 7 days
            expect(body.threshold_days).toBe(7);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
