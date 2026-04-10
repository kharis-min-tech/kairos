// @kairos/api - Souls Get Conversion Funnel Lambda
// Returns counts at each status stage and conversion rates.
//
// **Requirements: 16.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, sql } from 'drizzle-orm';
import { souls, outreachPrograms } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('souls-get-conversion-funnel');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting conversion funnel', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    // Get counts per status
    const statusCounts = await db
      .select({
        status: souls.status,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(outreachPrograms.branchId, branchId))
      .groupBy(souls.status);

    const countsMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countsMap[row.status || 'Unknown'] = row.count;
    }

    const totalSouls =
      (countsMap['New'] || 0) +
      (countsMap['Following Up'] || 0) +
      (countsMap['Interested'] || 0) +
      (countsMap['Converted'] || 0) +
      (countsMap['Not Interested'] || 0);

    const converted = countsMap['Converted'] || 0;
    const conversionRate = totalSouls > 0 ? Math.round((converted / totalSouls) * 100) : 0;

    const interested = countsMap['Interested'] || 0;
    const interestRate = totalSouls > 0 ? Math.round((interested / totalSouls) * 100) : 0;

    logger.info('Conversion funnel retrieved', { branchId, totalSouls });

    return successResponse({
      branchId,
      totalSouls,
      funnel: {
        new: countsMap['New'] || 0,
        followingUp: countsMap['Following Up'] || 0,
        interested: countsMap['Interested'] || 0,
        converted: countsMap['Converted'] || 0,
        notInterested: countsMap['Not Interested'] || 0,
      },
      rates: {
        conversionRate,
        interestRate,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};
