// Property-based tests for follow-up date update
// **Property: Follow-up Date Update**
// **Validates: Req 15.7**

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
  souls: { soulId: 'soul_id', outreachId: 'outreach_id', updatedAt: 'updated_at' },
  followUps: { followUpId: 'follow_up_id', soulId: 'soul_id', memberId: 'member_id', followUpDate: 'follow_up_date', contactMethod: 'contact_method', contactStatus: 'contact_status', durationMinutes: 'duration_minutes', notes: 'notes' },
  outreachPrograms: { outreachId: 'outreach_id', branchId: 'branch_id' },
}));

import { handler } from '../souls-log-followup';
import { resolveAuthContext, getDb, enforceBranchAccess, validateOrThrow } from '@kairos/utils';

const mockedGetAuthContext = vi.mocked(resolveAuthContext);
const mockedGetDb = vi.mocked(getDb);
const mockedValidateOrThrow = vi.mocked(validateOrThrow);

function createEvent(body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/souls/followup',
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

describe('Follow-up Date Update (Property)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceBranchAccess).mockImplementation(() => {});
  });

  it('should always update soul updatedAt after logging any follow-up', async () => {
    const contactMethods = ['Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other'] as const;
    const contactStatuses = ['Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested'] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(...contactMethods),
        fc.constantFrom(...contactStatuses),
        async (memberId, soulId, method, status) => {
          vi.clearAllMocks();
          vi.mocked(enforceBranchAccess).mockImplementation(() => {});

          mockedGetAuthContext.mockReturnValue({
            memberId,
            branchId: 10,
            roles: ['Member'],
            email: `member${memberId}@kairos.church`,
          });

          mockedValidateOrThrow.mockReturnValue({
            soul_id: soulId,
            contact_date: new Date('2026-02-10'),
            contact_method: method,
            contact_status: status,
          });

          let updateCalled = false;
          const mockDb = {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([{ soulId, outreachId: 1, branchId: 10 }]),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ followUpId: 1, soulId }]),
              }),
            }),
            update: vi.fn().mockImplementation(() => {
              updateCalled = true;
              return {
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(undefined),
                }),
              };
            }),
          };
          mockedGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

          const event = createEvent({
            soul_id: soulId,
            contact_date: '2026-02-10',
            contact_method: method,
            contact_status: status,
          });

          const result = await handler(event);
          expect(result.statusCode).toBe(201);
          expect(updateCalled).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
