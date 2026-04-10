// Property-based tests for branch isolation across all outreach endpoints
// **Property 1: Branch Isolation for Outreach Data**
// **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: actual.enforceBranchAccess,
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

vi.mock('@kairos/database', () => ({
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
    programName: 'program_name',
    programDate: 'program_date',
    location: 'location',
    address: 'address',
    city: 'city',
    description: 'description',
    coordinatorId: 'coordinator_id',
    totalSoulsReached: 'total_souls_reached',
    notes: 'notes',
    isCompleted: 'is_completed',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  outreachParticipants: {
    outreachId: 'outreach_id',
    memberId: 'member_id',
    role: 'role',
    notes: 'notes',
    createdAt: 'created_at',
  },
  souls: {
    soulId: 'soul_id',
    outreachId: 'outreach_id',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    gender: 'gender',
    ageRange: 'age_range',
    assignedMemberId: 'assigned_member_id',
    convertedToMemberId: 'converted_to_member_id',
    status: 'status',
    notes: 'notes',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    homeBranchId: 'home_branch_id',
  },
  followUps: {
    soulId: 'soul_id',
    followUpDate: 'follow_up_date',
    nextFollowUpDate: 'next_follow_up_date',
  },
}));

import { handler as listProgramsHandler } from '../outreach-list-programs';
import { handler as getProgramHandler } from '../outreach-get-program';
import { handler as completeProgramHandler } from '../outreach-complete-program';
import { handler as registerWorkerHandler } from '../outreach-register-worker';
import { handler as soulsCaptureHandler } from '../souls-capture';
import { handler as getAlertsHandler } from '../souls-get-alerts';

import {
  resolveAuthContext,
  getDb,
  validateOrThrow,
  isAdmin,
} from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedValidateOrThrow = vi.mocked(validateOrThrow);
const mockedIsAdmin = vi.mocked(isAdmin);

function createEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: overrides.body ?? null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: overrides.httpMethod ?? 'GET',
    isBase64Encoded: false,
    path: overrides.path ?? '/',
    pathParameters: overrides.pathParameters ?? null,
    queryStringParameters: overrides.queryStringParameters ?? null,
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

// ============================================================================
// Property 1: Branch Isolation for Outreach Data
// **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**
// ============================================================================

// ---------------------------------------------------------------------------
// 1a. GET /v1/outreach/programs — list programs returns only user's branch
// Validates: Requirements 16.1, 16.2
// ---------------------------------------------------------------------------
describe('Branch Isolation — List Programs (GET /v1/outreach/programs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should only return programs for the user\'s branch (non-admin)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 500 }),
        async (memberId, userBranchId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Mock DB: returns programs filtered by branch
          const branchPrograms = [
            {
              outreachId: 1,
              branchId: userBranchId,
              programName: 'Program A',
              coordinatorFirstName: null,
              coordinatorLastName: null,
            },
          ];

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Main data query
                return {
                  from: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                      where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockReturnValue({
                          limit: vi.fn().mockReturnValue({
                            offset: vi.fn().mockResolvedValue(branchPrograms),
                          }),
                        }),
                      }),
                    }),
                  }),
                };
              }
              // Count query
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 1 }]),
                }),
              };
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'GET',
            path: '/v1/outreach/programs',
          });

          const result = await listProgramsHandler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          // All returned programs belong to user's branch
          for (const program of body.data) {
            expect(program.branchId).toBe(userBranchId);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject non-admin requesting a different branch via query param', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        async (memberId, [userBranchId, otherBranchId]) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const event = createEvent({
            httpMethod: 'GET',
            path: '/v1/outreach/programs',
            queryStringParameters: { branchId: String(otherBranchId) },
          });

          const result = await listProgramsHandler(event);
          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1b. GET /v1/outreach/programs/{id} — 403 if different branch
