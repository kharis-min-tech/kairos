// @kairos/api - Outreach List Programs Lambda
// Lists programs by branch with coordinator and worker count.
// Includes souls captured per program.
//
// **Requirements: 13.4, 13.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, sql, desc } from 'drizzle-orm';
import { outreachPrograms, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('outreach-list-programs');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Listing outreach programs', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    const data = await db
      .select({
        outreachId: outreachPrograms.outreachId,
        branchId: outreachPrograms.branchId,
        programName: outreachPrograms.programName,
        programDate: outreachPrograms.programDate,
        location: outreachPrograms.location,
        description: outreachPrograms.description,
        coordinatorId: outreachPrograms.coordinatorId,
        coordinatorFirstName: members.firstName,
        coordinatorLastName: members.lastName,
        isCompleted: outreachPrograms.isCompleted,
        totalSoulsReached: outreachPrograms.totalSoulsReached,
        createdAt: outreachPrograms.createdAt,
        workerCount: sql<number>`(
          SELECT COUNT(*)::int FROM outreach_participants op
          WHERE op.outreach_id = ${outreachPrograms.outreachId}
        )`.as('worker_count'),
        soulsCaptured: sql<number>`(
          SELECT COUNT(*)::int FROM souls s
          WHERE s.outreach_id = ${outreachPrograms.outreachId}
        )`.as('souls_captured'),
      })
      .from(outreachPrograms)
      .leftJoin(members, eq(outreachPrograms.coordinatorId, members.memberId))
      .where(eq(outreachPrograms.branchId, branchId))
      .orderBy(desc(outreachPrograms.programDate))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachPrograms)
      .where(eq(outreachPrograms.branchId, branchId));

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const programs = data.map(p => ({
      ...p,
      coordinator: p.coordinatorFirstName
        ? { firstName: p.coordinatorFirstName, lastName: p.coordinatorLastName }
        : null,
    }));

    logger.info('Outreach programs listed', { total, page });

    return successResponse({
      data: programs,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleError(error);
  }
};
