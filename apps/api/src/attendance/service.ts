import { eq, ne, and, or, count, sql, gte, lte, inArray, notInArray } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { authHasCapability } from '../lib/grants';
import {
  services,
  serviceAttendance,
  members,
  branches,
  branchDepartments,
  departments,
  departmentMembers,
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from '@kairos/database';
import type { AuthContext } from '@kairos/types';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '@kairos/utils';
import { createMemberShell } from '../lib/member-shell';
import { authHasAnyCapability } from '../lib/grants';

// ── Local auth helpers (per-module, not imported — see CLAUDE.md) ──

function enforceBranchScope(auth: AuthContext, branchId?: string) {
  if (authHasCapability(auth, 'branch:read')) return;
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
  if (authHasCapability(auth, 'branch:read')) return;
  if (await isInAdminDepartment(db, auth.memberId, branchId)) return;
  throw new ForbiddenError(
    'Only admin-desk volunteers (Admin department), pastors, and admins can manage services',
  );
}

/** Reports are admin|pastor|leader. */
function enforceReportReader(auth: AuthContext) {
  if (authHasCapability(auth, 'branch:read') || authHasAnyCapability(auth, 'fellowship:read', 'department:read')) return;
  throw new ForbiddenError('Only leaders, pastors, and admins can view attendance reports');
}

/**
 * Resolve "the member-id scope" for a report given optional department/fellowship filters.
 * Returns null when no filter is present (caller should use the unrestricted member predicate
 * — typically "all active members of the branch"). When at least one filter is set, returns
 * the intersection of matching member IDs.
 *
 * Used by trends / missing-members / summary endpoints (Phase 4c).
 */
async function resolveFilterMemberIds(
  db: Database,
  branchId: string,
  filters: { departmentId?: string; fellowshipId?: string },
): Promise<string[] | null> {
  if (!filters.departmentId && !filters.fellowshipId) return null;

  let deptIds: Set<string> | null = null;
  if (filters.departmentId) {
    const rows = await db
      .select({ memberId: departmentMembers.memberId })
      .from(departmentMembers)
      .innerJoin(branchDepartments, eq(departmentMembers.branchDepartmentId, branchDepartments.id))
      .where(
        and(
          eq(departmentMembers.branchDepartmentId, filters.departmentId),
          eq(departmentMembers.isActive, true),
          eq(branchDepartments.branchId, branchId), // enforce cross-branch isolation
        ),
      );
    deptIds = new Set(rows.map((r) => r.memberId));
  }

  let fellowshipIds: Set<string> | null = null;
  if (filters.fellowshipId) {
    const rows = await db
      .select({ memberId: fellowshipMembers.memberId })
      .from(fellowshipMembers)
      .innerJoin(fellowships, eq(fellowshipMembers.fellowshipId, fellowships.id))
      .where(
        and(
          eq(fellowshipMembers.fellowshipId, filters.fellowshipId),
          eq(fellowshipMembers.isActive, true),
          eq(fellowships.branchId, branchId),
        ),
      );
    fellowshipIds = new Set(rows.map((r) => r.memberId));
  }

  if (deptIds && fellowshipIds) {
    return Array.from(deptIds).filter((id) => fellowshipIds!.has(id));
  }
  return Array.from(deptIds ?? fellowshipIds ?? new Set<string>());
}

/**
 * Auto-narrow reports for fellowship/department leaders without branch:read.
 * Returns the union of member IDs across all fellowships and departments the
 * caller leads/co-leads in the target branch.
 *
 *   branch:read holders (admin / pastor)  → null  (no narrowing — branch-wide)
 *   fellowship:read / department:read     → array (members of led groups)
 *   leader with no active led groups      → empty array (visible scope = nothing)
 *
 * Mirrors the souls dashboard fix: a Youth Fellowship leader's attendance
 * report should be Youth's attendance, not the whole branch's.
 */
async function resolveLeaderScopeMemberIds(
  db: Database,
  auth: AuthContext,
  branchId: string,
): Promise<string[] | null> {
  if (authHasCapability(auth, 'branch:read')) return null;
  // Plain members (no leadership cap) don't get auto-narrowed — they read
  // their branch's summary as-is. Only callers holding fellowship/department
  // read need narrowing because they'd otherwise see branch-wide data.
  if (!authHasAnyCapability(auth, 'fellowship:read', 'department:read')) {
    return null;
  }

  const [ledFellowshipRows, ledDeptRows] = await Promise.all([
    db
      .select({ id: fellowships.id })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          eq(fellowships.branchId, branchId),
          or(
            eq(fellowships.leaderId, auth.memberId),
            eq(fellowships.coLeaderId, auth.memberId),
          )!,
        ),
      ),
    db
      .select({ id: branchDepartments.id })
      .from(branchDepartments)
      .where(
        and(
          eq(branchDepartments.isActive, true),
          eq(branchDepartments.branchId, branchId),
          or(
            eq(branchDepartments.leadMemberId, auth.memberId),
            eq(branchDepartments.deputyMemberId, auth.memberId),
          )!,
        ),
      ),
  ]);

  const ledFellowshipIds = ledFellowshipRows.map((r) => r.id);
  const ledDeptIds = ledDeptRows.map((r) => r.id);

  if (ledFellowshipIds.length === 0 && ledDeptIds.length === 0) return [];

  const memberIdSet = new Set<string>();
  if (ledFellowshipIds.length > 0) {
    const rows = await db
      .select({ memberId: fellowshipMembers.memberId })
      .from(fellowshipMembers)
      .where(
        and(
          eq(fellowshipMembers.isActive, true),
          inArray(fellowshipMembers.fellowshipId, ledFellowshipIds),
        ),
      );
    rows.forEach((r) => memberIdSet.add(r.memberId));
  }
  if (ledDeptIds.length > 0) {
    const rows = await db
      .select({ memberId: departmentMembers.memberId })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.isActive, true),
          inArray(departmentMembers.branchDepartmentId, ledDeptIds),
        ),
      );
    rows.forEach((r) => memberIdSet.add(r.memberId));
  }
  return Array.from(memberIdSet);
}

