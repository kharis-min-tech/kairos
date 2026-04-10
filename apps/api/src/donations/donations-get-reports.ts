// @kairos/api - Donations Get Reports Lambda (Task 15.9)
// Generates donation reports:
//   - Total donations by branch and purpose
//   - Top donors list (shows "Anonymous" for is_anonymous=TRUE)
//   - Date range filtering
// Enforces branch isolation for pastors.
// GBP only for MVP.
//
// **Requirements: 15.9**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations, members } from '@kairos/database';
import { eq, and, sql, desc, between, sum, count } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('donations-get-reports');

/**
 * Lambda handler for donation reports.
 *
 * Query parameters:
 * - branchId (admin only — pastors auto-scoped)
 * - dateFrom / dateTo (date range filter, YYYY-MM-DD)
 * - topN (number of top donors to return, default: 10)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Generating donation reports', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const branchIdFilter = params.branchId ? parseInt(params.branchId, 10) : undefined;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;
    const topN = Math.min(50, Math.max(1, parseInt(params.topN || '10', 10) || 10));

    const db = getDb();

    // 3. Determine effective branch filter
    const effectiveBranchId = isAdmin(ctx) ? branchIdFilter : ctx.branchId;

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

    // 5. Total donations by purpose
    const byPurpose = await db
      .select({
        donationPurpose: donations.donationPurpose,
        totalAmount: sum(donations.amount),
        donationCount: count(),
      })
      .from(donations)
      .where(baseWhere)
      .groupBy(donations.donationPurpose)
      .orderBy(desc(sum(donations.amount)));

    // 6. Total donations by branch (admin only — shows all branches)
    let byBranch: { branchId: number; totalAmount: string | null; donationCount: number }[] = [];
    if (isAdmin(ctx) && !effectiveBranchId) {
      byBranch = await db
        .select({
          branchId: donations.branchId,
          totalAmount: sum(donations.amount),
          donationCount: count(),
        })
        .from(donations)
        .where(baseWhere)
        .groupBy(donations.branchId)
        .orderBy(desc(sum(donations.amount)));
    }

    // 7. Grand total
    const [grandTotal] = await db
      .select({
        totalAmount: sum(donations.amount),
        donationCount: count(),
      })
      .from(donations)
      .where(baseWhere);

    // 8. Top donors (show "Anonymous" for anonymous donations)
    const topDonors = await db
      .select({
        memberId: donations.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        isAnonymous: donations.isAnonymous,
        totalAmount: sum(donations.amount),
        donationCount: count(),
      })
      .from(donations)
      .leftJoin(members, eq(donations.memberId, members.memberId))
      .where(baseWhere)
      .groupBy(
        donations.memberId,
        members.firstName,
        members.lastName,
        donations.isAnonymous
      )
      .orderBy(desc(sum(donations.amount)))
      .limit(topN);

    // Mask anonymous donor names
    const topDonorsList = topDonors.map((d) => ({
      memberId: d.isAnonymous ? null : d.memberId,
      name: d.isAnonymous ? 'Anonymous' : `${d.firstName} ${d.lastName}`,
      totalAmount: d.totalAmount,
      donationCount: d.donationCount,
    }));

    logger.info('Donation reports generated', {
      branchId: effectiveBranchId,
      dateFrom,
      dateTo,
    });

    // 9. Return report data
    return successResponse({
      summary: {
        totalAmount: grandTotal?.totalAmount ?? '0',
        donationCount: grandTotal?.donationCount ?? 0,
        currency: 'GBP',
      },
      byPurpose,
      byBranch,
      topDonors: topDonorsList,
      filters: {
        branchId: effectiveBranchId ?? null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      },
    });
  } catch (error) {
    return handleError(error, { operation: 'donations-get-reports' });
  }
};
