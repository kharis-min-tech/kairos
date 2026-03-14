// @kairos/api - Souls Follow-Up Tracker Lambda
// Returns follow-up items with pending/completed counts.
// Supports tab filtering (all/pending/overdue), search, status, contactMethod.
// Enforces branch isolation for non-admin users.
//
// **Requirements: 2.5**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, or, ilike } from 'drizzle-orm';
import { followUps, souls, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('souls-get-follow-up-tracker');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Getting follow-up tracker', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const tab = (params.tab || 'all') as 'all' | 'pending' | 'overdue';
    const search = params.search?.trim() || '';
    const statusFilter = params.status || '';
    const contactMethodFilter = params.contactMethod || '';

    const db = getDb();

    // Base conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Branch isolation: non-admin users only see follow-ups for souls
    // assigned to members in their branch
    if (!isAdmin(ctx)) {
      conditions.push(eq(members.homeBranchId, ctx.branchId));
    }

    // Tab filtering
    if (tab === 'pending') {
      conditions.push(
        sql`(${followUps.contactStatus} NOT IN ('Successful', 'Not Interested') OR ${followUps.nextFollowUpDate} IS NOT NULL)`
      );
      conditions.push(
        sql`(${followUps.nextFollowUpDate} IS NULL OR ${followUps.nextFollowUpDate}::date >= CURRENT_DATE)`
      );
    } else if (tab === 'overdue') {
      conditions.push(
        sql`${followUps.nextFollowUpDate} IS NOT NULL AND ${followUps.nextFollowUpDate}::date < CURRENT_DATE`
      );
    }

    // Search filter (soul name or worker name)
    if (search) {
      conditions.push(
        or(
          ilike(souls.firstName, `%${search}%`),
          ilike(souls.lastName, `%${search}%`),
          ilike(members.firstName, `%${search}%`),
          ilike(members.lastName, `%${search}%`),
        )!
      );
    }

    // Status filter
    if (statusFilter) {
      if (statusFilter === 'Completed') {
        conditions.push(sql`${followUps.contactStatus} IN ('Successful', 'Not Interested')`);
      } else if (statusFilter === 'Overdue') {
        conditions.push(
          sql`${followUps.nextFollowUpDate} IS NOT NULL AND ${followUps.nextFollowUpDate}::date < CURRENT_DATE`
        );
      } else if (statusFilter === 'Pending') {
        conditions.push(
          sql`(${followUps.contactStatus} NOT IN ('Successful', 'Not Interested'))`
        );
        conditions.push(
          sql`(${followUps.nextFollowUpDate} IS NULL OR ${followUps.nextFollowUpDate}::date >= CURRENT_DATE)`
        );
      }
    }

    // Contact method filter
    if (contactMethodFilter) {
      conditions.push(eq(followUps.contactMethod, contactMethodFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query follow-ups joined with souls and members
    const rows = await db
      .select({
        followUpId: followUps.followUpId,
        soulId: souls.soulId,
        soulFirstName: souls.firstName,
        soulLastName: souls.lastName,
        workerFirstName: members.firstName,
        workerLastName: members.lastName,
        dueDate: followUps.nextFollowUpDate,
        contactMethod: followUps.contactMethod,
        contactStatus: followUps.contactStatus,
        notes: followUps.notes,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .innerJoin(souls, eq(followUps.soulId, souls.soulId))
      .innerJoin(members, eq(followUps.memberId, members.memberId))
      .where(whereClause)
      .orderBy(sql`${followUps.followUpDate} DESC`);

    // Derive status for each item
    const items = rows.map((r) => {
      let status: 'Pending' | 'Completed' | 'Overdue' = 'Pending';
      const isCompletedStatus = ['Successful', 'Not Interested'].includes(r.contactStatus);
      if (isCompletedStatus) {
        status = 'Completed';
      } else if (r.dueDate && new Date(r.dueDate) < new Date()) {
        status = 'Overdue';
      }

      return {
        followUpId: r.followUpId,
        soulId: r.soulId,
        soulName: `${r.soulFirstName} ${r.soulLastName}`,
        assignedWorker: `${r.workerFirstName} ${r.workerLastName}`,
        dueDate: r.dueDate ?? null,
        contactMethod: r.contactMethod ?? null,
        contactStatus: r.contactStatus,
        status,
        notes: r.notes ?? null,
        createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    });

    // Counts: pending = not completed, completed = completed this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pending = items.filter((i) => i.status !== 'Completed').length;
    const completed = items.filter(
      (i) => i.status === 'Completed' && new Date(i.createdAt) >= startOfMonth
    ).length;

    logger.info('Follow-up tracker data retrieved', { total: items.length, pending, completed });

    return successResponse({ pending, completed, items });
  } catch (error) {
    return handleError(error);
  }
};
