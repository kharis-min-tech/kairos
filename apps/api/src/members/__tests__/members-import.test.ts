// Unit tests for the Members Import Lambda handler
// Tests CSV parsing, row validation, error reporting, and bulk creation
//
// **Validates: Requirements 5.1-5.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
};

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    getDb: () => mockDb,
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
    email: 'email',
    phone: 'phone',
    isActive: 'is_active',
    firstName: 'first_name',
    lastName: 'last_name',
    homeBranchId: 'home_branch_id',
  },
}));

import { handler } from '../members-import';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let memberIdCounter = 100;

function createEvent(
  body: Record<string, unknown>,
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
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/members/import',
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
      identity: {} as any,
      path: '/v1/members/import',
      protocol: 'HTTP/1.1',
      requestId: 'test-request-id',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: 'staging',
    },
  } as APIGatewayProxyEvent;
}

function setupDbChain() {
  // select chain for duplicate checks: select().from().where().limit()
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue([]); // No duplicates by default

  // insert chain: insert().values().returning()
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockImplementation(() => {
    memberIdCounter++;
    return [{ memberId: memberIdCounter }];
  });
}

function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.join(',')).join('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Members Import Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memberIdCounter = 100;
    setupDbChain();
  });

  // Test: Valid CSV creates member records
  it('should create member records for valid CSV rows', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id', 'email'],
      ['John', 'Doe', '1', 'john@example.com'],
      ['Jane', 'Smith', '1', 'jane@example.com'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.totalRows).toBe(2);
    expect(body.successCount).toBe(2);
    expect(body.errorCount).toBe(0);
    expect(body.createdMemberIds).toHaveLength(2);
  });

  // Test: Invalid rows reported with row numbers
  it('should report errors with row numbers for invalid rows', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id', 'email'],
      ['John', 'Doe', '1', 'john@example.com'],       // Row 2: valid
      ['', 'Smith', '1', 'jane@example.com'],           // Row 3: missing first_name
      ['Bob', '', '1', 'bob@example.com'],               // Row 4: missing last_name
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.successCount).toBe(1);
    expect(body.errorCount).toBeGreaterThan(0);

    // Errors should include row numbers
    const errorRows = body.errors.map((e: { row: number }) => e.row);
    expect(errorRows).toContain(3); // Row 3: missing first_name
    expect(errorRows).toContain(4); // Row 4: missing last_name
  });

  // Test: Missing required fields rejected per row
  it('should reject rows with missing required first_name', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id'],
      ['', 'Doe', '1'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.successCount).toBe(0);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0].field).toBe('first_name');
  });

  it('should reject rows with missing required last_name', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id'],
      ['John', '', '1'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.successCount).toBe(0);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0].field).toBe('last_name');
  });

  // Test: Missing required CSV columns
  it('should return 400 when required columns are missing from CSV', async () => {
    const csv = buildCsv([
      ['email', 'phone'],
      ['john@example.com', '+447700900001'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.message).toContain('Missing required columns');
  });

  // Test: Empty CSV
  it('should return 400 for empty CSV', async () => {
    const csv = 'first_name,last_name,home_branch_id\n';

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  // Test: Missing CSV content
  it('should return 400 when csv field is missing', async () => {
    const event = createEvent({ branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  // Test: Missing branchId
  it('should return 400 when branchId is missing', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id'],
      ['John', 'Doe', '1'],
    ]);

    const event = createEvent({ csv });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  // Test: Invalid email format reported
  it('should report invalid email format with row number', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id', 'email'],
      ['John', 'Doe', '1', 'not-an-email'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.successCount).toBe(0);
    expect(body.errors.some((e: { field: string }) => e.field === 'email')).toBe(true);
  });

  // Test: Invalid gender reported
  it('should report invalid gender value with row number', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id', 'gender'],
      ['John', 'Doe', '1', 'Other'],
    ]);

    const event = createEvent({ csv, branchId: 1 });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.successCount).toBe(0);
    expect(body.errors.some((e: { field: string }) => e.field === 'gender')).toBe(true);
  });

  // Test: Regular member cannot import
  it('should return 403 when regular member tries to import', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id'],
      ['John', 'Doe', '1'],
    ]);

    const event = createEvent(
      { csv, branchId: 1 },
      { memberId: 10, branchId: 1, roles: ['Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });

  // Test: Pastor cannot import to another branch
  it('should return 403 when pastor tries to import to another branch', async () => {
    const csv = buildCsv([
      ['first_name', 'last_name', 'home_branch_id'],
      ['John', 'Doe', '1'],
    ]);

    const event = createEvent(
      { csv, branchId: 99 },
      { memberId: 5, branchId: 1, roles: ['Pastor', 'Member'] }
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });
});
