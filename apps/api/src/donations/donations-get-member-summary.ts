// @kairos/api - Donations Get Member Summary Lambda (Task 15.11)
// Calculates total giving per member for the current year.
// Groups by donation purpose.
// Enforces branch-level authorization.
// GBP only for MVP.
//
// **Requirements: 15.11**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations, members } from '@kairos/database';
import { eq, and, sql, sum, count } from 'drizzle-orm';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
} from '@kairos/utils';

const logger = createLogger('donations-get-member-summary');

/**
 * Lambda handler for getting a member's donation summary.
 *
 * Path parameters:
 * - memberId (required)
 *
 * Query parameters:
 * - year (default: current year)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Getting member donation summary', {
      userId: ctx.memberId,
      branchId: ctx.branchId,
    });

    // 2. Parse path parameter
    const memberId = parseInt(event.pathParameters?.memberId || '', 10);
    if (isNaN(memberId)) {
      throw new NotFoundError('Member', event.pathParameters?.memberId || 'unknown');
    }

    // 3. Parse query parameters
    const params = event.queryStringParameters || {};
    const year = parseInt(params.year || String(new Date().getFullYear()), 10);

    const db = getDb();

    // 4. Verify member exists and get their branch
    const [member] = await db
      .select({
        memberId: members.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        homeBranchId: members.homeBranchId,
      })
      .from(members)
      .where(and(eq(members.memberId, memberId), eq(members.isActive, true)))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member', String(memberId));
    }

    // 5. Enforce branch access
    enforceBranchAccess(ctx, member.homeBranchId);

    // 6. Date range for the requested year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // 7. Get totals grouped by purpose (only completed donations)
    const byPurpose = await db
      .select({
        donationPurpose: donations.donationPurpose,
        totalAmount: sum(donations.amount),
        donationCount: count(),
      })
      .from(donations)
      .where(
        and(
          eq(donations.memberId, memberId),
          eq(donations.status, 'completed'),
          sql`${donations.donationDate} >= ${yearStart}`,
          sql`${donations.donationDate} <= ${yearEnd}`
        )
      )
      .groupBy(donations.donationPurpose);

    // 8. Get grand total for the year
    const [grandTotal] = await db
      .select({
        totalAmount: sum(donations.amount),
        donationCount: count(),
      })
      .from(donations)
      .where(
        and(
          eq(donations.memberId, memberId),
          eq(donations.status, 'completed'),
          sql`${donations.donationDate} >= ${yearStart}`,
          sql`${donations.donationDate} <= ${yearEnd}`
        )
      );

    logger.info('Member donation summary generated', {
      memberId,
      year,
      total: grandTotal?.totalAmount ?? '0',
    });

    // 9. Return summary
    return successResponse({
      member: {
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
      },
      year,
      currency: 'GBP',
      summary: {
        totalAmount: grandTotal?.totalAmount ?? '0',
        donationCount: grandTotal?.donationCount ?? 0,
      },
      byPurpose: byPurpose.map((p) => ({
        purpose: p.donationPurpose,
        totalAmount: p.totalAmount ?? '0',
        donationCount: p.donationCount,
      })),
    });
  } catch (error) {
    return handleError(error, { operation: 'donations-get-member-summary' });
  }
};
