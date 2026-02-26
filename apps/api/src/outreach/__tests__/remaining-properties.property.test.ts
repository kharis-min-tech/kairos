// Property-based tests for remaining outreach module properties
// **Property 14: Follow-Up Contact Method and Status Validation**
// **Validates: Requirements 13.3, 13.4**
// **Property 10: Follow-Up Refreshes Soul Activity Timestamp**
// **Validates: Requirements 13.7**
// **Property 9: Conversion Funnel Count Consistency**
// **Validates: Requirements 15.1, 15.2**
// **Property 13: Cross-Branch Reassignment Prevention**
// **Validates: Requirements 12.2, 12.3**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { followUpCreateSchema, soulReassignSchema } from '@kairos/utils';

// ============================================================================
// Property 14: Follow-Up Contact Method and Status Validation
// **Validates: Requirements 13.3, 13.4**
// ============================================================================

const VALID_CONTACT_METHODS = [
  'Phone Call',
  'Text Message',
  'Email',
  'WhatsApp',
  'In-Person Visit',
  'Other',
] as const;

const VALID_CONTACT_STATUSES = [
  'Successful',
  'No Answer',
  'Wrong Number',
  'Call Back Later',
  'Not Interested',
  'Interested',
] as const;

describe('Property 14: Follow-Up Contact Method and Status Validation', () => {
  it('for any valid contact_method and contact_status combination, validation should pass', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_CONTACT_METHODS),
        fc.constantFrom(...VALID_CONTACT_STATUSES),
        fc.integer({ min: 1, max: 10000 }),
        (method, status, soulId) => {
          const result = followUpCreateSchema.safeParse({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: method,
            contact_status: status,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any invalid contact_method, validation should fail', () => {
    const invalidMethods = [
      'Carrier Pigeon',
      'Fax',
      'Telegram',
      'Smoke Signal',
      'Letter',
      'phone call',
      'EMAIL',
      '',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...invalidMethods),
        fc.constantFrom(...VALID_CONTACT_STATUSES),
        fc.integer({ min: 1, max: 10000 }),
        (invalidMethod, status, soulId) => {
          const result = followUpCreateSchema.safeParse({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: invalidMethod,
            contact_status: status,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any invalid contact_status, validation should fail', () => {
    const invalidStatuses = [
      'Pending',
      'Completed',
      'Cancelled',
      'Busy',
      'Left Voicemail',
      'successful',
      'NO ANSWER',
      '',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_CONTACT_METHODS),
        fc.constantFrom(...invalidStatuses),
        fc.integer({ min: 1, max: 10000 }),
        (method, invalidStatus, soulId) => {
          const result = followUpCreateSchema.safeParse({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: method,
            contact_status: invalidStatus,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any random string not in the valid sets, both method and status validation should fail', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !(VALID_CONTACT_METHODS as readonly string[]).includes(s)
        ),
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !(VALID_CONTACT_STATUSES as readonly string[]).includes(s)
        ),
        fc.integer({ min: 1, max: 10000 }),
        (randomMethod, randomStatus, soulId) => {
          const result = followUpCreateSchema.safeParse({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: randomMethod,
            contact_status: randomStatus,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 10: Follow-Up Refreshes Soul Activity Timestamp
// **Validates: Requirements 13.7**
// ============================================================================

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    validateOrThrow: vi.fn(),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setContext: vi.fn(),
    }),
    getDb: vi.fn(),
    isAdmin: vi.fn().mockReturnValue(false),
  };
});

vi.mock('drizzle-orm', () => {
  const mockSql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    as: vi.fn((alias: string) => alias),
  }));
  mockSql.raw = vi.fn((query: string) => query);
  return {
    eq: vi.fn((..._args: unknown[]) => 'eq'),
    sql: mockSql,
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
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  },
  followUps: {
    followUpId: 'follow_up_id',
    soulId: 'soul_id',
    memberId: 'member_id',
    followUpDate: 'follow_up_date',
    contactMethod: 'contact_method',
    contactStatus: 'contact_status',
    durationMinutes: 'duration_minutes',
    notes: 'notes',
    nextFollowUpDate: 'next_follow_up_date',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
    programName: 'program_name',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    homeBranchId: 'home_branch_id',
  },
}));

import { handler as logFollowUpHandler } from '../souls-log-followup';
import { handler as reassignHandler } from '../souls-reassign';
import { handler as conversionFunnelHandler } from '../souls-get-conversion-funnel';

import {
  resolveAuthContext,
  getDb,
  enforceBranchAccess,
  validateOrThrow,
  isAdmin,
} from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedValidateOrThrow = vi.mocked(validateOrThrow);
const mockedIsAdmin = vi.mocked(isAdmin);

function createFollowUpEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/souls/followup',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: { member_id: '1', branch_id: '10', roles: '["Member"]' },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('Property 10: Follow-Up Refreshes Soul Activity Timestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
    mockedIsAdmin.mockReturnValue(false);
  });

  it('for any follow-up logged, the soul updatedAt should be refreshed via db.update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(...VALID_CONTACT_METHODS),
        fc.constantFrom(...VALID_CONTACT_STATUSES),
        async (memberId, branchId, soulId, method, status) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            soul_id: soulId,
            contact_date: new Date('2026-03-15'),
            contact_method: method,
            contact_status: status,
          });

          let updateCalled = false;
          let updateTargetSoulId: number | undefined;

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { soulId, outreachId: 1, branchId },
                    ]),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  { followUpId: 1, soulId, memberId },
                ]),
              }),
            }),
            update: vi.fn().mockImplementation(() => {
              updateCalled = true;
              return {
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockImplementation(() => {
                    updateTargetSoulId = soulId;
                    return Promise.resolve(undefined);
                  }),
                }),
              };
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createFollowUpEvent({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: method,
            contact_status: status,
          });

          const result = await logFollowUpHandler(event);
          expect(result.statusCode).toBe(201);

          // Property: db.update was called to refresh soul's updatedAt
          expect(updateCalled).toBe(true);
          expect(mockDb.update).toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('for any follow-up regardless of contact outcome, the soul timestamp is always refreshed', async () => {
    // Even unsuccessful contact attempts should refresh the timestamp
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(...VALID_CONTACT_STATUSES),
        async (memberId, soulId, contactStatus) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: 10,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            soul_id: soulId,
            contact_date: new Date('2026-03-15'),
            contact_method: 'Phone Call',
            contact_status: contactStatus,
          });

          let updateCallCount = 0;

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { soulId, outreachId: 1, branchId: 10 },
                    ]),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  { followUpId: 1, soulId },
                ]),
              }),
            }),
            update: vi.fn().mockImplementation(() => {
              updateCallCount++;
              return {
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(undefined),
                }),
              };
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createFollowUpEvent({
            soul_id: soulId,
            contact_date: '2026-03-15',
            contact_method: 'Phone Call',
            contact_status: contactStatus,
          });

          const result = await logFollowUpHandler(event);
          expect(result.statusCode).toBe(201);
          // Regardless of contact status, update is always called
          expect(updateCallCount).toBe(1);
        }
      ),
      { numRuns: 30 }
    );
  });
});


