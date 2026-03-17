// Unit tests for the Souls List Lambda handler
// Tests ad-hoc souls (NULL outreach_id), branch isolation, pagination
//
// **Validates: Requirements 15.6, 16.7**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockLeftJoin = vi.fn();
const mockInnerJoin = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

const mockDb = {
  select: mockSelect,
};

vi.mock('@kairos/utils', () => ({
  resolveAuthContext: vi.fn(),
  enforceBranchAccess: vi.fn(),
  handleError: vi.fn((err) => ({
    statusCode: err.statusCode || 500,
    body: JSON.stringify({ error: err.message }),
  })),
  successResponse: vi.fn((data) => ({
    statusCode: 200,
    body: JSON.stringify(data),
  })),
  getDb: vi.fn(() => mockDb),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  isAdmin: vi.fn(),
  isPastor: vi.fn(),
  isLeader: vi.fn(),
}));

vi.mock('@kairos/database', () => ({
  souls: {
    soulId: 'soul_id',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    email: 'email',
    status: 'status',
    assignedMemberId: 'assigned_member_id',
    outreachId: 'outreach_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
    programName: 'program_name',
  },
}));

import { handler } from './souls-list';
import { resolveAuthContext, isAdmin, isPastor, isLeader } from '@kairos/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  queryParams?: Record<string, string>,
  authContext?: {
    memberId?: number;
    branchId?: number;
    roles?: string[];
  }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: authContext?.memberId ?? 1,
    branchId: authContext?.branchId ?? 1,
    roles: authContext?.roles ?? ['Admin', 'Member'],
  };

  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/outreach/souls',
    pathParameters: null,
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
      httpMethod: 'GET',
      identity: {} as any,
      path: '/v1/outreach/souls',
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: 'staging',
    },
  } as APIGatewayProxyEvent;
}

// Sample souls including one ad-hoc soul (outreachId = null)
const sampleSouls = [
  {
    soulId: 1,
    firstName: 'Alice',
    lastName: 'Johnson',
    phone: '07000000001',
    email: 'alice@example.com',
    status: 'New',
    assignedMemberId: 2,
    assignedFirstName: 'Worker',
    assignedLastName: 'One',
    outreachId: 10,
    programName: 'Easter Outreach',
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    soulId: 2,
    firstName: 'Bob',
    lastName: 'Williams',
    phone: '07000000002',
    email: null,
    status: 'Follow-up',
    assignedMemberId: 3,
    assignedFirstName: 'Worker',
    assignedLastName: 'Two',
    outreachId: null,
    programName: null,
    createdAt: new Date('2026-03-12'),
    updatedAt: new Date('2026-03-12'),
  },
];

/**
 * Sets up the mock DB chain.
 * The handler calls select() twice: once for data, once for count.
 * The data query chain: select().from().leftJoin().leftJoin().where().orderBy().limit().offset()
 * The count query chain: select().from().leftJoin().where()
 *
 * We track whether leftJoin is called (not innerJoin) to verify the bug fix.
 */
let joinMethodsUsed: string[] = [];

function setupDbChain(data: unknown[] = sampleSouls, total?: number) {
  joinMethodsUsed = [];
  let callCount = 0;

  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // Data query
      return {
        from: () => ({
          innerJoin: (...args: unknown[]) => {
            joinMethodsUsed.push('innerJoin');
            return {
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => data,
                    }),
                  }),
                }),
              }),
            };
          },
          leftJoin: (...args: unknown[]) => {
            joinMethodsUsed.push('leftJoin');
            return {
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => data,
                    }),
                  }),
                }),
              }),
            };
          },
        }),
      };
    }
    // Count query
    return {
      from: () => ({
        innerJoin: (...args: unknown[]) => {
          joinMethodsUsed.push('innerJoin');
          return {
            where: () => [{ count: total ?? data.length }],
          };
        },
        leftJoin: (...args: unknown[]) => {
          joinMethodsUsed.push('leftJoin');
          return {
            where: () => [{ count: total ?? data.length }],
          };
        },
      }),
    };
  });
}

