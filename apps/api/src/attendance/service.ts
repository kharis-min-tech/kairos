import { eq, ne, and, count, sql, gte, lte, inArray, notInArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  services,
  serviceAttendance,
  members,
  branches,
  branchDepartments,
  departments,
  departmentMembers,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError } from '@kairos/utils';
import { createMemberShell } from '../lib/member-shell';

// ── Local auth helpers (per-module, not imported — see CLAUDE.md) ──

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (branchId && branchId !== auth.branchId) {
    throw new ForbiddenError('You can only access attendance in your branch');
  }
}

/**
 * Whether the caller is an active member of the seeded "Admin" branch_department
 * in the given branch. Used to grant attendance-write authority to admin-desk
 * volunteers rather than to every system leader.
 */
async function isInAdminDepartment(
  db: Database,
  memberId: string,
  branchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: departmentMembers.id })
    .from(departmentMembers)
    .innerJoin(branchDepartments, eq(departmentMembers.branchDepartmentId, branchDepartments.id))
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .where(
      and(
        eq(departmentMembers.memberId, memberId),
        eq(departmentMembers.isActive, true),
        eq(branchDepartments.branchId, branchId),
        eq(branchDepartments.isActive, true),
        eq(departments.departmentName, 'Admin'),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * Service create/update/delete + attendance writes are gated to:
 *   - system admin / pastor (operational fallback)
 *   - members of the "Admin" branch_department in the target branch (admin-desk volunteers)
 *
 * Any other role (including non-Admin-dept leaders like worship/hospitality leads)
 * gets a Forbidden — leadership of an unrelated department doesn't grant register access.
 */
async function enforceServiceWriter(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<void> {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') return;
  if (await isInAdminDepartment(db, auth.memberId, branchId)) return;
  throw new ForbiddenError(
    'Only admin-desk volunteers (Admin department), pastors, and admins can manage services',
  );
}

/** Reports are admin|pastor|leader. */
function enforceReportReader(auth: AuthContext) {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor' || auth.systemRole === 'leader') return;
  throw new ForbiddenError('Only leaders, pastors, and admins can view attendance reports');
}

/** Resolve which branch a write/report targets, enforcing scope for non-admin/pastor. */
function resolveBranchId(auth: AuthContext, requested?: string): string {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') {
    return requested ?? auth.branchId;
  }
  if (requested && requested !== auth.branchId) {
    throw new ForbiddenError('You can only access attendance in your branch');
  }
  return auth.branchId;
}

// ── Types ──────────────────────────────────────────────────

interface CreateServiceInput {
  branchId?: string;
  serviceDate: string;
  serviceType: string;
  serviceTitle?: string;
  topic?: string;
  preacherId?: string;
  expectedAttendance?: number;
}

interface ListServicesQuery {
  page: number;
  limit: number;
  branchId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AttendanceEntry {
  memberId?: string;
  visitor?: { firstName: string; lastName: string; phone?: string };
  status: 'Present' | 'Late' | 'Virtual';
  arrivalTime?: string;
}

/**
 * Lightweight read used by the web to gate UI without exposing dept membership.
 * Returns whether the caller can record attendance in their (or admin/pastor: a chosen) branch.
 */
export async function canRecordAttendance(
  db: Database,
  auth: AuthContext,
  branchId?: string,
): Promise<{ canRecord: boolean }> {
  if (auth.systemRole === 'admin' || auth.systemRole === 'pastor') {
    return { canRecord: true };
  }
  if (!auth.branchId) return { canRecord: false };
  const targetBranch = branchId ?? auth.branchId;
  if (targetBranch !== auth.branchId) return { canRecord: false };
  return { canRecord: await isInAdminDepartment(db, auth.memberId, targetBranch) };
}

// ── Service CRUD ───────────────────────────────────────────

export async function createService(db: Database, auth: AuthContext, data: CreateServiceInput) {
  const branchId = resolveBranchId(auth, data.branchId);
  await enforceServiceWriter(db, auth, branchId);
  const serviceDate = new Date(data.serviceDate);

  // Pre-check the (branchId, serviceDate, serviceType) unique constraint.
  const [existing] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.branchId, branchId),
        eq(services.serviceDate, serviceDate),
        eq(services.serviceType, data.serviceType),
      ),
    );
  if (existing) {
    throw new ConflictError('A service of this type already exists at that date/time for this branch');
  }

  try {
    const [created] = await db
      .insert(services)
      .values({
        branchId,
        serviceDate,
        serviceType: data.serviceType,
        serviceTitle: data.serviceTitle ?? null,
        topic: data.topic ?? null,
        preacherId: data.preacherId ?? null,
        expectedAttendance: data.expectedAttendance ?? null,
        createdBy: auth.memberId,
      })
      .returning();
    return created!;
  } catch (err: unknown) {
    // Backstop in case of a race on the unique index.
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      throw new ConflictError('A service of this type already exists at that date/time for this branch');
    }
    throw err;
  }
}

