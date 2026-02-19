// Property-based tests for broadcast notification authorization (Task 19.6)
// Uses fast-check to verify authorization invariants across random inputs.
//
// **Validates: Requirements 24.1-24.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

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
        email: 'leader@kairos.church',
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

function setupDb(opts?: { insertReturning?: unknown[]; memberIds?: number[] }) {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(
      opts?.insertReturning || [{ notificationId: 1 }]
    ),
  };
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(
      (opts?.memberIds || [1, 2, 3]).map((id) => ({ memberId: id }))
    ),
  };

  mockGetDb.mockReturnValue({
    insert: vi.fn().mockReturnValue(insertChain),
    select: vi.fn().mockReturnValue(selectChain),
  });

  return { insertChain, selectChain };
}

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Scopes that leaders are NOT allowed to use */
const forbiddenLeaderScopeArb = fc.constantFrom('All' as const, 'Branch' as const);

/** All valid scopes for admin */
const validScopeArb = fc.constantFrom(
  'All' as const,
  'Branch' as const,
  'Department' as const,
  'Fellowship' as const
);

/** Valid notification types */
const notificationTypeArb = fc.constantFrom(
  'Announcement',
  'Reminder',
  'Alert',
  'Event',
  'General'
);

/** Valid priorities */
const priorityArb = fc.constantFrom('Low', 'Normal', 'High', 'Urgent');

/** Generate a non-empty title (1-200 chars) */
const titleArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generate a non-empty message (1-5000 chars) */
const messageArb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);

/** Positive integer IDs */
const idArb = fc.integer({ min: 1, max: 100_000 });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property: Broadcast Message Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property: Leader broadcasting to 'All' or 'Branch' ALWAYS returns 403
  // =========================================================================
  it('should ALWAYS return 403 when a Leader broadcasts to All or Branch scope', async () => {
    await fc.assert(
      fc.asyncProperty(
        forbiddenLeaderScopeArb,
        titleArb,
        messageArb,
        notificationTypeArb,
        priorityArb,
        idArb,
        idArb,
        async (scope, title, message, notificationType, priority, memberId, branchId) => {
          vi.clearAllMocks();
          setupDb();

          const payload: Record<string, unknown> = {
            title,
            message,
            notification_type: notificationType,
            priority,
            target_scope: scope,
          };

          // Add target_branch_id when scope is Branch (required by schema)
          if (scope === 'Branch') {
            payload.target_branch_id = branchId;
          }

          const event = createEvent(payload, {
            memberId,
            branchId,
            roles: ['Leader', 'Member'],
          });

          const result = await handler(event);
          const body = JSON.parse(result.body);

          // PROPERTY: Must ALWAYS be rejected with 403 Forbidden
          expect(result.statusCode).toBe(403);
          expect(body.error.code).toBe('FORBIDDEN');
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Property: Admin broadcasting to ANY scope ALWAYS succeeds (201)
  // =========================================================================
  it('should ALWAYS return 201 when an Admin broadcasts to any valid scope', async () => {
    await fc.assert(
      fc.asyncProperty(
        validScopeArb,
        titleArb,
        messageArb,
        notificationTypeArb,
        priorityArb,
        idArb,
        idArb,
        async (scope, title, message, notificationType, priority, memberId, branchId) => {
          vi.clearAllMocks();

          const notification = {
            notificationId: 1,
            title,
            targetScope: scope,
          };
          setupDb({ insertReturning: [notification], memberIds: [1, 2, 3] });

          const payload: Record<string, unknown> = {
            title,
            message,
            notification_type: notificationType,
            priority,
            target_scope: scope,
          };

          // Add required scope-specific IDs
          if (scope === 'Branch') {
            payload.target_branch_id = branchId;
          } else if (scope === 'Department') {
            payload.target_department_id = branchId;
          } else if (scope === 'Fellowship') {
            payload.target_fellowship_id = branchId;
          }

          const event = createEvent(payload, {
            memberId,
            branchId,
            roles: ['Admin', 'Member'],
          });

          const result = await handler(event);

          // PROPERTY: Must ALWAYS succeed with 201 Created
          expect(result.statusCode).toBe(201);
        }
      ),
      { numRuns: 50 }
    );
  });
});
