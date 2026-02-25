// @kairos/api - Forms List Lambda
// Task 16.3: List forms filtered by scope and branch
// - Enforce authorization (branch-specific forms only for that branch)
// - Exclude templates (isTemplate=false) unless ?includeTemplates=true
// - Paginate results

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { forms } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('forms-list');

/**
 * Lambda handler for listing forms with pagination and filtering.
 *
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * - scope (Church-wide | Branch-specific)
 * - includeTemplates (true to include templates, default: false)
 *
 * Access control:
 * - Admins see all forms
 * - Non-admins see Church-wide forms + their branch-specific forms
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Listing forms', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const scopeFilter = params.scope;
    const includeTemplates = params.includeTemplates === 'true';

    const db = getDb();
    const offset = (page - 1) * limit;

    // 3. Build WHERE conditions
    const conditions = [];

    // Only active forms
    conditions.push(eq(forms.isActive, true));

    // Exclude templates unless explicitly requested
    if (!includeTemplates) {
      conditions.push(eq(forms.isTemplate, false));
    }

    // Scope filter
    if (scopeFilter) {
      conditions.push(eq(forms.scope, scopeFilter));
    }

    // Branch isolation: non-admins see Church-wide + their branch forms only
    if (!isAdmin(ctx)) {
      conditions.push(
        or(
          eq(forms.scope, 'Church-wide'),
          and(
            eq(forms.scope, 'Branch-specific'),
            eq(forms.targetBranchId, ctx.branchId)
          )
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 4. Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(forms)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 5. Get paginated results
    const data = await db
      .select()
      .from(forms)
      .where(whereClause)
      .orderBy(desc(forms.createdAt))
      .limit(limit)
      .offset(offset);

    logger.info('Forms listed', { total, page, limit });

    // 6. Return paginated response
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
    return handleError(error, { operation: 'forms-list' });
  }
};
