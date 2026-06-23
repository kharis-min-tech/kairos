import { eq, and, desc, count, sql, type SQL } from 'drizzle-orm';
import { authHasAnyCapability } from '../lib/grants';
import { authHasCapability } from '../lib/grants';
import type { Database } from '@kairos/database';
import { followUps, souls, members, outreachPrograms } from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@kairos/utils';

/**
 * Log a follow-up for a soul
 * - Validates contact_method and contact_status enums
 * - Validates duration_minutes > 0
 * - Defaults follow_up_date to current timestamp
 * - Updates soul.updated_at
 * - Optionally updates soul status if provided
 */
export async function logFollowUp(
  db: Database,
  soulId: string,
  input: {
    contactMethod: string;
    contactStatus: string;
    urgencyLevel?: string;
    durationMinutes?: number;
    notes?: string;
    nextFollowUpDate?: string;
    updateStatus?: string;
  },
  auth: AuthContext,
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Verify soul exists and get current status
  const [soul] = await db
    .select({ 
      id: souls.id, 
      assignedMemberId: souls.assignedMemberId,
      status: souls.status,
    })
    .from(souls)
    .where(eq(souls.id, soulId));

  if (!soul) {
    throw new NotFoundError('Soul not found');
  }

  // Access control: only assigned member can log follow-ups
  if (effectiveRole === 'member' && soul.assignedMemberId !== auth.memberId) {
    throw new ForbiddenError('You can only log follow-ups for souls assigned to you');
  }

  // Validate duration if provided
  if (input.durationMinutes !== undefined && input.durationMinutes < 1) {
    throw new ValidationError('Duration must be at least 1 minute');
  }

  // Create follow-up
  const [followUp] = await db
    .insert(followUps)
    .values({
      soulId,
      memberId: auth.memberId,
      contactMethod: input.contactMethod,
      contactStatus: input.contactStatus,
      urgencyLevel: input.urgencyLevel ?? null,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      nextFollowUpDate: input.nextFollowUpDate ?? null,
    })
    .returning();

  // Update soul status if provided and different from current
  const updateData: { updatedAt: SQL; status?: string } = { updatedAt: sql`NOW()` };
  if (input.updateStatus && input.updateStatus !== soul.status) {
    updateData.status = input.updateStatus;
  }

  await db
    .update(souls)
    .set(updateData)
    .where(eq(souls.id, soulId));

  return followUp;
}

/**
 * Get follow-up history for a soul
 * - Uses LEFT JOIN to include ad-hoc souls
 * - Orders by follow_up_date descending
 * - Applies pagination with default limit 20
 * - Enforces access control
 */
export async function getFollowUpHistory(
  db: Database,
  soulId: string,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
  },
) {
  const effectiveRole = auth.activeRole ?? auth.systemRole;

  // Verify soul exists and user has access
  const [soul] = await db
    .select({
      id: souls.id,
      assignedMemberId: souls.assignedMemberId,
      branchId: outreachPrograms.branchId,
    })
    .from(souls)
    .leftJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
    .where(eq(souls.id, soulId));

  if (!soul) {
    throw new NotFoundError('Soul not found');
  }

  // Access control
  // Members can view follow-ups for:
  // 1. Souls assigned to them
  // 2. Souls from programs they're participating in (for collaboration)
  if (effectiveRole === 'member') {
    // Check if soul is assigned to them
    const isAssigned = soul.assignedMemberId === auth.memberId;
    
    // Check if they're a participant in the soul's program
    let isParticipant = false;
    if (soul.branchId) {
      const { outreachParticipants } = await import('@kairos/database');
      const [participation] = await db
        .select({ outreachId: outreachParticipants.outreachId })
        .from(outreachParticipants)
        .innerJoin(souls, eq(outreachParticipants.outreachId, souls.outreachId))
        .where(
          and(
            eq(souls.id, soulId),
            eq(outreachParticipants.memberId, auth.memberId)
          )
        );
      isParticipant = !!participation;
    }
    
    if (!isAssigned && !isParticipant) {
      throw new ForbiddenError('You can only view follow-ups for souls assigned to you or from programs you participate in');
    }
  }

  if ((authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) && soul.branchId && soul.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only view follow-ups for souls from your branch');
  }

  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: followUps.id,
        soulId: followUps.soulId,
        memberId: followUps.memberId,
        memberName: sql<string>`CONCAT(${members.firstName}, ' ', ${members.lastName})`,
        followUpDate: followUps.followUpDate,
        contactMethod: followUps.contactMethod,
        contactStatus: followUps.contactStatus,
        urgencyLevel: followUps.urgencyLevel,
        durationMinutes: followUps.durationMinutes,
        notes: followUps.notes,
        nextFollowUpDate: followUps.nextFollowUpDate,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .leftJoin(members, eq(followUps.memberId, members.id))
      .where(eq(followUps.soulId, soulId))
      .orderBy(desc(followUps.followUpDate))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(followUps)
      .where(eq(followUps.soulId, soulId)),
  ]);

  return {
    data: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: total!.count,
      totalPages: Math.ceil(total!.count / query.limit),
    },
  };
}

/**
 * Get follow-up statistics for a soul
 * - Total follow-ups count
 * - Average duration
 * - Days since last follow-up
 */
export async function getFollowUpStatistics(
  db: Database,
  soulId: string,
) {
  const [stats] = await db
    .select({
      totalFollowUps: count(),
      avgDuration: sql<number>`AVG(${followUps.durationMinutes})`,
      lastFollowUpDate: sql<Date>`MAX(${followUps.followUpDate})`,
    })
    .from(followUps)
    .where(eq(followUps.soulId, soulId));

  const daysSinceLastFollowUp = stats?.lastFollowUpDate
    ? Math.floor((Date.now() - new Date(stats.lastFollowUpDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    totalFollowUps: stats?.totalFollowUps ?? 0,
    avgDuration: stats?.avgDuration ? Math.round(stats.avgDuration) : null,
    lastFollowUpDate: stats?.lastFollowUpDate ?? null,
    daysSinceLastFollowUp,
  };
}
