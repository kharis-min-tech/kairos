// @kairos/api - Reports Get Donation Summary Lambda (Task 21.6)
// Returns donation totals grouped by purpose and by branch.
// Only counts completed donations.
// Enforces branch isolation for pastors.
// GBP only for MVP.
//
// **Requirements: 29.1, 29.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations } from '@kairos/database';
import { eq, and, sql, desc, between } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('reports-get-donation-summary');

/**
 * Lambda handler for donation summary report.
 *
 * Query parameters:
 * - branchId (admin only — pastors auto-scoped)
 * - dateFrom / dateTo (optional date range, YYYY-MM-DD)
 *
 * Returns totals by purpose, by branch, and grand total.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Getting donation summary', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = (event.queryStringParameters || {}) as Record<string, string | undefined>;
    const branchIdFilter: string | undefined = params.branchId;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    const db = getDb();

    // 3. Determine effective branch filter
    const branchIdFilterStr: string | undefined = typeof branchIdFilter === 'string' ? branchIdFilter : undefined;
    const effectiveBranchId: string = isAdmin(ctx) ? (branchIdFilterStr || ctx.branchId) : ctx.branchId;

    // 4. Build base conditions (only completed donations)
    const baseConditions = [eq(donations.status, 'completed')];

    if (effectiveBranchId) {
      baseConditions.push(eq(donations.branchId, effectiveBranchId));
    } else if (!isAdmin(ctx)) {
      // Safety: non-admins always scoped to their branch
      baseConditions.push(eq(donations.branchId, ctx.branchId));
    }

    if (dateFrom && dateTo) {
      baseConditions.push(between(donations.donationDate, dateFrom, dateTo));
    } else if (dateFrom) {
      baseConditions.push(sql`${donations.donationDate} >= ${dateFrom}`);
    } else if (dateTo) {
      baseConditions.push(sql`${donations.donationDate} <= ${dateTo}`);
    }

    const baseWhere = and(...baseConditions);

    // 5. Group by donation purpose
    const byPurpose = await db
      .select({
        purpose: donations.donationPurpose,
        total: sql<string>`coalesce(sum(${donations.amount}), 0)::numeric(12,2)`.as('total'),
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(donations)
      .where(baseWhere)
      .groupBy(donations.donationPurpose)
      .orderBy(desc(sql`sum(${donations.amount})`));

    // 6. Group by branch (admin only — shows all branches when no filter)
    let byBranch: { branchId: string; total: string; count: number }[] = [];
    if (isAdmin(ctx) && !effectiveBranchId) {
      byBranch = await db
        .select({
          branchId: donations.branchId,
          total: sql<string>`coalesce(sum(${donations.amount}), 0)::numeric(12,2)`.as('total'),
          count: sql<number>`count(*)::int`.as('count'),
        })
        .from(donations)
        .where(baseWhere)
        .groupBy(donations.branchId)
        .orderBy(desc(sql`sum(${donations.amount})`));
    }

    // 7. Grand total
    const [grandTotalRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${donations.amount}), 0)::numeric(12,2)`.as('total'),
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(donations)
      .where(baseWhere);

    logger.info('Donation summary generated', {
      branchId: effectiveBranchId,
      dateFrom,
      dateTo,
      grandTotal: grandTotalRow?.total,
    });

    // 8. Return summary data
    return successResponse({
      byPurpose,
      byBranch,
      grandTotal: grandTotalRow?.total ?? '0.00',
      totalCount: grandTotalRow?.count ?? 0,
      currency: 'GBP',
      filters: {
        branchId: effectiveBranchId ?? null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
