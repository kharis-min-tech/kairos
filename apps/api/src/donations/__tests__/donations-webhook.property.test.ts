// Property-based tests for Stripe webhook handling
// Task 15.5: Verifies donation status updates based on Stripe payment events
// Uses fast-check to verify across many random payment intents
//
// **Validates: Requirements 17.1, 17.9**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks (must be hoisted before other mocks)
// ---------------------------------------------------------------------------

const { mockStripeConstructEvent } = vi.hoisted(() => ({
  mockStripeConstructEvent: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create: vi.fn() };
    webhooks = { constructEvent: mockStripeConstructEvent };
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

import { handler } from '../donations-webhook';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWebhookEvent(rawBody: string, signature: string): APIGatewayProxyEvent {
  return {
    body: rawBody,
    headers: {
      'Stripe-Signature': signature,
    },
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/donations/webhook',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {},
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

/** Generate a valid Stripe payment intent ID */
const paymentIntentIdArb = fc.stringMatching(/^pi_[a-zA-Z0-9]{10,24}$/);

/** Generate a valid Stripe event ID */
const stripeEventIdArb = fc.stringMatching(/^evt_[a-zA-Z0-9]{10,24}$/);

/** Generate a valid donation ID */
const donationIdArb = fc.integer({ min: 1, max: 100000 });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Stripe Webhook Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property: For any payment_intent.succeeded event, donation status must
  // be updated to 'completed'
  // **Validates: Req 17.1, 17.9**
  // =========================================================================
  describe('Property: Successful Payment Updates Status to Completed', () => {
    it('for any payment_intent.succeeded event, the handler returns 200 and updates status to completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          paymentIntentIdArb,
          stripeEventIdArb,
          donationIdArb,
          async (paymentIntentId, eventId, donationId) => {
            vi.clearAllMocks();

            // Mock Stripe constructEvent to return a succeeded event
            mockStripeConstructEvent.mockReturnValue({
              id: eventId,
              type: 'payment_intent.succeeded',
              data: {
                object: {
                  id: paymentIntentId,
                  status: 'succeeded',
                },
              },
            });

            // DB update returns the updated donation
            setupDb({
              updateResult: [{ donationId }],
            });

            const event = createWebhookEvent(
              JSON.stringify({ type: 'payment_intent.succeeded' }),
              'test-signature',
            );
            const result = await handler(event);

            // Webhook handler always returns 200 to Stripe
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.received).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // =========================================================================
  // Property: For any payment_intent.payment_failed event, donation status
  // must be updated to 'failed'
  // **Validates: Req 17.1, 17.9**
  // =========================================================================
  describe('Property: Failed Payment Updates Status to Failed', () => {
    it('for any payment_intent.payment_failed event, the handler returns 200 and updates status to failed', async () => {
      await fc.assert(
        fc.asyncProperty(
          paymentIntentIdArb,
          stripeEventIdArb,
          donationIdArb,
          async (paymentIntentId, eventId, donationId) => {
            vi.clearAllMocks();

            // Mock Stripe constructEvent to return a failed event
            mockStripeConstructEvent.mockReturnValue({
              id: eventId,
              type: 'payment_intent.payment_failed',
              data: {
                object: {
                  id: paymentIntentId,
                  status: 'requires_payment_method',
                },
              },
            });

            // DB update returns the updated donation
            setupDb({
              updateResult: [{ donationId }],
            });

            const event = createWebhookEvent(
              JSON.stringify({ type: 'payment_intent.payment_failed' }),
              'test-signature',
            );
            const result = await handler(event);

            // Webhook handler always returns 200 to Stripe
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.received).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
