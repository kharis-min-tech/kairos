import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '@kairos/database';
import {
  fellowshipFollowups,
  fellowshipMembers,
  fellowships,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@kairos/utils';

const DEFAULT_OVERDUE_DAYS = 7;

async function loadFellowship(db: Database, fellowshipId: string) {
  const [fellowship] = await db
    .select({
      id: fellowships.id,
      branchId: fellowships.branchId,
      leaderId: fellowships.leaderId,
      coLeaderId: fellowships.coLeaderId,
      isActive: fellowships.isActive,
    })
    .from(fellowships)
    .where(and(eq(fellowships.id, fellowshipId), eq(fellowships.isActive, true)));

  if (!fellowship) throw new NotFoundError('Fellowship not found');
  return fellowship;
}

function enforceBranchScope(auth: AuthContext, fellowship: { branchId: string }) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (fellowship.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access fellowships in your branch');
  }
}

function enforceLeaderOrAbove(
  auth: AuthContext,
  fellowship: { leaderId: string | null; coLeaderId: string | null },
) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  const isFellowshipLead =
    auth.systemRole === 'leader' &&
    (fellowship.leaderId === auth.memberId || fellowship.coLeaderId === auth.memberId);
  if (isFellowshipLead) return;
  throw new ForbiddenError('Only fellowship leaders or above can perform this action');
}

async function enforceFellowshipAccess(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await loadFellowship(db, fellowshipId);
  enforceBranchScope(auth, fellowship);
  enforceLeaderOrAbove(auth, fellowship);
  return fellowship;
}

async function ensureMemberInFellowship(
  db: Database,
  fellowshipId: string,
  memberId: string,
) {
  const [row] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    );
  if (!row) throw new ValidationError('Member is not part of this fellowship');
}

export interface CreateFellowshipFollowupInput {
  contactMethod: string;
  contactStatus: string;
  contactedAt?: string;
  durationMinutes?: number | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  assignedToId?: string | null;
}

export async function createFellowshipFollowup(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  memberId: string,
  input: CreateFellowshipFollowupInput,
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  if (input.durationMinutes !== undefined && input.durationMinutes !== null && input.durationMinutes < 1) {
    throw new ValidationError('Duration must be at least 1 minute');
  }

  await ensureMemberInFellowship(db, fellowshipId, memberId);

  const [created] = await db
    .insert(fellowshipFollowups)
    .values({
      fellowshipId,
      memberId,
      recordedById: auth.memberId,
      assignedToId: input.assignedToId ?? null,
      contactedAt: input.contactedAt ? new Date(input.contactedAt) : new Date(),
      contactMethod: input.contactMethod,
      contactStatus: input.contactStatus,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      nextFollowUpDate: input.nextFollowUpDate ?? null,
    })
    .returning();

  return created!;
}

export interface UpdateFellowshipFollowupInput {
  contactMethod?: string;
  contactStatus?: string;
  contactedAt?: string;
  durationMinutes?: number | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  assignedToId?: string | null;
}

export async function updateFellowshipFollowup(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  followupId: string,
  input: UpdateFellowshipFollowupInput,
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  const [existing] = await db
    .select({
      id: fellowshipFollowups.id,
      fellowshipId: fellowshipFollowups.fellowshipId,
    })
    .from(fellowshipFollowups)
    .where(eq(fellowshipFollowups.id, followupId));

  if (!existing || existing.fellowshipId !== fellowshipId) {
    throw new NotFoundError('Followup not found');
  }

  if (input.durationMinutes !== undefined && input.durationMinutes !== null && input.durationMinutes < 1) {
    throw new ValidationError('Duration must be at least 1 minute');
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.contactMethod !== undefined) patch.contactMethod = input.contactMethod;
  if (input.contactStatus !== undefined) patch.contactStatus = input.contactStatus;
  if (input.contactedAt !== undefined) patch.contactedAt = new Date(input.contactedAt);
  if (input.durationMinutes !== undefined) patch.durationMinutes = input.durationMinutes;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.nextFollowUpDate !== undefined) patch.nextFollowUpDate = input.nextFollowUpDate;
  if (input.assignedToId !== undefined) patch.assignedToId = input.assignedToId;

  const [updated] = await db
    .update(fellowshipFollowups)
    .set(patch)
    .where(eq(fellowshipFollowups.id, followupId))
    .returning();

  return updated!;
}

export async function deleteFellowshipFollowup(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  followupId: string,
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  const [existing] = await db
    .select({
      id: fellowshipFollowups.id,
      fellowshipId: fellowshipFollowups.fellowshipId,
    })
    .from(fellowshipFollowups)
    .where(eq(fellowshipFollowups.id, followupId));

  if (!existing || existing.fellowshipId !== fellowshipId) {
    throw new NotFoundError('Followup not found');
  }

  await db.delete(fellowshipFollowups).where(eq(fellowshipFollowups.id, followupId));
  return { id: followupId };
}