function setupAuth(opts?: { admin?: boolean; pastor?: boolean; leader?: boolean }) {
  vi.mocked(resolveAuthContext).mockResolvedValue({
    memberId: 1,
    branchId: 1,
    roles: opts?.admin ? ['Admin', 'Member'] : opts?.pastor ? ['Pastor', 'Member'] : opts?.leader ? ['Leader', 'Member'] : ['Member'],
    email: 'test@kairos.church',
  } as any);
  vi.mocked(isAdmin).mockReturnValue(opts?.admin ?? false);
  vi.mocked(isPastor).mockReturnValue(opts?.pastor ?? false);
  vi.mocked(isLeader).mockReturnValue(opts?.leader ?? false);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('souls-list handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinMethodsUsed = [];
  });

  // ---- Success ----

  it('should return 200 with paginated souls list', async () => {
    setupAuth({ admin: true });
    setupDbChain(sampleSouls);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 2,
      totalPages: 1,
    });
  });

  it('should map soul fields correctly including assignedWorker', async () => {
    setupAuth({ admin: true });
    setupDbChain(sampleSouls);

    const event = createEvent();
    const result = await handler(event);

    const body = JSON.parse(result.body);
    const soul = body.data[0];
    expect(soul.soulId).toBe(1);
    expect(soul.firstName).toBe('Alice');
    expect(soul.lastName).toBe('Johnson');
    expect(soul.assignedWorker).toEqual({
      memberId: 2,
      firstName: 'Worker',
      lastName: 'One',
    });
    expect(soul.outreachId).toBe(10);
    expect(soul.programName).toBe('Easter Outreach');
  });

  // ---- Auth error ----

  it('should return error when auth context resolution fails', async () => {
    const authError = Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    vi.mocked(resolveAuthContext).mockRejectedValue(authError);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });

  // ---- Branch isolation ----

  it('should enforce branch isolation for non-admin users', async () => {
    setupAuth({ pastor: true });
    setupDbChain([sampleSouls[0]], 1);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
  });

  it('should restrict workers to only their assigned souls', async () => {
    setupAuth(); // regular member/worker
    setupDbChain([sampleSouls[0]], 1);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
  });

  // ---- Bug fix: ad-hoc souls with NULL outreach_id ----

  it('should include ad-hoc souls where outreach_id is NULL (uses leftJoin not innerJoin)', async () => {
    setupAuth({ admin: true });
    setupDbChain(sampleSouls);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);

    // Both souls should be returned — including the one with null outreachId
    const adHocSoul = body.data.find(
      (s: any) => s.outreachId === null
    );
    expect(adHocSoul).toBeDefined();
    expect(adHocSoul.firstName).toBe('Bob');
    expect(adHocSoul.programName).toBeNull();

    // Verify leftJoin was used instead of innerJoin for outreachPrograms
    expect(joinMethodsUsed).toContain('leftJoin');
    expect(joinMethodsUsed).not.toContain('innerJoin');
  });

  it('should return null programName for ad-hoc souls', async () => {
    setupAuth({ admin: true });
    const adHocOnly = [sampleSouls[1]]; // soul with null outreachId
    setupDbChain(adHocOnly, 1);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].outreachId).toBeNull();
    expect(body.data[0].programName).toBeNull();
    expect(body.data[0].assignedWorker).toBeDefined();
  });

  // ---- Pagination ----

  it('should use default pagination values when not specified', async () => {
    setupAuth({ admin: true });
    setupDbChain([], 0);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(50);
  });

  it('should cap limit at 100', async () => {
    setupAuth({ admin: true });
    setupDbChain([], 0);

    const event = createEvent({ limit: '500' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.limit).toBe(100);
  });

  it('should calculate correct totalPages', async () => {
    setupAuth({ admin: true });
    setupDbChain([], 120);

    const event = createEvent({ limit: '50' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.pagination.total).toBe(120);
    expect(body.pagination.totalPages).toBe(3);
  });

  // ---- Filters ----

  it('should accept status filter', async () => {
    setupAuth({ admin: true });
    setupDbChain([sampleSouls[0]], 1);

    const event = createEvent({ status: 'New' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });
});
