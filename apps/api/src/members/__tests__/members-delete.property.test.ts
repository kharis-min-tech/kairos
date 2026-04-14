// Property-based tests for the Members Delete Lambda handler
// Uses fast-check to verify soft delete preservation invariants
//
// **Validates: Requirements 3.8**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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
    memberId?: string;
    branchId?: string;
    roles?: string[];
  }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: authContext?.memberId ?? 'test-member-1',
    branchId: authContext?.branchId ?? 'test-branch-1',
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

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

const memberIdArb = fc.uuid();
const branchIdArb = fc.uuid();
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const emailArb = fc.emailAddress();

const activeMemberArb = fc.record({
  memberId: memberIdArb,
  firstName: nameArb,
  lastName: nameArb,
  email: emailArb,
  phone: fc.stringMatching(/^\+\d{10,15}$/),
  homeBranchId: branchIdArb,
  isActive: fc.constant(true),
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Members Delete (Soft Delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 8: Soft Delete Preservation
  // **Validates: Requirements 3.8**
  // =========================================================================
  describe('Property 8: Soft Delete Preservation', () => {
    it('soft delete ALWAYS sets is_active=false and NEVER deletes the record', async () => {
      await fc.assert(
        fc.asyncProperty(activeMemberArb, async (member) => {
          vi.clearAllMocks();

          // Setup select chain
          mockSelect.mockReturnValue({ from: mockFrom });
          mockFrom.mockReturnValue({ where: mockWhere });
          mockWhere.mockReturnValue({ limit: mockLimit });
          mockLimit.mockResolvedValue([member]);

          // Setup update chain and capture the set values
          let capturedSetValues: Record<string, unknown> = {};
          mockUpdate.mockReturnValue({ set: mockSet });
          mockSet.mockImplementation((vals: Record<string, unknown>) => {
            capturedSetValues = vals;
            return { where: mockUpdateWhere };
          });
          mockUpdateWhere.mockReturnValue({ returning: mockReturning });
          mockReturning.mockResolvedValue([{ ...member, isActive: false }]);

          const event = createEvent(String(member.memberId), {
            memberId: 'test-member-1',
            branchId: member.homeBranchId,
            roles: ['Admin', 'Member'],
          });
          const result = await handler(event);

          expect(result.statusCode).toBe(200);

          // PROPERTY: Only isActive is changed to false
          expect(capturedSetValues.isActive).toBe(false);
          expect(Object.keys(capturedSetValues)).toEqual(['isActive']);

          // PROPERTY: The member record is returned (preserved, not deleted)
          const body = JSON.parse(result.body);
          expect(body.member).toBeDefined();
          expect(body.member.memberId).toBe(member.memberId);
          expect(body.member.isActive).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('soft delete ALWAYS preserves all member data fields', async () => {
      await fc.assert(
        fc.asyncProperty(activeMemberArb, async (member) => {
          vi.clearAllMocks();

          mockSelect.mockReturnValue({ from: mockFrom });
          mockFrom.mockReturnValue({ where: mockWhere });
          mockWhere.mockReturnValue({ limit: mockLimit });
          mockLimit.mockResolvedValue([member]);

          mockUpdate.mockReturnValue({ set: mockSet });
          mockSet.mockReturnValue({ where: mockUpdateWhere });
          mockUpdateWhere.mockReturnValue({ returning: mockReturning });

          // The returned record should have all original fields except isActive
          const deactivatedMember = { ...member, isActive: false };
          mockReturning.mockResolvedValue([deactivatedMember]);

          const event = createEvent(String(member.memberId), {
            memberId: 'test-member-1',
            branchId: member.homeBranchId,
            roles: ['Admin', 'Member'],
          });
          const result = await handler(event);

          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);

          // PROPERTY: All original data fields are preserved
          expect(body.member.firstName).toBe(member.firstName);
          expect(body.member.lastName).toBe(member.lastName);
          expect(body.member.email).toBe(member.email);
          expect(body.member.phone).toBe(member.phone);
          expect(body.member.homeBranchId).toBe(member.homeBranchId);
        }),
        { numRuns: 50 }
      );
    });
  });
});