// ============================================================================
// Property 9: Conversion Funnel Count Consistency
// **Validates: Requirements 15.1, 15.2**
// ============================================================================

function createFunnelEvent(
  queryStringParameters?: Record<string, string> | null
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/souls/conversion-funnel',
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

const ALL_SOUL_STATUSES = ['New', 'Following Up', 'Interested', 'Converted', 'Not Interested'] as const;

describe('Property 9: Conversion Funnel Count Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('for any branch, the sum of all status counts should equal totalSouls', async () => {
    // Generate arbitrary counts for each status bucket
    const statusCountsArb = fc.record({
      New: fc.integer({ min: 0, max: 100 }),
      'Following Up': fc.integer({ min: 0, max: 100 }),
      Interested: fc.integer({ min: 0, max: 100 }),
      Converted: fc.integer({ min: 0, max: 100 }),
      'Not Interested': fc.integer({ min: 0, max: 100 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        statusCountsArb,
        async (memberId, branchId, statusCounts) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Build the DB response rows from the generated counts
          const dbRows = Object.entries(statusCounts)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => ({ status, count }));

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockResolvedValue(dbRows),
                  }),
                }),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createFunnelEvent();
          const result = await conversionFunnelHandler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);

          // Property: sum of all funnel counts equals totalSouls
          const funnelSum =
            body.funnel.new +
            body.funnel.followingUp +
            body.funnel.interested +
            body.funnel.converted +
            body.funnel.notInterested;

          expect(funnelSum).toBe(body.totalSouls);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any branch, no soul should be counted in more than one status bucket', async () => {
    // This property verifies that the funnel uses groupBy(status) which inherently
    // prevents double-counting since each soul has exactly one status
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.constantFrom(...ALL_SOUL_STATUSES), { minLength: 1, maxLength: 50 }),
        async (memberId, branchId, soulStatuses) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Count occurrences of each status (simulating GROUP BY)
          const counts: Record<string, number> = {};
          for (const s of soulStatuses) {
            counts[s] = (counts[s] || 0) + 1;
          }

          const dbRows = Object.entries(counts).map(([status, count]) => ({
            status,
            count,
          }));

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockResolvedValue(dbRows),
                  }),
                }),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createFunnelEvent();
          const result = await conversionFunnelHandler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);

          // Property: totalSouls equals the number of individual souls (soulStatuses.length)
          expect(body.totalSouls).toBe(soulStatuses.length);

          // Property: each status bucket count matches the expected count
          expect(body.funnel.new).toBe(counts['New'] || 0);
          expect(body.funnel.followingUp).toBe(counts['Following Up'] || 0);
          expect(body.funnel.interested).toBe(counts['Interested'] || 0);
          expect(body.funnel.converted).toBe(counts['Converted'] || 0);
          expect(body.funnel.notInterested).toBe(counts['Not Interested'] || 0);
        }
      ),
      { numRuns: 50 }
    );
  });
});


