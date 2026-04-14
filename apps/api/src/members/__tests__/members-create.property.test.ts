// Property-based tests for the Members Create Lambda handler
// Uses fast-check to verify invariants across many random inputs
//
// **Validates: Requirements 2.1, 2.5, 2.10**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetDb = vi.fn();

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => mockGetDb(),
    validateOrThrow: vi.fn((_schema: unknown, data: unknown) => data),
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

import { handler } from '../members-create';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(body: Record<string, unknown>, authContext?: {
  memberId?: string;
  branchId?: string;
  roles?: string[];
}): APIGatewayProxyEvent {
  const ctx = {
    memberId: authContext?.memberId ?? 'test-member-1',
    branchId: authContext?.branchId ?? 'test-branch-1',
    roles: authContext?.roles ?? ['Admin', 'Member'],
  };

  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/members',
    pathParameters: null,
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
      httpMethod: 'POST',
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

function setupDbChain(opts?: { emailExists?: boolean; phoneExists?: boolean }) {
  const selectCallIndex = { value: 0 };

  // Build the select results array based on options
  const selectResults: unknown[][] = [];

  // Email check result
  if (opts?.emailExists) {
    selectResults.push([{ memberId: 'test-member-99' }]);
  } else {
    selectResults.push([]);
  }
  // Phone check result
  if (opts?.phoneExists) {
    selectResults.push([{ memberId: 'test-member-88' }]);
  } else {
    selectResults.push([]);
  }

  const chainableSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const idx = selectCallIndex.value++;
      const result = Promise.resolve(selectResults[idx] || []);
      return {
        limit: vi.fn().mockReturnValue(result),
        then: result.then.bind(result),
        catch: result.catch.bind(result),
      };
    }),
  };

  const mockReturning = vi.fn();
  const chainableInsert = {
    values: vi.fn().mockReturnValue({ returning: mockReturning }),
  };

  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainableSelect),
    insert: vi.fn().mockReturnValue(chainableInsert),
  });

  return { mockReturning };
}

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a non-empty trimmed string suitable for names */
const nameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Generate a valid email */
const emailArb = fc.emailAddress();

/** Generate a valid phone number (E.164-like) */
const phoneArb = fc.stringMatching(/^\+\d{10,15}$/);

/** Generate a valid branch ID */
const branchIdArb = fc.uuid();

/** Generate a valid gender */
const genderArb = fc.constantFrom('Male', 'Female');

/** Generate a valid member creation input */
const validMemberInputArb = fc.record({
  first_name: nameArb,
  last_name: nameArb,
  email: emailArb,
  phone: phoneArb,
  home_branch_id: branchIdArb,
  gender: genderArb,
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Members Create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property 5: Member Registration Approval Workflow
  // **Validates: Requirements 2.1, 2.5**
  // =========================================================================
  describe('Property 5: Member Registration Approval Workflow', () => {
    it('every newly created member ALWAYS has is_active=false (pending status)', async () => {
      await fc.assert(
        fc.asyncProperty(validMemberInputArb, async (input) => {
          vi.clearAllMocks();

          let capturedValues: Record<string, unknown> = {};
          const { mockReturning } = setupDbChain();

          const origValues = vi.fn().mockImplementation((vals: Record<string, unknown>) => {
            capturedValues = vals;
            return { returning: mockReturning };
          });

          // Override the insert chain to capture values
          mockGetDb.mockReturnValue({
            ...mockGetDb(),
            insert: vi.fn().mockReturnValue({ values: origValues }),
          });

          mockReturning.mockResolvedValue([{
            memberId: 'test-member-1',
            firstName: input.first_name,
            lastName: input.last_name,
            isActive: false,
            homeBranchId: input.home_branch_id,
          }]);

          const event = createEvent(input, {
            memberId: 'test-member-1',
            branchId: input.home_branch_id,
            roles: ['Admin', 'Member'],
          });
          const result = await handler(event);

          if (result.statusCode === 201) {
            // The inserted values must have isActive=false
            expect(capturedValues.isActive).toBe(false);
            const body = JSON.parse(result.body);
            expect(body.isActive).toBe(false);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  // =========================================================================
  // Property 6: Unique Email and Phone for Active Members
  // **Validates: Requirements 2.10**
  // =========================================================================
  describe('Property 6: Unique Email and Phone for Active Members', () => {
    it('when an active member with the same email exists, creation ALWAYS returns 409', async () => {
      await fc.assert(
        fc.asyncProperty(validMemberInputArb, async (input) => {
          vi.clearAllMocks();
          setupDbChain({ emailExists: true });

          const event = createEvent(input, {
            memberId: 'test-member-1',
            branchId: input.home_branch_id,
            roles: ['Admin', 'Member'],
          });
          const result = await handler(event);

          expect(result.statusCode).toBe(409);
          const body = JSON.parse(result.body);
          expect(body.error.code).toBe('CONFLICT');
        }),
        { numRuns: 50 }
      );
    });

    it('when an active member with the same phone exists, creation ALWAYS returns 409', async () => {
      await fc.assert(
        fc.asyncProperty(validMemberInputArb, async (input) => {
          vi.clearAllMocks();
          setupDbChain({ emailExists: false, phoneExists: true });

          const event = createEvent(input, {
            memberId: 'test-member-1',
            branchId: input.home_branch_id,
            roles: ['Admin', 'Member'],
          });
          const result = await handler(event);

          expect(result.statusCode).toBe(409);
          const body = JSON.parse(result.body);
          expect(body.error.code).toBe('CONFLICT');
        }),
        { numRuns: 50 }
      );
    });
  });
});
