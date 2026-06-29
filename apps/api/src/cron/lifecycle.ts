import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { members, serviceAttendance, services } from '@kairos/database';
import { logger } from '@kairos/utils';

/**
 * Daily lifecycle cron job. Two pure-SQL transitions, each with logged
 * outcome counts so Workers Logs / Axiom can chart them over time.
 *
 *   #4 Phase C — child aging-out:
 *     members.member_type='child' + DOB ≥ 16y ago  →  flip to 'attendee'
 *
 *   #4 Phase D — visitor promotion:
 *     visitor with ≥6 service_attendance rows in last 90 days  →  promote
 *     to 'attendee'
 *
 * Both run under the existing per-request db client (the cron handler in
 * worker.ts wraps this call in withDb), so connection lifecycle is unchanged.
 */

const MINOR_AGE_THRESHOLD = 16;
const VISITOR_PROMOTION_THRESHOLD = 6;
const VISITOR_PROMOTION_WINDOW_DAYS = 90;

/** Aging-out: child shells whose DOB has crossed the minor threshold. */
export async function runAgingOutTransition(db: Database): Promise<number> {
  const result = await db
    .update(members)
    .set({
      memberType: 'attendee',
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(members.memberType, 'child'),
        eq(members.isActive, true),
        // DOB present AND age >= threshold.
        sql`${members.dateOfBirth} IS NOT NULL`,
        sql`${members.dateOfBirth} <= (CURRENT_DATE - INTERVAL '${sql.raw(String(MINOR_AGE_THRESHOLD))} years')`,
      ),
    )
    .returning({ id: members.id });

  const count = result.length;
  logger.info('lifecycle.agingOut', {
    module: 'cron',
    action: 'aging_out',
    transitioned: count,
  });
  return count;
}

/** Promotion: visitors who attended VISITOR_PROMOTION_THRESHOLD+ services in window. */
export async function runVisitorPromotion(db: Database): Promise<number> {
  // Find visitors who meet the threshold. One subquery counts qualifying
  // service_attendance rows per member; the outer UPDATE flips those ids.
  const result = await db
    .update(members)
    .set({
      memberType: 'attendee',
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(members.memberType, 'visitor'),
        eq(members.isActive, true),
        sql`(
          SELECT COUNT(*) FROM ${serviceAttendance}
          INNER JOIN ${services} ON ${services.id} = ${serviceAttendance.serviceId}
          WHERE ${serviceAttendance.memberId} = ${members.id}
            AND ${services.serviceDate} >= (CURRENT_DATE - INTERVAL '${sql.raw(String(VISITOR_PROMOTION_WINDOW_DAYS))} days')
            AND ${services.isActive} = TRUE
        ) >= ${VISITOR_PROMOTION_THRESHOLD}`,
      ),
    )
    .returning({ id: members.id });

  const count = result.length;
  logger.info('lifecycle.visitorPromotion', {
    module: 'cron',
    action: 'visitor_promotion',
    promoted: count,
  });
  return count;
}

export async function runLifecycleCron(db: Database): Promise<{
  agedOut: number;
  promoted: number;
}> {
  const agedOut = await runAgingOutTransition(db);
  const promoted = await runVisitorPromotion(db);
  return { agedOut, promoted };
}
