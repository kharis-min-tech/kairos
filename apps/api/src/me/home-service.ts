import type { Database } from '@kairos/database';
import type {
  AuthContext,
  HomeAgendaItem,
  HomePulseWarning,
  HomeGettingStartedItem,
  HomeGroupSummary,
  HomePulse,
  HomeTaskItem,
  MeHomeResponse,
} from '@kairos/types';
import { authHasCapability } from '../lib/grants';
import { resolveHomeAltitude } from '../lib/leader-scope';
import { listMyApprovals, listMyFollowups } from './service';
import { getAdminStats, getBranchStats } from '../analytics/service';
import { listMyUpcomingRota } from '../departments/rota-service';
import { listConcernFollowups } from '../members/followups-history-service';
import { getMissingMembers } from '../attendance/service';
import {
  listUpcomingServices,
  listMyUpcomingMeetings,
  listRegistersMissing,
  listBranchSummaries,
  listMyGroupSummaries,
  getAttendanceStreak,
  getProfileCompleteness,
  findUnrecordedService,
  countBranchesBehind,
  countBranchesWithoutPastor,
  getBranchMainPastorName,
  listRecentActivity,
  countFirstTimersNeedingFollowup,
  BRANCH_BEHIND_DAYS,
  DRIFTING_SERVICES_WINDOW,
} from './home-queries';

/**
 * GET /api/me/home — the control-centre payload for both clients.
 *
 * Pure composition: every number already has an owner elsewhere, so this
 * module's job is to decide what a given caller sees and in what order. The
 * four blocks are `today`/`thisWeek` (agenda), `needsYou` (tasks), `pulse`
 * (numbers) and `groups`/`gettingStarted` (the tail).
 *
 * Altitude, not role, drives the arrangement — adding a role must never mean
 * adding a branch here. A role with no altitude of its own (MembershipChampion
 * and anything added later) lands on `personal`, which is the whole point.
 */

/** How far ahead the agenda looks. */
const AGENDA_WINDOW_DAYS = 7;

