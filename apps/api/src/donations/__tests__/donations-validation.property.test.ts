// Property-based tests for donation validation rules
// Uses fast-check to verify invariants across random inputs
//
// **Validates: Req 15.3 — Purpose/description constraint, positive amount invariant**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

const { mockStripeCreate } = vi.hoisted(() => ({
  mockStripeCreate: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create: mockStripeCreate };
  },
}));

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class {
    send = vi.fn().mockResolvedValue({ Parameter: { Value: 'test-key' } });
  },
  GetParameterCommand: class {
    constructor(public params: unknown) {}
  },
}));

const mockGetDb = vi.fn();

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
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
  donations: {
    donationId: 'donation_id',
    memberId: 'member_id',
    branchId: 'branch_id',
    donationDate: 'donation_date',
    amount: 'amount',
    currency: 'currency',
    donationPurpose: 'donation_purpose',
    description: 'description',
    paymentMethod: 'payment_method',
    referenceNumber: 'reference_number',
    stripePaymentId: 'stripe_payment_id',
    status: 'status',
    isAnonymous: 'is_anonymous',
    notes: 'notes',
    recordedBy: 'recorded_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    homeBranchId: 'home_branch_id',
    isActive: 'is_active',
    email: 'email',
  },
}));

import { handler } from '../donations-create-online';

// ============================================================================
// Helpers
// ============================================================================

function createEvent(
  body?: Record<string, unknown>,
  auth?: { memberId?: number; branchId?: number; roles?: string[] },
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string>
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/donations',
    pathParameters: pathParams || null,
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

function _setupDb(options: {
  selectResult?: unknown[];
  insertResult?: unknown[];
  updateResult?: unknown[];
}) {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(options.selectResult || []),
    orderBy: vi.fn().mockResolvedValue(options.selectResult || []),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(options.selectResult || []),
    returning: vi.fn().mockResolvedValue(options.insertResult || options.updateResult || []),
  };
  const insertChain = {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(options.insertResult || []),
    }),
  };
  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(options.updateResult || []),
      }),
    }),
  };
  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainable),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
  });
  return { chainable, insertChain, updateChain };
}
void _setupDb;

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('donations-create-online property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('property: purpose "Other" with empty or missing description is always rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('   ')
        ),
        fc.double({ min: 0.01, max: 100000, noNaN: true }),
        async (description, amount) => {
          const body: Record<string, unknown> = {
            branch_id: 10,
            amount,
            donation_date: '2025-06-01',
            donation_purpose: 'Other',
          };
          if (description !== undefined) {
            body.description = description;
          }

          const event = createEvent(body);
          const result = await handler(event);

          expect(result.statusCode).toBe(422);
          const parsed = JSON.parse(result.body);
          expect(parsed.error.code).toBe('VALIDATION_ERROR');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('property: non-positive amounts are always rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -100000, max: 0, noNaN: true }),
        fc.constantFrom('Offering', 'Tithe', 'Building Fund'),
        async (amount, purpose) => {
          const event = createEvent({
            branch_id: 10,
            amount,
            donation_date: '2025-06-01',
            donation_purpose: purpose,
          });

          const result = await handler(event);

          expect(result.statusCode).toBe(422);
          const parsed = JSON.parse(result.body);
          expect(parsed.error.code).toBe('VALIDATION_ERROR');
        }
      ),
      { numRuns: 30 }
    );
  });
});
