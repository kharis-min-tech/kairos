import { eq, and, or, gte, lte, lt, count, sql, inArray, desc, asc, isNull, isNotNull } from 'drizzle-orm';
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
  branchLeadership,
  members,
  membershipInterest,
  membershipEnrollments,
  formSubmissions,
  souls,
  outreachPrograms,
} from '@kairos/database';
import type { AuthContext, HomeActivityItem, HomeGroupSummary } from '@kairos/types';

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
        headcount: count(fellowshipMembers.id),
      })
      .from(fellowships)
      .leftJoin(
        fellowshipMembers,
        and(
          eq(fellowshipMembers.fellowshipId, fellowships.id),
          eq(fellowshipMembers.isActive, true),
        )!,
      )
      .where(
        and(
          eq(fellowships.isActive, true),
          or(
            eq(fellowships.leaderId, auth.memberId),
            eq(fellowships.coLeaderId, auth.memberId),
          )!,
        ),
      )
      .groupBy(fellowships.id, fellowships.fellowshipName),
    db
      .select({
        id: branchDepartments.id,
        name: departments.departmentName,
        headcount: count(departmentMembers.id),
      })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .leftJoin(
        departmentMembers,
        and(
          eq(departmentMembers.branchDepartmentId, branchDepartments.id),
          eq(departmentMembers.isActive, true),
        )!,
      )
      .where(
        and(
          eq(branchDepartments.isActive, true),
          or(
            eq(branchDepartments.leadMemberId, auth.memberId),
            eq(branchDepartments.deputyMemberId, auth.memberId),
          )!,
        ),
      )
      .groupBy(branchDepartments.id, departments.departmentName),
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
      headcount: count(members.id),
    })
    .from(branches)
    .leftJoin(
      members,
      and(eq(members.homeBranchId, branches.id), eq(members.isActive, true))!,
    )
    .where(eq(branches.isActive, true))
    .groupBy(branches.id, branches.branchName)
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

// ── Pulse warnings ─────────────────────────────────────────
//
// Each warning is a concrete, actionable gap rather than a metric. They are
// deliberately cheap: a branch-altitude home does two extra reads, a church
// one does two different ones.

/** How far back an unrecorded service is still worth chasing. */
const UNRECORDED_LOOKBACK_DAYS = 28;

/** A branch with no attendance for this long is behind, not merely quiet. */
export const BRANCH_BEHIND_DAYS = 14;

/**
 * Services the drifting-member warning counts over. Matches the default on
 * the Not-seen-recently screen the warning links to, so the number the user
 * taps agrees with the number they land on.
 */
export const DRIFTING_SERVICES_WINDOW = 3;

export interface UnrecordedServiceRow {
  serviceId: string;
  serviceDate: string;
}

/**
 * The most recent past service in the branch that has no attendance rows at
 * all. "No rows" rather than "incomplete" — a register marked with everyone
 * absent is a decision, not an omission.
 */
export async function findUnrecordedService(
  db: Database,
  branchId: string,
): Promise<UnrecordedServiceRow | null> {
  const since = new Date(Date.now() - UNRECORDED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      serviceId: services.id,
      serviceDate: services.serviceDate,
      marked: count(serviceAttendance.memberId),
    })
    .from(services)
    .leftJoin(serviceAttendance, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(services.branchId, branchId),
        eq(services.isActive, true),
        lt(services.serviceDate, new Date()),
        gte(services.serviceDate, since),
      ),
    )
    .groupBy(services.id, services.serviceDate)
    .having(sql`COUNT(${serviceAttendance.memberId}) = 0`)
    .orderBy(desc(services.serviceDate))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    serviceId: row.serviceId,
    serviceDate: (row.serviceDate as Date).toISOString(),
  };
}

/**
 * Active branches that held at least one service in the window and recorded
 * no attendance against any of them. A branch with no services isn't behind —
 * it has nothing to record — so the inner join excludes it naturally.
 */
export async function countBranchesBehind(db: Database, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ branchId: services.branchId })
    .from(services)
    .leftJoin(serviceAttendance, eq(serviceAttendance.serviceId, services.id))
    .where(
      and(
        eq(services.isActive, true),
        lt(services.serviceDate, new Date()),
        gte(services.serviceDate, since),
      ),
    )
    .groupBy(services.branchId)
    .having(sql`COUNT(${serviceAttendance.memberId}) = 0`);

  return rows.length;
}

