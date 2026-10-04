import { eq, and, or, gte, lte, lt, count, sql, inArray, desc, asc } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  services,
  serviceAttendance,
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  branchDepartments,
  departmentMembers,
  departments,
  branches,
  members,
  membershipInterest,
} from '@kairos/database';
import type { AuthContext, HomeGroupSummary } from '@kairos/types';

/**
 * The reads behind GET /api/me/home that don't already exist elsewhere.
 * Everything else the home payload needs is composed from the module
 * services (approvals, follow-ups, rota, branch stats) — see home-service.ts.
 *
 * Each function is branch- or caller-scoped at the query level rather than
 * filtering in JS, so a leader can never be handed rows they then have to be
 * trusted not to render.
 */

/** How far back a fellowship meeting can be and still be worth chasing. */
const REGISTER_CHASE_DAYS = 21;

/** How many weeks of the caller's own attendance the streak walk considers. */
const STREAK_WINDOW_WEEKS = 26;

export interface UpcomingServiceRow {
  id: string;
  serviceName: string;
  serviceDate: string;
  branchName: string | null;
}

/** Services in the caller's branch from `from` forward, soonest first. */
export async function listUpcomingServices(
  db: Database,
  branchId: string,
  from: Date,
  to: Date,
): Promise<UpcomingServiceRow[]> {
  const rows = await db
    .select({
      id: services.id,
      serviceTitle: services.serviceTitle,
      serviceType: services.serviceType,
      serviceDate: services.serviceDate,
      branchName: branches.branchName,
    })
    .from(services)
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(
      and(
        eq(services.branchId, branchId),
        eq(services.isActive, true),
        gte(services.serviceDate, from),
        lte(services.serviceDate, to),
      ),
    )
    .orderBy(asc(services.serviceDate));

  return rows.map((r) => ({
    id: r.id,
    // serviceTitle is optional in the schema; fall back to the type so the
    // agenda row is never blank.
    serviceName: r.serviceTitle ?? r.serviceType ?? 'Service',
    serviceDate: (r.serviceDate as Date).toISOString(),
    branchName: r.branchName ?? null,
  }));
}

export interface UpcomingMeetingRow {
  id: string;
  fellowshipId: string;
  fellowshipName: string;
  meetingDate: string;
  location: string | null;
}

/** Meetings of fellowships the caller actually belongs to, soonest first. */
export async function listMyUpcomingMeetings(
  db: Database,
  memberId: string,
  from: Date,
  to: Date,
): Promise<UpcomingMeetingRow[]> {
  const rows = await db
    .select({
      id: fellowshipMeetings.id,
      fellowshipId: fellowships.id,
      fellowshipName: fellowships.fellowshipName,
      meetingDate: fellowshipMeetings.meetingDate,
      location: fellowshipMeetings.location,
    })
    .from(fellowshipMeetings)
    .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
    .innerJoin(
      fellowshipMembers,
      and(
        eq(fellowshipMembers.fellowshipId, fellowships.id),
        eq(fellowshipMembers.memberId, memberId),
        eq(fellowshipMembers.isActive, true),
      )!,
    )
    .where(
      and(
        eq(fellowships.isActive, true),
        gte(fellowshipMeetings.meetingDate, from),
        lte(fellowshipMeetings.meetingDate, to),
      ),
    )
    .orderBy(asc(fellowshipMeetings.meetingDate));

  return rows.map((r) => ({
    id: r.id,
    fellowshipId: r.fellowshipId,
    fellowshipName: r.fellowshipName,
    meetingDate: (r.meetingDate as Date).toISOString(),
    location: r.location ?? null,
  }));
}

export interface RegisterMissingRow {
  meetingId: string;
  fellowshipId: string;
  fellowshipName: string;
  meetingDate: string;
}

/**
 * Past meetings of fellowships the caller leads or co-leads that have no
 * attendance rows at all. "No rows" rather than "incomplete" on purpose — a
 * register marked with everyone absent is a decision, not an omission.
 */
