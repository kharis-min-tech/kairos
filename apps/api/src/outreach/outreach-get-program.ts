// @kairos/api - Outreach Get Program Lambda
// Returns program details with participants, souls, and follow-up outcome summaries.
// Enforces branch isolation for non-admin users.
//
// **Requirements: 3.1, 3.2, 3.3**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, desc, sql } from 'drizzle-orm';
import { outreachPrograms, outreachParticipants, souls, followUps, members } from '@kairos/database';
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

const logger = createLogger('outreach-get-program');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    const outreachId = parseInt(event.pathParameters?.outreachId || '', 10);

    if (isNaN(outreachId)) {
      throw new NotFoundError('Outreach program');
    }

    logger.info('Getting outreach program details', { outreachId, userId: ctx.memberId });

    const db = getDb();

    // Get program with coordinator info
    const [program] = await db
      .select({
        outreachId: outreachPrograms.outreachId,
        branchId: outreachPrograms.branchId,
        programName: outreachPrograms.programName,
        programDate: outreachPrograms.programDate,
        location: outreachPrograms.location,
        address: outreachPrograms.address,
        city: outreachPrograms.city,
        description: outreachPrograms.description,
        coordinatorId: outreachPrograms.coordinatorId,
        coordinatorFirstName: members.firstName,
        coordinatorLastName: members.lastName,
        totalSoulsReached: outreachPrograms.totalSoulsReached,
        notes: outreachPrograms.notes,
        isCompleted: outreachPrograms.isCompleted,
        createdAt: outreachPrograms.createdAt,
        updatedAt: outreachPrograms.updatedAt,
      })
      .from(outreachPrograms)
      .leftJoin(members, eq(outreachPrograms.coordinatorId, members.memberId))
      .where(eq(outreachPrograms.outreachId, outreachId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('Outreach program', String(outreachId));
    }

    // Branch isolation
    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, program.branchId);
    }

    // Get participants with member names
    const participants = await db
      .select({
        memberId: outreachParticipants.memberId,
        role: outreachParticipants.role,
        notes: outreachParticipants.notes,
        createdAt: outreachParticipants.createdAt,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(outreachParticipants)
      .leftJoin(members, eq(outreachParticipants.memberId, members.memberId))
      .where(eq(outreachParticipants.outreachId, outreachId));

    // Get souls linked to the program with follow-up outcome summaries
    const programSouls = await db
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
        createdAt: souls.createdAt,
        updatedAt: souls.updatedAt,
        followUpCount: sql<number>`(
          SELECT COUNT(*)::int FROM follow_ups f
          WHERE f.soul_id = ${souls.soulId}
        )`.as('follow_up_count'),
        lastFollowUpDate: sql<string | null>`(
          SELECT MAX(f.follow_up_date)::text FROM follow_ups f
          WHERE f.soul_id = ${souls.soulId}
        )`.as('last_follow_up_date'),
      })
      .from(souls)
      .leftJoin(members, eq(souls.assignedMemberId, members.memberId))
      .where(eq(souls.outreachId, outreachId))
      .orderBy(desc(souls.createdAt));

    // Get follow-up outcome summaries per soul (aggregated contact statuses)
    const followUpSummaries = await db
      .select({
        soulId: followUps.soulId,
        contactStatus: followUps.contactStatus,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(followUps)
      .where(
        sql`${followUps.soulId} IN (
          SELECT s.soul_id FROM souls s WHERE s.outreach_id = ${outreachId}
        )`
      )
      .groupBy(followUps.soulId, followUps.contactStatus);

    // Build follow-up outcome map per soul
    const outcomeBySoul = new Map<number, Record<string, number>>();
    for (const row of followUpSummaries) {
      if (!outcomeBySoul.has(row.soulId)) {
        outcomeBySoul.set(row.soulId, {});
      }
      outcomeBySoul.get(row.soulId)![row.contactStatus] = row.count;
    }

    const soulsWithOutcomes = programSouls.map((s) => ({
      soulId: s.soulId,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      email: s.email,
      status: s.status,
      assignedWorker: s.assignedFirstName
        ? { memberId: s.assignedMemberId, firstName: s.assignedFirstName, lastName: s.assignedLastName }
        : null,
      followUpCount: s.followUpCount,
      lastFollowUpDate: s.lastFollowUpDate,
      followUpOutcomes: outcomeBySoul.get(s.soulId) || {},
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    logger.info('Outreach program details retrieved', {
      outreachId,
      participantCount: participants.length,
      soulCount: soulsWithOutcomes.length,
    });

    return successResponse({
      ...program,
      coordinator: program.coordinatorFirstName
        ? { memberId: program.coordinatorId, firstName: program.coordinatorFirstName, lastName: program.coordinatorLastName }
        : null,
      participants: participants.map((p) => ({
        memberId: p.memberId,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      souls: soulsWithOutcomes,
    });
  } catch (error) {
    return handleError(error);
  }
};