export async function listServices(db: Database, auth: AuthContext, query: ListServicesQuery) {
  const conditions = [eq(services.isActive, true)];

  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    conditions.push(eq(services.branchId, auth.branchId));
  } else if (query.branchId) {
    conditions.push(eq(services.branchId, query.branchId));
  }

  if (query.type) conditions.push(eq(services.serviceType, query.type));
  if (query.dateFrom) conditions.push(gte(services.serviceDate, new Date(query.dateFrom)));
  if (query.dateTo) conditions.push(lte(services.serviceDate, new Date(query.dateTo)));

  const where = and(...conditions);
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
        topic: services.topic,
        preacherId: services.preacherId,
        expectedAttendance: services.expectedAttendance,
        createdBy: services.createdBy,
        isActive: services.isActive,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .leftJoin(branches, eq(services.branchId, branches.id))
      .where(where)
      .orderBy(sql`${services.serviceDate} DESC`)
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

export async function getService(db: Database, auth: AuthContext, id: string) {
  const [svc] = await db
    .select({
      id: services.id,
      branchId: services.branchId,
      branchName: branches.branchName,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
      topic: services.topic,
      preacherId: services.preacherId,
      preacherFirstName: members.firstName,
      preacherLastName: members.lastName,
      expectedAttendance: services.expectedAttendance,
      createdBy: services.createdBy,
      isActive: services.isActive,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .leftJoin(members, eq(services.preacherId, members.id))
    .where(and(eq(services.id, id), eq(services.isActive, true)));

  if (!svc) throw new NotFoundError('Service');
  enforceBranchScope(auth, svc.branchId);

  const [recorded] = await db
    .select({ value: count() })
    .from(serviceAttendance)
    .where(eq(serviceAttendance.serviceId, id));

  const preacherName =
    svc.preacherFirstName && svc.preacherLastName
      ? `${svc.preacherFirstName} ${svc.preacherLastName}`
      : null;

  return { ...svc, preacherName, recordedCount: recorded?.value ?? 0 };
}

export async function updateService(
  db: Database,
  auth: AuthContext,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await getService(db, auth, id);
  await enforceServiceWriter(db, auth, existing.branchId);

  const set: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (typeof data.serviceDate === 'string') set.serviceDate = new Date(data.serviceDate);

  // If the update touches any part of the unique key, re-check for a collision
  // with a DIFFERENT service so the edit returns a 409 rather than a raw 23505/500.
  const touchesUniqueKey =
    'serviceDate' in data || 'serviceType' in data || 'branchId' in data;
  if (touchesUniqueKey) {
    const nextBranchId = (set.branchId as string) ?? existing.branchId;
    const nextDate = (set.serviceDate as Date) ?? existing.serviceDate;
    const nextType = (set.serviceType as string) ?? existing.serviceType;
    const [clash] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.branchId, nextBranchId),
          eq(services.serviceDate, nextDate),
          eq(services.serviceType, nextType),
          ne(services.id, existing.id),
        ),
      );
    if (clash) {
      throw new ConflictError('A service of this type already exists at that date/time for this branch');
    }
  }

  try {
    const [updated] = await db
      .update(services)
      .set(set)
      .where(eq(services.id, existing.id))
      .returning();
    return updated!;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      throw new ConflictError('A service of this type already exists at that date/time for this branch');
    }
    throw err;
  }
}

export async function deleteService(db: Database, auth: AuthContext, id: string) {
  const existing = await getService(db, auth, id);
  await enforceServiceWriter(db, auth, existing.branchId);

  const [deleted] = await db
    .update(services)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(services.id, existing.id))
    .returning();

  return deleted!;
}

