// @kairos/api - Forms Create From Template Lambda
// Task 16.8 (continued): Create a new form from a saved template
// - Clone the template's form definition
// - Allow overriding form_name, scope, target_branch_id
// - Restrict to admins and leaders

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and } from 'drizzle-orm';
import { forms } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  isAdmin,
  isLeader,
} from '@kairos/utils';

const logger = createLogger('forms-create-from-template');

/**
 * Lambda handler for creating a new form from a saved template.
 *
 * Path parameter: templateId
 * Body:
 * - form_name (required) - name for the new form
 * - form_description (optional)
 * - scope (required) - 'Church-wide' or 'Branch-specific'
 * - target_branch_id (required when scope is 'Branch-specific')
 *
 * Flow:
 * 1. Extract auth context and restrict to admins/leaders
 * 2. Fetch the template
 * 3. Validate the template is actually a template
 * 4. Create a new form from the template definition
 * 5. Return the created form
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Creating form from template', { userId: ctx.memberId });

    // Restrict to admins and leaders
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only admins and leaders can create forms from templates');
    }

    const templateId = parseInt(event.pathParameters?.templateId || '', 10);
    if (isNaN(templateId)) {
      throw new NotFoundError('Template', event.pathParameters?.templateId);
    }

    const body = JSON.parse(event.body || '{}');
    const { form_name, form_description, scope, target_branch_id } = body;

    // Validate required fields
    if (!form_name || typeof form_name !== 'string' || form_name.trim().length === 0) {
      throw new BadRequestError('form_name is required');
    }
    if (!scope || !['Church-wide', 'Branch-specific'].includes(scope)) {
      throw new BadRequestError('scope must be Church-wide or Branch-specific');
    }
    if (scope === 'Branch-specific' && !target_branch_id) {
      throw new BadRequestError('target_branch_id is required for Branch-specific forms');
    }

    // Enforce branch access for branch-specific forms
    if (scope === 'Branch-specific' && target_branch_id) {
      enforceBranchAccess(ctx, target_branch_id);
    }

    const db = getDb();

    // 2. Fetch the template
    const [template] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.formId, templateId), eq(forms.isTemplate, true)))
      .limit(1);

    if (!template) {
      throw new NotFoundError('Template', String(templateId));
    }

    // 3. Create a new form from the template definition
    const [created] = await db
      .insert(forms)
      .values({
        formName: form_name.trim(),
        formDescription: form_description || template.formDescription,
        formDefinition: template.formDefinition,
        scope,
        targetBranchId: scope === 'Branch-specific' ? target_branch_id : null,
        isActive: true,
        isTemplate: false,
        createdBy: ctx.memberId,
      })
      .returning();

    logger.info('Form created from template', {
      formId: created!.formId,
      templateId,
      scope,
      createdBy: ctx.memberId,
    });

    // 4. Return the created form
    return createdResponse(created);
  } catch (error) {
    return handleError(error, { operation: 'forms-create-from-template' });
  }
};
