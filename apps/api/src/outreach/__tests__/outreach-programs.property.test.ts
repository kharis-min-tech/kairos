// Property-based tests for outreach program Lambdas
// **Property 6: Duplicate Program Detection**
// **Validates: Requirements 1.4**
// **Property 7: Worker Registration Idempotence Guard**
// **Validates: Requirements 4.2, 4.4**
// **Property 11: Program Completion Updates Soul Count**
// **Validates: Requirements 5.3**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

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
    status: 'status',
    notes: 'notes',
  },
  members: {
    memberId: 'member_id',
    homeBranchId: 'home_branch_id',
  },
}));

import { handler as createProgramHandler } from '../outreach-create-program';
import { handler as registerWorkerHandler } from '../outreach-register-worker';
import { handler as completeProgramHandler } from '../outreach-complete-program';

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

function createEvent(
  body: Record<string, unknown>,
  pathParameters?: Record<string, string> | null
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/outreach/programs',
    pathParameters: pathParameters ?? null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: { member_id: '1', branch_id: '10', roles: '["Pastor"]' },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

// ============================================================================
// Property 6: Duplicate Program Detection
// **Validates: Requirements 1.4**
// ============================================================================
describe('Duplicate Program Detection (Property 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should reject with 409 Conflict when a program with the same (branch_id, program_name, program_date, location) already exists', async () => {
    const programNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);
    const locationArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        programNameArb,
        locationArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        async (memberId, branchId, programName, location, programDate) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            branch_id: branchId,
            program_name: programName,
            program_date: programDate,
            location,
          });

          // Mock db: duplicate exists
          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([{ outreachId: 'test-outreach-999' }]),
                }),
              }),
            }),
            insert: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            branch_id: branchId,
            program_name: programName,
            program_date: programDate.toISOString(),
            location,
          });

          const result = await createProgramHandler(event);
          expect(result.statusCode).toBe(409);
          expect(mockDb.insert).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should accept program creation when no duplicate exists', async () => {
    const programNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);
    const locationArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        programNameArb,
        locationArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        async (memberId, branchId, programName, location, programDate) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            branch_id: branchId,
            program_name: programName,
            program_date: programDate,
            location,
          });

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  // No duplicate found
                  limit: vi.fn().mockReturnValue([]),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    outreachId: 'test-outreach-1',
                    branchId,
                    programName,
                    programDate: programDate.toISOString().split('T')[0],
                    location,
                    isCompleted: false,
                    totalSoulsReached: 0,
                  },
                ]),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            branch_id: branchId,
            program_name: programName,
            program_date: programDate.toISOString(),
            location,
          });

          const result = await createProgramHandler(event);
          expect(result.statusCode).toBe(201);
          expect(mockDb.insert).toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// Property 7: Worker Registration Idempotence Guard
// **Validates: Requirements 4.2, 4.4**
// ============================================================================
describe('Worker Registration Idempotence Guard (Property 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject with 409 Conflict when a member is already registered for the program', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (memberId, branchId, outreachId) => {
          vi.clearAllMocks();

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
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
                // Program exists
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        { outreachId, branchId },
                      ]),
                    }),
                  }),
                };
              }
              if (selectCallCount === 2) {
                // Member exists with matching branch
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        { memberId, homeBranchId: branchId },
                      ]),
                    }),
                  }),
                };
              }
              // Duplicate registration found
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      { outreachId },
                    ]),
                  }),
                }),
              };
            }),
            insert: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            outreach_id: outreachId,
            member_id: memberId,
          });

          const result = await registerWorkerHandler(event);
          expect(result.statusCode).toBe(409);
          expect(mockDb.insert).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should accept registration when member is not already registered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (memberId, branchId, outreachId) => {
          vi.clearAllMocks();

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
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
                // Program exists
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        { outreachId, branchId },
                      ]),
                    }),
                  }),
                };
              }
              if (selectCallCount === 2) {
                // Member exists with matching branch
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        { memberId, homeBranchId: branchId },
                      ]),
                    }),
                  }),
                };
              }
              // No duplicate registration
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    outreachId,
                    memberId,
                    role: null,
                    notes: null,
                  },
                ]),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            outreach_id: outreachId,
            member_id: memberId,
          });

          const result = await registerWorkerHandler(event);
          expect(result.statusCode).toBe(201);
          expect(mockDb.insert).toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// Property 11: Program Completion Updates Soul Count
// **Validates: Requirements 5.3**
// ============================================================================
describe('Program Completion Updates Soul Count (Property 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
    mockedIsAdmin.mockReturnValue(false);
  });

  it('should set total_souls_reached to the actual count of soul records linked to the program', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 200 }),
        async (memberId, branchId, outreachId, actualSoulCount) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          let updatedValues: Record<string, unknown> | undefined;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Program exists and is not completed
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([
                        {
                          outreachId,
                          branchId,
                          isCompleted: false,
                        },
                      ]),
                    }),
                  }),
                };
              }
              // Soul count query
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue([
                    { count: actualSoulCount },
                  ]),
                }),
              };
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                updatedValues = vals;
                return {
                  where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([
                      {
                        outreachId,
                        branchId,
                        isCompleted: true,
                        totalSoulsReached: actualSoulCount,
                      },
                    ]),
                  }),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent(
            {},
            { outreachId: String(outreachId) }
          );

          const result = await completeProgramHandler(event);
          expect(result.statusCode).toBe(200);
          expect(updatedValues).toBeDefined();
          expect(updatedValues!.isCompleted).toBe(true);
          expect(updatedValues!.totalSoulsReached).toBe(actualSoulCount);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject with 400 Bad Request when program is already completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (memberId, branchId, outreachId) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});
          mockedIsAdmin.mockReturnValue(false);

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Pastor'],
            email: `pastor${memberId}@kairos.church`,
          });

          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue([
                    {
                      outreachId,
                      branchId,
                      isCompleted: true,
                    },
                  ]),
                }),
              }),
            }),
            update: vi.fn(),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent(
            {},
            { outreachId: String(outreachId) }
          );

          const result = await completeProgramHandler(event);
          expect(result.statusCode).toBe(400);
          expect(mockDb.update).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });
});