// ── Roster ─────────────────────────────────────────────────

export async function getServiceRoster(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  query: { page: number; limit: number; search?: string },
) {
  const svc = await getService(db, auth, serviceId);

  const conditions = [
    eq(members.isActive, true),
    eq(members.homeBranchId, svc.branchId),
    eq(members.memberType, 'member'),
  ];
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      sql`(${members.firstName} ILIKE ${term} OR ${members.lastName} ILIKE ${term})`,
    );
  }
  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [roster, [total]] = await Promise.all([
    db
      .select({
        memberId: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        photoUrl: members.photoUrl,
      })
      .from(members)
      .where(where)
      .orderBy(members.lastName, members.firstName)
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(members).where(where),
  ]);

  // Current recorded statuses for these members on this service.
  const memberIds = roster.map((r) => r.memberId);
  const recorded =
    memberIds.length > 0
      ? await db
          .select({ memberId: serviceAttendance.memberId, attendanceStatus: serviceAttendance.attendanceStatus })
          .from(serviceAttendance)
          .where(
            and(eq(serviceAttendance.serviceId, serviceId), inArray(serviceAttendance.memberId, memberIds)),
          )
      : [];
  const statusByMember = new Map(recorded.map((r) => [r.memberId, r.attendanceStatus]));

  return {
    data: roster.map((r) => ({ ...r, status: statusByMember.get(r.memberId) ?? null })),
    meta: {
      page: query.page,
      limit: query.limit,
      total: total!.value,
      totalPages: Math.ceil(total!.value / query.limit),
    },
  };
}

// ── Record attendance (bulk upsert) ────────────────────────