/**
 * Compose the leader-scope and explicit-filter member IDs:
 *   admin/pastor + no explicit filter         → null (branch-wide)
 *   admin/pastor + explicit filter            → explicit filter IDs
 *   leader      + no explicit filter          → leader-scope IDs
 *   leader      + explicit filter             → intersection
 *
 * `[]` (empty array) means "scope resolved but contains no members" — the
 * caller short-circuits to an empty report rather than running a branch-wide
 * query.
 */
function composeScopeMemberIds(
  leaderIds: string[] | null,
  filterIds: string[] | null,
): string[] | null {
  if (leaderIds === null && filterIds === null) return null;
  if (leaderIds === null) return filterIds;
  if (filterIds === null) return leaderIds;
  const filterSet = new Set(filterIds);
  return leaderIds.filter((id) => filterSet.has(id));
}

/** Resolve which branch a write/report targets, enforcing scope for non-admin/pastor. */
function resolveBranchId(auth: AuthContext, requested?: string): string {
  if (authHasCapability(auth, 'branch:read')) {
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
  if (authHasCapability(auth, 'branch:read')) {
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

  if (!authHasCapability(auth, 'branch:read')) {
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

  // Task #33 follow-up: single query yields total + per-category breakdown.
  // Inner join to members is safe because members are soft-deleted (never
  // hard-deleted) so every attendance row still resolves to a member row.
  // Priority: confirmed Member (membership_class_completed_at IS NOT NULL)
  // wins over memberType; otherwise partition by memberType so the four
  // sub-counts sum to total.
  const [counts] = await db
    .select({
      value: count(),
      members: sql<number>`COUNT(CASE WHEN ${members.membershipClassCompletedAt} IS NOT NULL THEN 1 END)`,
      returners: sql<number>`COUNT(CASE WHEN ${members.membershipClassCompletedAt} IS NULL AND ${members.memberType} = 'attendee' THEN 1 END)`,
      visitors: sql<number>`COUNT(CASE WHEN ${members.membershipClassCompletedAt} IS NULL AND ${members.memberType} = 'visitor' THEN 1 END)`,
      children: sql<number>`COUNT(CASE WHEN ${members.membershipClassCompletedAt} IS NULL AND ${members.memberType} = 'child' THEN 1 END)`,
    })
    .from(serviceAttendance)
    .innerJoin(members, eq(serviceAttendance.memberId, members.id))
    .where(eq(serviceAttendance.serviceId, id));

  const preacherName =
    svc.preacherFirstName && svc.preacherLastName
      ? `${svc.preacherFirstName} ${svc.preacherLastName}`
      : null;

  return {
    ...svc,
    preacherName,
    recordedCount: counts?.value ?? 0,
    categoryBreakdown: {
      members: Number(counts?.members ?? 0),
      returners: Number(counts?.returners ?? 0),
      visitors: Number(counts?.visitors ?? 0),
      children: Number(counts?.children ?? 0),
    },
  };
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
  query: { branchId?: string; weeks: number; departmentId?: string; fellowshipId?: string },
) {
  enforceReportReader(auth);
  const branchId = resolveBranchId(auth, query.branchId);
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  const [explicitFilterIds, leaderScopeIds] = await Promise.all([
    resolveFilterMemberIds(db, branchId, {
      departmentId: query.departmentId,
      fellowshipId: query.fellowshipId,
    }),
    resolveLeaderScopeMemberIds(db, auth, branchId),
  ]);
  const filterIds = composeScopeMemberIds(leaderScopeIds, explicitFilterIds);
  if (filterIds !== null && filterIds.length === 0) {
    return [] as { weekStart: string; attendees: number; serviceCount: number }[];
  }

  const conditions = [
    eq(services.branchId, branchId),
    eq(services.isActive, true),
    gte(services.serviceDate, since),
  ];
  if (filterIds !== null) {
    conditions.push(inArray(serviceAttendance.memberId, filterIds));
  }

  // Per ISO week: distinct attendees (Present + Late + Virtual all count as attended).
  const rows = await db
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${services.serviceDate}), 'YYYY-MM-DD')`,
      attendees: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
      serviceCount: sql<number>`COUNT(DISTINCT ${services.id})`,
    })
    .from(services)
    .leftJoin(serviceAttendance, eq(serviceAttendance.serviceId, services.id))
    .where(and(...conditions))
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
  query: { branchId?: string; services?: number; departmentId?: string; fellowshipId?: string },
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
  ];

  // Leader scope auto-narrows fellowship/dept leaders to their groups; the
  // explicit query filter further narrows that intersection.
  const [explicitFilterIds, leaderScopeIds] = await Promise.all([
    resolveFilterMemberIds(db, branchId, {
      departmentId: query.departmentId,
      fellowshipId: query.fellowshipId,
    }),
    resolveLeaderScopeMemberIds(db, auth, branchId),
  ]);
  const filterIds = composeScopeMemberIds(leaderScopeIds, explicitFilterIds);
  if (filterIds !== null) {
    if (filterIds.length === 0) {
      return [] as { memberId: string; firstName: string; lastName: string; servicesConsidered: number }[];
    }
    baseConditions.push(inArray(members.id, filterIds));
  }

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
  // Cross-branch admins (branch:read) MUST pass an explicit branchId — the
  // compare API is single-branch and silently narrowing to auth.branchId
  // produced the "One or more services are outside the caller branch" bug
  // that the /attendance/reports page hit when the outer filter defaulted
  // to "All branches". Fail loudly instead of falling back.
  if (authHasCapability(auth, 'branch:read') && !query.branchId) {
    throw new ValidationError('branchId is required — pick a branch to compare cohorts within');
  }
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

/**
 * Personal attendance snapshot for the caller — rate over a window, status split
 * (Present-on-time / Late / Virtual / Missed), streak, last attended service,
 * and a per-service history. Open to any authenticated member; branch-scoped to
 * the caller's homeBranchId.
 */
export async function getMyAttendance(
  db: Database,
  auth: AuthContext,
  query: { weeks: number },
) {
  if (!auth.branchId) {
    return {
      windowWeeks: query.weeks,
      servicesInWindow: 0,
      attendedCount: 0,
      rate: 0,
      presentOnTimeCount: 0,
      lateCount: 0,
      virtualCount: 0,
      missedCount: 0,
      currentStreak: { kind: 'attended' as const, length: 0 },
      lastAttendedAt: null as string | null,
      lastService: null as null | { id: string; serviceDate: string; serviceType: string; serviceTitle: string | null },
      history: [] as Array<{ serviceId: string; serviceDate: string; serviceType: string; status: string | null }>,
    };
  }
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  // All services in the caller's branch within the window.
  const svcRows = await db
    .select({
      id: services.id,
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
    })
    .from(services)
    .where(
      and(
        eq(services.branchId, auth.branchId),
        eq(services.isActive, true),
        gte(services.serviceDate, since),
      ),
    )
    .orderBy(services.serviceDate);

  const servicesInWindow = svcRows.length;
  if (servicesInWindow === 0) {
    return {
      windowWeeks: query.weeks,
      servicesInWindow: 0,
      attendedCount: 0,
      rate: 0,
      presentOnTimeCount: 0,
      lateCount: 0,
      virtualCount: 0,
      missedCount: 0,
      currentStreak: { kind: 'attended' as const, length: 0 },
      lastAttendedAt: null,
      lastService: null,
      history: [],
    };
  }

  // Caller's attendance rows in the window.
  const attRows = await db
    .select({
      serviceId: serviceAttendance.serviceId,
      attendanceStatus: serviceAttendance.attendanceStatus,
      arrivalTime: serviceAttendance.arrivalTime,
      recordedAt: serviceAttendance.recordedAt,
    })
    .from(serviceAttendance)
    .where(
      and(
        eq(serviceAttendance.memberId, auth.memberId),
        inArray(
          serviceAttendance.serviceId,
          svcRows.map((s) => s.id),
        ),
      ),
    );
  const attBySvc = new Map(attRows.map((a) => [a.serviceId, a]));

  // Build per-service history, oldest first.
  const history = svcRows.map((s) => ({
    serviceId: s.id,
    serviceDate: s.serviceDate.toISOString(),
    serviceType: s.serviceType,
    status: attBySvc.get(s.id)?.attendanceStatus ?? null,
  }));

  // Status split.
  let presentOnTimeCount = 0;
  let lateCount = 0;
  let virtualCount = 0;
  let missedCount = 0;
  for (const h of history) {
    if (h.status === 'Present') presentOnTimeCount++;
    else if (h.status === 'Late') lateCount++;
    else if (h.status === 'Virtual') virtualCount++;
    else missedCount++;
  }
  const attendedCount = presentOnTimeCount + lateCount + virtualCount;
  const rate = attendedCount / servicesInWindow;

  // Current streak — walk from most recent service backwards.
  let streakKind: 'attended' | 'missed' = 'attended';
  let streakLength = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const attended = !!history[i]!.status;
    if (streakLength === 0) {
      streakKind = attended ? 'attended' : 'missed';
      streakLength = 1;
      continue;
    }
    const sameKind = streakKind === 'attended' ? attended : !attended;
    if (sameKind) streakLength++;
    else break;
  }

  // Last attended service.
  let lastAttendedAt: string | null = null;
  let lastService: null | { id: string; serviceDate: string; serviceType: string; serviceTitle: string | null } = null;
  for (let i = svcRows.length - 1; i >= 0; i--) {
    const s = svcRows[i]!;
    if (attBySvc.has(s.id)) {
      lastAttendedAt = s.serviceDate.toISOString();
      lastService = {
        id: s.id,
        serviceDate: s.serviceDate.toISOString(),
        serviceType: s.serviceType,
        serviceTitle: s.serviceTitle,
      };
      break;
    }
  }

  return {
    windowWeeks: query.weeks,
    servicesInWindow,
    attendedCount,
    rate,
    presentOnTimeCount,
    lateCount,
    virtualCount,
    missedCount,
    currentStreak: { kind: streakKind, length: streakLength },
    lastAttendedAt,
    lastService,
    history,
  };
}

/**
 * Department attendance report — service-attendance breakdown for the members
 * of a branch_department over a window. Used by the dept leader / admin / pastor
 * to see how their team is engaging with Sunday/midweek/special services.
 *
 * Visibility: dept lead / deputy / admin / pastor.
 */
export async function getDepartmentAttendance(
  db: Database,
  auth: AuthContext,
  branchDepartmentId: string,
  query: { weeks: number },
) {
  // Load the branch_department + its global department name, and enforce scope.
  const [bd] = await db
    .select({
      id: branchDepartments.id,
      branchId: branchDepartments.branchId,
      leadMemberId: branchDepartments.leadMemberId,
      deputyMemberId: branchDepartments.deputyMemberId,
      isActive: branchDepartments.isActive,
      departmentName: departments.departmentName,
      branchName: branches.branchName,
    })
    .from(branchDepartments)
    .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
    .innerJoin(branches, eq(branchDepartments.branchId, branches.id))
    .where(eq(branchDepartments.id, branchDepartmentId))
    .limit(1);
  if (!bd) throw new NotFoundError('Branch department');
  if (!bd.isActive) throw new NotFoundError('Branch department');
  enforceBranchScope(auth, bd.branchId);
  const isLeadOrDeputy =
    bd.leadMemberId === auth.memberId || bd.deputyMemberId === auth.memberId;
  if (
    !authHasCapability(auth, 'branch:read') &&
    !isLeadOrDeputy
  ) {
    throw new ForbiddenError('Only the department lead/deputy or branch admin can view this');
  }

  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  // Active dept member roster (the denominator + per-row breakdown).
  const memberRows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(departmentMembers)
    .innerJoin(members, eq(departmentMembers.memberId, members.id))
    .where(
      and(
        eq(departmentMembers.branchDepartmentId, branchDepartmentId),
        eq(departmentMembers.isActive, true),
        eq(members.isActive, true),
      ),
    )
    .orderBy(members.lastName, members.firstName);

  // Services in window for the branch.
  const svcRows = await db
    .select({ id: services.id, serviceDate: services.serviceDate })
    .from(services)
    .where(
      and(
        eq(services.branchId, bd.branchId),
        eq(services.isActive, true),
        gte(services.serviceDate, since),
      ),
    )
    .orderBy(services.serviceDate);

  const totalServices = svcRows.length;
  const memberIds = memberRows.map((r) => r.memberId);

  // Per-(member, status) counts for the dept inside the window.
  let attendanceCounts: { memberId: string; attendanceStatus: string; c: number }[] = [];
  let lastAttended: Map<string, Date> = new Map();
  if (memberIds.length > 0 && totalServices > 0) {
    const serviceIds = svcRows.map((s) => s.id);
    const rows = await db
      .select({
        memberId: serviceAttendance.memberId,
        attendanceStatus: serviceAttendance.attendanceStatus,
        c: count(),
      })
      .from(serviceAttendance)
      .where(
        and(
          inArray(serviceAttendance.serviceId, serviceIds),
          inArray(serviceAttendance.memberId, memberIds),
        ),
      )
      .groupBy(serviceAttendance.memberId, serviceAttendance.attendanceStatus);
    attendanceCounts = rows.map((r) => ({
      memberId: r.memberId,
      attendanceStatus: r.attendanceStatus,
      c: Number(r.c),
    }));

    // Last attended timestamp per member.
    const lastRows = await db
      .select({
        memberId: serviceAttendance.memberId,
        serviceDate: services.serviceDate,
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
      .where(
        and(
          inArray(serviceAttendance.serviceId, serviceIds),
          inArray(serviceAttendance.memberId, memberIds),
        ),
      );
    for (const r of lastRows) {
      const prev = lastAttended.get(r.memberId);
      if (!prev || r.serviceDate > prev) lastAttended.set(r.memberId, r.serviceDate);
    }
  }

  // Aggregate per-member rate from counts.
  const perMember = memberRows.map((m) => {
    const my = attendanceCounts.filter((r) => r.memberId === m.memberId);
    const present = my.find((r) => r.attendanceStatus === 'Present')?.c ?? 0;
    const late = my.find((r) => r.attendanceStatus === 'Late')?.c ?? 0;
    const virtualc = my.find((r) => r.attendanceStatus === 'Virtual')?.c ?? 0;
    const attendedCount = present + late + virtualc;
    const rate = totalServices === 0 ? 0 : attendedCount / totalServices;
    const last = lastAttended.get(m.memberId);
    return {
      memberId: m.memberId,
      firstName: m.firstName,
      lastName: m.lastName,
      attendedCount,
      lateCount: late,
      totalServices,
      rate,
      lastAttendedAt: last ? last.toISOString() : null,
    };
  });

  // Dept-level distinctAttendees and rate.
  const distinctAttendees = new Set(attendanceCounts.map((r) => r.memberId)).size;
  const activeMembers = memberRows.length;
  const deptRate = activeMembers === 0 ? 0 : distinctAttendees / activeMembers;

  // Weekly trend — distinct attendees per ISO week.
  let trend: { weekStart: string; attendees: number }[] = [];
  if (memberIds.length > 0 && totalServices > 0) {
    const serviceIds = svcRows.map((s) => s.id);
    const trendRows = await db
      .select({
        weekStart: sql<Date>`date_trunc('week', ${services.serviceDate})`.as('week_start'),
        attendees: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`.as('attendees'),
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
      .where(
        and(
          inArray(serviceAttendance.serviceId, serviceIds),
          inArray(serviceAttendance.memberId, memberIds),
        ),
      )
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);
    trend = trendRows.map((r) => ({
      weekStart: new Date(r.weekStart as Date | string).toISOString(),
      attendees: Number(r.attendees),
    }));
  }

  // Sort per-member roster by rate ascending so concerning members surface first.
  perMember.sort((a, b) => a.rate - b.rate);

  return {
    department: {
      id: bd.id,
      name: bd.departmentName,
      branchName: bd.branchName,
    },
    windowWeeks: query.weeks,
    totalServices,
    distinctAttendees,
    activeMembers,
    rate: deptRate,
    members: perMember,
    trend,
  };
}

