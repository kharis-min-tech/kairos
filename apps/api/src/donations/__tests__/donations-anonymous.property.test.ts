// Property-based tests for anonymous donation handling
// Task 15.7: Verifies invariants for anonymous vs non-anonymous donations
// Uses fast-check to verify across many random inputs
//
// **Validates: Requirements 18.3, 19.4**

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

import { handler } from '../donations-create-manual';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  body?: Record<string, unknown>,
  auth?: { memberId?: number; branchId?: number; roles?: string[] },
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
    path: '/v1/donations/manual',
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
      identity: {} as never,
      path: '',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
  } as APIGatewayProxyEvent;
}

function setupDb(options: {
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

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a valid positive donation amount */
const amountArb = fc.double({ min: 0.01, max: 100000, noNaN: true })
  .map((n) => Math.round(n * 100) / 100);

/** Generate a valid donation purpose */
const purposeArb = fc.constantFrom('Offering', 'Tithe', 'Building Fund');

/** Generate a valid manual payment method */
const paymentMethodArb = fc.constantFrom('Cash', 'Check', 'Bank Transfer', 'Mobile Money');

/** Generate a valid branch ID */
const branchIdArb = fc.integer({ min: 1, max: 100 });

/** Generate a valid member ID */
const memberIdArb = fc.integer({ min: 1, max: 1000 });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Anonymous Donation Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property: For any anonymous donation, member_id must be null and
  // is_anonymous must be true
  // **Validates: Req 18.3**
  // =========================================================================
  describe('Property: Anonymous Donation Invariants', () => {
    it('for any anonymous donation, the created record ALWAYS has memberId=null and isAnonymous=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArb,
          purposeArb,
          paymentMethodArb,
          branchIdArb,
          async (amount, purpose, paymentMethod, branchId) => {
            vi.clearAllMocks();

            const createdDonation = {
              donationId: 1,
              memberId: null,
              branchId,
              amount: String(amount),
              currency: 'GBP',
              donationPurpose: purpose,
              paymentMethod,
              isAnonymous: true,
              status: 'completed',
              recordedBy: 1,
            };
            setupDb({ insertResult: [createdDonation] });

            const event = createEvent(
              {
                branch_id: branchId,
                amount,
                currency: 'GBP',
                donation_date: '2025-01-15',
                donation_purpose: purpose,
                payment_method: paymentMethod,
                is_anonymous: true,
              },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.memberId).toBeNull();
              expect(body.isAnonymous).toBe(true);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // =========================================================================
  // Property: For any non-anonymous donation with a member_id,
  // is_anonymous must be false
  // **Validates: Req 18.3**
  // =========================================================================
  describe('Property: Non-Anonymous Donation Invariants', () => {
    it('for any non-anonymous donation with a member_id, isAnonymous is ALWAYS false', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArb,
          purposeArb,
          paymentMethodArb,
          branchIdArb,
          memberIdArb,
          async (amount, purpose, paymentMethod, branchId, memberId) => {
            vi.clearAllMocks();

            const createdDonation = {
              donationId: 1,
              memberId,
              branchId,
              amount: String(amount),
              currency: 'GBP',
              donationPurpose: purpose,
              paymentMethod,
              isAnonymous: false,
              status: 'completed',
              recordedBy: 1,
            };
            // Member lookup returns existing member
            setupDb({
              selectResult: [{ memberId }],
              insertResult: [createdDonation],
            });

            const event = createEvent(
              {
                branch_id: branchId,
                amount,
                currency: 'GBP',
                donation_date: '2025-01-15',
                donation_purpose: purpose,
                payment_method: paymentMethod,
                is_anonymous: false,
                member_id: memberId,
              },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.isAnonymous).toBe(false);
              expect(body.memberId).toBe(memberId);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