export async function recordAttendance(
  db: Database,
  auth: AuthContext,
  serviceId: string,
  body: { entries: AttendanceEntry[] },
) {
  const svc = await getService(db, auth, serviceId);
  await enforceServiceWriter(db, auth, svc.branchId);

  const rows: {
    serviceId: string;
    memberId: string;
    attendanceStatus: string;
    arrivalTime: Date | null;
    isFirstTimeVisitor: boolean;
    recordedBy: string;
  }[] = [];

  for (const entry of body.entries) {
    const arrivalTime = entry.arrivalTime ? new Date(entry.arrivalTime) : null;

    if (entry.memberId) {
      rows.push({
        serviceId,
        memberId: entry.memberId,
        attendanceStatus: entry.status,
        arrivalTime,
        isFirstTimeVisitor: false,
        recordedBy: auth.memberId,
      });
      continue;
    }

    const visitor = entry.visitor!;
    let resolvedMemberId: string | null = null;
    let isFirstTimeVisitor = true;

    if (visitor.phone && visitor.phone.trim().length > 0) {
      const [match] = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.phone, visitor.phone),
            eq(members.isActive, true),
            eq(members.homeBranchId, svc.branchId),
          ),
        );
      if (match) {
        resolvedMemberId = match.id;
        isFirstTimeVisitor = false;
      }
    }

    if (!resolvedMemberId) {
      resolvedMemberId = await createMemberShell(db, svc.branchId, {
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone ?? null,
        memberType: 'visitor',
      });
      isFirstTimeVisitor = true;
    }

    rows.push({
      serviceId,
      memberId: resolvedMemberId,
      attendanceStatus: entry.status,
      arrivalTime,
      isFirstTimeVisitor,
      recordedBy: auth.memberId,
    });
  }

  // Bulk upsert against the composite PK (serviceId, memberId).
  await db
    .insert(serviceAttendance)
    .values(rows)
    .onConflictDoUpdate({
      target: [serviceAttendance.serviceId, serviceAttendance.memberId],
      set: {
        attendanceStatus: sql`EXCLUDED.attendance_status`,
        arrivalTime: sql`EXCLUDED.arrival_time`,
        recordedBy: sql`EXCLUDED.recorded_by`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  return { recorded: rows.length };
}

export async function listAttendance(db: Database, auth: AuthContext, serviceId: string) {
  await getService(db, auth, serviceId);

  return db
    .select({
      serviceId: serviceAttendance.serviceId,
      memberId: serviceAttendance.memberId,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      attendanceStatus: serviceAttendance.attendanceStatus,
      arrivalTime: serviceAttendance.arrivalTime,
      isFirstTimeVisitor: serviceAttendance.isFirstTimeVisitor,
      recordedBy: serviceAttendance.recordedBy,
      recordedAt: serviceAttendance.recordedAt,
    })
    .from(serviceAttendance)
    .innerJoin(members, eq(serviceAttendance.memberId, members.id))
    .where(eq(serviceAttendance.serviceId, serviceId))
    .orderBy(members.lastName, members.firstName);
}

// ── Reports ────────────────────────────────────────────────

export async function getAttendanceTrends(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  enforceReportReader(auth);
  const branchId = resolveBranchId(auth, query.branchId);
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  // Per ISO week: distinct attendees (Present + Late + Virtual all count as attended).
  const rows = await db
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${services.serviceDate}), 'YYYY-MM-DD')`,
      attendees: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
      serviceCount: sql<number>`COUNT(DISTINCT ${services.id})`,
    })
    .from(services)
    .leftJoin(serviceAttendance, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(services.branchId, branchId),
        eq(services.isActive, true),
        gte(services.serviceDate, since),
      ),
    )
    .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
    .orderBy(sql`date_trunc('week', ${services.serviceDate})`);

  return rows.map((r) => ({
    weekStart: r.weekStart,
    attendees: Number(r.attendees),
    serviceCount: Number(r.serviceCount),
  }));
}

export async function getMissingMembers(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; services?: number },
) {
  enforceReportReader(auth);
  const branchId = resolveBranchId(auth, query.branchId);
  const recentCount = query.services ?? 4;

  // Recent N services for this branch.
  const recentServices = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.branchId, branchId), eq(services.isActive, true)))
    .orderBy(sql`${services.serviceDate} DESC`)
    .limit(recentCount);

  const recentServiceIds = recentServices.map((s) => s.id);

  // Active members (as of now) in this branch with no row across those services.
  const baseConditions = [
    eq(members.isActive, true),
    eq(members.homeBranchId, branchId),
    eq(members.memberType, 'member'),
  ];

  let rows;
  if (recentServiceIds.length === 0) {
    // No services to compare against — every active member is "missing".
    rows = await db
      .select({ memberId: members.id, firstName: members.firstName, lastName: members.lastName })
      .from(members)
      .where(and(...baseConditions))
      .orderBy(members.lastName, members.firstName);
  } else {
    const attendedSubquery = db
      .select({ memberId: serviceAttendance.memberId })
      .from(serviceAttendance)
      .where(inArray(serviceAttendance.serviceId, recentServiceIds));

    rows = await db
      .select({ memberId: members.id, firstName: members.firstName, lastName: members.lastName })
      .from(members)
      .where(and(...baseConditions, notInArray(members.id, attendedSubquery)))
      .orderBy(members.lastName, members.firstName);
  }

  return rows.map((r) => ({
    memberId: r.memberId,
    firstName: r.firstName,
    lastName: r.lastName,
    servicesConsidered: recentServiceIds.length,
  }));
}

/**
 * Cohort comparison — returns members "present in A" and "absent from B" across
 * any 2 multi-selects of services. ANY/ALL semantics per set:
 *   - ANY: attended at least one service in the set
 *   - ALL: attended every service in the set
 * Single-select inputs collapse: ANY and ALL produce the same answer.
 *
 * Both sets must belong to the caller's branch (admin can cross-branch).
 */
export async function getCohortDiff(
  db: Database,
  auth: AuthContext,
  query: {
    presentInServiceIds: string[];
    absentFromServiceIds: string[];
    presentMode: 'any' | 'all';
    absentMode: 'any' | 'all';
    branchId?: string;
  },
) {
  enforceReportReader(auth);
  const branchId = resolveBranchId(auth, query.branchId);

  // Validate that every referenced service belongs to the scoped branch.
  const allServiceIds = [
    ...new Set([...query.presentInServiceIds, ...query.absentFromServiceIds]),
  ];
  if (allServiceIds.length > 0) {
    const validServices = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          inArray(services.id, allServiceIds),
          eq(services.branchId, branchId),
          eq(services.isActive, true),
        ),
      );
    if (validServices.length !== allServiceIds.length) {
      throw new ForbiddenError('One or more services are outside the caller branch');
    }
  }

  // Build the "present in A" memberId set.
  let presentMemberIds: Set<string> | null = null;
  if (query.presentInServiceIds.length > 0) {
    if (query.presentMode === 'all') {
      // Members who attended every service in A.
      const rows = await db
        .select({
          memberId: serviceAttendance.memberId,
          c: count(serviceAttendance.serviceId),
        })
        .from(serviceAttendance)
        .where(inArray(serviceAttendance.serviceId, query.presentInServiceIds))
        .groupBy(serviceAttendance.memberId);
      presentMemberIds = new Set(
        rows
          .filter((r) => Number(r.c) === query.presentInServiceIds.length)
          .map((r) => r.memberId),
      );
    } else {
      // ANY: attended at least one service in A.
      const rows = await db
        .select({ memberId: serviceAttendance.memberId })
        .from(serviceAttendance)
        .where(inArray(serviceAttendance.serviceId, query.presentInServiceIds));
      presentMemberIds = new Set(rows.map((r) => r.memberId));
    }
  }

  // Build the "absent from B" memberId predicate.
  // ANY-absent: there exists at least one service in B the member didn't attend.
  // ALL-absent (default semantic per UI): the member attended none of B.
  let absentMemberIds: Set<string> | null = null;
  if (query.absentFromServiceIds.length > 0) {
    if (query.absentMode === 'any') {
      // Members for whom at least one service in B has NO attendance row.
      // Simplest read: take ALL members who appeared in B, count their distinct
      // services in B, keep those whose count < |B|. Then UNION with members
      // who appeared in NONE of B (the next bucket).
      const rows = await db
        .select({
          memberId: serviceAttendance.memberId,
          c: count(serviceAttendance.serviceId),
        })
        .from(serviceAttendance)
        .where(inArray(serviceAttendance.serviceId, query.absentFromServiceIds))
        .groupBy(serviceAttendance.memberId);
      const partialAttendees = new Set(
        rows
          .filter((r) => Number(r.c) < query.absentFromServiceIds.length)
          .map((r) => r.memberId),
      );
      // Plus everyone who appeared in zero services of B — we infer this from
      // the full active-member set in branch.
      const allMembers = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            eq(members.homeBranchId, branchId),
            eq(members.memberType, 'member'),
          ),
        );
      const attendedAtLeastOne = new Set(rows.map((r) => r.memberId));
      const noneOfB = allMembers
        .map((m) => m.id)
        .filter((id) => !attendedAtLeastOne.has(id));
      absentMemberIds = new Set([...partialAttendees, ...noneOfB]);
    } else {
      // ALL-absent: members who attended NONE of B.
      const attendedB = await db
        .select({ memberId: serviceAttendance.memberId })
        .from(serviceAttendance)
        .where(inArray(serviceAttendance.serviceId, query.absentFromServiceIds))
        .groupBy(serviceAttendance.memberId);
      const attendedSet = new Set(attendedB.map((r) => r.memberId));
      const allMembers = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.isActive, true),
            eq(members.homeBranchId, branchId),
            eq(members.memberType, 'member'),
          ),
        );
      absentMemberIds = new Set(
        allMembers.map((m) => m.id).filter((id) => !attendedSet.has(id)),
      );
    }
  }

  // Intersect the two predicates. If only one was provided, the other is "any".
  let resultIds: string[];
  if (presentMemberIds && absentMemberIds) {
    resultIds = Array.from(presentMemberIds).filter((id) => absentMemberIds!.has(id));
  } else if (presentMemberIds) {
    resultIds = Array.from(presentMemberIds);
  } else if (absentMemberIds) {
    resultIds = Array.from(absentMemberIds);
  } else {
    resultIds = [];
  }

  if (resultIds.length === 0) return { members: [] };

  // Hydrate names for the result list.
  const rows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(members)
    .where(and(inArray(members.id, resultIds), eq(members.isActive, true)))
    .orderBy(members.lastName, members.firstName);

  return { members: rows };
}

export async function getAttendanceByBranch(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  enforceReportReader(auth);
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  // Metric (defined here): attendanceRate = distinct attendees over the recent
  // period / count of active 'member'-type members in the branch. Capped at 1.0
  // when visitors push distinct attendees above the active-member count.
  //
  // Computed with three plain grouped queries merged in JS rather than
  // correlated scalar subqueries: embedding Drizzle column refs in a raw `sql`
  // subquery rendered them unqualified (so `branches.id` resolved to the inner
  // table's own id, breaking the correlation) and couldn't encode the Date bound.
  const branchConditions = [eq(branches.isActive, true)];
  if (auth.systemRole !== 'admin' && auth.systemRole !== 'pastor') {
    branchConditions.push(eq(branches.id, auth.branchId));
  } else if (query.branchId) {
    branchConditions.push(eq(branches.id, query.branchId));
  }

  const branchRows = await db
    .select({ id: branches.id, branchName: branches.branchName })
    .from(branches)
    .where(and(...branchConditions))
    .orderBy(branches.branchName);

  if (branchRows.length === 0) return [];
  const branchIds = branchRows.map((b) => b.id);

  // Active 'member'-type counts per branch.
  const memberCounts = await db
    .select({ branchId: members.homeBranchId, value: count() })
    .from(members)
    .where(
      and(
        eq(members.isActive, true),
        eq(members.memberType, 'member'),
        inArray(members.homeBranchId, branchIds),
      ),
    )
    .groupBy(members.homeBranchId);
  const activeByBranch = new Map(memberCounts.map((r) => [r.branchId, Number(r.value)]));

  // Distinct attendees per branch over the recent window (Present/Late/Virtual
  // all count). Uses gte() with a Date — the same encoder path as the trends query.
  const attendeeCounts = await db
    .select({
      branchId: services.branchId,
      value: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(services.isActive, true),
        gte(services.serviceDate, since),
        inArray(services.branchId, branchIds),
      ),
    )
    .groupBy(services.branchId);
  const attendeesByBranch = new Map(attendeeCounts.map((r) => [r.branchId, Number(r.value)]));

  return branchRows.map((b) => {
    const active = activeByBranch.get(b.id) ?? 0;
    const attended = attendeesByBranch.get(b.id) ?? 0;
    const rate = active > 0 ? Math.min(1, attended / active) : 0;
    return {
      branchId: b.id,
      branchName: b.branchName,
      activeMembers: active,
      distinctAttendees: attended,
      attendanceRate: Math.round(rate * 1000) / 1000,
    };
  });
}

// Dashboard summary feeding the two Mission Control donuts: the Present/Late/
// Virtual status split and the distinct-attendees ÷ active-members rate.
// Readable by any authenticated role and branch-scoped — admin sees all branches
// (or query.branchId), everyone else (pastor/leader/member) is pinned to their
// own branch — so it's safe to surface on the member dashboard.
export async function getAttendanceSummary(
  db: Database,
  auth: AuthContext,
  query: { branchId?: string; weeks: number },
) {
  const scopeBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  const serviceConditions = [eq(services.isActive, true), gte(services.serviceDate, since)];
  if (scopeBranchId) serviceConditions.push(eq(services.branchId, scopeBranchId));

  // 1) Status split (Present/Late/Virtual) — one row per status.
  const statusRows = await db
    .select({ status: serviceAttendance.attendanceStatus, value: count() })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .where(and(...serviceConditions))
    .groupBy(serviceAttendance.attendanceStatus);
  const statusMap = new Map(statusRows.map((r) => [r.status, Number(r.value)]));
  const present = statusMap.get('Present') ?? 0;
  const late = statusMap.get('Late') ?? 0;
  const virtual = statusMap.get('Virtual') ?? 0;

  // 2) Distinct attendees over the window (rate numerator).
  const distinctRows = await db
    .select({ value: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})` })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .where(and(...serviceConditions));
  const distinctAttendees = Number(distinctRows[0]?.value ?? 0);

  // 3) Active 'member'-type count in scope (rate denominator).
  const activeConditions = [eq(members.isActive, true), eq(members.memberType, 'member')];
  if (scopeBranchId) activeConditions.push(eq(members.homeBranchId, scopeBranchId));
  const activeRows = await db.select({ value: count() }).from(members).where(and(...activeConditions));
  const activeMembers = Number(activeRows[0]?.value ?? 0);

  const rate = activeMembers > 0 ? Math.min(1, distinctAttendees / activeMembers) : 0;

  return {
    statusBreakdown: { present, late, virtual, total: present + late + virtual },
    rate: {
      distinctAttendees,
      activeMembers,
      rate: Math.round(rate * 1000) / 1000,
    },
  };
}
