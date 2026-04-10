// @kairos/api - Members List Lambda
// Lists members with pagination, search, filtering, and sorting
// Enforces branch isolation — pastors see only their branch members

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, or, ilike, sql, asc, desc } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('members-list');

/** Allowed sort columns to prevent SQL injection */
const SORT_COLUMNS: Record<string, any> = {
  lastName: members.lastName,
  firstName: members.firstName,
  membershipDate: members.membershipDate,
  email: members.email,
};

/**
 * Lambda handler for listing members with pagination, search, and filters.
 *
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * - search (searches name, email, phone)
 * - branchId (filter by branch)
 * - status (active | pending | all, default: active)
 * - sortBy (lastName | firstName | membershipDate | email)
 * - sortOrder (asc | desc, default: asc)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Listing members', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const search = params.search?.trim();
    const branchIdFilter = params.branchId ? parseInt(params.branchId, 10) : undefined;
    const status = params.status || 'active';
    const sortBy = params.sortBy || 'lastName';
    const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';

    const db = getDb();
    const offset = (page - 1) * limit;

    // 3. Build WHERE conditions
    const conditions = [];

    // Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      conditions.push(eq(members.homeBranchId, ctx.branchId));
    } else if (branchIdFilter) {
      conditions.push(eq(members.homeBranchId, branchIdFilter));
    }

    // Status filter
    if (status === 'active') {
      conditions.push(eq(members.isActive, true));
    } else if (status === 'pending') {
      conditions.push(eq(members.isActive, false));
    }
    // 'all' — no status filter

    // Search filter (name, email, phone)
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(members.firstName, searchPattern),
          ilike(members.lastName, searchPattern),
          ilike(members.email, searchPattern),
          ilike(members.phone, searchPattern),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 4. Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // 5. Get paginated results with sorting
    const sortColumn = SORT_COLUMNS[sortBy] || members.lastName;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const data = await db
      .select()
      .from(members)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    logger.info('Members listed', { total, page, limit });

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
    return handleError(error, { operation: 'members-list' });
  }
};
