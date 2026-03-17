// @kairos/api - List Branches Lambda
// GET /v1/branches
// Lists branches with filters. Pastors see only their assigned branch.
// Supports pagination.

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, ilike, sql } from 'drizzle-orm';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';
import type { AuthContext } from '@kairos/utils';
import { branches, regions } from '@kairos/database';

const logger = createLogger('branches-list');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context (optional — endpoint is public for signup)
    let ctx: AuthContext | null = null;
    try {
      ctx = await resolveAuthContext(event);
      logger.info('Listing branches', { memberId: ctx.memberId });
    } catch {
      // Unauthenticated call (e.g. signup branch selector) — show all active branches
      logger.info('Listing branches (public)');
    }

    // 2. Parse query parameters
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const search = params.search?.trim();
    const regionId = params.region_id ? parseInt(params.region_id, 10) : undefined;
    const branchType = params.branch_type;
    const activeOnly = params.is_active !== 'false'; // default to active only

    // 3. Build filter conditions
    const conditions = [];

    // Authenticated non-admins see only their assigned branch
    if (ctx && !isAdmin(ctx)) {
      conditions.push(eq(branches.branchId, ctx.branchId));
    }

    if (activeOnly) {
      conditions.push(eq(branches.isActive, true));
    }

    if (regionId) {
      conditions.push(eq(branches.regionId, regionId));
    }

    if (branchType) {
      conditions.push(eq(branches.branchType, branchType));
    }

    if (search) {
      conditions.push(ilike(branches.branchName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 4. Query database
    const db = getDb();

    const [branchList, countResult] = await Promise.all([
      db
        .select({
          branchId: branches.branchId,
          branchName: branches.branchName,
          regionId: branches.regionId,
          regionName: regions.regionName,
          branchType: branches.branchType,
          address: branches.address,
          city: branches.city,
          postalCode: branches.postalCode,
          phone: branches.phone,
          email: branches.email,
          establishedDate: branches.establishedDate,
          isActive: branches.isActive,
          createdAt: branches.createdAt,
          updatedAt: branches.updatedAt,
        })
        .from(branches)
        .leftJoin(regions, eq(branches.regionId, regions.regionId))
        .where(whereClause)
        .orderBy(branches.branchName)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(branches)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    logger.info('Branches listed', { count: branchList.length, total });

    return successResponse({
      data: branchList,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleError(error, { operation: 'branches-list' });
  }
};
