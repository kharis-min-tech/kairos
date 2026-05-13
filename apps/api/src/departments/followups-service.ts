import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  branchDepartments,
  departmentMembers,
  departmentFollowups,
  members,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@kairos/utils';

// ── Helpers ────────────────────────────────────────────────

async function loadBranchDepartment(db: Database, branchDeptId: string) {
  const [bd] = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
      isActive: branchDepartments.isActive,
    })
    .from(branchDepartments)
    .where(eq(branchDepartments.id, branchDeptId));
  if (!bd) throw new NotFoundError('Department not found');
  return bd;
}

function enforceLeaderOrAbove(
  auth: AuthContext,
  bd: { branchId: string; leadMemberId: string | null; deputyMemberId: string | null },
) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  const isLead =
    auth.systemRole === 'leader' &&
    (bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId);
  if (isLead) return;
  throw new ForbiddenError('Only department leads or above can perform this action');
}

function enforceBranchScope(auth: AuthContext, bd: { branchId: string }) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (bd.branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access departments in your branch');
  }
}

async function ensureMemberInDepartment(
  db: Database,
  branchDeptId: string,
  memberId: string,
) {
  const [row] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDeptId),
        eq(departmentMembers.memberId, memberId),
        eq(departmentMembers.isActive, true),
      ),
    );
  if (!row) throw new ValidationError('Member is not part of this department');
}

const DEFAULT_OVERDUE_DAYS = 7;

// ── Public API ─────────────────────────────────────────────

export interface CreateFollowupInput {
  contactMethod: string;
  contactStatus: string;
  contactedAt?: string; // ISO timestamp
  durationMinutes?: number;
  notes?: string;
  nextFollowUpDate?: string; // ISO date
  assignedToId?: string;
}

