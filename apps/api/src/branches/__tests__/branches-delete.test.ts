// Unit tests and property-based tests for branch deletion
// Test: Branch with active members cannot be deleted
// Test: Branch without active members soft-deleted successfully
// Property: Referential Integrity for Branch Deletion
// **Validates: Requirements 6.7**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================
// Mocks
// ============================================================

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

// Use call-counting approach for select chain to handle
// two sequential select queries (branch lookup with .limit, member count without .limit)
const mockGetDb = vi.fn();

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual('@kairos/utils');
  return {
    ...actual,
    getDb: () => mockGetDb(),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

vi.mock('@kairos/database', () => ({
  branches: { branchId: 'branch_id', isActive: 'is_active' },
  members: { homeBranchId: 'home_branch_id', isActive: 'is_active' },
}));

import { handler } from '../branches-delete';

// ============================================================
// Helpers
// ============================================================

function createEvent(
  branchId: number,
  role: string = 'Admin'
): APIGatewayProxyEvent {
  return {
    body: null,
    pathParameters: { branchId: String(branchId) },
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: `/v1/branches/${branchId}`,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {
        member_id: '1',
        branch_id: '1',
        roles: JSON.stringify([role]),
        email: 'admin@kairos.church',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'DELETE',
      identity: {} as never,
      path: '',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
  };
}

/**
 * Sets up the db mock with call-counting select chain.
 * selectResults: array of results for each sequential db.select() call.
 * Each entry is the resolved value for that query.
 * The handler calls:
 *   1st select: branch lookup → chains .from().where().limit(1)
 *   2nd select: member count  → chains .from().where() (NO .limit)
 */
function setupDb(selectResults: unknown[][], updateResult?: unknown[]) {
  const selectCallIndex = { value: 0 };

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
  };

  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainableSelect),
    update: mockUpdate,
  });

  if (updateResult) {
    mockUpdateReturning.mockResolvedValueOnce(updateResult);
  }
}

// ============================================================
// Unit Tests
// ============================================================

describe('branches-delete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 when non-admin tries to delete branch', async () => {
    const event = createEvent(1, 'Member');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when branch does not exist', async () => {
    setupDb([
      [], // branch not found
    ]);

    const event = createEvent(999);
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 when branch is already inactive', async () => {
    setupDb([
      [{ branchId: 1, isActive: false }], // branch exists but inactive
    ]);

    const event = createEvent(1);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('already inactive');
  });

  it('should return 400 when branch has active members', async () => {
    setupDb([
      [{ branchId: 1, isActive: true }], // branch exists
      [{ count: 5 }],                     // 5 active members
    ]);

    const event = createEvent(1);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('active member');
    expect(body.error.message).toContain('5');
  });

  it('should soft-delete branch when no active members', async () => {
    setupDb(
      [
        [{ branchId: 1, isActive: true }], // branch exists
        [{ count: 0 }],                     // no active members
      ],
      [{ branchId: 1, isActive: false }]    // update result
    );

    const event = createEvent(1);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('deactivated');
    expect(body.branch.isActive).toBe(false);
  });
});

// ============================================================
// Property-Based Tests
// ============================================================

describe('Property 13: Referential Integrity for Branch Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent deletion of any branch that has active members', async () => {
    // Feature: kairos-mvp, Property 13: Referential Integrity for Branch Deletion
    // **Validates: Requirements 6.7**

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          branchId: fc.integer({ min: 1, max: 100 }),
          activeMemberCount: fc.integer({ min: 1, max: 500 }),
        }),
        async ({ branchId, activeMemberCount }) => {
          vi.clearAllMocks();

          setupDb([
            [{ branchId, isActive: true }],
            [{ count: activeMemberCount }],
          ]);

          const event = createEvent(branchId);
          const result = await handler(event);

          // PROPERTY: Branch with active members must NOT be deleted
          expect(result.statusCode).toBe(400);
          const body = JSON.parse(result.body);
          expect(body.error.message).toContain('active member');

          // Verify update was NOT called (branch not soft-deleted)
          expect(mockUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should allow deletion of any branch that has zero active members', async () => {
    // Feature: kairos-mvp, Property 13: Referential Integrity for Branch Deletion
    // **Validates: Requirements 6.7**

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (branchId) => {
          vi.clearAllMocks();

          setupDb(
            [
              [{ branchId, isActive: true }],
              [{ count: 0 }],
            ],
            [{ branchId, isActive: false }]
          );

          const event = createEvent(branchId);
          const result = await handler(event);

          // PROPERTY: Branch with zero active members CAN be deleted
          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          expect(body.branch.isActive).toBe(false);
        }
      ),
      { numRuns: 25 }
    );
  });
});
