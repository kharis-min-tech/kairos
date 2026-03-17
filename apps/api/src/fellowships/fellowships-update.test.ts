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
  validateOrThrow: vi.fn((_schema: unknown, data: unknown) => data),
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
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    constructor(message: string) {
      super(message);
    }
  },
  fellowshipUpdateSchema: {},
}));

vi.mock('@kairos/database', () => ({
  fellowships: {
    fellowshipId: 'fellowship_id',
    fellowshipName: 'fellowship_name',
    fellowshipType: 'fellowship_type',
    description: 'description',
    branchId: 'branch_id',
    leaderId: 'leader_id',
    coLeaderId: 'co_leader_id',
    meetingSchedule: 'meeting_schedule',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  ne: vi.fn((...args: unknown[]) => ({ type: 'ne', args })),
}));

import { handler } from './fellowships-update';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  validateOrThrow,
  getDb,
} from '@kairos/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResolveAuthContext = resolveAuthContext as ReturnType<typeof vi.fn>;
const mockEnforceBranchAccess = enforceBranchAccess as ReturnType<typeof vi.fn>;
const mockHandleError = handleError as ReturnType<typeof vi.fn>;
const mockSuccessResponse = successResponse as ReturnType<typeof vi.fn>;
const mockValidateOrThrow = validateOrThrow as ReturnType<typeof vi.fn>;
const mockGetDb = getDb as ReturnType<typeof vi.fn>;

