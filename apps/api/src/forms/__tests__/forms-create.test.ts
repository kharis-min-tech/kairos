// Unit tests for the Forms Create Lambda handler
// Task 16.2: Tests for form scope, access control, and validation
//
// **Validates: Requirements 20.4, 20.5**

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string>,
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
    pathParameters: pathParams || null,
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

const validFormDefinition = {
  fields: [
    { type: 'Text', label: 'Full Name', required: true },
    { type: 'Email', label: 'Email', required: false },
  ],
};

const validChurchWideForm = {
  form_name: 'Visitor Registration',
  form_description: 'A form for first-time visitors',
  form_definition: validFormDefinition,
  scope: 'Church-wide',
};

const validBranchSpecificForm = {
  form_name: 'Branch Event Signup',
  form_description: 'Sign up for branch events',
  form_definition: validFormDefinition,
  scope: 'Branch-specific',
  target_branch_id: 10,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Forms Create Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Task 16.2: Branch-specific form requires target_branch_id
  // =========================================================================
  it('should return 422 when Branch-specific form is missing target_branch_id', async () => {
    setupDb({ insertResult: [] });

    const event = createEvent({
      form_name: 'Branch Form',
      form_definition: validFormDefinition,
      scope: 'Branch-specific',
      // target_branch_id intentionally omitted
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // =========================================================================
  // Task 16.2: Branch-specific form accessible only to that branch's members
  // (Verified by creating a branch-specific form with target_branch_id)
  // =========================================================================
  it('should create a Branch-specific form with the correct target_branch_id', async () => {
    const createdForm = {
      formId: 1,
      formName: 'Branch Event Signup',
      formDescription: 'Sign up for branch events',
      formDefinition: validFormDefinition,
      scope: 'Branch-specific',
      targetBranchId: 10,
      isActive: true,
      isTemplate: false,
      createdBy: 1,
    };
    setupDb({ insertResult: [createdForm] });

    const event = createEvent(validBranchSpecificForm);
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.scope).toBe('Branch-specific');
    expect(body.targetBranchId).toBe(10);
  });

  // =========================================================================
  // Task 16.2: Church-wide form accessible to all members
  // =========================================================================
  it('should create a Church-wide form without target_branch_id', async () => {
    const createdForm = {
      formId: 2,
      formName: 'Visitor Registration',
      formDescription: 'A form for first-time visitors',
      formDefinition: validFormDefinition,
      scope: 'Church-wide',
      targetBranchId: null,
      isActive: true,
      isTemplate: false,
      createdBy: 1,
    };
    setupDb({ insertResult: [createdForm] });

    const event = createEvent(validChurchWideForm);
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.scope).toBe('Church-wide');
    expect(body.targetBranchId).toBeNull();
  });

  // =========================================================================
  // Task 16.2: Only admins and leaders can create forms (member role gets 403)
  // =========================================================================
  it('should return 403 when a regular member tries to create a form', async () => {
    setupDb({ insertResult: [] });

    const event = createEvent(
      validChurchWideForm,
      { memberId: 99, branchId: 10, roles: ['Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('should allow Admin to create a form', async () => {
    const createdForm = {
      formId: 3,
      formName: 'Visitor Registration',
      scope: 'Church-wide',
      targetBranchId: null,
      isActive: true,
      createdBy: 1,
    };
    setupDb({ insertResult: [createdForm] });

    const event = createEvent(
      validChurchWideForm,
      { memberId: 1, branchId: 10, roles: ['Admin', 'Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
  });

  it('should allow Leader to create a form', async () => {
    const createdForm = {
      formId: 4,
      formName: 'Visitor Registration',
      scope: 'Church-wide',
      targetBranchId: null,
      isActive: true,
      createdBy: 5,
    };
    setupDb({ insertResult: [createdForm] });

    const event = createEvent(
      validChurchWideForm,
      { memberId: 5, branchId: 10, roles: ['Leader', 'Member'] },
    );
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
  });
});