export async function listRegistersMissing(
  db: Database,
  auth: AuthContext,
): Promise<RegisterMissingRow[]> {
  const since = new Date(Date.now() - REGISTER_CHASE_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      meetingId: fellowshipMeetings.id,
      fellowshipId: fellowships.id,
      fellowshipName: fellowships.fellowshipName,
      meetingDate: fellowshipMeetings.meetingDate,
      marked: count(fellowshipMeetingAttendance.memberId),
    })
    .from(fellowshipMeetings)
    .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
    .leftJoin(
      fellowshipMeetingAttendance,
      eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id),
    )
    .where(
      and(
        eq(fellowships.isActive, true),
        gte(fellowshipMeetings.meetingDate, since),
        lt(fellowshipMeetings.meetingDate, new Date()),
        or(
          eq(fellowships.leaderId, auth.memberId),
          eq(fellowships.coLeaderId, auth.memberId),
        )!,
      ),
    )
    .groupBy(
      fellowshipMeetings.id,
      fellowships.id,
      fellowships.fellowshipName,
      fellowshipMeetings.meetingDate,
    )
    .having(sql`COUNT(${fellowshipMeetingAttendance.memberId}) = 0`)
    .orderBy(desc(fellowshipMeetings.meetingDate));

  return rows.map((r) => ({
    meetingId: r.meetingId,
    fellowshipId: r.fellowshipId,
    fellowshipName: r.fellowshipName,
    meetingDate: (r.meetingDate as Date).toISOString(),
  }));
}

/**
 * The fellowships and departments the caller leads, with headcount and the
 * most recent register. This is the group-altitude equivalent of the pulse —
 * the same question ("how is my group doing?") at the grain the caller owns.
 */
export async function listMyGroupSummaries(
  db: Database,
  auth: AuthContext,
): Promise<HomeGroupSummary[]> {
  const [ledFellowships, ledDepartments] = await Promise.all([
    db
      .select({
        id: fellowships.id,
        name: fellowships.fellowshipName,
        headcount: sql<number>`(
          SELECT COUNT(*) FROM ${fellowshipMembers}
          WHERE ${fellowshipMembers.fellowshipId} = ${fellowships.id}
            AND ${fellowshipMembers.isActive} = TRUE
        )`,
      })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          or(
            eq(fellowships.leaderId, auth.memberId),
            eq(fellowships.coLeaderId, auth.memberId),
          )!,
        ),
      ),
    db
      .select({
        id: branchDepartments.id,
        name: departments.departmentName,
        headcount: sql<number>`(
          SELECT COUNT(*) FROM ${departmentMembers}
          WHERE ${departmentMembers.branchDepartmentId} = ${branchDepartments.id}
            AND ${departmentMembers.isActive} = TRUE
        )`,
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          eq(branchDepartments.isActive, true),
          or(
            eq(branchDepartments.leadMemberId, auth.memberId),
            eq(branchDepartments.deputyMemberId, auth.memberId),
          )!,
        ),
      ),
  ]);

  const fellowshipIds = ledFellowships.map((f) => f.id);
  const lastRegisterByFellowship = new Map<string, { present: number; total: number }>();

  if (fellowshipIds.length > 0) {
    // Most recent meeting per led fellowship, with its present/total split.
    const registerRows = await db
      .select({
        fellowshipId: fellowshipMeetings.fellowshipId,
        meetingDate: fellowshipMeetings.meetingDate,
        total: count(fellowshipMeetingAttendance.memberId),
        present: sql<number>`COUNT(CASE WHEN ${fellowshipMeetingAttendance.attendanceStatus} = 'Present' THEN 1 END)`,
      })
      .from(fellowshipMeetings)
      .innerJoin(
        fellowshipMeetingAttendance,
        eq(fellowshipMeetingAttendance.meetingId, fellowshipMeetings.id),
      )
      .where(inArray(fellowshipMeetings.fellowshipId, fellowshipIds))
      .groupBy(fellowshipMeetings.fellowshipId, fellowshipMeetings.meetingDate)
      .orderBy(desc(fellowshipMeetings.meetingDate));

    // Rows arrive newest-first, so the first row per fellowship wins.
    for (const row of registerRows) {
      if (!lastRegisterByFellowship.has(row.fellowshipId)) {
        lastRegisterByFellowship.set(row.fellowshipId, {
          present: Number(row.present),
          total: Number(row.total),
        });
      }
    }
  }

  const groups: HomeGroupSummary[] = ledFellowships.map((f) => {
    const register = lastRegisterByFellowship.get(f.id);
    return {
      kind: 'fellowship' as const,
      id: f.id,
      name: f.name,
      headcount: Number(f.headcount),
      lastPresent: register?.present ?? null,
      lastTotal: register?.total ?? null,
    };
  });

  for (const d of ledDepartments) {
    groups.push({
      kind: 'department',
      id: d.id,
      name: d.name,
      headcount: Number(d.headcount),
      // Departments don't keep a register — rota coverage is their health
      // signal, and it has its own row in `needsYou`.
      lastPresent: null,
      lastTotal: null,
    });
  }

  return groups;
}

