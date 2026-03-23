import { eq, and, count, sql, exists } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  fellowshipJoinRequests,
  members,
  branches,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@kairos/utils';

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access fellowships in your branch');
  }
}

function enforceLeaderOrAbove(
  auth: AuthContext,
  fellowship: { leaderId: string | null; coLeaderId: string | null },
) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (
    auth.systemRole === 'leader' &&
    (fellowship.leaderId === auth.memberId || fellowship.coLeaderId === auth.memberId)
  ) return;
  throw new ForbiddenError('Only fellowship leaders or above can perform this action');
}

// ── Fellowship CRUD ────────────────────────────────────────

export async function listFellowships(
  db: Database,
  auth: AuthContext,
  query: { page: number; limit: number; fellowshipType?: string; branchId?: string; memberId?: string },
) {
  const conditions = [eq(fellowships.isActive, true)];

  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    conditions.push(eq(fellowships.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(fellowships.branchId, query.branchId));
  }

  if (query.fellowshipType) {
    conditions.push(eq(fellowships.fellowshipType, query.fellowshipType));
  }

  if (query.memberId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(fellowshipMembers)
          .where(
            and(
              eq(fellowshipMembers.fellowshipId, fellowships.id),
              eq(fellowshipMembers.memberId, query.memberId),
              eq(fellowshipMembers.isActive, true),
            ),
          ),
      ),
    );
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        branchId: fellowships.branchId,
        branchName: branches.branchName,
        fellowshipType: fellowships.fellowshipType,
        description: fellowships.description,
        leaderId: fellowships.leaderId,
        leaderFirstName: members.firstName,
        leaderLastName: members.lastName,
        coLeaderId: fellowships.coLeaderId,
        meetingSchedule: fellowships.meetingSchedule,
        isActive: fellowships.isActive,
        createdAt: fellowships.createdAt,
        updatedAt: fellowships.updatedAt,
      })
      .from(fellowships)
      .leftJoin(branches, eq(fellowships.branchId, branches.id))
      .leftJoin(members, eq(fellowships.leaderId, members.id))
      .where(where)
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(fellowships).where(where),
  ]);

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.value,
      totalPages: Math.ceil(total!.value / query.limit),
    },
  };
}

export async function getFellowship(db: Database, auth: AuthContext, id: string) {
  const [fellowship] = await db
    .select({
      id: fellowships.id,
      fellowshipName: fellowships.fellowshipName,
      branchId: fellowships.branchId,
      branchName: branches.branchName,
      fellowshipType: fellowships.fellowshipType,
      description: fellowships.description,
      leaderId: fellowships.leaderId,
      coLeaderId: fellowships.coLeaderId,
      meetingSchedule: fellowships.meetingSchedule,
      isActive: fellowships.isActive,
      createdAt: fellowships.createdAt,
      updatedAt: fellowships.updatedAt,
    })
    .from(fellowships)
    .leftJoin(branches, eq(fellowships.branchId, branches.id))
    .where(and(eq(fellowships.id, id), eq(fellowships.isActive, true)));

  if (!fellowship) throw new NotFoundError('Fellowship not found');
  enforceBranchScope(auth, fellowship.branchId);
  return fellowship;
}

export async function createFellowship(
  db: Database,
  auth: AuthContext,
  data: {
    fellowshipName: string;
    branchId: string;
    fellowshipType: string;
    description?: string;
    leaderId?: string;
    coLeaderId?: string;
    meetingSchedule?: string;
  },
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can create fellowships');
  }

  // Validate branch exists
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, data.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found');

  // Validate leader if provided
  if (data.leaderId) {
    const [leader] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, data.leaderId), eq(members.isActive, true)));
    if (!leader) throw new ValidationError('Leader member not found');
  }

  const [fellowship] = await db
    .insert(fellowships)
    .values({
      fellowshipName: data.fellowshipName,
      branchId: data.branchId,
      fellowshipType: data.fellowshipType,
      description: data.description,
      leaderId: data.leaderId,
      coLeaderId: data.coLeaderId,
      meetingSchedule: data.meetingSchedule,
    })
    .returning();

  // Auto-join leader as fellowship member
  if (data.leaderId) {
    await db.insert(fellowshipMembers).values({
      fellowshipId: fellowship!.id,
      memberId: data.leaderId,
    });
  }

  return fellowship!;
}

export async function updateFellowship(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can update fellowships');
  }

  const existing = await getFellowship(db, auth, id);

  const [updated] = await db
    .update(fellowships)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(fellowships.id, existing.id))
    .returning();

  return updated!;
}

