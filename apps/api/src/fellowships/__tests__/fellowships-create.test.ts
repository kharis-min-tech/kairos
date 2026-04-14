// Unit tests for the fellowships-create Lambda handler
// Tests fellowship creation, leader auto-add, and validation
//
// **Validates: Requirements 9.1-9.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock @kairos/utils
vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>(
    '@kairos/utils'
  );
  return {
    ...actual,
    getAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setContext: vi.fn(),
    }),
    getDb: vi.fn(),
  };
});

import { handler } from '../fellowships-create';
import { getAuthContext, getDb, enforceBranchAccess } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(getAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedEnforceBranchAccess = vi.mocked(enforceBranchAccess);

/** Helper to create a minimal API Gateway proxy event */
function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/fellowships',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        member_id: '1',
        branch_id: '1',
        roles: '["Admin","Member"]',
        email: 'admin@kairos.church',
      },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('fellowships-create handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthContext.mockReturnValue({
      memberId: 'test-member-1',
      branchId: 'test-branch-1',
      roles: ['Admin', 'Member'],
      email: 'admin@kairos.church',
    });
    mockedEnforceBranchAccess.mockImplementation(() => {});
  });

  it('should create a fellowship and return 201', async () => {
    const createdFellowship = {
      fellowshipId: 'test-fellowship-1',
      fellowshipName: 'K-Group Alpha',
      branchId: 'test-branch-1',
      description: null,
      leaderId: null,
      coLeaderId: null,
      meetingSchedule: 'Every Wednesday 7pm',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock DB: select returns no existing, insert returns created
    const mockLimit = vi.fn().mockReturnValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockReturning = vi.fn().mockResolvedValue([createdFellowship]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    const mockDb = { select: mockSelect, insert: mockInsert };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_name: 'K-Group Alpha',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'K-Groups',
      meeting_schedule: 'Every Wednesday 7pm',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.fellowshipName).toBe('K-Group Alpha');
  });

  it('should auto-add leader to fellowship_members when leader_id is provided', async () => {
    const createdFellowship = {
      fellowshipId: 'test-fellowship-5',
      fellowshipName: 'New Breeds Youth',
      branchId: 'test-branch-1',
      leaderId: 'test-member-10',
      coLeaderId: null,
    };

    const mockLimit = vi.fn().mockReturnValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockReturning = vi.fn().mockResolvedValue([createdFellowship]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    const mockDb = { select: mockSelect, insert: mockInsert };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_name: 'New Breeds Youth',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'New Breeds',
      leader_id: '00000000-0000-4000-8000-000000000010',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    // insert should be called twice: once for fellowship, once for leader membership
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('should auto-add both leader and co-leader to fellowship_members', async () => {
    const createdFellowship = {
      fellowshipId: 'test-fellowship-5',
      fellowshipName: 'Kharis Express',
      branchId: 'test-branch-1',
      leaderId: 'test-member-10',
      coLeaderId: 'test-member-20',
    };

    const mockLimit = vi.fn().mockReturnValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockReturning = vi.fn().mockResolvedValue([createdFellowship]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    const mockDb = { select: mockSelect, insert: mockInsert };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_name: 'Kharis Express',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'Kharis Express',
      leader_id: '00000000-0000-4000-8000-000000000010',
      co_leader_id: '00000000-0000-4000-8000-000000000020',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    // insert: fellowship + leader membership + co-leader membership = 3
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it('should return 400 when leader and co-leader are the same member', async () => {
    const event = createEvent({
      fellowship_name: 'Test Fellowship',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'K-Groups',
      leader_id: '00000000-0000-4000-8000-000000000010',
      co_leader_id: '00000000-0000-4000-8000-000000000010',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error.message).toContain(
      'Leader and co-leader must be different'
    );
  });

  it('should return 409 when fellowship name already exists in the branch', async () => {
    const mockLimit = vi.fn().mockReturnValue([{ fellowshipId: 'test-fellowship-99' }]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockDb = { select: mockSelect, insert: vi.fn() };
    mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

    const event = createEvent({
      fellowship_name: 'Existing Fellowship',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'K-Groups',
    });

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('should return 422 for invalid fellowship type', async () => {
    const event = createEvent({
      fellowship_name: 'Test',
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'Invalid Type',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });

  it('should return 422 when fellowship_name is missing', async () => {
    const event = createEvent({
      branch_id: '00000000-0000-4000-8000-000000000001',
      fellowship_type: 'K-Groups',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(422);
  });
});
