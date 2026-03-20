// Property-based tests for souls-get-alerts Lambda
// **Property 8: Follow-Up Overdue Alert Correctness**
// **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    isAdmin: vi.fn().mockReturnValue(false),
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

vi.mock('@kairos/database', () => ({
  souls: {
    soulId: 'soul_id',
    outreachId: 'outreach_id',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    status: 'status',
    assignedMemberId: 'assigned_member_id',
    createdAt: 'created_at',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    homeBranchId: 'home_branch_id',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
    programName: 'program_name',
  },
  followUps: {
    soulId: 'soul_id',
    followUpDate: 'follow_up_date',
    nextFollowUpDate: 'next_follow_up_date',
  },
}));

import { handler } from '../souls-get-alerts';
import { resolveAuthContext, getDb, isAdmin } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedIsAdmin = vi.mocked(isAdmin);

function createEvent(
  queryStringParameters?: Record<string, string> | null
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/souls/alerts',
    pathParameters: null,
    queryStringParameters: queryStringParameters ?? null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: { member_id: '1', branch_id: '10', roles: '["Pastor"]' },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

/**
 * Creates a mock DB that handles the souls-get-alerts query chain:
 *   1. Subquery: db.select(...).from(followUps).groupBy(...).as('latest_fu')
 *   2. Main query: db.select(...).from(souls).leftJoin(...).leftJoin(...).leftJoin(...).where(...)
 *
 * The first db.select() call builds the subquery, the second builds the main query.
 */
function createMockDb(overdueRows: Record<string, unknown>[]) {
  const subqueryResult = { _subquery: 'latest_fu' };

  // Track which select call we're on
  let selectCallCount = 0;

  const mockDb = {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Subquery: db.select({...}).from(followUps).groupBy(followUps.soulId).as('latest_fu')
        return {
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              as: vi.fn().mockReturnValue(subqueryResult),
            }),
          }),
        };
      }
      // Main query: db.select({...}).from(souls).leftJoin(...).leftJoin(...).leftJoin(...).where(...)
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(overdueRows),
              }),
            }),
          }),
        }),
      };
    }),
  };
  return mockDb;
}

// Active statuses that should appear in alerts when overdue
const ACTIVE_STATUSES = ['New', 'Following Up', 'Interested'] as const;
// Terminal statuses that should never appear in alerts
const TERMINAL_STATUSES = ['Converted', 'Not Interested'] as const;

// ============================================================================
// Property 8: Follow-Up Overdue Alert Correctness
// **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
// ============================================================================
describe('Follow-Up Overdue Alert Correctness (Property 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should return overdue souls in active statuses when next_follow_up_date is in the past', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...ACTIVE_STATUSES),
        fc.integer({ min: 1, max: 30 }),
        async (memberId, branchId, activeStatus, daysOverdue) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const overdueRows = [
            {
              soulId: 1,
              firstName: 'John',
              lastName: 'Doe',
              phone: '+447700900001',
              status: activeStatus,
              assignedMemberId: memberId,
              assignedFirstName: 'Worker',
              assignedLastName: 'One',
              assignedEmail: 'worker@kairos.church',
              createdAt: new Date(),
              programName: 'Outreach Program',
              lastFollowUpDate: new Date(),
              nextFollowUpDate: new Date(Date.now() - daysOverdue * 86400000).toISOString().split('T')[0],
              daysSinceActivity: daysOverdue,
            },
          ];

          const mockDb = createMockDb(overdueRows);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.overdueSouls).toHaveLength(1);
          expect(body.overdueSouls[0].status).toBe(activeStatus);
          expect(body.overdueSouls[0].soulId).toBe(1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return overdue souls when no next_follow_up_date and days since last follow-up exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...ACTIVE_STATUSES),
        fc.integer({ min: 3, max: 30 }),
        async (memberId, branchId, activeStatus, daysSinceLastFollowUp) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const overdueRows = [
            {
              soulId: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              phone: '+447700900002',
              status: activeStatus,
              assignedMemberId: memberId,
              assignedFirstName: 'Worker',
              assignedLastName: 'Two',
              assignedEmail: 'worker2@kairos.church',
              createdAt: new Date(),
              programName: null,
              lastFollowUpDate: new Date(Date.now() - daysSinceLastFollowUp * 86400000),
              nextFollowUpDate: null,
              daysSinceActivity: daysSinceLastFollowUp,
            },
          ];

          const mockDb = createMockDb(overdueRows);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.overdueSouls).toHaveLength(1);
          expect(body.overdueSouls[0].status).toBe(activeStatus);
          expect(body.overdueSouls[0].programName).toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return overdue souls when no follow-ups exist and days since creation exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...ACTIVE_STATUSES),
        fc.integer({ min: 3, max: 60 }),
        async (memberId, branchId, activeStatus, daysSinceCreation) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const overdueRows = [
            {
              soulId: 3,
              firstName: 'New',
              lastName: 'Soul',
              phone: null,
              status: activeStatus,
              assignedMemberId: memberId,
              assignedFirstName: 'Worker',
              assignedLastName: 'Three',
              assignedEmail: 'worker3@kairos.church',
              createdAt: new Date(Date.now() - daysSinceCreation * 86400000),
              programName: 'Outreach Event',
              lastFollowUpDate: null,
              nextFollowUpDate: null,
              daysSinceActivity: daysSinceCreation,
            },
          ];

          const mockDb = createMockDb(overdueRows);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.overdueSouls).toHaveLength(1);
          expect(body.overdueSouls[0].daysSinceActivity).toBe(daysSinceCreation);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should never return souls in terminal statuses (Converted, Not Interested)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(...TERMINAL_STATUSES),
        async (memberId, branchId, terminalStatus) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // DB query filters terminal statuses — mock returns empty
          const mockDb = createMockDb([]);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.overdueSouls).toHaveLength(0);
          for (const soul of body.overdueSouls) {
            expect(TERMINAL_STATUSES).not.toContain(soul.status);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should use default threshold of 2 days when no thresholdDays param is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        async (memberId, branchId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const mockDb = createMockDb([]);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.thresholdDays).toBe(2);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should accept configurable thresholdDays parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 14 }),
        async (memberId, branchId, customThreshold) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const mockDb = createMockDb([]);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({ thresholdDays: String(customThreshold) });
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.thresholdDays).toBe(customThreshold);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should include assigned worker info in overdue soul response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (memberId, branchId, workerFirstName, workerLastName) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          const workerEmail = `worker${memberId}@kairos.church`;

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const overdueRows = [
            {
              soulId: 10,
              firstName: 'Soul',
              lastName: 'Name',
              phone: '+447700900010',
              status: 'New',
              assignedMemberId: memberId,
              assignedFirstName: workerFirstName,
              assignedLastName: workerLastName,
              assignedEmail: workerEmail,
              createdAt: new Date(),
              programName: 'Program',
              lastFollowUpDate: null,
              nextFollowUpDate: null,
              daysSinceActivity: 5,
            },
          ];

          const mockDb = createMockDb(overdueRows);
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent();
          const result = await handler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          expect(body.overdueSouls).toHaveLength(1);
          const soul = body.overdueSouls[0];
          expect(soul.assignedWorker).toBeDefined();
          expect(soul.assignedWorker.firstName).toBe(workerFirstName);
          expect(soul.assignedWorker.lastName).toBe(workerLastName);
          expect(soul.assignedWorker.email).toBe(workerEmail);
        }
      ),
      { numRuns: 30 }
    );
  });
});