export async function deactivateFellowship(db: Database, auth: AuthContext, id: string) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    throw new ForbiddenError('Only admins and pastors can deactivate fellowships');
  }

  const existing = await getFellowship(db, auth, id);

  // Soft-deactivate all fellowship members first
  await db
    .update(fellowshipMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE` })
    .where(and(eq(fellowshipMembers.fellowshipId, existing.id), eq(fellowshipMembers.isActive, true)));

  const [deactivated] = await db
    .update(fellowships)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(fellowships.id, existing.id))
    .returning();

  return deactivated!;
}

// ── Fellowship Members ─────────────────────────────────────

export async function listFellowshipMembers(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  return db
    .select({
      id: fellowshipMembers.id,
      fellowshipId: fellowshipMembers.fellowshipId,
      memberId: fellowshipMembers.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      joinDate: fellowshipMembers.joinDate,
      isActive: fellowshipMembers.isActive,
      notes: fellowshipMembers.notes,
    })
    .from(fellowshipMembers)
    .innerJoin(members, eq(fellowshipMembers.memberId, members.id))
    .where(
      and(eq(fellowshipMembers.fellowshipId, fellowship.id), eq(fellowshipMembers.isActive, true)),
    );
}

export async function addFellowshipMember(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: { memberId: string; notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  // Validate member exists
  const [member] = await db
    .select({ id: members.id, homeBranchId: members.homeBranchId })
    .from(members)
    .where(and(eq(members.id, data.memberId), eq(members.isActive, true)));
  if (!member) throw new NotFoundError('Member not found');

  // Check branch consistency
  if (member.homeBranchId !== fellowship.branchId) {
    throw new ValidationError('Member must be in the same branch as the fellowship');
  }

  // Check for duplicate active membership
  const [existing] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, data.memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    );
  if (existing) throw new ConflictError('Member is already in this fellowship');

  // Cross-fellowship type constraint: one fellowship per type per branch
  const [crossConflict] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(
      and(
        eq(fellowshipMembers.memberId, data.memberId),
        eq(fellowshipMembers.isActive, true),
        eq(fellowships.fellowshipType, fellowship.fellowshipType),
        eq(fellowships.branchId, fellowship.branchId!),
      ),
    )
    .limit(1);
  if (crossConflict) {
    throw new ConflictError(`Member is already in a ${fellowship.fellowshipType} fellowship in this branch`);
  }

  const [record] = await db
    .insert(fellowshipMembers)
    .values({
      fellowshipId,
      memberId: data.memberId,
      notes: data.notes,
    })
    .returning();

  return record!;
}

export async function removeFellowshipMember(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  memberId: string,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [record] = await db
    .update(fellowshipMembers)
    .set({ isActive: false, leaveDate: sql`CURRENT_DATE` })
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    )
    .returning();

  if (!record) throw new NotFoundError('Fellowship member not found');
  return record;
}

// ── Fellowship Meetings ────────────────────────────────────

export async function listMeetings(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  return db
    .select()
    .from(fellowshipMeetings)
    .where(eq(fellowshipMeetings.fellowshipId, fellowship.id))
    .orderBy(sql`${fellowshipMeetings.meetingDate} DESC`);
}

export async function createMeeting(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: {
    meetingDate: string;
    meetingTitle?: string;
    meetingTopic?: string;
    meetingNotes?: string;
    location?: string;
    durationMinutes?: number;
  },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [meeting] = await db
    .insert(fellowshipMeetings)
    .values({
      fellowshipId: fellowship.id,
      meetingDate: new Date(data.meetingDate),
      meetingTitle: data.meetingTitle,
      meetingTopic: data.meetingTopic,
      meetingNotes: data.meetingNotes,
      location: data.location,
      durationMinutes: data.durationMinutes,
      createdBy: auth.memberId,
    })
    .returning();

  return meeting!;
}

export async function updateMeeting(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
  data: Record<string, unknown>,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [meeting] = await db
    .update(fellowshipMeetings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(fellowshipMeetings.id, meetingId), eq(fellowshipMeetings.fellowshipId, fellowshipId)))
    .returning();

  if (!meeting) throw new NotFoundError('Meeting not found');
  return meeting;
}

// ── Attendance ─────────────────────────────────────────────

export async function recordAttendance(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
  records: { memberId: string; attendanceStatus: string; notes?: string }[],
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  // Verify the meeting belongs to this fellowship
  const [meeting] = await db
    .select({ id: fellowshipMeetings.id })
    .from(fellowshipMeetings)
    .where(and(eq(fellowshipMeetings.id, meetingId), eq(fellowshipMeetings.fellowshipId, fellowshipId)));
  if (!meeting) throw new NotFoundError('Meeting not found');

  // Upsert attendance records
  const values = records.map((r) => ({
    meetingId,
    memberId: r.memberId,
    attendanceStatus: r.attendanceStatus,
    notes: r.notes,
    recordedBy: auth.memberId,
  }));

  await db
    .insert(fellowshipMeetingAttendance)
    .values(values)
    .onConflictDoUpdate({
      target: [fellowshipMeetingAttendance.meetingId, fellowshipMeetingAttendance.memberId],
      set: {
        attendanceStatus: sql`EXCLUDED.attendance_status`,
        notes: sql`EXCLUDED.notes`,
        recordedBy: sql`EXCLUDED.recorded_by`,
        recordedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function getMeetingAttendance(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  meetingId: string,
) {
  await getFellowship(db, auth, fellowshipId);

  return db
    .select({
      meetingId: fellowshipMeetingAttendance.meetingId,
      memberId: fellowshipMeetingAttendance.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      attendanceStatus: fellowshipMeetingAttendance.attendanceStatus,
      notes: fellowshipMeetingAttendance.notes,
      recordedAt: fellowshipMeetingAttendance.recordedAt,
    })
    .from(fellowshipMeetingAttendance)
    .innerJoin(members, eq(fellowshipMeetingAttendance.memberId, members.id))
    .where(eq(fellowshipMeetingAttendance.meetingId, meetingId));
}

export async function getAttendanceSummary(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  const stats = await db
    .select({
      meetingId: fellowshipMeetingAttendance.meetingId,
      meetingDate: fellowshipMeetings.meetingDate,
      total: count(),
      present: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Present')`,
      absent: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Absent')`,
      excused: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Excused')`,
      late: sql<number>`COUNT(*) FILTER (WHERE ${fellowshipMeetingAttendance.attendanceStatus} = 'Late')`,
    })
    .from(fellowshipMeetingAttendance)
    .innerJoin(
      fellowshipMeetings,
      eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id),
    )
    .where(eq(fellowshipMeetings.fellowshipId, fellowship.id))
    .groupBy(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.meetingDate)
    .orderBy(sql`${fellowshipMeetings.meetingDate} DESC`);

  return stats;
}

