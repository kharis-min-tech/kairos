// @kairos/api - Forms Create Lambda
// Task 16.1: Create form definition
// - Store form definition as JSON schema
// - Support field types: Text, Email, Phone, Number, Date, Dropdown, Checkbox, Radio, Textarea
// - Allow setting scope: Church-wide or Branch-specific
// - When Branch-specific, require target_branch_id (validated by formCreateSchema)
// - Restrict to admins and leaders only
// - Set createdBy to ctx.memberId
// - For Branch-specific forms, enforce branch access

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { forms } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  validateOrThrow,
  formCreateSchema,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  ForbiddenError,
  isAdmin,
  isLeader,
} from '@kairos/utils';

const logger = createLogger('forms-create');

/**
 * Lambda handler for creating a new form definition.
 *
 * Flow:
 * 1. Extract auth context from authorizer
 * 2. Restrict to admins and leaders only
 * 3. Parse and validate input body
 * 4. Enforce branch access for branch-specific forms
 * 5. Insert form record
 * 6. Return created form
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating form', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Restrict to admins and leaders only
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only admins and leaders can create forms');
    }

    // 3. Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const input = validateOrThrow(formCreateSchema, body);

    // 4. Enforce branch access for branch-specific forms
    if (input.scope === 'Branch-specific' && input.target_branch_id) {
      enforceBranchAccess(ctx, input.target_branch_id);
    }

    const db = getDb();

    // 5. Insert form record
    const [created] = await db
      .insert(forms)
      .values({
        formName: input.form_name,
        formDescription: input.form_description,
        formDefinition: input.form_definition,
        scope: input.scope,
        targetBranchId: input.target_branch_id ?? null,
        isActive: true,
        isTemplate: false,
        createdBy: ctx.memberId,
      })
      .returning();

    logger.info('Form created successfully', {
      formId: created!.formId,
      scope: created!.scope,
      createdBy: ctx.memberId,
    });

    // 6. Return created form
    return createdResponse(created);
  } catch (error) {
    return handleError(error, { operation: 'forms-create' });
  }
};
