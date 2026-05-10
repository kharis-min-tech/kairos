import { eq, and, count, sql, desc, gte, lte, between, inArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  services,
  serviceAttendance,
  members,
  branches,
  branchLeadership,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  sendCrossBranchVisitNotification,
} from '@kairos/utils';

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (auth.systemRole === 'admin') return;
  
  // All authenticated users can view services in their branch
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access services in your branch');
  }
}

// ── Service CRUD ───────────────────────────────────────────

export async function listServices(
  db: Database,
  auth: AuthContext,
  query: {
    page: number;
    limit: number;
    branchId?: string;
    serviceType?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  const conditions = [sql`${services.deletedAt} IS NULL`];

  if (auth.systemRole !== 'admin') {
    conditions.push(eq(services.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(services.branchId, query.branchId));
  }

  if (query.serviceType) {
    conditions.push(eq(services.serviceType, query.serviceType));
  }

  if (query.startDate) {
    conditions.push(gte(services.serviceDate, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(services.serviceDate, new Date(query.endDate)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: services.id,
        branchId: services.branchId,
        branchName: branches.branchName,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTitle: services.serviceTitle,
        preacherId: services.preacherId,
        preacherFirstName: members.firstName,
        preacherLastName: members.lastName,
        topic: services.topic,
        expectedAttendance: services.expectedAttendance,
        createdAt: services.createdAt,
        // Aggregate attendance counts (members only, excludes leadership)
        totalAttendance: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        presentCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Present' AND EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        virtualCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Virtual' AND EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        absentCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Absent' AND EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        lateCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Late' AND EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        firstTimeVisitorCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.isFirstTimeVisitor} = TRUE AND EXISTS (SELECT 1 FROM members m2 WHERE m2.id = ${serviceAttendance.memberId} AND m2.system_role = 'member'))`,
        // Total active members in the branch for accurate rate calculation
        branchMemberCount: sql<number>`(SELECT COUNT(*) FROM members m WHERE m.home_branch_id = ${services.branchId} AND m.is_active = TRUE AND m.system_role = 'member')`,
      })
      .from(services)
      .leftJoin(branches, eq(services.branchId, branches.id))
      .leftJoin(members, eq(services.preacherId, members.id))
      .leftJoin(serviceAttendance, eq(services.id, serviceAttendance.serviceId))
      .where(where)
      .groupBy(
        services.id,
        branches.branchName,
        members.firstName,
        members.lastName,
      )
      .orderBy(desc(services.serviceDate))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(services).where(where),
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

// Returns this week's services at branches OTHER than the user's home branch
export async function getOtherBranchServices(db: Database, auth: AuthContext) {
  const today = new Date();
  // Get start of current week (Monday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  // End of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      id: services.id,
      branchId: services.branchId,
      branchName: branches.branchName,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(
      and(
        sql`${services.branchId} != ${auth.branchId}`,
        between(services.serviceDate, weekStart, weekEnd),
        sql`${services.deletedAt} IS NULL`,
      ),
    )
    .orderBy(services.serviceDate);

  return rows;
}

export async function getService(db: Database, auth: AuthContext, id: string) {
  const [service] = await db
    .select({
      id: services.id,
      branchId: services.branchId,
      branchName: branches.branchName,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
      preacherId: services.preacherId,
      preacherFirstName: members.firstName,
      preacherLastName: members.lastName,
      topic: services.topic,
      expectedAttendance: services.expectedAttendance,
      createdBy: services.createdBy,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
      branchMemberCount: sql<number>`(SELECT COUNT(*) FROM members m WHERE m.home_branch_id = ${services.branchId} AND m.is_active = TRUE)`,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(members, eq(services.preacherId, members.id))
    .where(eq(services.id, id));

  if (!service) throw new NotFoundError('Service not found');
  enforceBranchScope(auth, service.branchId);
  return service;
}

export async function createService(
  db: Database,
  auth: AuthContext,
  data: {
    branchId: string;
    serviceDate: string;
    serviceType: string;
    serviceTitle?: string;
    preacherId?: string;
    topic?: string;
    expectedAttendance?: number;
  },
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can create services');
  }

  enforceBranchScope(auth, data.branchId);

  // Validate branch exists
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, data.branchId), eq(branches.isActive, true)));
  if (!branch) throw new ValidationError('Branch not found');

  // Validate preacher if provided
  if (data.preacherId) {
    const [preacher] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, data.preacherId), eq(members.isActive, true)));
    if (!preacher) throw new ValidationError('Preacher member not found');
  }

  // Check for duplicate service (same branch, date, type)
  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.branchId, data.branchId),
        eq(services.serviceDate, new Date(data.serviceDate)),
        eq(services.serviceType, data.serviceType),
      ),
    );
  if (existing) {
    throw new ConflictError('A service with this type already exists for this branch and date');
  }

  const [service] = await db
    .insert(services)
    .values({
      branchId: data.branchId,
      serviceDate: new Date(data.serviceDate),
      serviceType: data.serviceType,
      serviceTitle: data.serviceTitle,
      preacherId: data.preacherId,
      topic: data.topic,
      expectedAttendance: data.expectedAttendance,
      createdBy: auth.memberId,
    })
    .returning();

  return service!;
}

export async function updateService(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can update services');
  }

  const existing = await getService(db, auth, id);

  const [updated] = await db
    .update(services)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(services.id, existing.id))
    .returning();

  return updated!;
}

// ── Soft Delete & Restore ──────────────────────────────────

export async function softDeleteService(
  db: Database,
  auth: AuthContext,
  id: string,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can delete services');
  }

  const existing = await getService(db, auth, id);

  const [deleted] = await db
    .update(services)
    .set({ deletedAt: new Date(), deletedBy: auth.memberId, updatedAt: new Date() })
    .where(eq(services.id, existing.id))
    .returning();

  return deleted!;
}

export async function restoreService(
  db: Database,
  auth: AuthContext,
  id: string,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can restore services');
  }

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, id));

  if (!service) throw new NotFoundError('Service not found');

  const [restored] = await db
    .update(services)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning();

  return restored!;
}

export async function getDeletedServices(
  db: Database,
  auth: AuthContext,
) {
  const conditions = [sql`${services.deletedAt} IS NOT NULL`];

  if (auth.systemRole !== 'admin') {
    conditions.push(eq(services.branchId, auth.branchId));
  }

  const rows = await db
    .select({
      id: services.id,
      branchId: services.branchId,
      branchName: branches.branchName,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
      deletedAt: services.deletedAt,
      deletedBy: services.deletedBy,
      deletedByFirstName: members.firstName,
      deletedByLastName: members.lastName,
      deletedByRole: members.systemRole,
      createdAt: services.createdAt,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(members, eq(services.deletedBy, members.id))
    .where(and(...conditions))
    .orderBy(desc(services.deletedAt));

  return rows.map((row) => {
    const deletedDate = new Date(row.deletedAt!);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(expiryDate.getDate() + 20);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return { ...row, daysRemaining };
  });
}

// ── Service Attendance ─────────────────────────────────────

export async function recordAttendance(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  records: Array<{
    memberId: string;
    attendanceStatus: string;
    arrivalTime?: string;
    isFirstTimeVisitor?: boolean;
    visitorName?: string;
    visitorPhone?: string;
    visitorEmail?: string;
  }>,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can record attendance');
  }

  const service = await getService(db, auth, serviceId);

  // Validate all members exist and are active
  const memberIds = records.map((r) => r.memberId);
  const validMembers = await db
    .select({ id: members.id })
    .from(members)
    .where(and(inArray(members.id, memberIds), eq(members.isActive, true)));

  if (validMembers.length !== memberIds.length) {
    throw new ValidationError('One or more members not found or inactive');
  }

  // Check for duplicate member IDs in the same service
  const existingAttendance = await db
    .select({ memberId: serviceAttendance.memberId })
    .from(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        inArray(serviceAttendance.memberId, memberIds),
      ),
    );

  if (existingAttendance.length > 0) {
    const duplicateIds = existingAttendance.map((a) => a.memberId);
    throw new ConflictError(
      `Attendance already recorded for member(s): ${duplicateIds.join(', ')}. Use update endpoint to modify.`,
    );
  }

  // Insert attendance records with automated lateness detection
  const values = await Promise.all(records.map(async (r) => {
    let status = r.attendanceStatus;
    
    // Auto-detect lateness: if marked Present, check current time against schedule
    if (status === 'Present') {
      status = await detectLateness(db, serviceId, new Date());
    }

    return {
      serviceId,
      memberId: r.memberId,
      attendanceStatus: status,
      arrivalTime: new Date(),
      isFirstTimeVisitor: r.isFirstTimeVisitor ?? false,
      visitorName: r.visitorName,
      visitorPhone: r.visitorPhone,
      visitorEmail: r.visitorEmail,
      recordedBy: auth.memberId,
    };
  }));

  await db.insert(serviceAttendance).values(values);

  return { recorded: values.length };
}

export async function updateAttendance(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  memberId: string,
  data: {
    attendanceStatus?: string;
    arrivalTime?: string;
    isFirstTimeVisitor?: boolean;
    visitorName?: string;
    visitorPhone?: string;
    visitorEmail?: string;
  },
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can update attendance');
  }

  const service = await getService(db, auth, serviceId);

  const [existing] = await db
    .select()
    .from(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        eq(serviceAttendance.memberId, memberId),
      ),
    );

  if (!existing) {
    throw new NotFoundError('Attendance record not found');
  }

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  };

  if (data.arrivalTime) {
    updateData.arrivalTime = new Date(data.arrivalTime);
  }

  const [updated] = await db
    .update(serviceAttendance)
    .set(updateData)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        eq(serviceAttendance.memberId, memberId),
      ),
    )
    .returning();

  return updated!;
}

export async function deleteAttendance(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  memberId: string,
) {
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor' && auth.systemRole !== 'leader') {
    throw new ForbiddenError('Only admins, pastors, and leaders can delete attendance');
  }

  const service = await getService(db, auth, serviceId);

  const [deleted] = await db
    .delete(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        eq(serviceAttendance.memberId, memberId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new NotFoundError('Attendance record not found');
  }

  return deleted;
}

export async function getServiceAttendance(
  db: Database,
  auth: AuthContext,
  serviceId: string,
) {
  const service = await getService(db, auth, serviceId);

  return db
    .select({
      serviceId: serviceAttendance.serviceId,
      memberId: serviceAttendance.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      memberPhone: members.phone,
      memberPhotoUrl: members.photoUrl,
      memberBranchName: branches.branchName,
      attendanceStatus: serviceAttendance.attendanceStatus,
      arrivalTime: serviceAttendance.arrivalTime,
      isFirstTimeVisitor: serviceAttendance.isFirstTimeVisitor,
      visitorName: serviceAttendance.visitorName,
      visitorPhone: serviceAttendance.visitorPhone,
      visitorEmail: serviceAttendance.visitorEmail,
      recordedBy: serviceAttendance.recordedBy,
      recordedAt: serviceAttendance.recordedAt,
    })
    .from(serviceAttendance)
    .innerJoin(members, eq(serviceAttendance.memberId, members.id))
    .leftJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(
      eq(serviceAttendance.serviceId, service.id),
      eq(members.systemRole, 'member'),
    ))
    .orderBy(members.lastName, members.firstName);
}

// ── Reports ────────────────────────────────────────────────

export async function getAttendanceTrends(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  const conditions = [];

  if (auth.systemRole !== 'admin') {
    conditions.push(eq(services.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(services.branchId, query.branchId));
  }

  // Calculate date range (last N weeks)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - query.weeks * 7);

  conditions.push(between(services.serviceDate, startDate, endDate));

  const where = and(...conditions);

  const trends = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      branchName: branches.branchName,
      expectedAttendance: services.expectedAttendance,
      totalAttendance: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
      presentCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Present')`,
      virtualCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Virtual')`,
      lateCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Late')`,
      absentCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Absent')`,
      attendancePercentage: sql<number>`
        CASE 
          WHEN (SELECT COUNT(*) FROM members m WHERE m.home_branch_id = ${services.branchId} AND m.is_active = TRUE) > 0 
          THEN ROUND((COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} IN ('Present', 'Virtual', 'Late')))::numeric / (SELECT COUNT(*) FROM members m WHERE m.home_branch_id = ${services.branchId} AND m.is_active = TRUE) * 100, 2)
          ELSE NULL
        END
      `,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(serviceAttendance, eq(services.id, serviceAttendance.serviceId))
    .where(where)
    .groupBy(services.id, branches.branchName)
    .orderBy(desc(services.serviceDate));

  return trends;
}

export async function getDetailedAttendanceTrends(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  const conditions = [];

  console.log('=== getDetailedAttendanceTrends DEBUG ===');
  console.log('Auth:', { systemRole: auth.systemRole, branchId: auth.branchId });
  console.log('Query:', query);

  if (auth.systemRole !== 'admin') {
    conditions.push(eq(services.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(services.branchId, query.branchId));
  }

  // Calculate date range (last N weeks)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - query.weeks * 7);

  console.log('Date range:', { startDate, endDate, weeks: query.weeks });

  conditions.push(between(services.serviceDate, startDate, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  console.log('Conditions count:', conditions.length);

  // Get detailed attendance records with member info
  const detailedRecords = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      memberId: members.id,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      memberRole: members.systemRole,
      attendanceStatus: serviceAttendance.attendanceStatus,
      recordedBy: serviceAttendance.recordedBy,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .innerJoin(members, eq(serviceAttendance.memberId, members.id))
    .where(where)
    .orderBy(desc(services.serviceDate), members.lastName, members.firstName);

  console.log('Detailed records returned:', detailedRecords.length);
  console.log('First 3 records:', detailedRecords.slice(0, 3));

  return detailedRecords;
}

export async function getAttendanceByBranch(
  db: Database,
  auth: AuthContext,
  query: { startDate?: string; endDate?: string },
) {
  if (auth.systemRole !== 'admin') {
    throw new ForbiddenError('Only admins can view attendance by branch');
  }

  const conditions = [];

  if (query.startDate) {
    conditions.push(gte(services.serviceDate, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(services.serviceDate, new Date(query.endDate)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const byBranch = await db
    .select({
      branchId: services.branchId,
      branchName: branches.branchName,
      totalServices: count(services.id),
      totalAttendance: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
      presentCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Present')`,
      virtualCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Virtual')`,
      lateCount: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId}) FILTER (WHERE ${serviceAttendance.attendanceStatus} = 'Late')`,
      averageAttendance: sql<number>`ROUND(AVG(attendance_counts.attendance_count), 2)`,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(serviceAttendance, eq(services.id, serviceAttendance.serviceId))
    .leftJoin(
      sql`(
        SELECT service_id, COUNT(DISTINCT member_id) as attendance_count
        FROM service_attendance
        WHERE attendance_status IN ('Present', 'Virtual', 'Late')
        GROUP BY service_id
      ) as attendance_counts`,
      sql`attendance_counts.service_id = ${services.id}`,
    )
    .where(where)
    .groupBy(services.branchId, branches.branchName)
    .orderBy(branches.branchName);

  return byBranch;
}

export async function getMemberAttendanceHistory(
  db: Database,
  auth: AuthContext,
  memberId: string,
  query: { startDate?: string; endDate?: string; limit?: number },
) {
  // Members can only view their own history unless admin/pastor/leader
  if (auth.systemRole === 'member' && auth.memberId !== memberId) {
    throw new ForbiddenError('You can only view your own attendance history');
  }

  const conditions = [eq(serviceAttendance.memberId, memberId)];

  if (query.startDate) {
    conditions.push(gte(services.serviceDate, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(services.serviceDate, new Date(query.endDate)));
  }

  const where = and(...conditions);

  const history = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
      branchName: branches.branchName,
      attendanceStatus: serviceAttendance.attendanceStatus,
      arrivalTime: serviceAttendance.arrivalTime,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(where)
    .orderBy(desc(services.serviceDate))
    .limit(query.limit ?? 50);

  return history;
}

export async function getFirstTimeVisitors(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; startDate?: string; endDate?: string },
) {
  const conditions = [eq(serviceAttendance.isFirstTimeVisitor, true)];

  if (auth.systemRole !== 'admin') {
    conditions.push(eq(services.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(services.branchId, query.branchId));
  }

  if (query.startDate) {
    conditions.push(gte(services.serviceDate, new Date(query.startDate)));
  }

  if (query.endDate) {
    conditions.push(lte(services.serviceDate, new Date(query.endDate)));
  }

  const where = and(...conditions);

  const visitors = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      branchName: branches.branchName,
      memberId: serviceAttendance.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberEmail: members.email,
      memberPhone: members.phone,
      visitorName: serviceAttendance.visitorName,
      visitorPhone: serviceAttendance.visitorPhone,
      visitorEmail: serviceAttendance.visitorEmail,
      recordedAt: serviceAttendance.recordedAt,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(members, eq(serviceAttendance.memberId, members.id))
    .where(where)
    .orderBy(desc(services.serviceDate));

  return visitors;
}

// ── Self Check-In ──────────────────────────────────────────

export async function selfCheckIn(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  data: {
    attendanceStatus?: string;
    arrivalTime?: string;
  },
) {
  // Get service without branch scope enforcement (allows cross-branch check-in)
  const [service] = await db
    .select({
      id: services.id,
      branchId: services.branchId,
      branchName: branches.branchName,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(eq(services.id, serviceId));

  if (!service) throw new NotFoundError('Service not found');

  // Check if already checked in
  const [existing] = await db
    .select()
    .from(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        eq(serviceAttendance.memberId, auth.memberId),
      ),
    );

  if (existing) {
    throw new ConflictError('You have already been checked in for this service');
  }

  // Auto-detect lateness based on current time vs scheduled start
  // Applies to both in-person and virtual attendance
  const finalStatus = await detectLateness(db, serviceId, new Date());

  const [attendance] = await db
    .insert(serviceAttendance)
    .values({
      serviceId,
      memberId: auth.memberId,
      attendanceStatus: finalStatus,
      arrivalTime: new Date(),
      isFirstTimeVisitor: false,
      recordedBy: auth.memberId,
    })
    .returning();

  // Notify home branch leader + admin if this is a cross-branch visit
  if (service.branchId !== auth.branchId) {
    // Fire and forget — don't block the check-in response
    notifyCrossBranchVisit(db, auth, service).catch(() => {});
  }

  return attendance!;
}

async function notifyCrossBranchVisit(
  db: Database,
  auth: AuthContext,
  service: { branchId: string; branchName: string | null; serviceType: string; serviceDate: Date },
) {
  // Get the member's details and home branch name
  const [member] = await db
    .select({
      firstName: members.firstName,
      lastName: members.lastName,
      homeBranchId: members.homeBranchId,
    })
    .from(members)
    .where(eq(members.id, auth.memberId));

  if (!member) return;

  const [homeBranch] = await db
    .select({ branchName: branches.branchName })
    .from(branches)
    .where(eq(branches.id, member.homeBranchId));

  // Get home branch leaders (pastor/leader roles)
  const leaders = await db
    .select({
      memberId: branchLeadership.memberId,
      email: members.email,
      firstName: members.firstName,
    })
    .from(branchLeadership)
    .innerJoin(members, eq(branchLeadership.memberId, members.id))
    .where(eq(branchLeadership.branchId, member.homeBranchId));

  // Get all admins
  const admins = await db
    .select({ email: members.email, firstName: members.firstName })
    .from(members)
    .where(eq(members.systemRole, 'admin'));

  // Collect unique recipient emails
  const recipients = new Set<string>();
  leaders.forEach((l) => recipients.add(l.email));
  admins.forEach((a) => recipients.add(a.email));

  if (recipients.size === 0) return;

  const memberName = `${member.firstName} ${member.lastName}`;
  const homeBranchName = homeBranch?.branchName ?? 'Unknown Branch';
  const visitedBranchName = service.branchName ?? 'Unknown Branch';

  await sendCrossBranchVisitNotification(
    Array.from(recipients),
    'Leader',
    memberName,
    homeBranchName,
    visitedBranchName,
    service.serviceType,
    service.serviceDate.toISOString(),
  );
}

export async function getMyAttendanceStatus(
  db: Database,
  auth: AuthContext,
  serviceId: string,
) {
  const [attendance] = await db
    .select({
      serviceId: serviceAttendance.serviceId,
      memberId: serviceAttendance.memberId,
      attendanceStatus: serviceAttendance.attendanceStatus,
      arrivalTime: serviceAttendance.arrivalTime,
      recordedBy: serviceAttendance.recordedBy,
      recordedAt: serviceAttendance.recordedAt,
      isCheckedInByLeadership: sql<boolean>`${serviceAttendance.recordedBy} != ${auth.memberId}`,
    })
    .from(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.serviceId, serviceId),
        eq(serviceAttendance.memberId, auth.memberId),
      ),
    );

  return attendance || null;
}

// ── Cross-Branch Visit Detection ───────────────────────────
//
// Logic: For each service at a member's home branch where they are marked
// Absent (or have no record), check if they attended a service at a
// *different* branch on the same calendar date. If so, it's a cross-branch
// visit, not a true absence.

export async function getCrossBranchVisits(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; startDate?: string; endDate?: string; weeks?: number },
) {
  // Only leaders/pastors/admins can run this report
  if (auth.systemRole === 'member') {
    throw new ForbiddenError('Only leaders and admins can view cross-branch visit reports');
  }

  // Determine the branch we're reporting on (home branch scope)
  const targetBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;

  // Build date range
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - (query.weeks ?? 8) * 7);
        return d;
      })();

  // Step 1: Get all services at the target branch within the date range
  const homeBranchConditions = [
    between(services.serviceDate, startDate, endDate),
  ];
  if (targetBranchId) {
    homeBranchConditions.push(eq(services.branchId, targetBranchId));
  }

  const homeBranchServices = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      branchId: services.branchId,
      branchName: branches.branchName,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(and(...homeBranchConditions));

  if (homeBranchServices.length === 0) return [];

  const homeServiceIds = homeBranchServices.map((s) => s.serviceId);

  // Step 2: Get all members whose home branch is the target branch
  const homeMemberConditions = [eq(members.isActive, true)];
  if (targetBranchId) {
    homeMemberConditions.push(eq(members.homeBranchId, targetBranchId));
  }

  const homeMembers = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      homeBranchId: members.homeBranchId,
    })
    .from(members)
    .where(and(...homeMemberConditions));

  if (homeMembers.length === 0) return [];

  const homeMemberIds = homeMembers.map((m) => m.id);

  // Step 3: Get attendance records for home branch services (to find absences)
  const homeAttendanceRecords = await db
    .select({
      serviceId: serviceAttendance.serviceId,
      memberId: serviceAttendance.memberId,
      attendanceStatus: serviceAttendance.attendanceStatus,
    })
    .from(serviceAttendance)
    .where(
      and(
        inArray(serviceAttendance.serviceId, homeServiceIds),
        inArray(serviceAttendance.memberId, homeMemberIds),
      ),
    );

  // Build a lookup: memberId -> Set of serviceIds they attended at home branch
  const homeAttendanceMap = new Map<string, Map<string, string>>();
  for (const rec of homeAttendanceRecords) {
    if (!homeAttendanceMap.has(rec.memberId)) {
      homeAttendanceMap.set(rec.memberId, new Map());
    }
    homeAttendanceMap.get(rec.memberId)!.set(rec.serviceId, rec.attendanceStatus);
  }

  // Step 4: For each home service, find members who are absent or have no record
  // Then check if they attended another branch's service on the same date
  const crossBranchResults: Array<{
    memberId: string;
    memberFirstName: string;
    memberLastName: string;
    memberEmail: string;
    homeBranchId: string;
    homeBranchName: string | null;
    homeServiceId: string;
    homeServiceDate: Date;
    homeServiceType: string;
    homeAttendanceStatus: string;
    visitedBranchId: string;
    visitedBranchName: string | null;
    visitedServiceId: string;
    visitedServiceType: string;
    visitedAttendanceStatus: string;
  }> = [];

  for (const homeService of homeBranchServices) {
    // Members absent or unrecorded for this home service
    const absentMemberIds = homeMemberIds.filter((memberId) => {
      const memberMap = homeAttendanceMap.get(memberId);
      if (!memberMap) return true; // No record = absent
      const status = memberMap.get(homeService.serviceId);
      return !status || status === 'Absent';
    });

    if (absentMemberIds.length === 0) continue;

    // Get the ISO week range (Mon-Sun) for this service
    const serviceDay = new Date(homeService.serviceDate);
    const dayOfWeek = serviceDay.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(serviceDay);
    weekStart.setDate(serviceDay.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Find services at OTHER branches in the same week
    const otherBranchConditions = [
      between(services.serviceDate, weekStart, weekEnd),
      sql`${services.branchId} != ${homeService.branchId}`,
    ];

    const otherBranchServices = await db
      .select({
        serviceId: services.id,
        serviceType: services.serviceType,
        branchId: services.branchId,
        branchName: branches.branchName,
      })
      .from(services)
      .leftJoin(branches, eq(services.branchId, branches.id))
      .where(and(...otherBranchConditions));

    if (otherBranchServices.length === 0) continue;

    const otherServiceIds = otherBranchServices.map((s) => s.serviceId);

    // Check if any absent members attended one of those other-branch services
    const crossVisits = await db
      .select({
        memberId: serviceAttendance.memberId,
        serviceId: serviceAttendance.serviceId,
        attendanceStatus: serviceAttendance.attendanceStatus,
      })
      .from(serviceAttendance)
      .where(
        and(
          inArray(serviceAttendance.memberId, absentMemberIds),
          inArray(serviceAttendance.serviceId, otherServiceIds),
          sql`${serviceAttendance.attendanceStatus} IN ('Present', 'Late', 'Virtual')`,
        ),
      );

    // Build lookup maps for this batch
    const memberMap = new Map(homeMembers.map((m) => [m.id, m]));
    const otherServiceMap = new Map(otherBranchServices.map((s) => [s.serviceId, s]));

    for (const visit of crossVisits) {
      const member = memberMap.get(visit.memberId);
      const visitedService = otherServiceMap.get(visit.serviceId);
      if (!member || !visitedService) continue;

      // Skip if they visited their own home branch
      if (visitedService.branchId === member.homeBranchId) continue;

      const homeStatus = homeAttendanceMap.get(visit.memberId)?.get(homeService.serviceId) ?? 'No Record';

      crossBranchResults.push({
        memberId: member.id,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
        memberEmail: member.email,
        homeBranchId: member.homeBranchId,
        homeBranchName: homeService.branchName,
        homeServiceId: homeService.serviceId,
        homeServiceDate: homeService.serviceDate,
        homeServiceType: homeService.serviceType,
        homeAttendanceStatus: homeStatus,
        visitedBranchId: visitedService.branchId,
        visitedBranchName: visitedService.branchName,
        visitedServiceId: visitedService.serviceId,
        visitedServiceType: visitedService.serviceType,
        visitedAttendanceStatus: visit.attendanceStatus,
      });
    }
  }

  // Sort by date desc, then member name
  crossBranchResults.sort((a, b) => {
    const dateDiff = new Date(b.homeServiceDate).getTime() - new Date(a.homeServiceDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return `${a.memberLastName} ${a.memberFirstName}`.localeCompare(`${b.memberLastName} ${b.memberFirstName}`);
  });

  return crossBranchResults;
}

// ── Automated Lateness Detection ───────────────────────────
// Compares a member's arrivalTime against the branch's scheduled
// service start time + grace period. If arrival is after start + grace,
// status is Late. Called during attendance recording to auto-set status.
//
// Branch serviceSchedule format:
// [{ day: "Thursday", time: "19:00", type: "Midweek Service", gracePeriodMinutes: 15 }]
//
// Default grace period is 15 minutes if not specified.

const DEFAULT_GRACE_PERIOD_MINUTES = 10;

export async function detectLateness(
  db: Database,
  serviceId: string,
  checkInTime: Date,
): Promise<'Present' | 'Late'> {
  // Get the service and its branch schedule
  const [service] = await db
    .select({
      serviceType: services.serviceType,
      branchId: services.branchId,
      serviceDate: services.serviceDate,
    })
    .from(services)
    .where(eq(services.id, serviceId));

  if (!service) return 'Present';

  // Get the branch's service schedule
  const [branch] = await db
    .select({ serviceSchedule: branches.serviceSchedule })
    .from(branches)
    .where(eq(branches.id, service.branchId));

  if (!branch?.serviceSchedule || !Array.isArray(branch.serviceSchedule)) {
    // No schedule — compare against the service's own date/time + default grace
    const serviceStart = new Date(service.serviceDate);
    const cutoff = new Date(serviceStart.getTime() + DEFAULT_GRACE_PERIOD_MINUTES * 60 * 1000);
    return checkInTime > cutoff ? 'Late' : 'Present';
  }

  // Find the matching schedule entry for this service type
  const schedule = (branch.serviceSchedule as Array<{ day: string; time: string; type: string; gracePeriodMinutes?: number }>)
    .find((s) => s.type === service.serviceType);

  if (!schedule?.time) {
    // No matching type in schedule — compare against the service's own date/time + default grace
    const serviceStart = new Date(service.serviceDate);
    const cutoff = new Date(serviceStart.getTime() + DEFAULT_GRACE_PERIOD_MINUTES * 60 * 1000);
    return checkInTime > cutoff ? 'Late' : 'Present';
  }

  // Parse scheduled time (e.g. "19:00") and build the scheduled start datetime
  const [hours, minutes] = schedule.time.split(':').map(Number);
  const scheduledStart = new Date(service.serviceDate);
  scheduledStart.setHours(hours!, minutes!, 0, 0);

  // Apply grace period
  const gracePeriod = schedule.gracePeriodMinutes ?? DEFAULT_GRACE_PERIOD_MINUTES;
  const cutoff = new Date(scheduledStart.getTime() + gracePeriod * 60 * 1000);

  // If check-in is after scheduled start + grace period, they're late
  return checkInTime > cutoff ? 'Late' : 'Present';
}

// ── Members Missing Recently ───────────────────────────────
// Returns active members who have no Present/Late/Virtual record
// across the last N services at their home branch.

export async function getMissingMembers(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  const targetBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - query.weeks * 7);

  // Get recent services for the branch
  const branchConditions: ReturnType<typeof eq>[] = [];
  if (targetBranchId) branchConditions.push(eq(services.branchId, targetBranchId));
  branchConditions.push(between(services.serviceDate, startDate, endDate) as any);

  const recentServices = await db
    .select({
      id: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
    })
    .from(services)
    .where(and(...branchConditions))
    .orderBy(desc(services.serviceDate));

  if (recentServices.length === 0) return [];

  const serviceIds = recentServices.map((s) => s.id);

  // Get all active members of this branch with their branch name
  const memberConditions: ReturnType<typeof eq>[] = [eq(members.isActive, true)];
  if (targetBranchId) memberConditions.push(eq(members.homeBranchId, targetBranchId));

  const branchMembers = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      phone: members.phone,
      photoUrl: members.photoUrl,
      gender: members.gender,
      membershipDate: members.membershipDate,
      homeBranchId: members.homeBranchId,
      branchName: branches.branchName,
    })
    .from(members)
    .leftJoin(branches, eq(members.homeBranchId, branches.id))
    .where(and(...memberConditions));

  if (branchMembers.length === 0) return [];

  const memberIds = branchMembers.map((m) => m.id);

  // Get which services each member DID attend
  const attendedRecords = await db
    .select({
      memberId: serviceAttendance.memberId,
      serviceId: serviceAttendance.serviceId,
    })
    .from(serviceAttendance)
    .where(
      and(
        inArray(serviceAttendance.serviceId, serviceIds),
        inArray(serviceAttendance.memberId, memberIds),
        sql`${serviceAttendance.attendanceStatus} IN ('Present', 'Late', 'Virtual')`,
      ),
    );

  // Build attended set per member
  const attendedByMember = new Map<string, Set<string>>();
  for (const rec of attendedRecords) {
    if (!attendedByMember.has(rec.memberId)) attendedByMember.set(rec.memberId, new Set());
    attendedByMember.get(rec.memberId)!.add(rec.serviceId);
  }

  // Members with zero attendance in the period at their home branch
  // But check if they attended another branch (cross-branch visit)
  const missingAtHome = branchMembers.filter((m) => {
    const attended = attendedByMember.get(m.id);
    return !attended || attended.size === 0;
  });

  // Check if "missing" members actually attended services at other branches
  let crossBranchAttendees = new Set<string>();
  if (missingAtHome.length > 0) {
    const missingIds = missingAtHome.map((m) => m.id);

    // Get all services in the same period at OTHER branches
    const otherBranchConditions = [
      between(services.serviceDate, startDate, endDate),
    ];
    if (targetBranchId) {
      otherBranchConditions.push(sql`${services.branchId} != ${targetBranchId}` as any);
    }

    const otherBranchServiceRows = await db
      .select({ id: services.id })
      .from(services)
      .where(and(...otherBranchConditions));

    if (otherBranchServiceRows.length > 0) {
      const otherServiceIds = otherBranchServiceRows.map((s) => s.id);

      const crossBranchRecords = await db
        .select({ memberId: serviceAttendance.memberId })
        .from(serviceAttendance)
        .where(
          and(
            inArray(serviceAttendance.memberId, missingIds),
            inArray(serviceAttendance.serviceId, otherServiceIds),
            sql`${serviceAttendance.attendanceStatus} IN ('Present', 'Late', 'Virtual')`,
          ),
        );

      crossBranchAttendees = new Set(crossBranchRecords.map((r) => r.memberId));
    }
  }

  // Filter out members who attended another branch
  const missing = missingAtHome.filter((m) => !crossBranchAttendees.has(m.id));

  return missing.map((m) => {
    const attended = attendedByMember.get(m.id) ?? new Set<string>();
    const missedServices = recentServices
      .filter((s) => !attended.has(s.id))
      .map((s) => ({
        serviceId: s.id,
        serviceType: s.serviceType,
        serviceTitle: s.serviceTitle,
        serviceDate: s.serviceDate,
      }));

    return {
      memberId: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      photoUrl: m.photoUrl,
      gender: m.gender,
      membershipDate: m.membershipDate,
      homeBranchId: m.homeBranchId,
      branchName: m.branchName,
      servicesMissed: missedServices.length,
      missedServices,
    };
  });
}

// ── Attendance by Service Type ─────────────────────────────
// Returns average attendance per service type over the period.

export async function getAttendanceByServiceType(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  const targetBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - query.weeks * 7);

  const conditions: any[] = [between(services.serviceDate, startDate, endDate)];
  if (targetBranchId) conditions.push(eq(services.branchId, targetBranchId));

  const rows = await db
    .select({
      serviceType: services.serviceType,
      totalServices: sql<number>`COUNT(DISTINCT ${services.id})`,
      totalPresent: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Present' THEN 1 END)`,
      totalLate: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Late' THEN 1 END)`,
      totalVirtual: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Virtual' THEN 1 END)`,
      totalAbsent: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} = 'Absent' THEN 1 END)`,
      totalAttended: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} IN ('Present', 'Late', 'Virtual') THEN 1 END)`,
      totalRecords: sql<number>`COUNT(${serviceAttendance.memberId})`,
      avgAttendance: sql<number>`ROUND(
        COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} IN ('Present', 'Late', 'Virtual') THEN 1 END)::numeric
        / NULLIF(COUNT(DISTINCT ${services.id}), 0), 1
      )`,
    })
    .from(services)
    .leftJoin(serviceAttendance, eq(services.id, serviceAttendance.serviceId))
    .where(and(...conditions))
    .groupBy(services.serviceType)
    .orderBy(services.serviceType);

  return rows;
}
