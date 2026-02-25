// Unit tests for the Donations Create Manual Lambda handler
// Task 15.7: Tests for anonymous donations, role-based access, and member linking
//
// **Validates: Requirements 18.3, 19.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string>,
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

const validDonationInput = {
  branch_id: 10,
  amount: 50,
  currency: 'GBP',
  donation_date: '2025-01-15',
  donation_purpose: 'Offering',
  payment_method: 'Cash',
  is_anonymous: false,
  member_id: 5,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Donations Create Manual Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Task 15.7: Anonymous donation has is_anonymous=TRUE, no member_id
  // =========================================================================
  it('should create anonymous donation with is_anonymous=TRUE and null member_id', async () => {
    const createdDonation = {
      donationId: 1,
      memberId: null,
      branchId: 10,
      amount: '100',
      currency: 'GBP',
      donationPurpose: 'Offering',
      paymentMethod: 'Cash',
      isAnonymous: true,
      status: 'completed',
      recordedBy: 1,
    };
    setupDb({ insertResult: [createdDonation] });

    const event = createEvent({
      ...validDonationInput,
      is_anonymous: true,
      member_id: undefined,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.isAnonymous).toBe(true);
    expect(body.memberId).toBeNull();
  });

  // =========================================================================
  // Task 15.7: Anonymous donations show as "Anonymous" in reports
  // (Verified by checking the stored record has null memberId and isAnonymous=true,
  //  which the reports handler uses to display "Anonymous")
  // =========================================================================
  it('should store anonymous donation with null memberId for report display', async () => {
    const createdDonation = {
      donationId: 2,
      memberId: null,
      branchId: 10,
      amount: '200',
      currency: 'GBP',
      donationPurpose: 'Tithe',
      paymentMethod: 'Bank Transfer',
      isAnonymous: true,
      status: 'completed',
      recordedBy: 1,
    };
    setupDb({ insertResult: [createdDonation] });

    const event = createEvent({
      branch_id: 10,
      amount: 200,
      currency: 'GBP',
      donation_date: '2025-01-15',
      donation_purpose: 'Tithe',
      payment_method: 'Bank Transfer',
      is_anonymous: true,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    // Anonymous donations must have null memberId so reports show "Anonymous"
    expect(body.memberId).toBeNull();
    expect(body.isAnonymous).toBe(true);
  });

  // =========================================================================
  // Task 15.7: Non-anonymous donation links to member
  // =========================================================================
  it('should link non-anonymous donation to the specified member', async () => {
    const createdDonation = {
      donationId: 3,
      memberId: 5,
      branchId: 10,
      amount: '75',
      currency: 'GBP',
      donationPurpose: 'Offering',
      paymentMethod: 'Cash',
      isAnonymous: false,
      status: 'completed',
      recordedBy: 1,
    };
    // Member lookup returns existing member
    setupDb({
      selectResult: [{ memberId: 5 }],
      insertResult: [createdDonation],
    });

    const event = createEvent({
      ...validDonationInput,
      is_anonymous: false,
      member_id: 5,
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.memberId).toBe(5);
    expect(body.isAnonymous).toBe(false);
  });

  // =========================================================================
  // Task 15.7: Only admins and pastors can record manual donations
  // =========================================================================
  it('should return 403 when a regular member tries to record a manual donation', async () => {
    setupDb({ insertResult: [] });

    const event = createEvent(
      validDonationInput,
      { memberId: 99, branchId: 10, roles: ['Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should allow Admin to record a manual donation', async () => {
    const createdDonation = {
      donationId: 4,
      memberId: 5,
      branchId: 10,
      amount: '50',
      isAnonymous: false,
      status: 'completed',
    };
    setupDb({
      selectResult: [{ memberId: 5 }],
      insertResult: [createdDonation],
    });

    const event = createEvent(
      validDonationInput,
      { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
  });

  it('should allow Pastor to record a manual donation', async () => {
    const createdDonation = {
      donationId: 5,
      memberId: 5,
      branchId: 10,
      amount: '50',
      isAnonymous: false,
      status: 'completed',
    };
    setupDb({
      selectResult: [{ memberId: 5 }],
      insertResult: [createdDonation],
    });

    const event = createEvent(
      validDonationInput,
      { memberId: 2, branchId: 10, roles: ['Pastor', 'Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
  });
});
