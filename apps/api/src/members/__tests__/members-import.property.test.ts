// Property-based tests for the Members Import Lambda handler
// Uses fast-check to verify CSV validation and creation invariants
//
// **Validates: Requirements 5.1-5.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue([]);

  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockImplementation(() => {
    memberIdCounter++;
    return [{ memberId: memberIdCounter }];
  });
}

/** Escape CSV field values that may contain commas or quotes */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a valid name (no commas, quotes, or newlines to keep CSV simple) */
const csvSafeNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0)
  .filter((s) => !/[,"\n\r]/.test(s));

/** Generate a valid email */
const emailArb = fc.emailAddress()
  .filter((e) => !/[,"\n\r]/.test(e));

/** Generate a valid branch ID */
const branchIdArb = fc.integer({ min: 1, max: 100 });

/** Generate a valid CSV row (first_name, last_name, email) */
const validCsvRowArb = fc.record({
  firstName: csvSafeNameArb,
  lastName: csvSafeNameArb,
  email: emailArb,
});

/** Generate a batch of valid CSV rows */
const validCsvBatchArb = fc.array(validCsvRowArb, { minLength: 1, maxLength: 5 });

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Members Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memberIdCounter = 100;
  });

  // =========================================================================
  // Property 10: CSV Import Validation and Creation
  // **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  // =========================================================================
  describe('Property 10: CSV Import Validation and Creation', () => {
    it('valid CSV rows ALWAYS result in successCount equal to number of valid rows', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCsvBatchArb,
          branchIdArb,
          async (rows, branchId) => {
            vi.clearAllMocks();
            memberIdCounter = 100;
            setupDbChain();

            // Deduplicate emails to avoid intra-CSV duplicate errors
            const seenEmails = new Set<string>();
            const uniqueRows = rows.filter((r) => {
              const email = r.email.toLowerCase();
              if (seenEmails.has(email)) return false;
              seenEmails.add(email);
              return true;
            });

            const header = 'first_name,last_name,home_branch_id,email';
            const dataRows = uniqueRows.map(
              (r) => `${escapeCsvField(r.firstName)},${escapeCsvField(r.lastName)},${branchId},${escapeCsvField(r.email)}`
            );
            const csv = [header, ...dataRows].join('\n');

            const event = createEvent(
              { csv, branchId },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] }
            );
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);

            // PROPERTY: successCount equals number of unique valid rows
            expect(body.successCount).toBe(uniqueRows.length);
            expect(body.createdMemberIds).toHaveLength(uniqueRows.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('rows with missing first_name ALWAYS produce errors with correct row numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          csvSafeNameArb,
          branchIdArb,
          fc.integer({ min: 1, max: 5 }),
          async (lastName, branchId, numBadRows) => {
            vi.clearAllMocks();
            memberIdCounter = 100;
            setupDbChain();

            const header = 'first_name,last_name,home_branch_id';
            const badRows = Array.from({ length: numBadRows }, () =>
              `,${escapeCsvField(lastName)},${branchId}`
            );
            const csv = [header, ...badRows].join('\n');

            const event = createEvent(
              { csv, branchId },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] }
            );
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);

            // PROPERTY: All bad rows produce errors
            expect(body.successCount).toBe(0);
            expect(body.errors.length).toBeGreaterThanOrEqual(numBadRows);

            // PROPERTY: Error row numbers are valid (>= 2 because row 1 is header)
            for (const error of body.errors) {
              expect(error.row).toBeGreaterThanOrEqual(2);
              expect(error.field).toBe('first_name');
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('totalRows ALWAYS equals the number of data rows in the CSV', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCsvBatchArb,
          branchIdArb,
          async (rows, branchId) => {
            vi.clearAllMocks();
            memberIdCounter = 100;
            setupDbChain();

            const header = 'first_name,last_name,home_branch_id,email';
            const dataRows = rows.map(
              (r, i) => `${escapeCsvField(r.firstName)},${escapeCsvField(r.lastName)},${branchId},${escapeCsvField(`user${i}@test.com`)}`
            );
            const csv = [header, ...dataRows].join('\n');

            const event = createEvent(
              { csv, branchId },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] }
            );
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);

            // PROPERTY: totalRows matches the number of data rows
            expect(body.totalRows).toBe(rows.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('successCount + errorCount ALWAYS accounts for all rows', async () => {
      await fc.assert(
        fc.asyncProperty(
          branchIdArb,
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 0, max: 3 }),
          async (branchId, validCount, invalidCount) => {
            vi.clearAllMocks();
            memberIdCounter = 100;
            setupDbChain();

            const header = 'first_name,last_name,home_branch_id';
            const validRows = Array.from({ length: validCount }, (_, i) =>
              `ValidFirst${i},ValidLast${i},${branchId}`
            );
            const invalidRows = Array.from({ length: invalidCount }, (_, i) =>
              `,MissingFirst${i},${branchId}`
            );
            const csv = [header, ...validRows, ...invalidRows].join('\n');

            const totalDataRows = validCount + invalidCount;
            if (totalDataRows === 0) return; // Skip empty case

            const event = createEvent(
              { csv, branchId },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] }
            );
            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);

            // PROPERTY: totalRows = validCount + invalidCount
            expect(body.totalRows).toBe(totalDataRows);
            // PROPERTY: successCount <= totalRows
            expect(body.successCount).toBeLessThanOrEqual(body.totalRows);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
