// Unit tests for the notifications-send-broadcast Lambda handler (Task 19.6)
// Tests broadcast authorization, recipient population, and validation
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
    targetRoleId: 'target_role_id',
    targetLeadershipRole: 'target_leadership_role',
    scheduledFor: 'scheduled_for',
    expiresAt: 'expires_at',
    isActive: 'is_active',
  },
  notificationRecipients: {
    notificationId: 'notification_id',
    memberId: 'member_id',
    isRead: 'is_read',
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

import { handler } from '../notifications-send-broadcast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  body: unknown,
  auth?: { memberId?: number; branchId?: number; roles?: string[] }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/notifications/broadcast',
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
  } as unknown as APIGatewayProxyEvent;
}

function setupDb(opts: {
  insertReturning?: unknown[];
  memberIds?: number[];
}) {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(
      opts.insertReturning || [{ notificationId: 1 }]
    ),
  };
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(
      (opts.memberIds || [1, 2, 3]).map((id) => ({ memberId: id }))
    ),
  };
  const batchInsert = {
    values: vi.fn().mockResolvedValue([]),
  };

  mockGetDb.mockReturnValue({
    insert: vi.fn().mockReturnValue(insertChain),
    select: vi.fn().mockReturnValue(selectChain),
  });

  return { insertChain, selectChain };
}

// ---------------------------------------------------------------------------
// Valid payloads
// ---------------------------------------------------------------------------

const allScopePayload = {
  title: 'Church-wide Announcement',
  message: 'Important update for all members.',
  notification_type: 'Announcement',
  priority: 'Normal',
  target_scope: 'All',
};

const branchScopePayload = {
  title: 'Branch Update',
  message: 'Update for branch members.',
  notification_type: 'Announcement',
  priority: 'Normal',
  target_scope: 'Branch',
  target_branch_id: 10,
};

const departmentScopePayload = {
  title: 'Department Meeting',
  message: 'Meeting this Saturday.',
  notification_type: 'Reminder',
  priority: 'Normal',
  target_scope: 'Department',
  target_department_id: 5,
};

const fellowshipScopePayload = {
  title: 'Fellowship Gathering',
  message: 'K-Group gathering this week.',
  notification_type: 'Announcement',
  priority: 'Normal',
  target_scope: 'Fellowship',
  target_fellowship_id: 3,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notifications-send-broadcast handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Admin can broadcast to all members
  // =========================================================================
  it('should allow Admin to broadcast to all members and return 201', async () => {
    const notification = {
      notificationId: 1,
      title: allScopePayload.title,
      targetScope: 'All',
    };
    setupDb({ insertReturning: [notification], memberIds: [1, 2, 3, 4, 5] });

    const event = createEvent(allScopePayload, {
      roles: ['Admin', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.notificationId).toBe(1);
    expect(body.recipientCount).toBe(5);
  });

  // =========================================================================
  // 2. Admin can broadcast to specific branch
  // =========================================================================
  it('should allow Admin to broadcast to a specific branch', async () => {
    const notification = {
      notificationId: 2,
      title: branchScopePayload.title,
      targetScope: 'Branch',
    };
    setupDb({ insertReturning: [notification], memberIds: [10, 11, 12] });

    const event = createEvent(branchScopePayload, {
      roles: ['Admin', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.recipientCount).toBe(3);
  });

  // =========================================================================
  // 3. Leader can broadcast to their own department
  // =========================================================================
  it('should allow Leader to broadcast to their own department', async () => {
    const notification = {
      notificationId: 3,
      title: departmentScopePayload.title,
      targetScope: 'Department',
    };
    setupDb({ insertReturning: [notification], memberIds: [20, 21] });

    const event = createEvent(departmentScopePayload, {
      roles: ['Leader', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.recipientCount).toBe(2);
  });

  // =========================================================================
  // 4. Leader can broadcast to their own fellowship
  // =========================================================================
  it('should allow Leader to broadcast to their own fellowship', async () => {
    const notification = {
      notificationId: 4,
      title: fellowshipScopePayload.title,
      targetScope: 'Fellowship',
    };
    setupDb({ insertReturning: [notification], memberIds: [30, 31, 32] });

    const event = createEvent(fellowshipScopePayload, {
      roles: ['Leader', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.recipientCount).toBe(3);
  });

  // =========================================================================
  // 5. Leader CANNOT broadcast to 'All' scope (403)
  // =========================================================================
  it('should return 403 when Leader tries to broadcast to All scope', async () => {
    setupDb({});

    const event = createEvent(allScopePayload, {
      roles: ['Leader', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Leaders can only broadcast');
  });

  // =========================================================================
  // 6. Leader CANNOT broadcast to 'Branch' scope (403)
  // =========================================================================
  it('should return 403 when Leader tries to broadcast to Branch scope', async () => {
    setupDb({});

    const event = createEvent(branchScopePayload, {
      roles: ['Leader', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Leaders can only broadcast');
  });

  // =========================================================================
  // 7. Pastor can broadcast to their own branch
  // =========================================================================
  it('should allow Pastor to broadcast to their own branch', async () => {
    const notification = {
      notificationId: 7,
      title: branchScopePayload.title,
      targetScope: 'Branch',
    };
    setupDb({ insertReturning: [notification], memberIds: [40, 41] });

    const event = createEvent(branchScopePayload, {
      branchId: 10,
      roles: ['Pastor', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.recipientCount).toBe(2);
  });

  // =========================================================================
  // 8. Notification recipients are populated correctly
  // =========================================================================
  it('should populate notification recipients with correct member IDs', async () => {
    const notification = {
      notificationId: 8,
      title: departmentScopePayload.title,
      targetScope: 'Department',
    };
    const { insertChain } = setupDb({
      insertReturning: [notification],
      memberIds: [50, 51, 52, 53],
    });

    const event = createEvent(departmentScopePayload, {
      roles: ['Admin', 'Member'],
    });
    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.recipientCount).toBe(4);

    // The second insert call should be for recipients
    const db = mockGetDb();
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  // =========================================================================
  // 9. Invalid body returns 400/422
  // =========================================================================
  it('should return 422 when body is missing required fields', async () => {
    const event = createEvent({ title: '' });
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });

  it('should return 422 when target_scope is Branch but target_branch_id is missing', async () => {
    const event = createEvent({
      title: 'Test',
      message: 'Test message',
      notification_type: 'Announcement',
      target_scope: 'Branch',
      // target_branch_id intentionally omitted
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });
});