function pluralise(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Thu 2 Oct" — enough to identify a meeting without a full timestamp. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/**
 * Welfare and safeguarding inboxes throw ForbiddenError rather than returning
 * empty, so the gate is mirrored here instead of catching a 403 — swallowing
 * one would hide a real authorization bug.
 */
function canSeeConcerns(auth: AuthContext, kind: 'welfare' | 'safeguarding'): boolean {
  if (auth.systemRole === 'admin') return true;
  const scope = { kind: 'branch' as const, id: auth.branchId };
  if (authHasCapability(auth, 'branch:write', scope)) return true;
  return kind === 'safeguarding' && authHasCapability(auth, 'safeguarding:read', scope);
}

export async function getMyHome(db: Database, auth: AuthContext): Promise<MeHomeResponse> {
  const altitude = resolveHomeAltitude(auth);
  const isPersonal = altitude === 'personal';
  const hasQueue = !isPersonal;

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);
  const windowEnd = new Date(now.getTime() + AGENDA_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    upcomingServices,
    upcomingMeetings,
    upcomingRota,
    approvals,
    followups,
    registersMissing,
    firstTimersNeedingFollowup,
    welfare,
    safeguarding,
    groups,
    streakWeeks,
    completeness,
    mainPastor,
    recentActivity,
    pulse,
  ] = await Promise.all([
    listUpcomingServices(db, auth.branchId, now, windowEnd),
    listMyUpcomingMeetings(db, auth.memberId, now, windowEnd),
    listMyUpcomingRota(db, auth, { from: now.toISOString(), to: windowEnd.toISOString() }),
    hasQueue ? listMyApprovals(db, auth) : Promise.resolve([]),
    hasQueue ? listMyFollowups(db, auth) : Promise.resolve([]),
    hasQueue ? listRegistersMissing(db, auth) : Promise.resolve([]),
    // Only branch altitude and up owns this queue — a group leader has no
    // reach over first-timers, who belong to no group by definition.
    altitude === 'branch' || altitude === 'church'
      ? countFirstTimersNeedingFollowup(db, auth.branchId)
      : Promise.resolve(0),
    canSeeConcerns(auth, 'welfare')
      ? listConcernFollowups(db, auth, 'welfare')
      : Promise.resolve([]),
    canSeeConcerns(auth, 'safeguarding')
      ? listConcernFollowups(db, auth, 'safeguarding')
      : Promise.resolve([]),
    altitude === 'church' ? listBranchSummaries(db) : listMyGroupSummaries(db, auth),
    altitude === 'personal' || altitude === 'group'
      ? getAttendanceStreak(db, auth.memberId)
      : Promise.resolve(null),
    isPersonal
      ? getProfileCompleteness(db, auth.memberId)
      : Promise.resolve({ complete: true, hasFellowship: true, hasMembershipInterest: true }),
    getBranchMainPastorName(db, auth.branchId),
    listRecentActivity(db, auth, altitude),
    buildPulse(db, auth, altitude),
  ]);

  // ── Agenda ──────────────────────────────────────────────
  const agenda: HomeAgendaItem[] = [];

  for (const s of upcomingServices) {
    const isToday = new Date(s.serviceDate) <= endOfToday;
    agenda.push({
      kind: 'service',
      id: s.id,
      title: s.serviceName,
      // The Main Pastor rides on today's service only — repeating the name
      // down every row this week is noise.
      subtitle:
        isToday && mainPastor
          ? [s.branchName, mainPastor.name].filter(Boolean).join(' · ')
          : s.branchName,
      at: s.serviceDate,
      refs: { serviceId: s.id },
    });
  }

  for (const r of upcomingRota) {
    const at = rotaTimestamp(r);
    if (!at) continue;
    agenda.push({
      kind: 'rota',
      id: r.instanceId,
      title: r.templateName ?? 'Rota duty',
      subtitle: r.slotRoleName ?? null,
      at,
      refs: { rotaInstanceId: r.instanceId },
    });
  }

  for (const m of upcomingMeetings) {
    agenda.push({
      kind: 'fellowship_meeting',
      id: m.id,
      title: m.fellowshipName,
      subtitle: m.location,
      at: m.meetingDate,
      refs: { fellowshipId: m.fellowshipId, meetingId: m.id },
    });
  }

  agenda.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const today = agenda.filter((i) => new Date(i.at) <= endOfToday);
  const thisWeek = agenda.filter((i) => new Date(i.at) > endOfToday);

  // ── Needs you ───────────────────────────────────────────
  const needsYou: HomeTaskItem[] = [];

  // One row per missing register — which fellowship and which week is the
  // whole content of the task, so collapsing them would lose it.
  for (const r of registersMissing) {
    needsYou.push({
      kind: 'register_missing',
      id: r.meetingId,
      title: 'Register not taken',
      subtitle: `${r.fellowshipName} · ${shortDate(r.meetingDate)}`,
      count: 1,
      urgency: 'high',
      refs: { fellowshipId: r.fellowshipId, meetingId: r.meetingId },
    });
  }

  if (firstTimersNeedingFollowup > 0) {
    needsYou.push({
      kind: 'first_timer_followup',
      id: 'first_timer_followup',
      title: pluralise(
        firstTimersNeedingFollowup,
        'first-timer needs a first visit',
        'first-timers need a first visit',
      ),
      subtitle: null,
      count: firstTimersNeedingFollowup,
      urgency: 'high',
      refs: {},
    });
  }

  if (welfare.length > 0) {
    needsYou.push({
      kind: 'welfare_concern',
      id: 'welfare',
      title: pluralise(welfare.length, 'welfare concern', 'welfare concerns'),
      subtitle: null,
      count: welfare.length,
      urgency: 'high',
      refs: {},
    });
  }

  if (safeguarding.length > 0) {
    needsYou.push({
      kind: 'safeguarding_concern',
      id: 'safeguarding',
      title: pluralise(safeguarding.length, 'safeguarding matter', 'safeguarding matters'),
      subtitle: null,
      count: safeguarding.length,
      urgency: 'high',
      refs: {},
    });
  }

  const approvalRows: Array<[string, HomeTaskItem['kind'], string, string]> = [
    ['member_signup', 'member_approval', 'member approval', 'member approvals'],
    ['fellowship_join', 'fellowship_join', 'fellowship join request', 'fellowship join requests'],
    ['department_join', 'department_join', 'department join request', 'department join requests'],
  ];

  for (const [sourceKind, taskKind, one, many] of approvalRows) {
    const matching = approvals.filter((a) => a.kind === sourceKind);
    if (matching.length === 0) continue;
    // Carry the group id when every pending request is for the SAME group, so
    // the row opens the page that actually shows them rather than a list the
    // reader then has to search. Mixed groups have no single destination.
    const groupIds = new Set(
      matching.map((a) =>
        'fellowshipId' in a ? a.fellowshipId : 'branchDeptId' in a ? a.branchDeptId : null,
      ),
    );
    const only = groupIds.size === 1 ? [...groupIds][0] : null;
    needsYou.push({
      kind: taskKind,
      id: taskKind,
      title: pluralise(matching.length, one, many),
      subtitle: null,
      count: matching.length,
      urgency: 'normal',
      refs:
        only && sourceKind === 'fellowship_join'
          ? { fellowshipId: only }
          : only && sourceKind === 'department_join'
            ? { departmentId: only }
            : {},
    });
  }

  if (followups.length > 0) {
    needsYou.push({
      kind: 'followup_due',
      id: 'followup_due',
      title: `${pluralise(followups.length, 'follow-up', 'follow-ups')} due`,
      subtitle: null,
      count: followups.length,
      urgency: 'normal',
      refs: {},
    });
  }

  // Stable sort: high urgency first, insertion order preserved within a band.
  needsYou.sort((a, b) => Number(b.urgency === 'high') - Number(a.urgency === 'high'));

  // ── Tail ────────────────────────────────────────────────
  const gettingStarted: HomeGettingStartedItem[] = [];
  if (isPersonal) {
    if (!completeness.hasFellowship) {
      gettingStarted.push({ key: 'join_fellowship', title: 'Join a fellowship' });
    }
    if (!completeness.hasMembershipInterest) {
      gettingStarted.push({
        key: 'membership_interest',
        title: 'Express interest in the membership class',
      });
    }
    if (!completeness.complete) {
      gettingStarted.push({ key: 'complete_profile', title: 'Complete your profile' });
    }
  }

  return {
    altitude,
    today,
    thisWeek,
    needsYou,
    pulse,
    groups: groups as HomeGroupSummary[],
    // Pastor is an IDENTITY on branch_leadership, not a system role or a grant
    // — so the badge can prefer it over whatever authority the caller also
    // happens to hold. A Main Pastor who is also a Branch System Admin was
    // being labelled the latter.
    viewerIsBranchMainPastor: mainPastor?.memberId === auth.memberId,
    recentActivity,
    gettingStarted,
    streakWeeks,
  };
}

