// Unit tests and property-based tests for pastor assignment
// Tests: Assigning new pastor marks previous as not current
// Tests: Only one is_current=TRUE main pastor per branch at any time
// Property: Single Current Pastor Per Branch
// **Validates: Requirements 6.3, 6.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================
// Mocks
// ============================================================

// Track database state for property tests
let mockLeadershipRecords: Array<{
  leadershipId: number;
  branchId: number;
  memberId: number;
  role: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}> = [];
let nextLeadershipId = 1;

// Mock transaction that tracks state
const mockTxUpdate = vi.fn();
const mockTxInsert = vi.fn();

const createMockTx = () => {
  const txUpdateReturning = vi.fn().mockImplementation(() => {
    // No returning needed for update
    return Promise.resolve([]);
  });
  const txUpdateWhere = vi.fn().mockImplementation((whereClause) => {
    // Mark existing current pastors as not current
    mockLeadershipRecords = mockLeadershipRecords.map((r) => {
      if (r.role === 'Main Pastor' && r.isCurrent) {
        return { ...r, isCurrent: false, endDate: new Date().toISOString().split('T')[0]! };
      }
      return r;
    });
    return { returning: txUpdateReturning };
  });
  const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere });

  const txInsertReturning = vi.fn().mockImplementation(() => {
    const lastRecord = mockLeadershipRecords[mockLeadershipRecords.length - 1];
    return Promise.resolve([lastRecord]);
  });
  const txInsertValues = vi.fn().mockImplementation((values: Record<string, unknown>) => {
    const record = {
      leadershipId: nextLeadershipId++,
      branchId: values.branchId as number,
      memberId: values.memberId as number,
      role: values.role as string,
      startDate: (values.startDate as string) || new Date().toISOString().split('T')[0]!,
      endDate: null,
      isCurrent: values.isCurrent as boolean,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLeadershipRecords.push(record);
    return { returning: txInsertReturning };
  });

  return {
    update: vi.fn().mockReturnValue({
      set: txUpdateSet,
    }),
    insert: vi.fn().mockReturnValue({
      values: txInsertValues,
    }),
  };
};

// Mock getDb
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockTransaction = vi.fn().mockImplementation(async (callback: (tx: ReturnType<typeof createMockTx>) => Promise<unknown>) => {
  const tx = createMockTx();
  return callback(tx);
});

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual('@kairos/utils');
  return {
    ...actual,
    getDb: () => ({
      select: mockSelect,
      transaction: mockTransaction,
    }),
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
  branchLeadership: {
    leadershipId: 'leadership_id',
    branchId: 'branch_id',
    memberId: 'member_id',
    role: 'role',
    startDate: 'start_date',
    endDate: 'end_date',
    isCurrent: 'is_current',
  },
  members: { memberId: 'member_id', isActive: 'is_active' },
}));

import { handler } from '../branches-assign-pastor';

// ============================================================
// Helpers
// ============================================================

