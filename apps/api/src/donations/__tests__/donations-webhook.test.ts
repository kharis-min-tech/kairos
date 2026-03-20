// Unit tests for donations-webhook Lambda
// Tests Stripe webhook signature verification and donation status updates
//
// **Validates: Req 15.4, 15.5 — Webhook handling, payment success/failure status updates**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

const { mockStripeCreate, mockStripeConstructEvent } = vi.hoisted(() => ({
  mockStripeCreate: vi.fn(),
  mockStripeConstructEvent: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create: mockStripeCreate };
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

// ============================================================================
// Helpers
// ============================================================================

function createWebhookEvent(
  rawBody: string,
  signature?: string
): APIGatewayProxyEvent {
  return {
    body: rawBody,
    headers: signature ? { 'Stripe-Signature': signature } : {},
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
  };
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

// ============================================================================
// Tests
// ============================================================================

describe('donations-webhook Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update donation status to "completed" on payment_intent.succeeded', async () => {
    const stripeEvent = {
      id: 'evt_test_success',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount: 5000,
          currency: 'gbp',
        },
      },
    };

    mockStripeConstructEvent.mockReturnValue(stripeEvent);

    const { updateChain } = setupDb({
      updateResult: [{ donationId: 42 }],
    });

    const rawBody = JSON.stringify(stripeEvent);
    const event = createWebhookEvent(rawBody, 'whsec_test_signature');

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.received).toBe(true);

    // Verify constructEvent was called with correct arguments
    expect(mockStripeConstructEvent).toHaveBeenCalledWith(
      rawBody,
      'whsec_test_signature',
      'test-key'
    );

    // Verify the donation was updated — set() was called with status 'completed'
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should update donation status to "failed" on payment_intent.payment_failed', async () => {
    const stripeEvent = {
      id: 'evt_test_failed',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_456',
          amount: 3000,
          currency: 'gbp',
        },
      },
    };

    mockStripeConstructEvent.mockReturnValue(stripeEvent);

    const { updateChain } = setupDb({
      updateResult: [{ donationId: 43 }],
    });

    const rawBody = JSON.stringify(stripeEvent);
    const event = createWebhookEvent(rawBody, 'whsec_test_signature');

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.received).toBe(true);

    // Verify the donation was updated — set() was called with status 'failed'
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
  });

  it('should reject requests with invalid Stripe signature (400 error)', async () => {
    mockStripeConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const rawBody = '{"type":"payment_intent.succeeded"}';
    const event = createWebhookEvent(rawBody, 'invalid_signature');

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Invalid webhook signature');
  });

  it('should reject requests with missing Stripe-Signature header', async () => {
    const rawBody = '{"type":"payment_intent.succeeded"}';
    const event = createWebhookEvent(rawBody); // no signature

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should update donation record on successful payment (receipt verification)', async () => {
    const stripeEvent = {
      id: 'evt_test_receipt',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_789',
          amount: 10000,
          currency: 'gbp',
        },
      },
    };

    mockStripeConstructEvent.mockReturnValue(stripeEvent);

    const { updateChain } = setupDb({
      updateResult: [{ donationId: 99 }],
    });

    const rawBody = JSON.stringify(stripeEvent);
    const event = createWebhookEvent(rawBody, 'whsec_valid_sig');

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    // Verify the DB update was triggered — this confirms the donation record
    // was updated to 'completed', which is the prerequisite for receipt generation
    expect(updateChain.set).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });
});
