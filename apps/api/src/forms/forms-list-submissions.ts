// @kairos/api - Forms List Submissions Lambda
// Task 16.6: List form submissions
// - Filter by form type, date, branch
// - Pastors see only their branch submissions
// - Paginate results

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, desc } from 'drizzle-orm';
import { forms, formSubmissions, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
  isLeader,
} from '@kairos/utils';

const logger = createLogger('forms-list-submissions');

/**
 * Lambda handler for listing form submissions with pagination and filtering.
 *
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * - formId (filter by specific form)
 * - startDate (filter submissions from this date, ISO format)
 * - endDate (filter submissions up to this date, ISO format)
 *
 * Access control:
 * - Admins see all submissions
 * - Pastors/Leaders see only submissions for their branch forms
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Listing form submissions', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Restrict to admins and leaders
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only admins and leaders can view form submissions');
    }

    // 3. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const formIdFilter = params.formId ? parseInt(params.formId, 10) : undefined;
    const startDate = params.startDate;
    const endDate = params.endDate;

    const db = getDb();
    const offset = (page - 1) * limit;

    // 4. Build WHERE conditions
    const conditions = [];

    // Filter by specific form
    if (formIdFilter) {
      conditions.push(eq(formSubmissions.formId, formIdFilter));
    }

    // Date range filters
    if (startDate) {
      conditions.push(
        sql`${formSubmissions.submittedAt} >= ${startDate}::timestamp`
      );
    }
    if (endDate) {
      conditions.push(
        sql`${formSubmissions.submittedAt} <= ${endDate}::timestamp`
      );
    }

    // Branch isolation: non-admins see only submissions for their branch forms
    // Join with forms table to enforce branch filtering
    if (!isAdmin(ctx)) {
      conditions.push(
        sql`(${forms.scope} = 'Church-wide' OR ${forms.targetBranchId} = ${ctx.branchId})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 5. Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formSubmissions)
      .innerJoin(forms, eq(formSubmissions.formId, forms.formId))
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 6. Get paginated results with form name and member info
    const data = await db
      .select({
        submissionId: formSubmissions.submissionId,
        formId: formSubmissions.formId,
        formName: forms.formName,
        memberId: formSubmissions.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        submissionData: formSubmissions.submissionData,
        submittedAt: formSubmissions.submittedAt,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(formSubmissions.formId, forms.formId))
      .leftJoin(members, eq(formSubmissions.memberId, members.memberId))
      .where(whereClause)
      .orderBy(desc(formSubmissions.submittedAt))
      .limit(limit)
      .offset(offset);

    logger.info('Form submissions listed', { total, page, limit });

    // 7. Return paginated response
    return successResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleError(error, { operation: 'forms-list-submissions' });
  }
};
