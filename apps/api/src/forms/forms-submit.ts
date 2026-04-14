// @kairos/api - Forms Submit Lambda
// Task 16.5: Submit a form response
// - Validate submission data against form definition schema (basic type checking)
// - Store submission in database with timestamp
// - Link to member record if logged in (ctx.memberId)
// - Return submission confirmation

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { forms, formSubmissions } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  validateOrThrow,
  formSubmitSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('forms-submit');

/** Valid field types for basic type checking */
const FIELD_TYPE_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  Text: (v) => typeof v === 'string',
  Email: (v) => typeof v === 'string',
  Phone: (v) => typeof v === 'string',
  Number: (v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v))),
  Date: (v) => typeof v === 'string',
  Dropdown: (v) => typeof v === 'string',
  Checkbox: (v) => typeof v === 'boolean' || Array.isArray(v),
  Radio: (v) => typeof v === 'string',
  Textarea: (v) => typeof v === 'string',
};

/**
 * Basic validation of submission data against form definition.
 * Checks that required fields are present and values match expected types.
 */
function validateSubmissionData(
  submissionData: Record<string, unknown>,
  formDefinition: Record<string, unknown>
): string[] {
  const errors: string[] = [];
  const fields = (formDefinition.fields as Array<Record<string, unknown>>) || [];

  for (const field of fields) {
    const fieldName = field.name as string;
    const fieldType = field.type as string;
    const required = field.required as boolean;
    const value = submissionData[fieldName];

    // Check required fields
    if (required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${fieldName}' is required`);
      continue;
    }

    // Skip type check if value is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Basic type checking
    const validator = FIELD_TYPE_VALIDATORS[fieldType];
    if (validator && !validator(value)) {
      errors.push(`Field '${fieldName}' has invalid type, expected ${fieldType}`);
    }
  }

  return errors;
}

/**
 * Lambda handler for submitting a form response.
 *
 * Flow:
 * 1. Extract auth context
 * 2. Parse and validate input
 * 3. Fetch the form definition
 * 4. Enforce branch access for branch-specific forms
 * 5. Validate submission data against form definition
 * 6. Store submission
 * 7. Return confirmation
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Submitting form', { userId: ctx.memberId });

    // 2. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(formSubmitSchema, body);

    const db = getDb();

    // 3. Fetch the form definition
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, input.form_id))
      .limit(1);

    if (!form) {
      throw new NotFoundError('Form', String(input.form_id));
    }

    if (!form.isActive) {
      throw new BadRequestError('This form is no longer accepting submissions');
    }

    // 4. Enforce branch access for branch-specific forms
    if (
      form.scope === 'Branch-specific' &&
      form.targetBranchId &&
      !isAdmin(ctx) &&
      form.targetBranchId !== ctx.branchId
    ) {
      throw new ForbiddenError('You do not have access to submit this branch-specific form');
    }

    // 5. Validate submission data against form definition
    const formDefinition = form.formDefinition as Record<string, unknown>;
    const validationErrors = validateSubmissionData(
      input.submission_data as Record<string, unknown>,
      formDefinition
    );

    if (validationErrors.length > 0) {
      throw new BadRequestError(
        `Form validation failed: ${validationErrors.join('; ')}`
      );
    }

    // 6. Store submission
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        formId: input.form_id,
        memberId: ctx.memberId || null,
        submissionData: input.submission_data,
      })
      .returning();

    logger.info('Form submitted successfully', {
      submissionId: submission!.id,
      formId: input.form_id,
      memberId: ctx.memberId,
    });

    // 7. Return submission confirmation
    return createdResponse({
      submissionId: submission!.id,
      formId: submission!.formId,
      submittedAt: submission!.submittedAt,
      message: 'Form submitted successfully',
    });
  } catch (error) {
    return handleError(error, { operation: 'forms-submit' });
  }
};
