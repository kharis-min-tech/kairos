// @kairos/api - Donations List Lambda (Task 15.8)
// Lists donations with pagination, filtering by member, branch, date range, purpose.
// Enforces branch-level authorization (pastors see only their branch).
// Paginated results (default 50 per page).
// Ordered by donation_date desc.
//
// **Requirements: 15.8**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations, members } from '@kairos/database';
import { eq, and, sql, desc, between } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('donations-list');

/**
 * Lambda handler for listing donations with pagination and filters.
 *
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * - memberId (filter by specific member)
 * - branchId (filter by branch — admin only)
 * - dateFrom / dateTo (date range filter, YYYY-MM-DD)
 * - purpose (filter by donation purpose)
 * - status (filter by status: completed, pending, failed)
 * - anonymous (filter: true = anonymous only, false = non-anonymous only)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Listing donations', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const memberId = params.memberId ? parseInt(params.memberId, 10) : undefined;
    const branchIdFilter = params.branchId ? parseInt(params.branchId, 10) : undefined;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;
    const purpose = params.purpose;
    const status = params.status;
    const anonymous = params.anonymous;

    const db = getDb();
    const offset = (page - 1) * limit;

    // 3. Build WHERE conditions
    const conditions = [];

    // Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      conditions.push(eq(donations.branchId, ctx.branchId));
    } else if (branchIdFilter) {
      conditions.push(eq(donations.branchId, branchIdFilter));
    }

    // Member filter
    if (memberId) {
      conditions.push(eq(donations.memberId, memberId));
    }

    // Date range filter
    if (dateFrom && dateTo) {
      conditions.push(between(donations.donationDate, dateFrom, dateTo));
    } else if (dateFrom) {
      conditions.push(sql`${donations.donationDate} >= ${dateFrom}`);
    } else if (dateTo) {
      conditions.push(sql`${donations.donationDate} <= ${dateTo}`);
    }

    // Purpose filter
    if (purpose) {
      conditions.push(eq(donations.donationPurpose, purpose));
    }

    // Status filter
    if (status) {
      conditions.push(eq(donations.status, status));
    }

    // Anonymous filter
    if (anonymous === 'true') {
      conditions.push(eq(donations.isAnonymous, true));
    } else if (anonymous === 'false') {
      conditions.push(eq(donations.isAnonymous, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 4. Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(donations)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 5. Get paginated results with member name (left join for anonymous)
    const data = await db
      .select({
        donationId: donations.donationId,
        memberId: donations.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        branchId: donations.branchId,
        donationDate: donations.donationDate,
        amount: donations.amount,
        currency: donations.currency,
        donationPurpose: donations.donationPurpose,
        description: donations.description,
        paymentMethod: donations.paymentMethod,
        referenceNumber: donations.referenceNumber,
        stripePaymentId: donations.stripePaymentId,
        status: donations.status,
        isAnonymous: donations.isAnonymous,
        notes: donations.notes,
        recordedBy: donations.recordedBy,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .leftJoin(members, eq(donations.memberId, members.memberId))
      .where(whereClause)
      .orderBy(desc(donations.donationDate))
      .limit(limit)
      .offset(offset);

    // 6. Mask anonymous donor names
    const results = data.map((d) => ({
      ...d,
      memberFirstName: d.isAnonymous ? 'Anonymous' : d.memberFirstName,
      memberLastName: d.isAnonymous ? '' : d.memberLastName,
    }));

    logger.info('Donations listed', { total, page, limit });

    // 7. Return paginated response
    return successResponse({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleError(error, { operation: 'donations-list' });
  }
};
