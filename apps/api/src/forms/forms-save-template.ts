// @kairos/api - Forms Save Template Lambda
// Task 16.8: Save an existing form definition as a reusable template
// - Copy the form definition, set isTemplate=true
// - Restrict to admins and leaders

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { forms } from '@kairos/database';
import {
  resolveAuthContext,
  handleError,
  createdResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
  isAdmin,
  isLeader,
} from '@kairos/utils';

const logger = createLogger('forms-save-template');

/**
 * Lambda handler for saving an existing form as a reusable template.
 *
 * Path parameter: formId
 * Body (optional): { template_name?: string }
 *
 * Flow:
 * 1. Extract auth context and restrict to admins/leaders
 * 2. Fetch the source form
 * 3. Copy the form definition as a new template record
 * 4. Return the created template
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Saving form as template', { userId: ctx.memberId });

    // Restrict to admins and leaders
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only admins and leaders can save form templates');
    }

    const formId = parseInt(event.pathParameters?.formId || '', 10);
    if (isNaN(formId)) {
      throw new NotFoundError('Form', event.pathParameters?.formId);
    }

    const body = JSON.parse(event.body || '{}');
    const templateName = body.template_name;

    const db = getDb();

    // 2. Fetch the source form
    const [sourceForm] = await db
      .select()
      .from(forms)
      .where(eq(forms.formId, formId))
      .limit(1);

    if (!sourceForm) {
      throw new NotFoundError('Form', String(formId));
    }

    // 3. Copy the form definition as a new template record
    const [template] = await db
      .insert(forms)
      .values({
        formName: templateName || `${sourceForm.formName} (Template)`,
        formDescription: sourceForm.formDescription,
        formDefinition: sourceForm.formDefinition,
        scope: 'Church-wide', // Templates are always Church-wide
        targetBranchId: null,
        isActive: true,
        isTemplate: true,
        createdBy: ctx.memberId,
      })
      .returning();

    logger.info('Form saved as template', {
      templateId: template!.formId,
      sourceFormId: formId,
      createdBy: ctx.memberId,
    });

    // 4. Return the created template
    return createdResponse(template);
  } catch (error) {
    return handleError(error, { operation: 'forms-save-template' });
  }
};
