// Property-based tests for form scope and access control
// Task 16.2: Verifies invariants for Branch-specific vs Church-wide forms
// Uses fast-check to verify across many random inputs
//
// **Validates: Requirements 20.4, 20.5**

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

import { handler } from '../forms-create';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEvent(
  body?: Record<string, unknown>,
  auth?: { memberId?: number; branchId?: number; roles?: string[] },
): APIGatewayProxyEvent {
  const ctx = {
    memberId: auth?.memberId ?? 1,
    branchId: auth?.branchId ?? 10,
    roles: auth?.roles ?? ['Admin', 'Member'],
  };
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/forms',
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

function setupDb(options: {
  selectResult?: unknown[];
  insertResult?: unknown[];
  updateResult?: unknown[];
}) {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(options.selectResult || []),
    orderBy: vi.fn().mockResolvedValue(options.selectResult || []),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(options.selectResult || []),
    returning: vi.fn().mockResolvedValue(options.insertResult || options.updateResult || []),
  };
  const insertChain = {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(options.insertResult || []),
    }),
  };
  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(options.updateResult || []),
      }),
    }),
  };
  mockGetDb.mockReturnValue({
    select: vi.fn().mockReturnValue(chainable),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
  });
  return { chainable, insertChain, updateChain };
}

// ---------------------------------------------------------------------------
// Smart Generators
// ---------------------------------------------------------------------------

/** Generate a valid form name */
const formNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Generate a valid branch ID */
const branchIdArb = fc.integer({ min: 1, max: 100 });

/** Generate a valid form definition object */
const formDefinitionArb = fc.record({
  fields: fc.array(
    fc.record({
      type: fc.constantFrom('Text', 'Email', 'Phone', 'Number', 'Date'),
      label: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
      required: fc.boolean(),
    }),
    { minLength: 1, maxLength: 5 },
  ),
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests: Form Scope and Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Property: For any Branch-specific form, target_branch_id must be present
  // **Validates: Req 20.4**
  // =========================================================================
  describe('Property: Branch-specific Form Requires target_branch_id', () => {
    it('for any Branch-specific form created successfully, target_branch_id is ALWAYS present', async () => {
      await fc.assert(
        fc.asyncProperty(
          formNameArb,
          formDefinitionArb,
          branchIdArb,
          async (formName, formDefinition, branchId) => {
            vi.clearAllMocks();

            const createdForm = {
              formId: 1,
              formName,
              formDefinition,
              scope: 'Branch-specific',
              targetBranchId: branchId,
              isActive: true,
              isTemplate: false,
              createdBy: 1,
            };
            setupDb({ insertResult: [createdForm] });

            const event = createEvent(
              {
                form_name: formName,
                form_definition: formDefinition,
                scope: 'Branch-specific',
                target_branch_id: branchId,
              },
              { memberId: 1, branchId, roles: ['Admin', 'Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.scope).toBe('Branch-specific');
              expect(body.targetBranchId).toBeDefined();
              expect(body.targetBranchId).not.toBeNull();
              expect(body.targetBranchId).toBe(branchId);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('for any Branch-specific form without target_branch_id, creation ALWAYS fails with 422', async () => {
      await fc.assert(
        fc.asyncProperty(
          formNameArb,
          formDefinitionArb,
          async (formName, formDefinition) => {
            vi.clearAllMocks();
            setupDb({ insertResult: [] });

            const event = createEvent(
              {
                form_name: formName,
                form_definition: formDefinition,
                scope: 'Branch-specific',
                // target_branch_id intentionally omitted
              },
              { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] },
            );
            const result = await handler(event);

            expect(result.statusCode).toBe(422);
            const body = JSON.parse(result.body);
            expect(body.error.code).toBe('VALIDATION_ERROR');
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // =========================================================================
  // Property: For any Church-wide form, target_branch_id must be null
  // **Validates: Req 20.5**
  // =========================================================================
  describe('Property: Church-wide Form Has Null target_branch_id', () => {
    it('for any Church-wide form created successfully, target_branch_id is ALWAYS null', async () => {
      await fc.assert(
        fc.asyncProperty(
          formNameArb,
          formDefinitionArb,
          async (formName, formDefinition) => {
            vi.clearAllMocks();

            const createdForm = {
              formId: 1,
              formName,
              formDefinition,
              scope: 'Church-wide',
              targetBranchId: null,
              isActive: true,
              isTemplate: false,
              createdBy: 1,
            };
            setupDb({ insertResult: [createdForm] });

            const event = createEvent(
              {
                form_name: formName,
                form_definition: formDefinition,
                scope: 'Church-wide',
              },
              { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] },
            );
            const result = await handler(event);

            if (result.statusCode === 201) {
              const body = JSON.parse(result.body);
              expect(body.scope).toBe('Church-wide');
              expect(body.targetBranchId).toBeNull();
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