// Validates: Requirements 16.1, 16.4
// ---------------------------------------------------------------------------
describe('Branch Isolation — Get Program Detail (GET /v1/outreach/programs/{id})', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should reject with 403 when non-admin accesses a program from a different branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        fc.integer({ min: 1, max: 500 }),
        async (memberId, [userBranchId, programBranchId], outreachId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Mock DB: program exists but belongs to a different branch
          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                      {
                        outreachId,
                        branchId: programBranchId,
                        programName: 'Other Branch Program',
                        isCompleted: false,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'GET',
            path: `/v1/outreach/programs/${outreachId}`,
            pathParameters: { outreachId: String(outreachId) },
          });

          const result = await getProgramHandler(event);
          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1c. PUT /v1/outreach/programs/{id}/complete — 403 if different branch
// Validates: Requirements 16.4
// ---------------------------------------------------------------------------
describe('Branch Isolation — Complete Program (PUT /v1/outreach/programs/{id}/complete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should reject with 403 when non-admin completes a program from a different branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        fc.integer({ min: 1, max: 500 }),
        async (memberId, [userBranchId, programBranchId], outreachId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Mock DB: program exists but belongs to a different branch
          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      outreachId,
                      branchId: programBranchId,
                      isCompleted: false,
                    },
                  ]),
                }),
              }),
            }),
            update: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'PUT',
            path: `/v1/outreach/programs/${outreachId}/complete`,
            pathParameters: { outreachId: String(outreachId) },
            body: JSON.stringify({}),
          });

          const result = await completeProgramHandler(event);
          expect(result.statusCode).toBe(403);
          expect(mockDb.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1d. POST /v1/outreach/programs/{id}/register-worker — 403 if different branch
// Validates: Requirements 16.4
// ---------------------------------------------------------------------------
describe('Branch Isolation — Register Worker (POST /v1/outreach/programs/{id}/register-worker)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should reject with 403 when member registers for a program in a different branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        fc.integer({ min: 1, max: 500 }),
        async (memberId, [memberBranchId, programBranchId], outreachId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: memberBranchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            outreach_id: outreachId,
            member_id: memberId,
          });

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Program exists but belongs to a different branch
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        { outreachId, branchId: programBranchId },
                      ]),
                    }),
                  }),
                };
              }
              // Member exists with their own branch (different from program)
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { memberId, homeBranchId: memberBranchId },
                    ]),
                  }),
                }),
              };
            }),
            insert: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'POST',
            path: `/v1/outreach/programs/${outreachId}/workers`,
            body: JSON.stringify({
              outreach_id: outreachId,
              member_id: memberId,
            }),
          });

          const result = await registerWorkerHandler(event);
          expect(result.statusCode).toBe(403);
          expect(mockDb.insert).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1e. POST /v1/souls — 403 when capturing soul with outreach_id from different branch
// Validates: Requirements 16.4, 16.5
// ---------------------------------------------------------------------------
describe('Branch Isolation — Soul Capture (POST /v1/souls)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should reject with 403 when capturing a soul for a program in a different branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        fc.integer({ min: 1, max: 500 }),
        async (memberId, [userBranchId, programBranchId], outreachId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: 'Test',
            last_name: 'Soul',
            outreach_id: outreachId,
          });

          // Mock DB: program exists but belongs to a different branch
          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([
                    { outreachId, branchId: programBranchId },
                  ]),
                }),
              }),
            }),
            insert: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'POST',
            path: '/v1/souls',
            body: JSON.stringify({
              first_name: 'Test',
              last_name: 'Soul',
              outreach_id: outreachId,
            }),
          });

          const result = await soulsCaptureHandler(event);
          expect(result.statusCode).toBe(403);
          expect(mockDb.insert).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// 1f. GET /v1/souls/alerts — alerts only show user's branch souls
// Validates: Requirements 16.1, 16.2
// ---------------------------------------------------------------------------
describe('Branch Isolation — Follow-Up Alerts (GET /v1/souls/alerts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should reject non-admin requesting alerts for a different branch', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        distinctBranchesArb,
        async (memberId, [userBranchId, otherBranchId]) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const event = createEvent({
            httpMethod: 'GET',
            path: '/v1/souls/alerts',
            queryStringParameters: { branchId: String(otherBranchId) },
          });

          const result = await getAlertsHandler(event);
          expect(result.statusCode).toBe(403);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return alerts filtered to user\'s branch when no branchId param', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 500 }),
        async (memberId, userBranchId) => {
          vi.clearAllMocks();
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId: userBranchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          // Subquery + main query mock
          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Subquery for latest follow-up
                return {
                  from: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      as: vi.fn().mockReturnValue({ _subquery: 'latest_fu' }),
                    }),
                  }),
                };
              }
              // Main query returns souls for user's branch
              return {
                from: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                      leftJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                      }),
                    }),
                  }),
                }),
              };
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            httpMethod: 'GET',
            path: '/v1/souls/alerts',
          });

          const result = await getAlertsHandler(event);
          const body = JSON.parse(result.body);

          expect(result.statusCode).toBe(200);
          // Response branchId matches user's branch
          expect(body.branchId).toBe(userBranchId);
        }
      ),
      { numRuns: 30 }
    );
  });
});