/** Active branches with no current Main Pastor on `branch_leadership`. */
export async function countBranchesWithoutPastor(db: Database): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(branches)
    .leftJoin(
      branchLeadership,
      and(
        eq(branchLeadership.branchId, branches.id),
        eq(branchLeadership.role, 'Main Pastor'),
        eq(branchLeadership.isCurrent, true),
      )!,
    )
    .where(and(eq(branches.isActive, true), isNull(branchLeadership.id)));

  return Number(rows[0]?.value ?? 0);
}

/**
 * The branch's current Main Pastor, for the service row's subtitle. Folded in
 * here so the home screen is one request — the clients used to fetch the whole
 * leadership roster separately and pick this one name out of it, which made
 * the service row reflow once the second response landed.
 */
export async function getBranchMainPastorName(
  db: Database,
  branchId: string,
): Promise<string | null> {
  const rows = await db
    .select({ firstName: members.firstName, lastName: members.lastName })
    .from(branchLeadership)
    .innerJoin(members, eq(branchLeadership.memberId, members.id))
    .where(
      and(
        eq(branchLeadership.branchId, branchId),
        eq(branchLeadership.role, 'Main Pastor'),
        eq(branchLeadership.isCurrent, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || null;
}

// ── Recent activity ────────────────────────────────────────

/** How far back the feed looks. Beyond this it stops being "recent". */
const ACTIVITY_LOOKBACK_DAYS = 14;

/** Rows pulled per source before the merge; the merged feed is capped below. */
const ACTIVITY_PER_SOURCE = 6;

/** Rows returned to the client. */
const ACTIVITY_LIMIT = 6;

const FORM_TYPE_LABEL: Record<string, string> = {
  first_time_visitor: 'First-time visitor',
  altar_call: 'Altar call',
  baptism: 'Baptism',
  testimony: 'Testimony',
  baby_naming: 'Baby naming',
  baby_dedication: 'Baby dedication',
};

function formLabel(formType: string): string {
  return (
    FORM_TYPE_LABEL[formType] ??
    formType.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase())
  );
}

/**
 * What has happened lately, in the caller's reach.
 *
 * Five sources, each queried in parallel and capped, then merged and sorted so
 * no single busy source can crowd the others out. Scope is enforced per query
 * rather than filtered afterwards — a fellowship leader must never be handed
 * branch-wide rows and trusted not to render them.
 */
export async function listRecentActivity(
  db: Database,
  auth: AuthContext,
  altitude: 'church' | 'branch' | 'group' | 'personal',
): Promise<HomeActivityItem[]> {
  // A plain member has no community feed — nothing here is theirs to see.
  if (altitude === 'personal') return [];

  const since = new Date(Date.now() - ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const items: HomeActivityItem[] = [];

  // A group leader sees their own groups' meetings and nothing else.
  if (altitude === 'group') {
    const led = await db
      .select({ id: fellowships.id })
      .from(fellowships)
      .where(
        and(
          eq(fellowships.isActive, true),
          or(
            eq(fellowships.leaderId, auth.memberId),
            eq(fellowships.coLeaderId, auth.memberId),
          )!,
        ),
      );
    const ledIds = led.map((f) => f.id);
    if (ledIds.length === 0) return [];

    const meetings = await db
      .select({
        id: fellowshipMeetings.id,
        fellowshipId: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        meetingDate: fellowshipMeetings.meetingDate,
      })
      .from(fellowshipMeetings)
      .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
      .where(
        and(
          inArray(fellowshipMeetings.fellowshipId, ledIds),
          lt(fellowshipMeetings.meetingDate, new Date()),
          gte(fellowshipMeetings.meetingDate, since),
        ),
      )
      .orderBy(desc(fellowshipMeetings.meetingDate))
      .limit(ACTIVITY_LIMIT);

    return meetings.map((m) => ({
      kind: 'fellowship_met' as const,
      id: m.id,
      title: `${m.fellowshipName} met`,
      subtitle: null,
      at: (m.meetingDate as Date).toISOString(),
      refs: { fellowshipId: m.fellowshipId, meetingId: m.id },
    }));
  }

  // `undefined` means church altitude — every branch.
  const branchId = altitude === 'branch' ? auth.branchId : undefined;

  const [joined, forms, graduated, met, reached] = await Promise.all([
    db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        createdAt: members.createdAt,
        branchName: branches.branchName,
      })
      .from(members)
      .leftJoin(branches, eq(members.homeBranchId, branches.id))
      .where(
        and(
          eq(members.isActive, true),
          gte(members.createdAt, since),
          branchId ? eq(members.homeBranchId, branchId) : undefined,
        ),
      )
      .orderBy(desc(members.createdAt))
      .limit(ACTIVITY_PER_SOURCE),

    db
      .select({
        id: formSubmissions.id,
        formType: formSubmissions.formType,
        createdAt: formSubmissions.createdAt,
        branchName: branches.branchName,
      })
      .from(formSubmissions)
      .leftJoin(branches, eq(formSubmissions.branchId, branches.id))
      .where(
        and(
          gte(formSubmissions.createdAt, since),
          branchId ? eq(formSubmissions.branchId, branchId) : undefined,
        ),
      )
      .orderBy(desc(formSubmissions.createdAt))
      .limit(ACTIVITY_PER_SOURCE),

    db
      .select({
        id: membershipEnrollments.id,
        memberId: membershipEnrollments.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        graduatedAt: membershipEnrollments.graduatedAt,
        branchName: branches.branchName,
      })
      .from(membershipEnrollments)
      .innerJoin(members, eq(membershipEnrollments.memberId, members.id))
      .leftJoin(branches, eq(membershipEnrollments.branchId, branches.id))
      .where(
        and(
          isNotNull(membershipEnrollments.graduatedAt),
          gte(membershipEnrollments.graduatedAt, since),
          branchId ? eq(membershipEnrollments.branchId, branchId) : undefined,
        ),
      )
      .orderBy(desc(membershipEnrollments.graduatedAt))
      .limit(ACTIVITY_PER_SOURCE),

    db
      .select({
        id: fellowshipMeetings.id,
        fellowshipId: fellowships.id,
        fellowshipName: fellowships.fellowshipName,
        meetingDate: fellowshipMeetings.meetingDate,
      })
      .from(fellowshipMeetings)
      .innerJoin(fellowships, eq(fellowshipMeetings.fellowshipId, fellowships.id))
      .where(
        and(
          eq(fellowships.isActive, true),
          lt(fellowshipMeetings.meetingDate, new Date()),
          gte(fellowshipMeetings.meetingDate, since),
          branchId ? eq(fellowships.branchId, branchId) : undefined,
        ),
      )
      .orderBy(desc(fellowshipMeetings.meetingDate))
      .limit(ACTIVITY_PER_SOURCE),

    db
      .select({
        id: souls.id,
        firstName: souls.firstName,
        lastName: souls.lastName,
        createdAt: souls.createdAt,
        programName: outreachPrograms.programName,
      })
      .from(souls)
      .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.id))
      .where(
        and(
          gte(souls.createdAt, since),
          branchId ? eq(outreachPrograms.branchId, branchId) : undefined,
        ),
      )
      .orderBy(desc(souls.createdAt))
      .limit(ACTIVITY_PER_SOURCE),
  ]);

  for (const r of joined) {
    items.push({
      kind: 'member_joined',
      id: r.id,
      title: `${r.firstName} ${r.lastName} registered`,
      subtitle: r.branchName,
      at: (r.createdAt as Date).toISOString(),
      refs: { memberId: r.id },
    });
  }

  for (const r of forms) {
    items.push({
      kind: 'form_submitted',
      id: r.id,
      title: `${formLabel(r.formType)} form submitted`,
      subtitle: r.branchName,
      at: (r.createdAt as Date).toISOString(),
      refs: {},
    });
  }

  for (const r of graduated) {
    items.push({
      kind: 'membership_graduated',
      id: r.id,
      title: `${r.firstName} ${r.lastName} completed the membership class`,
      subtitle: r.branchName,
      at: (r.graduatedAt as Date).toISOString(),
      refs: { memberId: r.memberId },
    });
  }

  for (const r of met) {
    items.push({
      kind: 'fellowship_met',
      id: r.id,
      title: `${r.fellowshipName} met`,
      subtitle: null,
      at: (r.meetingDate as Date).toISOString(),
      refs: { fellowshipId: r.fellowshipId, meetingId: r.id },
    });
  }

  for (const r of reached) {
    items.push({
      kind: 'soul_captured',
      id: r.id,
      title: `${r.firstName} ${r.lastName} was reached`,
      subtitle: r.programName,
      at: (r.createdAt as Date).toISOString(),
      refs: {},
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, ACTIVITY_LIMIT);
}