// ── Fellowship Join Requests ───────────────────────────────

export async function createJoinRequest(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  data: { notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);

  const [activeMembership] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.memberId, auth.memberId),
        eq(fellowshipMembers.isActive, true),
      ),
    );
  if (activeMembership) throw new ConflictError('You are already a member of this fellowship');

  const [pendingRequest] = await db
    .select({ id: fellowshipJoinRequests.id })
    .from(fellowshipJoinRequests)
    .where(
      and(
        eq(fellowshipJoinRequests.fellowshipId, fellowshipId),
        eq(fellowshipJoinRequests.memberId, auth.memberId),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    );
  if (pendingRequest) throw new ConflictError('You already have a pending join request for this fellowship');

  // Cross-fellowship type constraint
  const [crossConflict] = await db
    .select({ id: fellowshipMembers.id })
    .from(fellowshipMembers)
    .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
    .where(
      and(
        eq(fellowshipMembers.memberId, auth.memberId),
        eq(fellowshipMembers.isActive, true),
        eq(fellowships.fellowshipType, fellowship.fellowshipType),
        eq(fellowships.branchId, fellowship.branchId!),
      ),
    )
    .limit(1);
  if (crossConflict) {
    throw new ConflictError(`You are already in a ${fellowship.fellowshipType} fellowship in this branch`);
  }

  const [request] = await db
    .insert(fellowshipJoinRequests)
    .values({ fellowshipId, memberId: auth.memberId, notes: data.notes })
    .returning();

  return request!;
}

export async function listJoinRequests(db: Database, auth: AuthContext, fellowshipId: string) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  return db
    .select({
      id: fellowshipJoinRequests.id,
      fellowshipId: fellowshipJoinRequests.fellowshipId,
      memberId: fellowshipJoinRequests.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      status: fellowshipJoinRequests.status,
      notes: fellowshipJoinRequests.notes,
      reviewedBy: fellowshipJoinRequests.reviewedBy,
      reviewedAt: fellowshipJoinRequests.reviewedAt,
      createdAt: fellowshipJoinRequests.createdAt,
      updatedAt: fellowshipJoinRequests.updatedAt,
    })
    .from(fellowshipJoinRequests)
    .innerJoin(members, eq(fellowshipJoinRequests.memberId, members.id))
    .where(
      and(
        eq(fellowshipJoinRequests.fellowshipId, fellowship.id),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    )
    .orderBy(fellowshipJoinRequests.createdAt);
}

export async function reviewJoinRequest(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  requestId: string,
  data: { status: 'approved' | 'rejected'; notes?: string },
) {
  const fellowship = await getFellowship(db, auth, fellowshipId);
  enforceLeaderOrAbove(auth, fellowship);

  const [request] = await db
    .select()
    .from(fellowshipJoinRequests)
    .where(
      and(
        eq(fellowshipJoinRequests.id, requestId),
        eq(fellowshipJoinRequests.fellowshipId, fellowshipId),
        eq(fellowshipJoinRequests.status, 'pending'),
      ),
    );
  if (!request) throw new NotFoundError('Join request not found or already reviewed');

  const [updated] = await db
    .update(fellowshipJoinRequests)
    .set({
      status: data.status,
      notes: data.notes ?? request.notes,
      reviewedBy: auth.memberId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(fellowshipJoinRequests.id, requestId))
    .returning();

  if (data.status === 'approved') {
    // Check if member already has a record in this fellowship (e.g. previously left)
    const [existing] = await db
      .select({ id: fellowshipMembers.id })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, fellowshipId),
          eq(fellowshipMembers.memberId, request.memberId),
        ),
      );
    if (existing) {
      await db
        .update(fellowshipMembers)
        .set({ isActive: true, leaveDate: null, updatedAt: new Date() })
        .where(eq(fellowshipMembers.id, existing.id));
    } else {
      await db
        .insert(fellowshipMembers)
        .values({ fellowshipId, memberId: request.memberId });
    }
  }

  return updated!;
}
