// Property-based tests for fellowship membership constraints
// Uses fast-check to verify the Single Fellowship Membership invariant
//
// **Validates: Requirements 9.5, 9.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a valid positive integer for IDs */
const memberIdArb = fc.integer({ min: 1, max: 100_000 });
const fellowshipIdArb = fc.integer({ min: 1, max: 10_000 });
const branchIdArb = fc.integer({ min: 1, max: 500 });

/** Generate a pair of distinct fellowship IDs */
const distinctFellowshipPairArb = fc
  .record({
    fellowship1Id: fellowshipIdArb,
    fellowship2Id: fellowshipIdArb,
  })
  .filter(({ fellowship1Id, fellowship2Id }) => fellowship1Id !== fellowship2Id);

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

describe('Property 18: Single Fellowship Membership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 1,
      branchId: 1,
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation(() => {});
  });

  // =========================================================================
  // Property: Member in one fellowship cannot join another
  // **Validates: Req 9.5, 9.6**
  // =========================================================================
  it('should ALWAYS reject adding a member who is already active in any fellowship', async () => {
    await fc.assert(
      fc.asyncProperty(
        memberIdArb,
        distinctFellowshipPairArb,
        branchIdArb,
        async (memberId, { fellowship1Id, fellowship2Id }, branchId) => {
          vi.clearAllMocks();
          mockedGetAuthContext.mockReturnValue({
            memberId: 1,
            branchId,
            roles: ['Admin', 'Member'],
            email: 'admin@kairos.church',
          });
          mockedEnforceBranchAccess.mockImplementation(() => {});

          // Simulate: fellowship2 exists, member already active in fellowship1
          let selectCallCount = 0;
          const mockLimit = vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // Fellowship exists
              return [{ fellowshipId: fellowship2Id, branchId, isActive: true }];
            }
            // Member already in fellowship1
            return [{ fellowshipMemberId: 99, fellowshipId: fellowship1Id }];
          });

          const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
          const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
          const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

          const mockDb = { select: mockSelect, insert: vi.fn() };
          mockedGetDb.mockReturnValue(
            mockDb as unknown as ReturnType<typeof getDb>
          );

          const event = createEvent({
            fellowship_id: fellowship2Id,
            member_id: memberId,
          });

          const result = await handler(event);
          const body = JSON.parse(result.body);

          // PROPERTY: Must ALWAYS be rejected with 409 Conflict
          expect(result.statusCode).toBe(409);
          expect(body.error.code).toBe('CONFLICT');
          expect(body.error.message).toContain(
            'already belongs to a fellowship'
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Property: Removing from fellowship allows joining a new one
  // **Validates: Req 9.5, 9.6**
  // =========================================================================
  it('should ALWAYS allow adding a member who has no active fellowship membership', async () => {
    await fc.assert(
      fc.asyncProperty(
        memberIdArb,
        fellowshipIdArb,
        branchIdArb,
        async (memberId, fellowshipId, branchId) => {
          vi.clearAllMocks();
          mockedGetAuthContext.mockReturnValue({
            memberId: 1,
            branchId,
            roles: ['Admin', 'Member'],
            email: 'admin@kairos.church',
          });
          mockedEnforceBranchAccess.mockImplementation(() => {});

          // Simulate: fellowship exists, member has NO active membership
          let selectCallCount = 0;
          const mockLimit = vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // Fellowship exists
              return [{ fellowshipId, branchId, isActive: true }];
            }
            // No existing membership (member was removed or never joined)
            return [];
          });

          const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
          const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
          const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

          const mockReturning = vi.fn().mockResolvedValue([
            {
              fellowshipMemberId: 1,
              fellowshipId,
              memberId,
              joinDate: '2025-01-01',
              isActive: true,
              notes: null,
            },
          ]);
          const mockValues = vi
            .fn()
            .mockReturnValue({ returning: mockReturning });
          const mockInsert = vi
            .fn()
            .mockReturnValue({ values: mockValues });

          const mockDb = { select: mockSelect, insert: mockInsert };
          mockedGetDb.mockReturnValue(
            mockDb as unknown as ReturnType<typeof getDb>
          );

          const event = createEvent({
            fellowship_id: fellowshipId,
            member_id: memberId,
          });

          const result = await handler(event);
          const body = JSON.parse(result.body);

          // PROPERTY: Must ALWAYS succeed with 201 Created
          expect(result.statusCode).toBe(201);
          expect(body.fellowshipId).toBe(fellowshipId);
          expect(body.memberId).toBe(memberId);
        }
      ),
      { numRuns: 50 }
    );
  });
});
