import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  getDb: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    setContext: vi.fn(),
  })),
  NotFoundError: class NotFoundError extends Error {
    statusCode = 404;
    constructor(resource: string, id: string) {
      super(`${resource} with ID ${id} not found`);
    }
  },
  BadRequestError: class BadRequestError extends Error {
    statusCode = 400;
    constructor(message: string) {
      super(message);
    }
  },
}));

vi.mock('@kairos/database', () => ({
  fellowships: {
    fellowshipId: 'fellowship_id',
    branchId: 'branch_id',
  },
  fellowshipMembers: {
    fellowshipMemberId: 'fellowship_member_id',
    fellowshipId: 'fellowship_id',
    memberId: 'member_id',
    isActive: 'is_active',
    leaveDate: 'leave_date',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}));

import { handler } from './fellowships-remove-member';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  getDb,
} from '@kairos/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResolveAuthContext = resolveAuthContext as ReturnType<typeof vi.fn>;
const mockEnforceBranchAccess = enforceBranchAccess as ReturnType<typeof vi.fn>;
const mockHandleError = handleError as ReturnType<typeof vi.fn>;
const mockSuccessResponse = successResponse as ReturnType<typeof vi.fn>;
const mockGetDb = getDb as ReturnType<typeof vi.fn>;

const existingFellowship = {
  fellowshipId: 1,
  branchId: 10,
};

const activeMembership = {
  fellowshipMemberId: 42,
  fellowshipId: 1,
  memberId: 5,
  joinDate: '2025-01-15',
  leaveDate: null,
  isActive: true,
  notes: null,
  createdAt: '2025-01-15',
  updatedAt: '2025-01-15',
};

const updatedMembership = {
  ...activeMembership,
  isActive: false,
  leaveDate: new Date().toISOString().split('T')[0],
};

function mockEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: '/fellowships/1/members/5',
    pathParameters: { fellowshipId: '1', memberId: '5' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    resource: '',
    ...overrides,
  };
}

function mockAuthContext(overrides = {}) {
  return {
    memberId: 1,
    branchId: 10,
    role: 'Admin',
    ...overrides,
  };
}

function setupDbMock({
  fellowshipResult = [existingFellowship],
  membershipResult = [activeMembership],
  updateResult = [updatedMembership],
}: {
  fellowshipResult?: Record<string, unknown>[];
  membershipResult?: Record<string, unknown>[];
  updateResult?: Record<string, unknown>[];
} = {}) {
  let selectCallCount = 0;

  const mockReturning = vi.fn().mockResolvedValue(updateResult);
  const mockWhereUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  const mockLimit = vi.fn().mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) return Promise.resolve(fellowshipResult);
    return Promise.resolve(membershipResult);
  });
  const mockWhereSelect = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhereSelect });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  const db = {
    select: mockSelect,
    update: mockUpdate,
  };

  mockGetDb.mockReturnValue(db);

  return {
    db,
    mockSelect,
    mockFrom,
    mockWhereSelect,
    mockLimit,
    mockUpdate,
    mockSet,
    mockWhereUpdate,
    mockReturning,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fellowships-remove-member handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent mockImplementation leaking from the 403 test
    mockEnforceBranchAccess.mockImplementation(() => {});
  });

  // ---- 1. Success ----
  it('should soft-remove member and return 200 with updated record', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    const { mockSet } = setupDbMock();

    // Act
    const result = await handler(mockEvent());

    // Assert
    expect(mockResolveAuthContext).toHaveBeenCalledWith(
      expect.objectContaining({ pathParameters: { fellowshipId: '1', memberId: '5' } })
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(updatedMembership);
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify(updatedMembership),
    });
    // Verify soft-delete fields
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        leaveDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
  });

  // ---- 2. Auth error ----
  it('should return 401 when resolveAuthContext throws', async () => {
    // Arrange
    const authError = new Error('Unauthorized');
    (authError as Record<string, unknown>).statusCode = 401;
    mockResolveAuthContext.mockRejectedValue(authError);

    // Act
    const result = await handler(mockEvent());

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(authError);
    expect(result).toEqual({
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });

  // ---- 3. Branch isolation ----
  it('should call enforceBranchAccess with correct context and branch ID', async () => {
    // Arrange
    const ctx = mockAuthContext({ branchId: 10 });
    mockResolveAuthContext.mockResolvedValue(ctx);
    setupDbMock();

    // Act
    await handler(mockEvent());

    // Assert
    expect(mockEnforceBranchAccess).toHaveBeenCalledWith(ctx, 10);
  });

  it('should return 403 when enforceBranchAccess throws', async () => {
    // Arrange
    const ctx = mockAuthContext({ branchId: 99 });
    mockResolveAuthContext.mockResolvedValue(ctx);
    setupDbMock({ fellowshipResult: [{ fellowshipId: 1, branchId: 10 }] });
    const forbiddenError = new Error('Forbidden');
    (forbiddenError as Record<string, unknown>).statusCode = 403;
    mockEnforceBranchAccess.mockImplementation(() => {
      throw forbiddenError;
    });

    // Act
    const result = await handler(mockEvent());

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(forbiddenError);
    expect(result).toEqual({
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' }),
    });
  });

  // ---- 4. Fellowship not found ----
  it('should return 404 when fellowship does not exist', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    setupDbMock({ fellowshipResult: [] });

    // Act
    const result = await handler(mockEvent());

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
    expect(result).toEqual({
      statusCode: 404,
      body: expect.stringContaining('Fellowship'),
    });
  });

  // ---- 5. Membership not found ----
  it('should return 404 when no active membership record exists', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    setupDbMock({ membershipResult: [] });

    // Act
    const result = await handler(mockEvent());

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
    expect(result).toEqual({
      statusCode: 404,
      body: expect.stringContaining('Active membership'),
    });
  });

  // ---- 6. Missing path params ----
  it('should return 400 when fellowshipId is missing', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    const result = await handler(
      mockEvent({ pathParameters: { memberId: '5' } })
    );

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid fellowship ID'),
    });
  });

  it('should return 400 when memberId is missing', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    const result = await handler(
      mockEvent({ pathParameters: { fellowshipId: '1' } })
    );

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid member ID'),
    });
  });

  it('should return 400 when pathParameters is null', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    const result = await handler(mockEvent({ pathParameters: null }));

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid fellowship ID'),
    });
  });

  // ---- 7. Non-numeric path params ----
  it('should return 400 when fellowshipId is non-numeric', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    const result = await handler(
      mockEvent({ pathParameters: { fellowshipId: 'abc', memberId: '5' } })
    );

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid fellowship ID'),
    });
  });

  it('should return 400 when memberId is non-numeric', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    const result = await handler(
      mockEvent({ pathParameters: { fellowshipId: '1', memberId: 'xyz' } })
    );

    // Assert
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid member ID'),
    });
  });

  // ---- Edge cases ----
  it('should not call getDb when path params are invalid', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    // Act
    await handler(
      mockEvent({ pathParameters: { fellowshipId: 'bad', memberId: 'bad' } })
    );

    // Assert
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('should not query membership when fellowship is not found', async () => {
    // Arrange
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    const { mockLimit } = setupDbMock({ fellowshipResult: [] });

    // Act
    await handler(mockEvent());

    // Assert — only one select call (fellowship lookup), never the membership lookup
    expect(mockLimit).toHaveBeenCalledTimes(1);
  });
});