/**
 * Every branch with its congregation size and most recent service turnout.
 * The church-altitude tail block.
 */
export async function listBranchSummaries(db: Database): Promise<HomeGroupSummary[]> {
  const branchRows = await db
    .select({
      id: branches.id,
      name: branches.branchName,
      headcount: sql<number>`(
        SELECT COUNT(*) FROM ${members}
        WHERE ${members.homeBranchId} = ${branches.id}
          AND ${members.isActive} = TRUE
      )`,
    })
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.branchName));

  if (branchRows.length === 0) return [];

  const turnoutRows = await db
    .select({
      branchId: services.branchId,
      serviceDate: services.serviceDate,
      present: sql<number>`COUNT(CASE WHEN ${serviceAttendance.attendanceStatus} <> 'Absent' THEN 1 END)`,
    })
    .from(services)
    .innerJoin(serviceAttendance, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(services.isActive, true),
        lt(services.serviceDate, new Date()),
        inArray(
          services.branchId,
          branchRows.map((b) => b.id),
        ),
      ),
    )
    .groupBy(services.branchId, services.serviceDate)
    .orderBy(desc(services.serviceDate));

  const lastTurnout = new Map<string, number>();
  for (const row of turnoutRows) {
    if (!lastTurnout.has(row.branchId)) lastTurnout.set(row.branchId, Number(row.present));
  }

  return branchRows.map((b) => ({
    kind: 'branch' as const,
    id: b.id,
    name: b.name,
    headcount: Number(b.headcount),
    lastPresent: lastTurnout.get(b.id) ?? null,
    lastTotal: null,
  }));
}

/**
 * Consecutive weeks the caller has been present at a service, counting back
 * from the most recent week they attended.
 *
 * Weeks with no service at all are not bridged — a branch that skips a week
 * breaks the streak. That's a known simplification: the alternative is
 * reconciling against the branch's service calendar, which costs a second
 * query for a number that decorates one card.
 */
export async function getAttendanceStreak(db: Database, memberId: string): Promise<number> {
  const since = new Date(Date.now() - STREAK_WINDOW_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${services.serviceDate}), 'YYYY-MM-DD')`,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(serviceAttendance.memberId, memberId),
        eq(serviceAttendance.attendanceStatus, 'Present'),
        gte(services.serviceDate, since),
      ),
    )
    .groupBy(sql`DATE_TRUNC('week', ${services.serviceDate})`)
    .orderBy(desc(sql`DATE_TRUNC('week', ${services.serviceDate})`));

  if (rows.length === 0) return 0;

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const previous = new Date(`${rows[i - 1]!.week}T00:00:00.000Z`).getTime();
    const current = new Date(`${rows[i]!.week}T00:00:00.000Z`).getTime();
    if (previous - current !== WEEK_MS) break;
    streak++;
  }
  return streak;
}

export interface ProfileCompleteness {
  complete: boolean;
  hasFellowship: boolean;
  hasMembershipInterest: boolean;
}

/**
 * What the caller still hasn't done. Drives the getting-started block, which
 * replaces an empty agenda for a brand-new member rather than leaving a gap.
 */
export async function getProfileCompleteness(
  db: Database,
  memberId: string,
): Promise<ProfileCompleteness> {
  const [profileRow, fellowshipRow, interestRow] = await Promise.all([
    db
      .select({
        phone: members.phone,
        dateOfBirth: members.dateOfBirth,
        address: members.address,
        mustCompleteProfile: members.mustCompleteProfile,
      })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1),
    db
      .select({ id: fellowshipMembers.id })
      .from(fellowshipMembers)
      .where(
        and(eq(fellowshipMembers.memberId, memberId), eq(fellowshipMembers.isActive, true)),
      )
      .limit(1),
    db
      .select({ id: membershipInterest.id })
      .from(membershipInterest)
      .where(
        and(eq(membershipInterest.memberId, memberId), eq(membershipInterest.isActive, true)),
      )
      .limit(1),
  ]);

  const profile = profileRow[0];
  const complete =
    !!profile &&
    !profile.mustCompleteProfile &&
    !!profile.phone &&
    !!profile.dateOfBirth &&
    !!profile.address;

  return {
    complete,
    hasFellowship: fellowshipRow.length > 0,
    hasMembershipInterest: interestRow.length > 0,
  };
}