function createEvent(
  branchId: number,
  body: Record<string, unknown>,
  role: string = 'Admin'
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    pathParameters: { branchId: String(branchId) },
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: `/v1/branches/${branchId}/pastor`,
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
      httpMethod: 'POST',
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

// ============================================================
// Unit Tests
// ============================================================

describe('branches-assign-pastor handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeadershipRecords = [];
    nextLeadershipId = 1;
  });

  it('should return 403 when non-admin tries to assign pastor', async () => {
    const event = createEvent(1, { member_id: 10 }, 'Member');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should return 404 when branch does not exist', async () => {
    mockSelectLimit.mockResolvedValueOnce([]); // branch not found

    const event = createEvent(999, { member_id: 10 });
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  it('should return 400 when branch is inactive', async () => {
    mockSelectLimit.mockResolvedValueOnce([{ branchId: 1, isActive: false }]);

    const event = createEvent(1, { member_id: 10 });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('inactive');
  });

  it('should return 404 when member does not exist', async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ branchId: 1, isActive: true }]) // branch exists
      .mockResolvedValueOnce([]); // member not found

    const event = createEvent(1, { member_id: 999 });
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  it('should assign pastor and return 201 when valid', async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ branchId: 1, isActive: true }]) // branch exists
      .mockResolvedValueOnce([{ memberId: 10, isActive: true }]); // member exists

    const event = createEvent(1, { member_id: 10 });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(mockTransaction).toHaveBeenCalledTimes(1);

    const body = JSON.parse(result.body);
    expect(body.memberId).toBe(10);
    expect(body.role).toBe('Main Pastor');
    expect(body.isCurrent).toBe(true);
  });

  it('should mark previous pastor as not current when assigning new pastor', async () => {
    // Simulate existing pastor
    mockLeadershipRecords.push({
      leadershipId: 100,
      branchId: 1,
      memberId: 5,
      role: 'Main Pastor',
      startDate: '2024-01-01',
      endDate: null,
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockSelectLimit
      .mockResolvedValueOnce([{ branchId: 1, isActive: true }])
      .mockResolvedValueOnce([{ memberId: 10, isActive: true }]);

    const event = createEvent(1, { member_id: 10 });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);

    // Verify previous pastor was marked as not current
    const previousPastor = mockLeadershipRecords.find(
      (r) => r.memberId === 5 && r.role === 'Main Pastor'
    );
    expect(previousPastor?.isCurrent).toBe(false);
    expect(previousPastor?.endDate).toBeTruthy();

    // Verify new pastor is current
    const newPastor = mockLeadershipRecords.find(
      (r) => r.memberId === 10 && r.role === 'Main Pastor'
    );
    expect(newPastor?.isCurrent).toBe(true);
    expect(newPastor?.endDate).toBeNull();
  });

  it('should validate that member_id is required', async () => {
    const event = createEvent(1, {});
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });
});

// ============================================================
// Property-Based Tests
// ============================================================

describe('Property 12: Single Current Pastor Per Branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeadershipRecords = [];
    nextLeadershipId = 1;
  });

  it('should ensure only one current main pastor per branch after any sequence of assignments', async () => {
    // Feature: kairos-mvp, Property 12: Single Current Pastor Per Branch
    // **Validates: Requirements 6.3, 6.4**

    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of pastor assignments for a single branch
        fc.record({
          branchId: fc.integer({ min: 1, max: 5 }),
          pastorIds: fc.array(
            fc.integer({ min: 1, max: 100 }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ branchId, pastorIds }) => {
          // Reset state for each test run
          mockLeadershipRecords = [];
          nextLeadershipId = 1;

          // Assign each pastor in sequence
          for (const pastorId of pastorIds) {
            mockSelectLimit
              .mockResolvedValueOnce([{ branchId, isActive: true }])
              .mockResolvedValueOnce([{ memberId: pastorId, isActive: true }]);

            const event = createEvent(branchId, { member_id: pastorId });
            const result = await handler(event);
            expect(result.statusCode).toBe(201);
          }

          // PROPERTY: After all assignments, exactly one current main pastor
          const currentPastors = mockLeadershipRecords.filter(
            (r) =>
              r.branchId === branchId &&
              r.role === 'Main Pastor' &&
              r.isCurrent === true
          );

          expect(currentPastors.length).toBe(1);

          // The current pastor should be the last one assigned
          const lastPastorId = pastorIds[pastorIds.length - 1];
          expect(currentPastors[0]!.memberId).toBe(lastPastorId);

          // All previous pastors should have isCurrent=false and an endDate
          const previousPastors = mockLeadershipRecords.filter(
            (r) =>
              r.branchId === branchId &&
              r.role === 'Main Pastor' &&
              r.isCurrent === false
          );

          for (const prev of previousPastors) {
            expect(prev.endDate).toBeTruthy();
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});