export async function createFollowup(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  memberId: string,
  input: CreateFollowupInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  if (input.durationMinutes !== undefined && input.durationMinutes < 1) {
    throw new ValidationError('Duration must be at least 1 minute');
  }

  await ensureMemberInDepartment(db, branchDeptId, memberId);

  const [created] = await db
    .insert(departmentFollowups)
    .values({
      branchDepartmentId: branchDeptId,
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

export interface UpdateFollowupInput {
  contactMethod?: string;
  contactStatus?: string;
  contactedAt?: string;
  durationMinutes?: number | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  assignedToId?: string | null;
}

export async function updateFollowup(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  followupId: string,
  input: UpdateFollowupInput,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [existing] = await db
    .select({
      id: departmentFollowups.id,
      branchDepartmentId: departmentFollowups.branchDepartmentId,
      recordedById: departmentFollowups.recordedById,
    })
    .from(departmentFollowups)
    .where(eq(departmentFollowups.id, followupId));
  if (!existing || existing.branchDepartmentId !== branchDeptId) {
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
    .update(departmentFollowups)
    .set(patch)
    .where(eq(departmentFollowups.id, followupId))
    .returning();
  return updated!;
}

export async function deleteFollowup(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  followupId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const [existing] = await db
    .select({
      id: departmentFollowups.id,
      branchDepartmentId: departmentFollowups.branchDepartmentId,
    })
    .from(departmentFollowups)
    .where(eq(departmentFollowups.id, followupId));
  if (!existing || existing.branchDepartmentId !== branchDeptId) {
    throw new NotFoundError('Followup not found');
  }

  await db.delete(departmentFollowups).where(eq(departmentFollowups.id, followupId));
  return { id: followupId };
}

export async function listFollowupsForMember(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  memberId: string,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceLeaderOrAbove(auth, bd);

  const recorder = members;
  return db
    .select({
      id: departmentFollowups.id,
      branchDepartmentId: departmentFollowups.branchDepartmentId,
      memberId: departmentFollowups.memberId,
      recordedById: departmentFollowups.recordedById,
      recordedByFirstName: recorder.firstName,
      recordedByLastName: recorder.lastName,
      assignedToId: departmentFollowups.assignedToId,
      contactedAt: departmentFollowups.contactedAt,
      contactMethod: departmentFollowups.contactMethod,
      contactStatus: departmentFollowups.contactStatus,
      durationMinutes: departmentFollowups.durationMinutes,
      notes: departmentFollowups.notes,
      nextFollowUpDate: departmentFollowups.nextFollowUpDate,
      createdAt: departmentFollowups.createdAt,
      updatedAt: departmentFollowups.updatedAt,
      daysSinceFollowup: sql<number>`EXTRACT(DAY FROM NOW() - ${departmentFollowups.contactedAt})::int`,
    })
    .from(departmentFollowups)
    .leftJoin(recorder, eq(departmentFollowups.recordedById, recorder.id))
    .where(
      and(
        eq(departmentFollowups.branchDepartmentId, branchDeptId),
        eq(departmentFollowups.memberId, memberId),
      ),
    )
    .orderBy(desc(departmentFollowups.contactedAt));
}

export async function listFollowupsForDepartment(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  query: { limit?: number; days?: number; memberId?: string },
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  enforceLeaderOrAbove(auth, bd);

  const limit = query.limit ?? 50;

  const conditions = [eq(departmentFollowups.branchDepartmentId, branchDeptId)];
  if (query.days !== undefined) {
    conditions.push(
      sql`${departmentFollowups.contactedAt} >= NOW() - (${query.days} || ' days')::interval`,
    );
  }
  if (query.memberId) {
    conditions.push(eq(departmentFollowups.memberId, query.memberId));
  }

  return db
    .select({
      id: departmentFollowups.id,
      memberId: departmentFollowups.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      contactedAt: departmentFollowups.contactedAt,
      contactMethod: departmentFollowups.contactMethod,
      contactStatus: departmentFollowups.contactStatus,
      durationMinutes: departmentFollowups.durationMinutes,
      notes: departmentFollowups.notes,
      nextFollowUpDate: departmentFollowups.nextFollowUpDate,
      recordedById: departmentFollowups.recordedById,
      assignedToId: departmentFollowups.assignedToId,
      createdAt: departmentFollowups.createdAt,
    })
    .from(departmentFollowups)
    .leftJoin(members, eq(departmentFollowups.memberId, members.id))
    .where(and(...conditions))
    .orderBy(desc(departmentFollowups.contactedAt))
    .limit(limit);
}

/**
 * Returns active department members whose most recent followup is older than `days`
 * (or who have never been contacted). Default threshold = 7 days.
 */
export async function listOverdueFollowups(
  db: Database,
  auth: AuthContext,
  branchDeptId: string,
  days: number = DEFAULT_OVERDUE_DAYS,
) {
  const bd = await loadBranchDepartment(db, branchDeptId);
  enforceBranchScope(auth, bd);
  enforceLeaderOrAbove(auth, bd);

  // 1. Active members of the department
  const roster = await db
    .select({
      memberId: departmentMembers.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      photoUrl: members.photoUrl,
      email: members.email,
    })
    .from(departmentMembers)
    .innerJoin(members, eq(departmentMembers.memberId, members.id))
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDeptId),
        eq(departmentMembers.isActive, true),
      ),
    );

  if (roster.length === 0) return [];

  // 2. Most recent followup per member (within this department)
  const memberIds = roster.map((r) => r.memberId);
  const lastFollowups = await db
    .select({
      memberId: departmentFollowups.memberId,
      lastContactedAt: sql<Date | null>`MAX(${departmentFollowups.contactedAt})`,
    })
    .from(departmentFollowups)
    .where(
      and(
        eq(departmentFollowups.branchDepartmentId, branchDeptId),
        inArray(departmentFollowups.memberId, memberIds),
      ),
    )
    .groupBy(departmentFollowups.memberId);

  const lastByMember = new Map<string, Date | null>();
  for (const r of lastFollowups) {
    lastByMember.set(r.memberId, r.lastContactedAt);
  }

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const overdue = roster
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
    .filter((m) => m.isOverdue)
    .sort((a, b) => {
      // Never-contacted first, then oldest contact first
      if (a.lastContactedAt === null && b.lastContactedAt !== null) return -1;
      if (a.lastContactedAt !== null && b.lastContactedAt === null) return 1;
      if (a.lastContactedAt && b.lastContactedAt) {
        return a.lastContactedAt.getTime() - b.lastContactedAt.getTime();
      }
      return 0;
    });

  return overdue;
}