/**
 * Fellowship attendance report — combines TWO attendance streams for the
 * fellowship's active members:
 *   - service attendance (Sunday/midweek/special church services)
 *   - fellowship-meeting attendance (the fellowship's own roll-call meetings)
 *
 * Visibility: fellowship leader / co-leader / admin / pastor.
 */
export async function getFellowshipAttendance(
  db: Database,
  auth: AuthContext,
  fellowshipId: string,
  query: { weeks: number },
) {
  const [fs] = await db
    .select({
      id: fellowships.id,
      branchId: fellowships.branchId,
      fellowshipName: fellowships.fellowshipName,
      leaderId: fellowships.leaderId,
      coLeaderId: fellowships.coLeaderId,
      isActive: fellowships.isActive,
      branchName: branches.branchName,
    })
    .from(fellowships)
    .innerJoin(branches, eq(fellowships.branchId, branches.id))
    .where(eq(fellowships.id, fellowshipId))
    .limit(1);
  if (!fs) throw new NotFoundError('Fellowship');
  if (!fs.isActive) throw new NotFoundError('Fellowship');
  enforceBranchScope(auth, fs.branchId);
  const isLeadOrCo = fs.leaderId === auth.memberId || fs.coLeaderId === auth.memberId;
  if (
    !authHasCapability(auth, 'branch:read') &&
    !isLeadOrCo
  ) {
    throw new ForbiddenError('Only the fellowship leader or branch admin can view this');
  }

  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  // Active fellowship members.
  const memberRows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(fellowshipMembers)
    .innerJoin(members, eq(fellowshipMembers.memberId, members.id))
    .where(
      and(
        eq(fellowshipMembers.fellowshipId, fellowshipId),
        eq(fellowshipMembers.isActive, true),
        eq(members.isActive, true),
      ),
    )
    .orderBy(members.lastName, members.firstName);
  const memberIds = memberRows.map((r) => r.memberId);
  const activeMembers = memberRows.length;

  // ── Services side ───────────────────────────────────────
  const svcRows = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.branchId, fs.branchId),
        eq(services.isActive, true),
        gte(services.serviceDate, since),
      ),
    );
  const totalServices = svcRows.length;
  let svcAttended: Map<string, number> = new Map();
  let svcDistinct = 0;
  let svcTrend: { weekStart: string; attendees: number }[] = [];
  if (memberIds.length > 0 && totalServices > 0) {
    const sids = svcRows.map((s) => s.id);
    const rows = await db
      .select({
        memberId: serviceAttendance.memberId,
        c: count(),
      })
      .from(serviceAttendance)
      .where(
        and(
          inArray(serviceAttendance.serviceId, sids),
          inArray(serviceAttendance.memberId, memberIds),
        ),
      )
      .groupBy(serviceAttendance.memberId);
    for (const r of rows) svcAttended.set(r.memberId, Number(r.c));
    svcDistinct = svcAttended.size;
    const trendRows = await db
      .select({
        weekStart: sql<Date>`date_trunc('week', ${services.serviceDate})`.as('week_start'),
        attendees: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`.as('attendees'),
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
      .where(
        and(
          inArray(serviceAttendance.serviceId, sids),
          inArray(serviceAttendance.memberId, memberIds),
        ),
      )
      .groupBy(sql`date_trunc('week', ${services.serviceDate})`)
      .orderBy(sql`date_trunc('week', ${services.serviceDate})`);
    svcTrend = trendRows.map((r) => ({
      weekStart: new Date(r.weekStart as Date | string).toISOString(),
      attendees: Number(r.attendees),
    }));
  }
  const svcRate = activeMembers === 0 ? 0 : svcDistinct / activeMembers;

  // ── Meetings side ───────────────────────────────────────
  const mtgRows = await db
    .select({ id: fellowshipMeetings.id, meetingDate: fellowshipMeetings.meetingDate })
    .from(fellowshipMeetings)
    .where(
      and(
        eq(fellowshipMeetings.fellowshipId, fellowshipId),
        gte(fellowshipMeetings.meetingDate, since),
      ),
    )
    .orderBy(fellowshipMeetings.meetingDate);
  const totalMeetings = mtgRows.length;
  let mtgAttended: Map<string, number> = new Map();
  let mtgDistinct = 0;
  let lastMeeting: null | { id: string; date: string; attended: number; total: number } = null;
  if (memberIds.length > 0 && totalMeetings > 0) {
    const mids = mtgRows.map((m) => m.id);
    const rows = await db
      .select({
        memberId: fellowshipMeetingAttendance.memberId,
        c: count(),
      })
      .from(fellowshipMeetingAttendance)
      .where(
        and(
          inArray(fellowshipMeetingAttendance.meetingId, mids),
          inArray(fellowshipMeetingAttendance.memberId, memberIds),
          eq(fellowshipMeetingAttendance.attendanceStatus, 'Present'),
        ),
      )
      .groupBy(fellowshipMeetingAttendance.memberId);
    for (const r of rows) mtgAttended.set(r.memberId, Number(r.c));
    mtgDistinct = mtgAttended.size;

    // Last-meeting attendance breakdown
    const lastMtg = mtgRows[mtgRows.length - 1]!;
    const lastAttRows = await db
      .select({ c: count() })
      .from(fellowshipMeetingAttendance)
      .where(
        and(
          eq(fellowshipMeetingAttendance.meetingId, lastMtg.id),
          eq(fellowshipMeetingAttendance.attendanceStatus, 'Present'),
        ),
      );
    lastMeeting = {
      id: lastMtg.id,
      date: lastMtg.meetingDate.toISOString(),
      attended: Number(lastAttRows[0]?.c ?? 0),
      total: activeMembers,
    };
  }
  const mtgRate = activeMembers === 0 ? 0 : mtgDistinct / activeMembers;

  // Per-member combined breakdown.
  const perMember = memberRows.map((m) => {
    const sAtt = svcAttended.get(m.memberId) ?? 0;
    const mAtt = mtgAttended.get(m.memberId) ?? 0;
    return {
      memberId: m.memberId,
      firstName: m.firstName,
      lastName: m.lastName,
      serviceAttendedCount: sAtt,
      serviceRate: totalServices === 0 ? 0 : sAtt / totalServices,
      meetingAttendedCount: mAtt,
      meetingRate: totalMeetings === 0 ? 0 : mAtt / totalMeetings,
    };
  });
  // Sort ascending by service rate (concerning first), then meeting rate.
  perMember.sort((a, b) => a.serviceRate - b.serviceRate || a.meetingRate - b.meetingRate);

  return {
    fellowship: {
      id: fs.id,
      name: fs.fellowshipName,
      branchName: fs.branchName,
    },
    windowWeeks: query.weeks,
    activeMembers,
    services: {
      totalServices,
      distinctAttendees: svcDistinct,
      rate: svcRate,
      trend: svcTrend,
    },
    meetings: {
      totalMeetings,
      distinctAttendees: mtgDistinct,
      rate: mtgRate,
      lastMeeting,
    },
    members: perMember,
  };
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
  if (!authHasCapability(auth, 'branch:read')) {
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

  // Leader scope auto-narrows to the caller's led groups. Only applies when
  // the caller has fellowship/dept:read but not branch:read — admin/pastor
  // get null and the report renders branch-wide as before. Because this
  // report is cross-branch but the leader scope is single-branch, we use
  // auth.branchId for the resolution.
  const leaderScopeIds = await resolveLeaderScopeMemberIds(db, auth, auth.branchId);
  if (leaderScopeIds !== null && leaderScopeIds.length === 0) return [];

  // Active 'member'-type counts per branch.
  const memberCountConditions = [
    eq(members.isActive, true),
    inArray(members.homeBranchId, branchIds),
  ];
  if (leaderScopeIds !== null) {
    memberCountConditions.push(inArray(members.id, leaderScopeIds));
  }
  const memberCounts = await db
    .select({ branchId: members.homeBranchId, value: count() })
    .from(members)
    .where(and(...memberCountConditions))
    .groupBy(members.homeBranchId);
  const activeByBranch = new Map(memberCounts.map((r) => [r.branchId, Number(r.value)]));

  // Distinct attendees per branch over the recent window (Present/Late/Virtual
  // all count). Uses gte() with a Date — the same encoder path as the trends query.
  const attendeeCountConditions = [
    eq(services.isActive, true),
    gte(services.serviceDate, since),
    inArray(services.branchId, branchIds),
  ];
  if (leaderScopeIds !== null) {
    attendeeCountConditions.push(inArray(serviceAttendance.memberId, leaderScopeIds));
  }
  const attendeeCounts = await db
    .select({
      branchId: services.branchId,
      value: sql<number>`COUNT(DISTINCT ${serviceAttendance.memberId})`,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .where(and(...attendeeCountConditions))
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
  query: { branchId?: string; weeks: number; departmentId?: string; fellowshipId?: string },
) {
  const scopeBranchId = auth.systemRole === 'admin' ? query.branchId : auth.branchId;
  const since = new Date(Date.now() - query.weeks * 7 * 24 * 60 * 60 * 1000);

  const serviceConditions = [eq(services.isActive, true), gte(services.serviceDate, since)];
  if (scopeBranchId) serviceConditions.push(eq(services.branchId, scopeBranchId));

  // Leader scope + optional dept/fellowship query filter, intersected.
  const [explicitFilterIds, leaderScopeIds] = await Promise.all([
    scopeBranchId
      ? resolveFilterMemberIds(db, scopeBranchId, {
          departmentId: query.departmentId,
          fellowshipId: query.fellowshipId,
        })
      : Promise.resolve(null),
    scopeBranchId
      ? resolveLeaderScopeMemberIds(db, auth, scopeBranchId)
      : Promise.resolve(null),
  ]);
  const filterIds = composeScopeMemberIds(leaderScopeIds, explicitFilterIds);
  if (filterIds !== null && filterIds.length === 0) {
    return {
      statusBreakdown: { present: 0, late: 0, virtual: 0, total: 0 },
      rate: { distinctAttendees: 0, activeMembers: 0, rate: 0 },
    };
  }
  if (filterIds !== null) {
    serviceConditions.push(inArray(serviceAttendance.memberId, filterIds));
  }

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
  // When filtered, the denominator collapses to the filter set size.
  let activeMembers: number;
  if (filterIds !== null) {
    activeMembers = filterIds.length;
  } else {
    const activeConditions = [eq(members.isActive, true)];
    if (scopeBranchId) activeConditions.push(eq(members.homeBranchId, scopeBranchId));
    const activeRows = await db.select({ value: count() }).from(members).where(and(...activeConditions));
    activeMembers = Number(activeRows[0]?.value ?? 0);
  }

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
