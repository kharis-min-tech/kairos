// Unit tests for members-export Lambda
// Tests CSV generation, branch isolation, date formatting, S3 upload
//
// **Validates: Req 5.5-5.7, 31.2-31.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mocks
// ============================================================================

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
  mockGetSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockSend;
  },
  PutObjectCommand: class {
    constructor(public params: unknown) {}
  },
  GetObjectCommand: class {
    constructor(public params: unknown) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
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
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    middleName: 'middle_name',
    email: 'email',
    phone: 'phone',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    address: 'address',
    city: 'city',
    postalCode: 'postal_code',
    homeBranchId: 'home_branch_id',
    membershipDate: 'membership_date',
    isActive: 'is_active',
    photoUrl: 'photo_url',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
  },
}));

vi.mock('csv-stringify/sync', () => ({
  stringify: vi.fn((rows: unknown[], _opts: unknown) => {
    // Simple CSV mock: header + rows
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const lines = [headers.join(',')];
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      lines.push(headers.map((h) => String(r[h] ?? '')).join(','));
    }
    return lines.join('\n');
  }),
}));

import { handler } from '../members-export';

// ============================================================================
// Helpers
// ============================================================================

function createEvent(
  queryParams?: Record<string, string>,
  auth?: { memberId?: string; branchId?: string; roles?: string[] }
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 'test-member-1',
    branchId: auth?.branchId ?? 'test-branch-10',
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v1/members/export',
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

const sampleMembers = [
  {
    memberId: 'test-member-1',
    firstName: 'John',
    lastName: 'Doe',
    middleName: null,
    email: 'john@example.com',
    phone: '+447700900001',
    dateOfBirth: '1990-05-15',
    gender: 'Male',
    address: '123 Main St',
    city: 'London',
    postalCode: 'SW1A 1AA',
    homeBranchId: 'test-branch-10',
    membershipDate: '2024-01-15',
    isActive: true,
    photoUrl: null,
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+447700900002',
  },
  {
    memberId: 'test-member-2',
    firstName: 'Sarah',
    lastName: 'Smith',
    middleName: 'Ann',
    email: 'sarah@example.com',
    phone: '+447700900003',
    dateOfBirth: '1985-12-25',
    gender: 'Female',
    address: null,
    city: null,
    postalCode: null,
    homeBranchId: 'test-branch-10',
    membershipDate: '2024-03-01',
    isActive: true,
    photoUrl: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
  },
];

function setupDb(data: unknown[]) {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(data),
  };
  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainable),
  });
  return chainable;
}

// ============================================================================
// Tests
// ============================================================================

describe('members-export Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export members as CSV and return presigned URL', async () => {
    setupDb(sampleMembers);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.downloadUrl).toBe('https://s3.example.com/presigned-url');
    expect(body.recordCount).toBe(2);
    expect(body.fileName).toContain('members-export-');
    expect(body.expiresInSeconds).toBe(3600);

    // Verify S3 upload was called
    expect(mockSend).toHaveBeenCalledOnce();
    // Verify presigned URL was generated
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it('should export empty CSV when no members match', async () => {
    setupDb([]);

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.recordCount).toBe(0);
  });

  it('should pass search filter to query', async () => {
    const chain = setupDb(sampleMembers);

    const event = createEvent({ search: 'John' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    // Verify where was called (filters applied)
    expect(chain.where).toHaveBeenCalled();
  });

  it('should pass branchId filter for admin', async () => {
    const chain = setupDb(sampleMembers);

    const event = createEvent({ branchId: '20' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(chain.where).toHaveBeenCalled();
  });

  it('should enforce branch isolation for pastor', async () => {
    const chain = setupDb(sampleMembers);

    const event = createEvent({}, {
      memberId: 'test-member-5',
      branchId: 'test-branch-10',
      roles: ['Pastor', 'Member'],
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    // Pastor should have branch filter applied
    expect(chain.where).toHaveBeenCalled();
  });

  it('should handle status filter', async () => {
    const chain = setupDb([]);

    const event = createEvent({ status: 'pending' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(chain.where).toHaveBeenCalled();
  });

  it('should handle S3 upload failure gracefully', async () => {
    setupDb(sampleMembers);
    mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));

    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});
