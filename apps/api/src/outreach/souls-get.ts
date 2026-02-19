// @kairos/api - Souls Get Lambda
// Returns soul details with full follow-up history.
//
// **Requirements: 15**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, desc } from 'drizzle-orm';
import { souls, followUps, members, outreachPrograms } from '@kairos/database';
import {
  resolveAuthContext,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  NotFoundError,
  isAdmin,
} from '@kairos/utils';

const logger = createLogger('souls-get');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const soulId = parseInt(event.pathParameters?.soulId || '', 10);

    if (isNaN(soulId)) {
      throw new NotFoundError('Soul');
    }

    logger.info('Getting soul details', { soulId, userId: ctx.memberId });

    const db = getDb();

    // Get soul with outreach program info
    const [soul] = await db
      .select({
        soulId: souls.soulId,
        firstName: souls.firstName,
        lastName: souls.lastName,
        phone: souls.phone,
        email: souls.email,
        address: souls.address,
        city: souls.city,
        gender: souls.gender,
        ageRange: souls.ageRange,
        status: souls.status,
        assignedMemberId: souls.assignedMemberId,
        convertedToMemberId: souls.convertedToMemberId,
        outreachId: souls.outreachId,
        notes: souls.notes,
        createdAt: souls.createdAt,
        updatedAt: souls.updatedAt,
        programName: outreachPrograms.programName,
        programBranchId: outreachPrograms.branchId,
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .where(eq(souls.soulId, soulId))
      .limit(1);

    if (!soul) {
      throw new NotFoundError('Soul', String(soulId));
    }

    // Branch isolation
    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, soul.programBranchId);
    }

    // Get follow-up history
    const followUpHistory = await db
      .select({
        followUpId: followUps.followUpId,
        followUpDate: followUps.followUpDate,
        contactMethod: followUps.contactMethod,
        contactStatus: followUps.contactStatus,
        durationMinutes: followUps.durationMinutes,
        notes: followUps.notes,
        memberId: followUps.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .leftJoin(members, eq(followUps.memberId, members.memberId))
      .where(eq(followUps.soulId, soulId))
      .orderBy(desc(followUps.followUpDate));

    logger.info('Soul details retrieved', { soulId });

    return successResponse({
      ...soul,
      followUps: followUpHistory.map(f => ({
        followUpId: f.followUpId,
        followUpDate: f.followUpDate,
        contactMethod: f.contactMethod,
        contactStatus: f.contactStatus,
        durationMinutes: f.durationMinutes,
        notes: f.notes,
        followedUpBy: f.memberFirstName
          ? { memberId: f.memberId, firstName: f.memberFirstName, lastName: f.memberLastName }
          : null,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};
