// @kairos/api - Forms Handle Pre-built Lambda
// Task 16.9: Handle pre-built form submissions with special integrations
// - Accept form_type in the body: 'department-signup', 'soul-capture',
//   'baby-dedication', 'first-time-visitor', 'altar-call', 'baptism-request',
//   'baby-naming', 'testimony'
// - For 'department-signup': create a department member record with status 'pending'
// - For 'soul-capture': create a soul record, assign to submitter, set status 'New'
// - For others: just store the submission

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, sql } from 'drizzle-orm';
import { formSubmissions, departmentMembers, souls, outreachPrograms } from '@kairos/database';
import {
  resolveAuthContext,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  BadRequestError,
  NotFoundError,
} from '@kairos/utils';

const logger = createLogger('forms-handle-prebuilt');

/** Valid pre-built form types */
const VALID_FORM_TYPES = [
  'department-signup',
  'soul-capture',
  'baby-dedication',
  'first-time-visitor',
  'altar-call',
  'baptism-request',
  'baby-naming',
  'testimony',
] as const;

type PrebuiltFormType = (typeof VALID_FORM_TYPES)[number];

/**
 * Handle department signup: create a department member record with status 'pending'.
 */
async function handleDepartmentSignup(
  db: ReturnType<typeof getDb>,
  submissionData: Record<string, unknown>,
  memberId: number
): Promise<Record<string, unknown>> {
  const branchDepartmentId = submissionData.branch_department_id as number;

  if (!branchDepartmentId) {
    throw new BadRequestError('branch_department_id is required for department signup');
  }

  // Create department member record with pending status (isActive=false)
  const [departmentMember] = await db
    .insert(departmentMembers)
    .values({
      branchDepartmentId,
      memberId,
      isActive: false, // Pending approval
    })
    .returning();

  return {
    type: 'department-signup',
    departmentMemberId: departmentMember!.departmentMemberId,
    status: 'pending',
  };
}

/**
 * Handle soul capture: create a soul record, assign to submitter, set status 'New'.
 */
async function handleSoulCapture(
  db: ReturnType<typeof getDb>,
  submissionData: Record<string, unknown>,
  memberId: number
): Promise<Record<string, unknown>> {
  const outreachId = submissionData.outreach_id as number;

  if (!outreachId) {
    throw new BadRequestError('outreach_id is required for soul capture');
  }

  // Verify outreach program exists
  const [outreach] = await db
    .select({ outreachId: outreachPrograms.outreachId })
    .from(outreachPrograms)
    .where(eq(outreachPrograms.outreachId, outreachId))
    .limit(1);

  if (!outreach) {
    throw new NotFoundError('Outreach Program', String(outreachId));
  }

  // Create soul record assigned to submitter
  const [soul] = await db
    .insert(souls)
    .values({
      outreachId,
      firstName: (submissionData.first_name as string) || '',
      lastName: (submissionData.last_name as string) || '',
      phone: submissionData.phone as string | undefined,
      email: submissionData.email as string | undefined,
      address: submissionData.address as string | undefined,
      city: submissionData.city as string | undefined,
      gender: submissionData.gender as string | undefined,
      ageRange: submissionData.age_range as string | undefined,
      assignedMemberId: memberId,
      status: 'New',
      notes: submissionData.notes as string | undefined,
    })
    .returning();

  // Increment total_souls_reached on the outreach program
  await db
    .update(outreachPrograms)
    .set({
      totalSoulsReached: sql`${outreachPrograms.totalSoulsReached} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(outreachPrograms.outreachId, outreachId));

  return {
    type: 'soul-capture',
    soulId: soul!.soulId,
    assignedTo: memberId,
    status: 'New',
  };
}

/**
 * Lambda handler for pre-built form submissions with special integrations.
 *
 * Body:
 * - form_type (required) - one of the valid pre-built form types
 * - form_id (optional) - link to a form definition if one exists
 * - submission_data (required) - the form data
 *
 * Flow:
 * 1. Extract auth context
 * 2. Validate form_type
 * 3. Handle special integrations based on form_type
 * 4. Store the submission record
 * 5. Return result
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Handling pre-built form submission', { userId: ctx.memberId });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const { form_type, form_id, submission_data } = body;

    if (!form_type || !VALID_FORM_TYPES.includes(form_type)) {
      throw new BadRequestError(
        `Invalid form_type. Must be one of: ${VALID_FORM_TYPES.join(', ')}`
      );
    }

    if (!submission_data || typeof submission_data !== 'object') {
      throw new BadRequestError('submission_data is required and must be an object');
    }

    const db = getDb();
    let integrationResult: Record<string, unknown> = {};

    // 3. Handle special integrations based on form_type
    const formType = form_type as PrebuiltFormType;

    switch (formType) {
      case 'department-signup':
        if (!ctx.memberId) {
          throw new BadRequestError('You must be logged in to sign up for a department');
        }
        integrationResult = await handleDepartmentSignup(
          db,
          submission_data,
          ctx.memberId
        );
        break;

      case 'soul-capture':
        if (!ctx.memberId) {
          throw new BadRequestError('You must be logged in to capture a soul');
        }
        integrationResult = await handleSoulCapture(
          db,
          submission_data,
          ctx.memberId
        );
        break;

      // For all other pre-built forms, just store the submission
      case 'baby-dedication':
      case 'first-time-visitor':
      case 'altar-call':
      case 'baptism-request':
      case 'baby-naming':
      case 'testimony':
        integrationResult = { type: formType };
        break;
    }

    // 4. Store the submission record
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        formId: form_id || null,
        memberId: ctx.memberId || null,
        submissionData: {
          form_type: formType,
          ...submission_data,
        },
      })
      .returning();

    logger.info('Pre-built form submitted', {
      submissionId: submission!.submissionId,
      formType,
      memberId: ctx.memberId,
    });

    // 5. Return result
    return createdResponse({
      submissionId: submission!.submissionId,
      formType,
      submittedAt: submission!.submittedAt,
      integration: integrationResult,
      message: 'Pre-built form submitted successfully',
    });
  } catch (error) {
    return handleError(error, { operation: 'forms-handle-prebuilt' });
  }
};
