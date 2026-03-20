// @kairos/api - Forms Get Lambda
// Task 16.4: Return form definition by formId
// - Return form definition by formId from path parameter
// - Auto-populate fields from member profile if logged in (return member data alongside form)
// - Enforce branch access for branch-specific forms

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { forms, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('forms-get');

/**
 * Lambda handler for getting a single form definition.
 *
 * Path parameter: formId
 *
 * Access control:
 * - Admins can view any form
 * - Non-admins can view Church-wide forms and their branch-specific forms
 *
 * Auto-populate:
 * - If the user is logged in, return member profile data alongside the form
 *   so the frontend can pre-fill fields (name, email, phone, etc.)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    const formId = parseInt(event.pathParameters?.formId || '', 10);

    if (isNaN(formId)) {
      throw new NotFoundError('Form', event.pathParameters?.formId);
    }

    logger.info('Getting form', { userId: ctx.memberId, formId });

    const db = getDb();

    // 2. Fetch the form
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.formId, formId))
      .limit(1);

    if (!form) {
      throw new NotFoundError('Form', String(formId));
    }

    // 3. Enforce branch access for branch-specific forms
    if (
      form.scope === 'Branch-specific' &&
      form.targetBranchId &&
      !isAdmin(ctx) &&
      form.targetBranchId !== ctx.branchId
    ) {
      throw new ForbiddenError('You do not have access to this branch-specific form');
    }

    // 4. Auto-populate: fetch member profile data if logged in
    let memberData: Record<string, unknown> | null = null;
    if (ctx.memberId) {
      const [member] = await db
        .select({
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          phone: members.phone,
          dateOfBirth: members.dateOfBirth,
          gender: members.gender,
          address: members.address,
          city: members.city,
          postalCode: members.postalCode,
        })
        .from(members)
        .where(eq(members.memberId, ctx.memberId))
        .limit(1);

      if (member) {
        memberData = member;
      }
    }

    logger.info('Form retrieved', { formId, scope: form.scope });

    // 5. Return form with optional member data for auto-populate
    return successResponse({
      ...form,
      memberProfile: memberData,
    });
  } catch (error) {
    return handleError(error, { operation: 'forms-get' });
  }
};
