// Property-based tests for soul capture
// **Property 2: Soul Auto-Assignment to Capturing Member**
// **Validates: Requirements 6.4, 7.3**
// **Property 3: Soul Initial Status is New**
// **Validates: Requirements 6.5, 7.4**
// **Property 12: Ad-Hoc Soul Branch Derivation**
// **Validates: Requirements 7.5, 16.5**
// **Property 15: Duplicate Phone Warning Without Rejection**
// **Validates: Requirements 6.6**

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
  };
});

vi.mock('@kairos/database', () => ({
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
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
  },
}));

import { handler } from '../souls-capture';

import { resolveAuthContext, getDb, enforceBranchAccess, validateOrThrow } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedValidateOrThrow = vi.mocked(validateOrThrow);

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/souls',
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

// ============================================================================
// Property 2: Soul Auto-Assignment to Capturing Member
// **Validates: Requirements 6.4, 7.3**
// ============================================================================
describe('Soul Auto-Assignment to Capturing Member (Property 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should always assign soul to the capturing member for program-linked captures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 500 }),
        async (capturingMemberId, branchId, outreachId) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId: capturingMemberId,
            branchId,
            roles: ['Member'],
            email: `member${capturingMemberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: 'Test',
            last_name: 'Soul',
            phone: '+447700900001',
            outreach_id: outreachId,
          });

          let insertedValues: Record<string, unknown> | undefined;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([{ outreachId, branchId }]),
                    }),
                  }),
                };
              }
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    assignedMemberId: capturingMemberId,
                    status: 'New',
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: 'Test',
            last_name: 'Soul',
            phone: '+447700900001',
            outreach_id: outreachId,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();
          expect(insertedValues!.assignedMemberId).toBe(capturingMemberId);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should always assign soul to the capturing member for ad-hoc captures (no outreach_id)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (capturingMemberId, branchId, firstName, lastName) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId: capturingMemberId,
            branchId,
            roles: ['Member'],
            email: `member${capturingMemberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: firstName,
            last_name: lastName,
            // No outreach_id — ad-hoc capture
          });

          let insertedValues: Record<string, unknown> | undefined;

          const mockDb = {
            select: vi.fn(),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    firstName,
                    lastName,
                    assignedMemberId: capturingMemberId,
                    status: 'New',
                    outreachId: null,
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: firstName,
            last_name: lastName,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();
          expect(insertedValues!.assignedMemberId).toBe(capturingMemberId);
        }
      ),
      { numRuns: 30 }
    );
  });
});


// **Property 15: Duplicate Phone Warning Without Rejection**
// **Validates: Requirements 6.6**
describe('Duplicate Phone Warning Without Rejection (Property 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should create the soul record AND include a warning when phone matches an existing soul in the same outreach program', async () => {
    const phoneArb = fc
      .integer({ min: 1000000, max: 9999999999 })
      .map((n) => `+44${n.toString().padStart(10, '0')}`);

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 500 }),
        phoneArb,
        fc.integer({ min: 1, max: 9999 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (
          capturingMemberId,
          branchId,
          outreachId,
          duplicatePhone,
          existingSoulId,
          existingFirstName,
          existingLastName
        ) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId: capturingMemberId,
            branchId,
            roles: ['Member'],
            email: `member${capturingMemberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: 'New',
            last_name: 'Soul',
            phone: duplicatePhone,
            outreach_id: outreachId,
          });

          const newSoulId = existingSoulId + 1;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([{ outreachId, branchId }]),
                    }),
                  }),
                };
              }
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                      {
                        soulId: existingSoulId,
                        firstName: existingFirstName,
                        lastName: existingLastName,
                      },
                    ]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    soulId: newSoulId,
                    firstName: 'New',
                    lastName: 'Soul',
                    phone: duplicatePhone,
                    outreachId,
                    assignedMemberId: capturingMemberId,
                    status: 'New',
                  },
                ]),
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: 'New',
            last_name: 'Soul',
            phone: duplicatePhone,
            outreach_id: outreachId,
          });

          const result = await handler(event);
          const body = JSON.parse(result.body);

          // Property: status is 201 Created — NOT rejected (not 409 Conflict)
          expect(result.statusCode).toBe(201);

          // Property: the soul record was created (insert was called)
          expect(mockDb.insert).toHaveBeenCalled();

          // Property: response includes a duplicate warning
          expect(body.warning).toBeDefined();
          expect(typeof body.warning).toBe('string');
          expect(body.warning.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});


// ============================================================================
// Property 3: Soul Initial Status is New
// **Validates: Requirements 6.5, 7.4**
// ============================================================================
describe('Soul Initial Status is New (Property 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should always set status to "New" for program-linked captures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 500 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (memberId, branchId, outreachId, firstName, lastName) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: firstName,
            last_name: lastName,
            outreach_id: outreachId,
          });

          let insertedValues: Record<string, unknown> | undefined;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([{ outreachId, branchId }]),
                    }),
                  }),
                };
              }
              // No duplicate phone (no phone provided)
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    firstName,
                    lastName,
                    assignedMemberId: memberId,
                    status: 'New',
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: firstName,
            last_name: lastName,
            outreach_id: outreachId,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();
          expect(insertedValues!.status).toBe('New');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should always set status to "New" for ad-hoc captures (no outreach_id)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (memberId, branchId, firstName, lastName) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: firstName,
            last_name: lastName,
            // No outreach_id — ad-hoc capture
          });

          let insertedValues: Record<string, unknown> | undefined;

          const mockDb = {
            select: vi.fn(),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    firstName,
                    lastName,
                    assignedMemberId: memberId,
                    status: 'New',
                    outreachId: null,
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: firstName,
            last_name: lastName,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();
          expect(insertedValues!.status).toBe('New');
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ============================================================================
// Property 12: Ad-Hoc Soul Branch Derivation
// **Validates: Requirements 7.5, 16.5**
// ============================================================================
describe('Ad-Hoc Soul Branch Derivation (Property 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should set outreachId to null for ad-hoc captures, deriving branch from capturing member', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (memberId, branchId, firstName, lastName) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: firstName,
            last_name: lastName,
            // No outreach_id — ad-hoc capture
          });

          let insertedValues: Record<string, unknown> | undefined;

          const mockDb = {
            select: vi.fn(),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    firstName,
                    lastName,
                    assignedMemberId: memberId,
                    outreachId: null,
                    status: 'New',
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: firstName,
            last_name: lastName,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();

          // Property: outreachId is null for ad-hoc captures
          expect(insertedValues!.outreachId).toBeNull();

          // Property: assignedMemberId is set to the capturing member
          // (branch derivation happens via this member's home_branch_id)
          expect(insertedValues!.assignedMemberId).toBe(memberId);

          // Property: no program lookup was performed (no select calls needed)
          expect(mockDb.select).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should NOT set outreachId to null for program-linked captures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 500 }),
        async (memberId, branchId, outreachId) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId,
            branchId,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: 'Test',
            last_name: 'Soul',
            outreach_id: outreachId,
          });

          let insertedValues: Record<string, unknown> | undefined;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([{ outreachId, branchId }]),
                    }),
                  }),
                };
              }
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    assignedMemberId: memberId,
                    outreachId,
                    status: 'New',
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: 'Test',
            last_name: 'Soul',
            outreach_id: outreachId,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();

          // Property: outreachId is set to the provided program ID
          expect(insertedValues!.outreachId).toBe(outreachId);
        }
      ),
      { numRuns: 30 }
    );
  });
});
