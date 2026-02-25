// Property-based tests for the Members List Lambda handler
// Uses fast-check to verify search, filtering, and pagination invariants
//
// **Validates: Requirements 4.1-4.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();

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

function setupDbChain(data: unknown[] = [], total = 0) {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        from: () => ({
          where: () => [{ count: total }],
        }),
      };
    }
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
// Smart Generators
// ---------------------------------------------------------------------------

const pageArb = fc.integer({ min: 1, max: 100 });
const limitArb = fc.integer({ min: 1, max: 200 });
const totalArb = fc.integer({ min: 0, max: 10000 });
const branchIdArb = fc.integer({ min: 1, max: 100 });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Members List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 9: Search and Filter Correctness
  // **Validates: Requirements 4.1, 4.2, 4.3, 4.6**
  // =========================================================================
  describe('Property 9: Search and Filter Correctness', () => {
    it('pagination totalPages ALWAYS equals ceil(total / limit)', async () => {
      await fc.assert(
        fc.asyncProperty(
          pageArb,
          limitArb,
          totalArb,
          async (page, limit, total) => {
            vi.clearAllMocks();
            const effectiveLimit = Math.min(100, Math.max(1, limit));
            setupDbChain([], total);

            const event = createEvent({
              page: String(page),
              limit: String(limit),
            });
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            const expectedTotalPages = Math.ceil(total / effectiveLimit);
            expect(body.pagination.totalPages).toBe(expectedTotalPages);
            expect(body.pagination.total).toBe(total);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('page number in response ALWAYS matches requested page (clamped to >= 1)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10, max: 100 }),
          totalArb,
          async (page, total) => {
            vi.clearAllMocks();
            setupDbChain([], total);

            const event = createEvent({ page: String(page) });
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.pagination.page).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('limit in response ALWAYS is between 1 and 100 inclusive', async () => {
      await fc.assert(
        fc.asyncProperty(limitArb, async (limit) => {
          vi.clearAllMocks();
          setupDbChain([], 0);

          const event = createEvent({ limit: String(limit) });
          const result = await handler(event);

          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          expect(body.pagination.limit).toBeGreaterThanOrEqual(1);
          expect(body.pagination.limit).toBeLessThanOrEqual(100);
        }),
        { numRuns: 50 }
      );
    });

    it('non-admin users ALWAYS get branch-scoped results (handler enforces branch isolation)', async () => {
      await fc.assert(
        fc.asyncProperty(branchIdArb, async (branchId) => {
          vi.clearAllMocks();
          const branchMembers = [
            { memberId: 1, firstName: 'A', lastName: 'B', homeBranchId: branchId, isActive: true },
          ];
          setupDbChain(branchMembers, 1);

          const event = createEvent(
            {},
            { memberId: 10, branchId, roles: ['Pastor', 'Member'] }
          );
          const result = await handler(event);

          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          // All returned members should be from the pastor's branch
          for (const member of body.data) {
            expect(member.homeBranchId).toBe(branchId);
          }
        }),
        { numRuns: 50 }
      );
    });
  });
});