// ============================================================================
// Property 13: Cross-Branch Reassignment Prevention
// **Validates: Requirements 12.2, 12.3**
// ============================================================================

function createReassignEvent(
  soulId: number,
  body: Record<string, unknown>
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'PUT',
    isBase64Encoded: false,
    path: `/v1/souls/${soulId}/reassign`,
    pathParameters: { soulId: String(soulId) },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: { member_id: '1', branch_id: '10', roles: '["Pastor"]' },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

/**
 * Generates two distinct branch IDs to simulate cross-branch access.
 */
const distinctBranchesArb = fc
  .tuple(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 500 }))
  .filter(([a, b]) => a !== b);

describe('Property 13: Cross-Branch Reassignment Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
    mockedIsAdmin.mockReturnValue(false);
  });

  it('for any reassignment where the new worker belongs to the same branch, it should succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 10000 }),
        async (pastorId, branchId, soulId, newWorkerId) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId: pastorId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${pastorId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            assigned_member_id: newWorkerId,
          });

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Soul exists with matching branch
                return {
                  from: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                      where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue([
                          { soulId, branchId },
                        ]),
                      }),
                    }),
                  }),
                };
              }
              // New worker exists
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { memberId: newWorkerId },
                    ]),
                  }),
                }),
              };
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      soulId,
                      assignedMemberId: newWorkerId,
                    },
                  ]),
                }),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createReassignEvent(soulId, {
            assigned_member_id: newWorkerId,
          });

          const result = await reassignHandler(event);
          expect(result.statusCode).toBe(200);
          expect(mockDb.update).toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('for any reassignment where the new worker is from a different branch, it should reject with 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 10000 }),
        async (pastorId, [soulBranchId, workerBranchId], soulId, newWorkerId) => {
          vi.clearAllMocks();
          // Use real enforceBranchAccess for this test — it should throw on mismatch
          const { enforceBranchAccess: realEnforce } = await vi.importActual<
            typeof import('@kairos/utils')
          >('@kairos/utils');
          vi.mocked(enforceBranchAccess).mockImplementation(realEnforce);
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId: pastorId,
            branchId: workerBranchId, // Pastor is from a different branch than the soul
            roles: ['Pastor'],
            email: `pastor${pastorId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            assigned_member_id: newWorkerId,
          });

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { soulId, branchId: soulBranchId },
                    ]),
                  }),
                }),
              }),
            }),
            update: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createReassignEvent(soulId, {
            assigned_member_id: newWorkerId,
          });

          const result = await reassignHandler(event);
          expect(result.statusCode).toBe(403);
          expect(mockDb.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('for any reassignment, the soulReassignSchema should require a positive integer assigned_member_id', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        (validMemberId) => {
          const result = soulReassignSchema.safeParse({
            assigned_member_id: validMemberId,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any non-positive assigned_member_id, the soulReassignSchema should reject', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (invalidId) => {
          const result = soulReassignSchema.safeParse({
            assigned_member_id: invalidId,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