const existingFellowship = {
  fellowshipId: 1,
  fellowshipName: 'Youth Fellowship',
  fellowshipType: 'youth',
  description: 'Youth gathering',
  branchId: 10,
  leaderId: 100,
  coLeaderId: 200,
  meetingSchedule: 'Every Saturday',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

function mockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: JSON.stringify({ fellowship_name: 'Updated Fellowship' }),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'PUT',
    isBase64Encoded: false,
    path: '/fellowships/1',
    pathParameters: { fellowshipId: '1' },
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
  selectResult = [existingFellowship],
  duplicateResult = [],
  updateResult = [{ ...existingFellowship, fellowshipName: 'Updated Fellowship' }],
}: {
  selectResult?: Record<string, unknown>[];
  duplicateResult?: Record<string, unknown>[];
  updateResult?: Record<string, unknown>[];
} = {}) {
  let selectCallCount = 0;

  const mockReturning = vi.fn().mockResolvedValue(updateResult);
  const mockWhereUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  const mockLimit = vi.fn().mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) return Promise.resolve(selectResult);
    return Promise.resolve(duplicateResult);
  });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  const db = {
    select: mockSelect,
    update: mockUpdate,
  };

  mockGetDb.mockReturnValue(db);

  return { db, mockSet, mockWhere, mockReturning, mockLimit };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fellowships-update handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent mockImplementation leaking from the 403 test
    mockEnforceBranchAccess.mockImplementation(() => {});
  });

  // 1. Success — valid partial update returns 200
  it('should return 200 with updated fellowship on valid partial update', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    const updatedFellowship = { ...existingFellowship, fellowshipName: 'Updated Fellowship' };
    mockValidateOrThrow.mockReturnValue({ fellowship_name: 'Updated Fellowship' });
    setupDbMock({ updateResult: [updatedFellowship] });

    const event = mockEvent();
    const result = await handler(event);

    expect(mockSuccessResponse).toHaveBeenCalledWith(updatedFellowship);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(updatedFellowship);
  });

  // 2. Returns existing fellowship when no update fields provided
  it('should return existing fellowship when no fields need updating', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({});
    setupDbMock();

    const event = mockEvent({ body: JSON.stringify({}) });
    const result = await handler(event);

    expect(mockSuccessResponse).toHaveBeenCalledWith(existingFellowship);
    expect(result.statusCode).toBe(200);
  });

  // 3. Validation error — validateOrThrow throws → 400
  it('should return 400 when validateOrThrow throws a validation error', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    const validationError = Object.assign(new Error('Validation failed'), {
      statusCode: 400,
    });
    mockValidateOrThrow.mockImplementation(() => {
      throw validationError;
    });
    setupDbMock();

    const event = mockEvent({ body: JSON.stringify({ fellowship_name: '' }) });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalledWith(validationError);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Validation failed' });
  });

  // 4. Auth error — resolveAuthContext throws → 401
  it('should return 401 when resolveAuthContext throws', async () => {
    const authError = Object.assign(new Error('Unauthorized'), {
      statusCode: 401,
    });
    mockResolveAuthContext.mockRejectedValue(authError);

    const event = mockEvent();
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalledWith(authError);
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({ error: 'Unauthorized' });
  });

  // 5. Branch isolation — enforceBranchAccess called with correct params
  it('should call enforceBranchAccess with auth context and fellowship branchId', async () => {
    const ctx = mockAuthContext({ branchId: 10 });
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ fellowship_name: 'Updated Fellowship' });
    setupDbMock();

    const event = mockEvent();
    await handler(event);

    expect(mockEnforceBranchAccess).toHaveBeenCalledWith(ctx, existingFellowship.branchId);
  });

  // 6. Branch isolation — enforceBranchAccess rejects → 403
  it('should return 403 when enforceBranchAccess throws', async () => {
    const ctx = mockAuthContext({ branchId: 99 });
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ fellowship_name: 'Updated Fellowship' });
    setupDbMock();
    const forbiddenError = Object.assign(new Error('Forbidden'), {
      statusCode: 403,
    });
    mockEnforceBranchAccess.mockImplementation(() => {
      throw forbiddenError;
    });

    const event = mockEvent();
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalledWith(forbiddenError);
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden' });
  });

  // 7. Not found — fellowship with given ID doesn't exist → 404
  it('should return 404 when fellowship does not exist', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ fellowship_name: 'Updated Fellowship' });
    setupDbMock({ selectResult: [] });

    const event = mockEvent({ pathParameters: { fellowshipId: '999' } });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(404);
  });

  // 8. Conflict/duplicate — duplicate fellowship name → 409
  it('should return 409 when duplicate fellowship name exists in same branch', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ fellowship_name: 'Existing Fellowship' });
    setupDbMock({
      duplicateResult: [{ fellowshipId: 5 }],
    });

    const event = mockEvent({
      body: JSON.stringify({ fellowship_name: 'Existing Fellowship' }),
    });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toContain('already exists');
  });

  // 9. Leader ≠ co-leader — rejects when leader_id === co_leader_id
  it('should return 400 when leader_id equals co_leader_id in input', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ leader_id: 100, co_leader_id: 100 });
    setupDbMock();

    const event = mockEvent({
      body: JSON.stringify({ leader_id: 100, co_leader_id: 100 }),
    });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe(
      'Leader and co-leader must be different members'
    );
  });

  // 10. Leader equals existing co-leader when only leader_id updated
  it('should return 400 when new leader_id matches existing co_leader_id', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ leader_id: 200 });
    setupDbMock();

    const event = mockEvent({
      body: JSON.stringify({ leader_id: 200 }),
    });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe(
      'Leader and co-leader must be different members'
    );
  });

  // 11. Co-leader equals existing leader when only co_leader_id updated
  it('should return 400 when new co_leader_id matches existing leader_id', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({ co_leader_id: 100 });
    setupDbMock();

    const event = mockEvent({
      body: JSON.stringify({ co_leader_id: 100 }),
    });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe(
      'Leader and co-leader must be different members'
    );
  });

  // 12. Invalid fellowship ID (non-numeric) → 400
  it('should return 400 when fellowshipId path parameter is not a number', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    const event = mockEvent({ pathParameters: { fellowshipId: 'abc' } });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Invalid fellowship ID');
  });

  // 13. Missing fellowshipId path parameter → 400
  it('should return 400 when fellowshipId path parameter is missing', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);

    const event = mockEvent({ pathParameters: null });
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Invalid fellowship ID');
  });

  // 14. No duplicate check when fellowship_name unchanged
  it('should skip duplicate check when fellowship_name is the same as existing', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    mockValidateOrThrow.mockReturnValue({
      fellowship_name: existingFellowship.fellowshipName,
    });
    const { db } = setupDbMock();

    const event = mockEvent({
      body: JSON.stringify({
        fellowship_name: existingFellowship.fellowshipName,
      }),
    });
    await handler(event);

    // select should be called once (fetch existing), not twice (no duplicate check)
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  // 15. Successful update with multiple fields
  it('should update multiple fields at once', async () => {
    const ctx = mockAuthContext();
    mockResolveAuthContext.mockResolvedValue(ctx);
    const updateInput = {
      fellowship_name: 'New Name',
      description: 'New description',
      is_active: false,
    };
    mockValidateOrThrow.mockReturnValue(updateInput);

    const updatedFellowship = {
      ...existingFellowship,
      fellowshipName: 'New Name',
      description: 'New description',
      isActive: false,
    };
    const { mockSet } = setupDbMock({ updateResult: [updatedFellowship] });

    const event = mockEvent({ body: JSON.stringify(updateInput) });
    const result = await handler(event);

    expect(mockSet).toHaveBeenCalledWith({
      fellowshipName: 'New Name',
      description: 'New description',
      isActive: false,
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(updatedFellowship);
  });

  // 16. Generic error → 500
  it('should return 500 for unexpected errors', async () => {
    const unexpectedError = new Error('Database connection failed');
    mockResolveAuthContext.mockRejectedValue(unexpectedError);

    const event = mockEvent();
    const result = await handler(event);

    expect(mockHandleError).toHaveBeenCalledWith(unexpectedError);
    expect(result.statusCode).toBe(500);
  });
});
