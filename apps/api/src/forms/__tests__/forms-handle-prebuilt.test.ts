// Unit tests for the Forms Handle Pre-built Lambda handler
// Task 16.10: Tests for pre-built form integrations (department signup, soul capture)
//
// **Validates: Requirements 20.9, 20.10**

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

import { handler } from '../forms-handle-prebuilt';

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
    path: '/v1/forms/prebuilt',
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
// Tests
// ---------------------------------------------------------------------------

describe('Forms Handle Pre-built Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Task 16.10: Department signup creates join request
  // (departmentMembers record with isActive=false)
  // =========================================================================
  it('should create a department member record with isActive=false for department-signup', async () => {
    setupPrebuiltDb({
      insertResults: [
        // First insert: departmentMembers record
        [{ departmentMemberId: 1, branchDepartmentId: 5, memberId: 1, isActive: false }],
        // Second insert: formSubmissions record
        [{ submissionId: 100, formId: null, memberId: 1, submittedAt: '2025-01-15' }],
      ],
    });

    const event = createEvent({
      form_type: 'department-signup',
      submission_data: {
        branch_department_id: 5,
      },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.formType).toBe('department-signup');
    expect(body.integration.type).toBe('department-signup');
    expect(body.integration.status).toBe('pending');
    expect(body.integration.departmentMemberId).toBe(1);
  });

  // =========================================================================
  // Task 16.10: Soul capture form creates soul record assigned to submitter
  // with status 'New'
  // =========================================================================
  it('should create a soul record assigned to submitter with status New for soul-capture', async () => {
    setupPrebuiltDb({
      // Select: outreach program lookup
      selectResults: [[{ outreachId: 3 }]],
      insertResults: [
        // First insert: souls record
        [{ soulId: 10, outreachId: 3, assignedMemberId: 1, status: 'New' }],
        // Second insert: formSubmissions record
        [{ submissionId: 101, formId: null, memberId: 1, submittedAt: '2025-01-15' }],
      ],
    });

    const event = createEvent({
      form_type: 'soul-capture',
      submission_data: {
        outreach_id: 3,
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '+447700900001',
      },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.formType).toBe('soul-capture');
    expect(body.integration.type).toBe('soul-capture');
    expect(body.integration.assignedTo).toBe(1);
    expect(body.integration.status).toBe('New');
    expect(body.integration.soulId).toBe(10);
  });

  // =========================================================================
  // Task 16.10: Invalid form_type rejected
  // =========================================================================
  it('should return 400 for an invalid form_type', async () => {
    setupPrebuiltDb({});

    const event = createEvent({
      form_type: 'invalid-type',
      submission_data: { some: 'data' },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Invalid form_type');
  });

  // =========================================================================
  // Task 16.10: Missing required fields rejected
  // (e.g., no branch_department_id for department-signup)
  // =========================================================================
  it('should return 400 when department-signup is missing branch_department_id', async () => {
    setupPrebuiltDb({});

    const event = createEvent({
      form_type: 'department-signup',
      submission_data: {
        // branch_department_id intentionally omitted
      },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('branch_department_id');
  });

  it('should return 400 when soul-capture is missing outreach_id', async () => {
    setupPrebuiltDb({});

    const event = createEvent({
      form_type: 'soul-capture',
      submission_data: {
        first_name: 'Jane',
        last_name: 'Doe',
        // outreach_id intentionally omitted
      },
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('outreach_id');
  });

  it('should return 400 when submission_data is missing', async () => {
    setupPrebuiltDb({});

    const event = createEvent({
      form_type: 'department-signup',
      // submission_data intentionally omitted
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
