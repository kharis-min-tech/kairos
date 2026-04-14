// @kairos/api - Reports Get Soul Funnel Lambda (Task 21.7)
// Returns counts at each soul status stage and conversion rates.
// Souls are linked to outreach programs which have branch_id,
// so branch filtering joins souls with outreachPrograms.
// Enforces branch isolation for pastors.
//
// **Requirements: 29.1, 29.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { souls, outreachPrograms } from '@kairos/database';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('reports-get-soul-funnel');

/**
 * Lambda handler for soul funnel report.
 *
 * Query parameters:
 * - branchId (admin only — pastors auto-scoped)
 * - dateFrom / dateTo (optional date range, YYYY-MM-DD, filters by soul created_at)
 *
 * Returns funnel counts per status and conversion rate.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Getting soul funnel', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = (event.queryStringParameters || {}) as Record<string, string | undefined>;
    const requestedBranchId: string | undefined = params.branchId;
    const branchId: string = requestedBranchId || ctx.branchId;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    // 3. Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    // 4. Build WHERE conditions
    // Souls are linked to outreach programs which have branch_id
    const conditions = [eq(outreachPrograms.branchId, branchId)];

    if (dateFrom) {
      conditions.push(gte(souls.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(souls.createdAt, new Date(dateTo)));
    }

    const whereClause = and(...conditions);

    // 5. Get counts per status
    const statusCounts = await db
      .select({
        status: souls.status,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
      .where(whereClause)
      .groupBy(souls.status);

    // 6. Build funnel in pipeline order
    const countsMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countsMap[row.status || 'Unknown'] = row.count;
    }

    const funnel = [
      { status: 'New', count: countsMap['New'] || 0 },
      { status: 'Following Up', count: countsMap['Following Up'] || 0 },
      { status: 'Interested', count: countsMap['Interested'] || 0 },
      { status: 'Converted', count: countsMap['Converted'] || 0 },
      { status: 'Not Interested', count: countsMap['Not Interested'] || 0 },
    ];

    // Include Lost Contact if any exist
    if (countsMap['Lost Contact']) {
      funnel.push({ status: 'Lost Contact', count: countsMap['Lost Contact'] });
    }

    // 7. Calculate totals and conversion rate
    const totalSouls = funnel.reduce((sum, stage) => sum + stage.count, 0);
    const converted = countsMap['Converted'] || 0;
    const conversionRate = totalSouls > 0
      ? parseFloat(((converted / totalSouls) * 100).toFixed(1))
      : 0;

    logger.info('Soul funnel retrieved', { branchId, totalSouls, conversionRate });

    // 8. Return funnel data
    return successResponse({
      branchId,
      funnel,
      conversionRate,
      totalSouls,
      filters: {
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
