// Property-based tests for soul capture and automatic assignment
// **Property: Automatic Soul Assignment**
// **Validates: Req 14.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    enforceBranchAccess: vi.fn(),
    validateOrThrow: vi.fn(),
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

vi.mock('@kairos/database', () => ({
  souls: {
    soulId: 'soul_id',
    outreachId: 'outreach_id',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    gender: 'gender',
    ageRange: 'age_range',
    assignedMemberId: 'assigned_member_id',
    status: 'status',
    notes: 'notes',
  },
  outreachPrograms: {
    outreachId: 'outreach_id',
    branchId: 'branch_id',
  },
}));

import { handler } from '../souls-capture';
import { resolveAuthContext, getDb, enforceBranchAccess, validateOrThrow } from '@kairos/utils';

const mockedResolveAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedValidateOrThrow = vi.mocked(validateOrThrow);

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/souls',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: { member_id: '1', branch_id: '10', roles: '["Member"]' },
    } as unknown as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('Automatic Soul Assignment (Property)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should always assign soul to the capturing member regardless of member ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        async (capturingMemberId, branchId) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedResolveAuthContext.mockResolvedValue({
            memberId: capturingMemberId,
            branchId,
            roles: ['Member'],
            email: `member${capturingMemberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            first_name: 'Test',
            last_name: 'Soul',
            phone: '+447700900001',
            outreach_id: 1,
          });

          let insertedValues: Record<string, unknown> | undefined;

          let selectCallCount = 0;
          const mockDb = {
            select: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return {
                  from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue([{ outreachId: 1, branchId }]),
                    }),
                  }),
                };
              }
              return {
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([]),
                  }),
                }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
                insertedValues = vals;
                return {
                  returning: vi.fn().mockResolvedValue([{
                    soulId: 1,
                    assignedMemberId: capturingMemberId,
                    status: 'New',
                  }]),
                };
              }),
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            first_name: 'Test',
            last_name: 'Soul',
            phone: '+447700900001',
            outreach_id: 1,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(insertedValues).toBeDefined();
          expect(insertedValues!.assignedMemberId).toBe(capturingMemberId);
          expect(insertedValues!.status).toBe('New');
        }
      ),
      { numRuns: 20 }
    );
  });
});
