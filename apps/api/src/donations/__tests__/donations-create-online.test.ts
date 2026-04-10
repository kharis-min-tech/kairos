// Unit tests for donations-create-online Lambda
// Tests donation validation, Stripe payment intent creation, and record persistence
//
// **Validates: Req 15.2, 15.3 — Amount validation, purpose/description rules, currency enforcement**

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('donations-create-online Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject donation with amount <= 0 (validation error)', async () => {
    const event = createEvent({
      branch_id: 10,
      amount: 0,
      donation_date: '2025-06-01',
      donation_purpose: 'Offering',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject donation with negative amount', async () => {
    const event = createEvent({
      branch_id: 10,
      amount: -50,
      donation_date: '2025-06-01',
      donation_purpose: 'Tithe',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject purpose "Other" without description', async () => {
    const event = createEvent({
      branch_id: 10,
      amount: 25,
      donation_date: '2025-06-01',
      donation_purpose: 'Other',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should create a valid donation with stripe_payment_id', async () => {
    const createdDonation = {
      donationId: 42,
      branchId: 10,
      amount: '50.00',
      currency: 'GBP',
      donationPurpose: 'Offering',
      status: 'pending',
      stripePaymentId: 'pi_test_123',
    };

    setupDb({
      selectResult: [{ memberId: 1, homeBranchId: 10 }],
      insertResult: [createdDonation],
    });

    mockStripeCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    });

    const event = createEvent({
      branch_id: 10,
      member_id: 1,
      amount: 50,
      donation_date: '2025-06-01',
      donation_purpose: 'Offering',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.donation.stripePaymentId).toBe('pi_test_123');
    expect(body.clientSecret).toBe('pi_test_123_secret_abc');
    expect(body.stripePaymentId).toBe('pi_test_123');

    // Verify Stripe was called with GBP currency and correct amount in pence
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'gbp',
      })
    );
  });

  it('should always use GBP currency', async () => {
    const createdDonation = {
      donationId: 43,
      branchId: 10,
      amount: '100.00',
      currency: 'GBP',
      donationPurpose: 'Tithe',
      status: 'pending',
      stripePaymentId: 'pi_test_456',
    };

    setupDb({
      selectResult: [{ memberId: 1, homeBranchId: 10 }],
      insertResult: [createdDonation],
    });

    mockStripeCreate.mockResolvedValue({
      id: 'pi_test_456',
      client_secret: 'pi_test_456_secret_def',
    });

    // Attempt to pass a different currency — schema enforces GBP literal
    const event = createEvent({
      branch_id: 10,
      member_id: 1,
      amount: 100,
      currency: 'USD',
      donation_date: '2025-06-01',
      donation_purpose: 'Tithe',
    });

    const result = await handler(event);

    // Should be rejected because currency must be 'GBP'
    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
