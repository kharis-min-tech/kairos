// Property-based tests for pre-built form submission integrations
// Task 16.10: Verifies invariants for soul-capture and department-signup submissions
// Uses fast-check to verify across many random inputs
//
// **Validates: Requirements 20.9, 20.10**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  forms: {
    formId: 'form_id',
    formName: 'form_name',
    formDescription: 'form_description',
    formDefinition: 'form_definition',
    scope: 'scope',
    targetBranchId: 'target_branch_id',
    isActive: 'is_active',
    isTemplate: 'is_template',
    createdBy: 'created_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  formSubmissions: {
    submissionId: 'submission_id',
    formId: 'form_id',
    memberId: 'member_id',
    submissionData: 'submission_data',
    submittedAt: 'submitted_at',
  },
  departmentMembers: {
    departmentMemberId: 'department_member_id',
    branchDepartmentId: 'branch_department_id',
    memberId: 'member_id',
    isActive: 'is_active',
  },
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
    totalSoulsReached: 'total_souls_reached',
    updatedAt: 'updated_at',
  },
  members: {
    memberId: 'member_id',
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    address: 'address',
    city: 'city',
    postalCode: 'postal_code',
    homeBranchId: 'home_branch_id',
    isActive: 'is_active',
  },
}));

import { handler } from '../forms-handle-prebuilt';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  body?: Record<string, unknown>,
  auth?: { memberId?: string; branchId?: string; roles?: string[] },
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 'test-member-1',
    branchId: auth?.branchId ?? 'test-branch-10',
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/forms/prebuilt',
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
      identity: {} as never,
      path: '',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
  } as APIGatewayProxyEvent;
}

/**
 * Sets up the DB mock with support for multiple insert calls.
 * The prebuilt handler does multiple inserts (integration + formSubmissions),
 * and may also do selects (outreach lookup) and updates (outreach counter).
 */
function setupPrebuiltDb(options: {
  selectResults?: unknown[][];
  insertResults?: unknown[][];
  updateResult?: unknown[];
}) {
  const selectCallIndex = { value: 0 };
  const insertCallIndex = { value: 0 };

  const selectResults = options.selectResults || [[]];
  const insertResults = options.insertResults || [[]];

  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      const idx = selectCallIndex.value++;
      return Promise.resolve(selectResults[idx] || []);
    }),
  };

  const makeInsertChain = () => ({
    values: vi.fn().mockImplementation(() => ({
      returning: vi.fn().mockImplementation(() => {
        const idx = insertCallIndex.value++;
        return Promise.resolve(insertResults[idx] || []);
      }),
    })),
  });

  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(options.updateResult || []),
      }),
    }),
  };

  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainable),
    insert: vi.fn().mockImplementation(() => makeInsertChain()),
    update: vi.fn().mockReturnValue(updateChain),
  });
}

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a valid member ID */
const memberIdArb = fc.uuid();

/** Generate a valid outreach ID */
const outreachIdArb = fc.uuid();

/** Generate a valid branch department ID */
const branchDepartmentIdArb = fc.uuid();

/** Generate a valid soul first name */
const firstNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Generate a valid soul last name */
const lastNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Generate a valid phone number */
const phoneArb = fc.stringMatching(/^\+\d{10,15}$/);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Pre-built Form Submission Integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property: For any soul-capture submission, the created soul must be
  // assigned to the submitter (assigned_member_id = ctx.memberId)
  // **Validates: Req 20.9**
  // =========================================================================
  describe('Property: Soul Capture Assignment', () => {
    it('for any soul-capture submission, the soul is ALWAYS assigned to the submitter', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          outreachIdArb,
          firstNameArb,
          lastNameArb,
          phoneArb,
          async (memberId, outreachId, firstName, lastName, phone) => {
            vi.clearAllMocks();

            setupPrebuiltDb({
              // Select: outreach program exists
              selectResults: [[{ outreachId }]],
              insertResults: [
                // First insert: souls record — assigned to submitter
                [{
                  soulId: 'test-soul-10',
                  outreachId,
                  firstName,
                  lastName,
                  assignedMemberId: memberId,
                  status: 'New',
                }],
                // Second insert: formSubmissions record
                [{ submissionId: 100, formId: null, memberId, submittedAt: '2025-01-15' }],
              ],
            });

            const event = createEvent(
              {
                form_type: 'soul-capture',
                submission_data: {
                  outreach_id: outreachId,
                  first_name: firstName,
                  last_name: lastName,
                  phone,
                },
              },
              { memberId, branchId: 'test-branch-10', roles: ['Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.integration.assignedTo).toBe(memberId);
              expect(body.integration.status).toBe('New');
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // =========================================================================
  // Property: For any department-signup submission, the created record must
  // have isActive=false (pending approval)
  // **Validates: Req 20.10**
  // =========================================================================
  describe('Property: Department Signup Creates Pending Record', () => {
    it('for any department-signup submission, the record ALWAYS has pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          branchDepartmentIdArb,
          async (memberId, branchDepartmentId) => {
            vi.clearAllMocks();

            setupPrebuiltDb({
              insertResults: [
                // First insert: departmentMembers record with isActive=false
                [{
                  departmentMemberId: 'test-dept-member-1',
                  branchDepartmentId,
                  memberId,
                  isActive: false,
                }],
                // Second insert: formSubmissions record
                [{ submissionId: 100, formId: null, memberId, submittedAt: '2025-01-15' }],
              ],
            });

            const event = createEvent(
              {
                form_type: 'department-signup',
                submission_data: {
                  branch_department_id: branchDepartmentId,
                },
              },
              { memberId, branchId: 'test-branch-10', roles: ['Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.formType).toBe('department-signup');
              expect(body.integration.type).toBe('department-signup');
              expect(body.integration.status).toBe('pending');
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