/**
 * `rotaInstances.serviceDate` is a date and `startTime` a separate time
 * column, so the agenda timestamp is assembled from both. A row with neither
 * is skipped rather than defaulted to midnight, which would sort it wrongly.
 */
function rotaTimestamp(row: { serviceDate?: unknown; startTime?: unknown }): string | null {
  const date = row.serviceDate;
  if (!date) return null;
  const iso = date instanceof Date ? date.toISOString() : String(date);
  const time = typeof row.startTime === 'string' ? row.startTime : null;
  if (!time) return iso.includes('T') ? iso : `${iso}T00:00:00.000Z`;
  const datePart = iso.split('T')[0];
  const parsed = new Date(`${datePart}T${time.length === 5 ? `${time}:00` : time}Z`);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toISOString();
}

/**
 * Numbers for branch and church altitude, sourced from the existing dashboard
 * stats so the control centre and /reports can never disagree.
 *
 * Warnings are concrete gaps rather than metrics, and each links to the screen
 * that resolves it. The drifting count reuses `getMissingMembers` over the same
 * window the Not-seen-recently screen defaults to, so the number here agrees
 * with the number the user lands on.
 */
async function buildPulse(
  db: Database,
  auth: AuthContext,
  altitude: ReturnType<typeof resolveHomeAltitude>,
): Promise<HomePulse | null> {
  if (altitude === 'church') {
    const [stats, branchesBehind, branchesWithoutPastor] = await Promise.all([
      getAdminStats(db, auth),
      countBranchesBehind(db, BRANCH_BEHIND_DAYS),
      countBranchesWithoutPastor(db),
    ]);

    const warnings: HomePulseWarning[] = [];
    if (branchesBehind > 0) {
      warnings.push({
        kind: 'branches_behind',
        text:
          branchesBehind === 1
            ? `1 branch hasn't recorded attendance in ${BRANCH_BEHIND_DAYS} days`
            : `${branchesBehind} branches haven't recorded attendance in ${BRANCH_BEHIND_DAYS} days`,
        refs: {},
      });
    }
    if (branchesWithoutPastor > 0) {
      warnings.push({
        kind: 'branch_without_pastor',
        text:
          branchesWithoutPastor === 1
            ? '1 branch has no Main Pastor assigned'
            : `${branchesWithoutPastor} branches have no Main Pastor assigned`,
        refs: {},
      });
    }

    return {
      scope: 'church',
      scopeLabel: 'Church-wide',
      metrics: [
        { key: 'branches', label: 'Branches', value: stats.totalBranches, delta: null },
        { key: 'congregation', label: 'Total congregation', value: stats.totalRoll, delta: null },
        { key: 'members', label: 'Confirmed members', value: stats.totalMembers, delta: null },
        { key: 'fellowships', label: 'Fellowships', value: stats.totalFellowships, delta: null },
      ],
      warnings,
    };
  }

  if (altitude === 'branch') {
    const [stats, unrecorded, drifting] = await Promise.all([
      getBranchStats(db, auth),
      findUnrecordedService(db, auth.branchId),
      getMissingMembers(db, auth, {
        branchId: auth.branchId,
        services: DRIFTING_SERVICES_WINDOW,
      }),
    ]);
    const trend = stats.attendanceTrend ?? [];
    const latest = trend[trend.length - 1];
    const prior = trend.slice(-5, -1);
    const priorMean =
      prior.length > 0 ? prior.reduce((sum, r) => sum + r.rate, 0) / prior.length : null;
    const delta =
      latest && priorMean !== null
        ? `${latest.rate - priorMean >= 0 ? '+' : '−'}${Math.abs(
            Math.round(latest.rate - priorMean),
          )}% vs 4wk`
        : null;

    const warnings: HomePulseWarning[] = [];
    if (unrecorded) {
      warnings.push({
        kind: 'attendance_unrecorded',
        text: `Attendance not recorded for ${shortDate(unrecorded.serviceDate)}`,
        refs: { serviceId: unrecorded.serviceId },
      });
    }
    if (drifting.length > 0) {
      warnings.push({
        kind: 'members_drifting',
        text:
          drifting.length === 1
            ? `1 member has missed the last ${DRIFTING_SERVICES_WINDOW} services`
            : `${drifting.length} members have missed the last ${DRIFTING_SERVICES_WINDOW} services`,
        refs: {},
      });
    }

    return {
      scope: 'branch',
      scopeLabel: 'This branch',
      metrics: [
        { key: 'congregation', label: 'Total congregation', value: stats.totalRoll, delta: null },
        { key: 'members', label: 'Confirmed members', value: stats.totalMembers, delta: null },
        {
          key: 'attendance_rate',
          label: 'Attendance last week',
          value: latest?.rate ?? 0,
          delta,
        },
        { key: 'fellowships', label: 'Fellowships', value: stats.totalFellowships, delta: null },
      ],
      warnings,
    };
  }

  return null;
}