export async function listFellowshipFollowupsForMember(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  memberId: string,
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  const recordedBy = alias(members, 'recorded_by');
  const assignedTo = alias(members, 'assigned_to');

  return db
    .select({
      id: fellowshipFollowups.id,
      fellowshipId: fellowshipFollowups.fellowshipId,
      memberId: fellowshipFollowups.memberId,
      recordedById: fellowshipFollowups.recordedById,
      recordedByFirstName: recordedBy.firstName,
      recordedByLastName: recordedBy.lastName,
      assignedToId: fellowshipFollowups.assignedToId,
      assignedToFirstName: assignedTo.firstName,
      assignedToLastName: assignedTo.lastName,
      contactedAt: fellowshipFollowups.contactedAt,
      contactMethod: fellowshipFollowups.contactMethod,
      contactStatus: fellowshipFollowups.contactStatus,
      durationMinutes: fellowshipFollowups.durationMinutes,
      notes: fellowshipFollowups.notes,
      nextFollowUpDate: fellowshipFollowups.nextFollowUpDate,
      createdAt: fellowshipFollowups.createdAt,
      updatedAt: fellowshipFollowups.updatedAt,
      daysSinceFollowup: sql<number>`EXTRACT(DAY FROM NOW() - ${fellowshipFollowups.contactedAt})::int`,
    })
    .from(fellowshipFollowups)
    .leftJoin(recordedBy, eq(fellowshipFollowups.recordedById, recordedBy.id))
    .leftJoin(assignedTo, eq(fellowshipFollowups.assignedToId, assignedTo.id))
    .where(
      and(
        eq(fellowshipFollowups.fellowshipId, fellowshipId),
        eq(fellowshipFollowups.memberId, memberId),
      ),
    )
    .orderBy(desc(fellowshipFollowups.contactedAt));
}

export async function listFellowshipFollowups(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  query: { limit?: number; days?: number; memberId?: string },
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  const limit = query.limit ?? 50;
  const conditions = [eq(fellowshipFollowups.fellowshipId, fellowshipId)];

  if (query.days !== undefined) {
    conditions.push(
      sql`${fellowshipFollowups.contactedAt} >= NOW() - (${query.days} || ' days')::interval`,
    );
  }
  if (query.memberId) {
    conditions.push(eq(fellowshipFollowups.memberId, query.memberId));
  }

  const subject = alias(members, 'subject');
  const recordedBy = alias(members, 'recorded_by');
  const assignedTo = alias(members, 'assigned_to');

  return db
    .select({
      id: fellowshipFollowups.id,
      fellowshipId: fellowshipFollowups.fellowshipId,
      memberId: fellowshipFollowups.memberId,
      memberFirstName: subject.firstName,
      memberLastName: subject.lastName,
      recordedById: fellowshipFollowups.recordedById,
      recordedByFirstName: recordedBy.firstName,
      recordedByLastName: recordedBy.lastName,
      assignedToId: fellowshipFollowups.assignedToId,
      assignedToFirstName: assignedTo.firstName,
      assignedToLastName: assignedTo.lastName,
      contactedAt: fellowshipFollowups.contactedAt,
      contactMethod: fellowshipFollowups.contactMethod,
      contactStatus: fellowshipFollowups.contactStatus,
      durationMinutes: fellowshipFollowups.durationMinutes,
      notes: fellowshipFollowups.notes,
      nextFollowUpDate: fellowshipFollowups.nextFollowUpDate,
      createdAt: fellowshipFollowups.createdAt,
      updatedAt: fellowshipFollowups.updatedAt,
      daysSinceFollowup: sql<number>`EXTRACT(DAY FROM NOW() - ${fellowshipFollowups.contactedAt})::int`,
    })
    .from(fellowshipFollowups)
    .leftJoin(subject, eq(fellowshipFollowups.memberId, subject.id))
    .leftJoin(recordedBy, eq(fellowshipFollowups.recordedById, recordedBy.id))
    .leftJoin(assignedTo, eq(fellowshipFollowups.assignedToId, assignedTo.id))
    .where(and(...conditions))
    .orderBy(desc(fellowshipFollowups.contactedAt))
    .limit(limit);
}

export async function listOverdueFellowshipFollowups(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  days: number = DEFAULT_OVERDUE_DAYS,
) {
  await enforceFellowshipAccess(db, auth, fellowshipId);

  const roster = await db
    .select({
      memberId: fellowshipMembers.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      photoUrl: members.photoUrl,
      email: members.email,
    })
    .from(fellowshipMembers)
    .innerJoin(members, eq(fellowshipMembers.memberId, members.id))
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.isActive, true),
      ),
    );

  if (roster.length === 0) return [];

  const memberIds = roster.map((r) => r.memberId);
  const lastFollowups = await db
    .select({
      memberId: fellowshipFollowups.memberId,
      lastContactedAt: sql<Date | null>`MAX(${fellowshipFollowups.contactedAt})`,
    })
    .from(fellowshipFollowups)
    .where(
      and(
        eq(fellowshipFollowups.fellowshipId, fellowshipId),
        inArray(fellowshipFollowups.memberId, memberIds),
      ),
    )
    .groupBy(fellowshipFollowups.memberId);

  const lastByMember = new Map<string, Date | null>();
  for (const r of lastFollowups) {
    lastByMember.set(r.memberId, r.lastContactedAt);
  }

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  return roster
    .map((member) => {
      const last = lastByMember.get(member.memberId) ?? null;
      const lastDate = last ? new Date(last) : null;
      const daysSince = lastDate
        ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const isOverdue = !lastDate || lastDate.getTime() < cutoffMs;
      return {
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        photoUrl: member.photoUrl,
        email: member.email,
        lastContactedAt: lastDate,
        daysSinceFollowup: daysSince,
        isOverdue,
      };
    })
    .filter((member) => member.isOverdue)
    .sort((a, b) => {
      if (a.lastContactedAt === null && b.lastContactedAt !== null) return -1;
      if (a.lastContactedAt !== null && b.lastContactedAt === null) return 1;
      if (a.lastContactedAt && b.lastContactedAt) {
        return a.lastContactedAt.getTime() - b.lastContactedAt.getTime();
      }
      return 0;
    });
}
