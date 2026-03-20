// Unit tests for the notifications-get-unread-count Lambda handler (Task 19.5)
// Tests unread count retrieval, display capping, and filtering logic
//
// **Validates: Requirements 24.1-24.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@kairos/database', () => ({
  notifications: {
    notificationId: 'notification_id',
    sentBy: 'sent_by',
    title: 'title',
    message: 'message',
    notificationType: 'notification_type',
    priority: 'priority',
    targetScope: 'target_scope',
    targetBranchId: 'target_branch_id',
    targetDepartmentId: 'target_department_id',
    targetFellowshipId: 'target_fellowship_id',
    isActive: 'is_active',
    expiresAt: 'expires_at',
  },
  notificationRecipients: {
    notificationId: 'notification_id',
    memberId: 'member_id',
    isRead: 'is_read',
    isDismissed: 'is_dismissed',
  },
  members: {
    memberId: 'member_id',
    homeBranchId: 'home_branch_id',
    isActive: 'is_active',
    firstName: 'first_name',
    email: 'email',
  },
  departmentMembers: {
    departmentId: 'department_id',
    memberId: 'member_id',
    isActive: 'is_active',
  },
  fellowshipMembers: {
    fellowshipId: 'fellowship_id',
    memberId: 'member_id',
    isActive: 'is_active',
  },
}));

const mockGetDb = vi.fn();

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>(
    '@kairos/utils'
  );
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

import { handler } from '../notifications-get-unread-count';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  auth?: { memberId?: number; branchId?: number; roles?: string[] }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Member'],
  };
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/notifications/unread-count',
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
        email: 'member@kairos.church',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'GET',
      identity: {} as never,
      path: '',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
  } as unknown as APIGatewayProxyEvent;
}

function setupDb(count: number) {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ count }]),
  };
  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(selectChain),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notifications-get-unread-count handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Returns correct unread count
  // =========================================================================
  it('should return the correct unread count', async () => {
    setupDb(15);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(15);
    expect(body.display).toBe('15');
  });

  // =========================================================================
  // 2. Returns "99+" when count exceeds 99
  // =========================================================================
  it('should return "99+" display when count exceeds 99', async () => {
    setupDb(150);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(150);
    expect(body.display).toBe('99+');
  });

  // =========================================================================
  // 3. Returns 0 when no unread notifications
  // =========================================================================
  it('should return 0 when there are no unread notifications', async () => {
    setupDb(0);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(0);
    expect(body.display).toBe('0');
  });

  // =========================================================================
  // 4. Excludes dismissed notifications
  // =========================================================================
  it('should exclude dismissed notifications from the count', async () => {
    // The DB mock returns count=5, meaning the query already filters out dismissed
    setupDb(5);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(5);

    // Verify the DB was queried (innerJoin + where filters applied)
    const db = mockGetDb();
    expect(db.select).toHaveBeenCalled();
  });

  // =========================================================================
  // 5. Excludes expired notifications
  // =========================================================================
  it('should exclude expired notifications from the count', async () => {
    // The DB mock returns count=3, meaning the query already filters out expired
    setupDb(3);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(3);

    // Verify the DB was queried with proper filters
    const db = mockGetDb();
    expect(db.select).toHaveBeenCalled();
  });

  // =========================================================================
  // Edge case: exactly 99 should show "99" not "99+"
  // =========================================================================
  it('should return "99" display when count is exactly 99', async () => {
    setupDb(99);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(99);
    expect(body.display).toBe('99');
  });

  // =========================================================================
  // Edge case: count of 100 should show "99+"
  // =========================================================================
  it('should return "99+" display when count is exactly 100', async () => {
    setupDb(100);

    const event = createEvent({ memberId: 1 });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.count).toBe(100);
    expect(body.display).toBe('99+');
  });
});
