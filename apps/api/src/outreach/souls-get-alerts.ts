// @kairos/api - Souls Get Alerts Lambda
// Hybrid overdue detection: uses next_follow_up_date when available,
// falls back to days since last follow-up or soul creation.
// Returns overdue souls with assigned worker info.
//
// **Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, or, sql, isNull, isNotNull } from 'drizzle-orm';
import { souls, members, outreachPrograms, followUps } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('souls-get-alerts');

const DEFAULT_THRESHOLD_DAYS = 2;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting soul follow-up alerts', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const thresholdDays = params.thresholdDays
      ? parseInt(params.thresholdDays, 10)
      : DEFAULT_THRESHOLD_DAYS;
    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;

    if (!isAdmin(ctx)) {
      enforceBranchAccess(ctx, branchId);
    }

    const db = getDb();

    // Subquery: get latest follow-up per soul with its next_follow_up_date
    const latestFollowUp = db
      .select({
        soulId: followUps.soulId,
        lastFollowUpDate: sql<Date>`MAX(${followUps.followUpDate})`.as('last_follow_up_date'),
        nextFollowUpDate: sql<string | null>`(
          SELECT ${followUps.nextFollowUpDate}
          FROM ${followUps} AS fu2
          WHERE fu2.soul_id = ${followUps.soulId}
          ORDER BY fu2.follow_up_date DESC
          LIMIT 1
        )`.as('next_follow_up_date'),
      })
      .from(followUps)
      .groupBy(followUps.soulId)
      .as('latest_fu');

    // Alias for the assigned member (worker)
    const assignedMember = members;

    // Alias for the member linked to the soul (for ad-hoc branch derivation)
    // We use the assigned member's homeBranchId when outreach_id IS NULL

    const overdueRows = await db
      .select({
        soulId: souls.soulId,
        firstName: souls.firstName,
        lastName: souls.lastName,
        phone: souls.phone,
        status: souls.status,
        assignedMemberId: souls.assignedMemberId,
        assignedFirstName: assignedMember.firstName,
        assignedLastName: assignedMember.lastName,
        assignedEmail: assignedMember.email,
        createdAt: souls.createdAt,
        programName: outreachPrograms.programName,
        lastFollowUpDate: latestFollowUp.lastFollowUpDate,
        nextFollowUpDate: latestFollowUp.nextFollowUpDate,
        daysSinceActivity: sql<number>`
          CASE
            WHEN ${latestFollowUp.lastFollowUpDate} IS NOT NULL
              THEN EXTRACT(DAY FROM NOW() - ${latestFollowUp.lastFollowUpDate})::int
            ELSE EXTRACT(DAY FROM NOW() - ${souls.createdAt})::int
          END
        `.as('days_since_activity'),
      })
      .from(souls)
      .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
      .leftJoin(assignedMember, eq(souls.assignedMemberId, assignedMember.memberId))
      .leftJoin(latestFollowUp, eq(souls.soulId, latestFollowUp.soulId))
      .where(
        and(
          // Active statuses only
          sql`${souls.status} IN ('New', 'Following Up', 'Interested')`,
          // Branch isolation: program-linked via outreachPrograms.branchId,
          // ad-hoc via assigned member's homeBranchId
          or(
            eq(outreachPrograms.branchId, branchId),
            and(isNull(souls.outreachId), eq(assignedMember.homeBranchId, branchId))
          ),
          // Hybrid overdue conditions:
          or(
            // (a) next_follow_up_date is set and in the past
            and(
              isNotNull(latestFollowUp.nextFollowUpDate),
              sql`${latestFollowUp.nextFollowUpDate}::date < CURRENT_DATE`
            ),
            // (b) next_follow_up_date is NULL, has follow-ups, and days since last exceeds threshold
            and(
              isNull(latestFollowUp.nextFollowUpDate),
              isNotNull(latestFollowUp.lastFollowUpDate),
              sql`(NOW() - ${latestFollowUp.lastFollowUpDate}) > INTERVAL '1 day' * ${thresholdDays}`
            ),
            // (c) No follow-ups exist and days since soul creation exceeds threshold
            and(
              isNull(latestFollowUp.soulId),
              sql`(NOW() - ${souls.createdAt}) > INTERVAL '1 day' * ${thresholdDays}`
            )
          )
        )
      );

    logger.info('Follow-up alerts retrieved', { count: overdueRows.length, thresholdDays });

    return successResponse({
      branchId,
      thresholdDays,
      overdueSouls: overdueRows.map(s => ({
        soulId: s.soulId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        status: s.status,
        daysSinceActivity: s.daysSinceActivity,
        programName: s.programName ?? null,
        assignedWorker: s.assignedFirstName
          ? {
              memberId: s.assignedMemberId,
              firstName: s.assignedFirstName,
              lastName: s.assignedLastName,
              email: s.assignedEmail,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};
