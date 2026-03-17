// @kairos/api - Souls List Lambda
// Filters by status, assigned worker, date range.
// Workers see their assigned souls; leaders see all in their scope.
//
// **Requirements: 15.6, 16.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { souls, members, outreachPrograms } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  isLeader,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('souls-list');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Listing souls', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const status = params.status;
    const assignedMemberId = params.assignedMemberId ? parseInt(params.assignedMemberId, 10) : undefined;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    const db = getDb();

    const conditions = [];

    // Branch isolation via outreach program's branch
    if (!isAdmin(ctx)) {
      conditions.push(eq(outreachPrograms.branchId, ctx.branchId));
    }

    // Workers see only their assigned souls (unless leader/pastor/admin)
    if (!isAdmin(ctx) && !isPastor(ctx) && !isLeader(ctx)) {
      conditions.push(eq(souls.assignedMemberId, ctx.memberId));
    }

    if (status) {
      conditions.push(eq(souls.status, status));
    }

    if (assignedMemberId) {
      conditions.push(eq(souls.assignedMemberId, assignedMemberId));
    }

    if (dateFrom) {
      conditions.push(gte(souls.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(souls.createdAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select({
        soulId: souls.soulId,
        firstName: souls.firstName,
        lastName: souls.lastName,
        phone: souls.phone,
        email: souls.email,
        status: souls.status,
        assignedMemberId: souls.assignedMemberId,
        assignedFirstName: members.firstName,
        assignedLastName: members.lastName,
        outreachId: souls.outreachId,
        programName: outreachPrograms.programName,
        createdAt: souls.createdAt,
        updatedAt: souls.updatedAt,
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .leftJoin(members, eq(souls.assignedMemberId, members.memberId))
      .where(whereClause)
      .orderBy(desc(souls.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const soulsList = data.map(s => ({
      soulId: s.soulId,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      email: s.email,
      status: s.status,
      outreachId: s.outreachId,
      programName: s.programName,
      assignedWorker: s.assignedFirstName
        ? { memberId: s.assignedMemberId, firstName: s.assignedFirstName, lastName: s.assignedLastName }
        : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    logger.info('Souls listed', { total, page });

    return successResponse({
      data: soulsList,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleError(error);
  }
};
