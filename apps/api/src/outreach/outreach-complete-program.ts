// @kairos/api - Outreach Complete Program Lambda
// Marks an outreach program as completed.
// Updates total_souls_reached with actual count of linked souls.
// Rejects if already completed.
//
// **Requirements: 5.1, 5.2, 5.3**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, sql } from 'drizzle-orm';
import { outreachPrograms, souls } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  BadRequestError,
  isAdmin,
} from '@kairos/utils';

const logger = createLogger('outreach-complete-program');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const outreachId = parseInt(event.pathParameters?.outreachId || '', 10);

    if (isNaN(outreachId)) {
      throw new NotFoundError('Outreach program');
    }

    logger.info('Completing outreach program', { outreachId, userId: ctx.memberId });

    const db = getDb();

    // Verify program exists
    const [program] = await db
      .select({
        outreachId: outreachPrograms.outreachId,
        branchId: outreachPrograms.branchId,
        isCompleted: outreachPrograms.isCompleted,
      })
      .from(outreachPrograms)
      .where(eq(outreachPrograms.outreachId, outreachId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('Outreach program', String(outreachId));
    }

    // Branch isolation
    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, program.branchId);
    }

    // Reject if already completed
    if (program.isCompleted) {
      throw new BadRequestError('Program is already completed');
    }

    // Count actual souls linked to program
    const [soulCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(souls)
      .where(eq(souls.outreachId, outreachId));

    const totalSoulsReached = soulCount?.count ?? 0;

    // Update program: mark completed and set soul count
    const [updated] = await db
      .update(outreachPrograms)
      .set({
        isCompleted: true,
        totalSoulsReached,
        updatedAt: new Date(),
      })
      .where(eq(outreachPrograms.outreachId, outreachId))
      .returning();

    logger.info('Outreach program completed', {
      outreachId,
      totalSoulsReached,
    });

    return successResponse(updated!);
  } catch (error) {
    return handleError(error);
  }
};
