import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext, Grant, RoleScope } from '@kairos/types';
import { FunctionalRole, CHURCH_SCOPE_ID } from '@kairos/types';
import { TEST_IDS } from '../test-helpers';

// The home payload is pure composition: it calls the surfaces that already
// exist and arranges their output by altitude. So the unit under test is the
// arrangement, and every collaborator is mocked. The collaborators have their
// own coverage in me/router.test.ts, analytics/service.test.ts and
// departments/rota-service.test.ts.

const mockListMyApprovals = vi.fn();
const mockListMyFollowups = vi.fn();

vi.mock('./service', () => ({
  listMyApprovals: (...a: unknown[]) => mockListMyApprovals(...a),
  listMyFollowups: (...a: unknown[]) => mockListMyFollowups(...a),
}));

const mockGetAdminStats = vi.fn();
const mockGetBranchStats = vi.fn();

vi.mock('../analytics/service', () => ({
  getAdminStats: (...a: unknown[]) => mockGetAdminStats(...a),
  getBranchStats: (...a: unknown[]) => mockGetBranchStats(...a),
}));

const mockListMyUpcomingRota = vi.fn();

vi.mock('../departments/rota-service', () => ({
  listMyUpcomingRota: (...a: unknown[]) => mockListMyUpcomingRota(...a),
}));

const mockListConcernFollowups = vi.fn();

vi.mock('../members/followups-history-service', () => ({
  listConcernFollowups: (...a: unknown[]) => mockListConcernFollowups(...a),
}));

// The agenda and register-missing queries are the only genuinely new SQL in
// this module. They're mocked here and exercised against a chain-mock db in
// the "queries" describe block at the bottom.
const mockListUpcomingServices = vi.fn();
const mockListMyUpcomingMeetings = vi.fn();
const mockListRegistersMissing = vi.fn();
const mockListBranchSummaries = vi.fn();
const mockListMyGroupSummaries = vi.fn();
const mockGetAttendanceStreak = vi.fn();
const mockGetProfileCompleteness = vi.fn();
const mockFindUnrecordedService = vi.fn();
const mockCountBranchesBehind = vi.fn();
const mockCountBranchesWithoutPastor = vi.fn();
const mockGetBranchMainPastorName = vi.fn();
const mockListRecentActivity = vi.fn();

vi.mock('./home-queries', () => ({
  listUpcomingServices: (...a: unknown[]) => mockListUpcomingServices(...a),
  listMyUpcomingMeetings: (...a: unknown[]) => mockListMyUpcomingMeetings(...a),
  listRegistersMissing: (...a: unknown[]) => mockListRegistersMissing(...a),
  listBranchSummaries: (...a: unknown[]) => mockListBranchSummaries(...a),
  listMyGroupSummaries: (...a: unknown[]) => mockListMyGroupSummaries(...a),
  getAttendanceStreak: (...a: unknown[]) => mockGetAttendanceStreak(...a),
  getProfileCompleteness: (...a: unknown[]) => mockGetProfileCompleteness(...a),
  findUnrecordedService: (...a: unknown[]) => mockFindUnrecordedService(...a),
  countBranchesBehind: (...a: unknown[]) => mockCountBranchesBehind(...a),
  countBranchesWithoutPastor: (...a: unknown[]) => mockCountBranchesWithoutPastor(...a),
  getBranchMainPastorName: (...a: unknown[]) => mockGetBranchMainPastorName(...a),
  listRecentActivity: (...a: unknown[]) => mockListRecentActivity(...a),
  BRANCH_BEHIND_DAYS: 14,
  DRIFTING_SERVICES_WINDOW: 3,
}));

const mockGetMissingMembers = vi.fn();

vi.mock('../attendance/service', () => ({
  getMissingMembers: (...a: unknown[]) => mockGetMissingMembers(...a),
}));

const { getMyHome } = await import('./home-service');

const db = {} as never;

function auth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    memberId: TEST_IDS.memberId,
    email: 'grace@kharis.org',
    systemRole: 'member',
    branchId: TEST_IDS.branchId,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
    grants: [],
    ...overrides,
  };
}

function grant(role: FunctionalRole, kind: RoleScope['kind'], id: string): Grant {
  return { role, scope: { kind, id }, branchId: TEST_IDS.branchId };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListMyApprovals.mockResolvedValue([]);
  mockListMyFollowups.mockResolvedValue([]);
  mockListMyUpcomingRota.mockResolvedValue([]);
  mockListConcernFollowups.mockResolvedValue([]);
  mockListUpcomingServices.mockResolvedValue([]);
  mockListMyUpcomingMeetings.mockResolvedValue([]);
  mockListRegistersMissing.mockResolvedValue([]);
  mockListBranchSummaries.mockResolvedValue([]);
  mockListMyGroupSummaries.mockResolvedValue([]);
  mockGetAttendanceStreak.mockResolvedValue(0);
  mockFindUnrecordedService.mockResolvedValue(null);
  mockCountBranchesBehind.mockResolvedValue(0);
  mockCountBranchesWithoutPastor.mockResolvedValue(0);
  mockGetBranchMainPastorName.mockResolvedValue(null);
  mockListRecentActivity.mockResolvedValue([]);
  mockGetMissingMembers.mockResolvedValue([]);
  mockGetProfileCompleteness.mockResolvedValue({ complete: true, hasFellowship: true, hasMembershipInterest: true });
  mockGetBranchStats.mockResolvedValue({
    totalRoll: 1204,
    memberBreakdown: { members: 800, returners: 300, visitors: 80, children: 24 },
    totalMembers: 800,
    totalFellowships: 12,
    recentMeetings: 30,
    pendingApprovals: 3,
    attendanceTrend: [{ week: '2026-09-28', rate: 71 }],
  });
  mockGetAdminStats.mockResolvedValue({
    totalBranches: 12,
    totalRoll: 4186,
    memberBreakdown: { members: 2600, returners: 1200, visitors: 300, children: 86 },
    totalMembers: 2600,
    totalFellowships: 64,
    pendingApprovals: 2,
  });
});

describe('getMyHome — altitude', () => {
  it('a plain member renders at personal altitude with no pulse', async () => {
    const home = await getMyHome(db, auth());
    expect(home.altitude).toBe('personal');
    expect(home.pulse).toBeNull();
  });

  it('a Membership Champion renders at personal altitude — no lens of its own', async () => {
    const home = await getMyHome(
      db,
      auth({ grants: [grant(FunctionalRole.MembershipChampion, 'branch', TEST_IDS.branchId)] }),
    );
    expect(home.altitude).toBe('personal');
    expect(home.pulse).toBeNull();
  });

  it('a fellowship leader renders at group altitude with no pulse', async () => {
    const home = await getMyHome(
      db,
      auth({
        grants: [grant(FunctionalRole.FellowshipLeader, 'fellowship', 'f1')],
      }),
    );
    expect(home.altitude).toBe('group');
    expect(home.pulse).toBeNull();
  });

  it('a branch admin renders at branch altitude with a branch pulse', async () => {
    const home = await getMyHome(
      db,
      auth({
        grants: [grant(FunctionalRole.BranchAdmin, 'branch', TEST_IDS.branchId)],
      }),
    );
    expect(home.altitude).toBe('branch');
    expect(home.pulse?.scope).toBe('branch');
    expect(mockGetBranchStats).toHaveBeenCalled();
    expect(mockGetAdminStats).not.toHaveBeenCalled();
  });

  it('a system admin renders at church altitude with a church pulse', async () => {
    const home = await getMyHome(db, auth({ systemRole: 'admin' }));
    expect(home.altitude).toBe('church');
    expect(home.pulse?.scope).toBe('church');
    expect(mockGetAdminStats).toHaveBeenCalled();
    expect(mockGetBranchStats).not.toHaveBeenCalled();
  });

  it('a church-scoped MembershipAdmin grant does not confer branch altitude', async () => {
    // A church target takes no hierarchical match downward either way — a
    // church grant is not a branch grant. MembershipAdmin has no branch:read.
    const home = await getMyHome(
      db,
      auth({
        grants: [grant(FunctionalRole.MembershipAdmin, 'church', CHURCH_SCOPE_ID)],
      }),
    );
    expect(home.altitude).toBe('personal');
  });
});

describe('getMyHome — needs you', () => {
  const branchAdmin = () =>
    auth({ grants: [grant(FunctionalRole.BranchAdmin, 'branch', TEST_IDS.branchId)] });

  it('collapses same-kind approvals into one counted row', async () => {
    mockListMyApprovals.mockResolvedValue([
      { kind: 'member_signup', id: 'm1', subjectName: 'A B', createdAt: '2026-10-01T00:00:00.000Z' },
      { kind: 'member_signup', id: 'm2', subjectName: 'C D', createdAt: '2026-10-02T00:00:00.000Z' },
      { kind: 'member_signup', id: 'm3', subjectName: 'E F', createdAt: '2026-10-03T00:00:00.000Z' },
    ]);
    const home = await getMyHome(db, branchAdmin());
    const row = home.needsYou.find((t) => t.kind === 'member_approval');
    expect(row).toBeDefined();
    expect(row!.count).toBe(3);
    expect(row!.title).toBe('3 member approvals');
    expect(row!.urgency).toBe('normal');
  });

  it('uses the singular title for a single item', async () => {
    mockListMyApprovals.mockResolvedValue([
      { kind: 'member_signup', id: 'm1', subjectName: 'A B', createdAt: '2026-10-01T00:00:00.000Z' },
    ]);
    const home = await getMyHome(db, branchAdmin());
    expect(home.needsYou.find((t) => t.kind === 'member_approval')!.title).toBe('1 member approval');
  });

  it('surfaces a missing fellowship register as its own high-urgency row', async () => {
    mockListRegistersMissing.mockResolvedValue([
      {
        meetingId: 'mtg1',
        fellowshipId: 'f1',
        fellowshipName: 'Grace Fellowship',
        meetingDate: '2026-10-02T19:00:00.000Z',
      },
    ]);
    const home = await getMyHome(db, branchAdmin());
    const row = home.needsYou.find((t) => t.kind === 'register_missing');
    expect(row).toBeDefined();
    expect(row!.urgency).toBe('high');
    expect(row!.title).toBe('Register not taken');
    expect(row!.subtitle).toContain('Grace Fellowship');
    // "rollcall" is gone from user-visible copy — see the naming decision.
    expect(JSON.stringify(home)).not.toMatch(/rollcall/i);
  });

  it('sorts high urgency ahead of normal', async () => {
    mockListMyApprovals.mockResolvedValue([
      { kind: 'member_signup', id: 'm1', subjectName: 'A B', createdAt: '2026-10-01T00:00:00.000Z' },
    ]);
    mockListRegistersMissing.mockResolvedValue([
      { meetingId: 'mtg1', fellowshipId: 'f1', fellowshipName: 'Grace', meetingDate: '2026-10-02T19:00:00.000Z' },
    ]);
    const home = await getMyHome(db, branchAdmin());
    expect(home.needsYou[0]!.urgency).toBe('high');
  });

  it('surfaces welfare concerns as a high-urgency row', async () => {
    mockListConcernFollowups.mockImplementation(async (_db: unknown, _auth: unknown, kind: string) =>
      kind === 'welfare' ? [{ id: 'c1' }] : [],
    );
    const home = await getMyHome(db, branchAdmin());
    const row = home.needsYou.find((t) => t.kind === 'welfare_concern');
    expect(row).toMatchObject({ title: '1 welfare concern', urgency: 'high', count: 1 });
  });

  it('does not ask for the concern inboxes without the capability', async () => {
    await getMyHome(db, auth());
    expect(mockListConcernFollowups).not.toHaveBeenCalled();
  });

  it('is empty for a plain member', async () => {
    const home = await getMyHome(db, auth());
    expect(home.needsYou).toEqual([]);
  });
});

describe('getMyHome — getting started', () => {
  it('offers the three prompts to a member with no group, no class and a thin profile', async () => {
    mockGetProfileCompleteness.mockResolvedValue({
      complete: false,
      hasFellowship: false,
      hasMembershipInterest: false,
    });
    const home = await getMyHome(db, auth());
    expect(home.gettingStarted.map((g) => g.key)).toEqual([
      'join_fellowship',
      'membership_interest',
      'complete_profile',
    ]);
  });

  it('offers nothing once the member is settled', async () => {
    const home = await getMyHome(db, auth());
    expect(home.gettingStarted).toEqual([]);
  });

  it('is never offered above personal altitude', async () => {
    mockGetProfileCompleteness.mockResolvedValue({
      complete: false,
      hasFellowship: false,
      hasMembershipInterest: false,
    });
    const home = await getMyHome(
      db,
      auth({ grants: [grant(FunctionalRole.BranchAdmin, 'branch', TEST_IDS.branchId)] }),
    );
    expect(home.gettingStarted).toEqual([]);
  });
});

describe('getMyHome — agenda', () => {
  it('splits today from the rest of the week by local date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T08:00:00.000Z'));
    mockListUpcomingServices.mockResolvedValue([
      { id: 's1', serviceName: 'Sunday Service', serviceDate: '2026-10-04T10:00:00.000Z', branchName: 'London' },
      { id: 's2', serviceName: 'Midweek', serviceDate: '2026-10-07T19:00:00.000Z', branchName: 'London' },
    ]);
    const home = await getMyHome(db, auth());
    expect(home.today.map((i) => i.id)).toContain('s1');
    expect(home.thisWeek.map((i) => i.id)).toContain('s2');
    expect(home.today.map((i) => i.id)).not.toContain('s2');
    vi.useRealTimers();
  });

  it('orders today chronologically', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T06:00:00.000Z'));
    mockListUpcomingServices.mockResolvedValue([
      { id: 's1', serviceName: 'Second', serviceDate: '2026-10-04T12:00:00.000Z', branchName: 'London' },
    ]);
    mockListMyUpcomingRota.mockResolvedValue([
      {
        instanceId: 'r1',
        templateName: 'Welcome Team',
        slotRoleName: 'Door 2',
        serviceDate: '2026-10-04T09:30:00.000Z',
      },
    ]);
    const home = await getMyHome(db, auth());
    expect(home.today.map((i) => i.id)).toEqual(['r1', 's1']);
    vi.useRealTimers();
  });
});

describe('getMyHome — groups and streak', () => {
  it('lists a led fellowship with its last register', async () => {
    mockListMyGroupSummaries.mockResolvedValue([
      {
        kind: 'fellowship',
        id: 'f1',
        name: 'Grace Fellowship',
        headcount: 24,
        lastPresent: 18,
        lastTotal: 24,
      },
    ]);
    const home = await getMyHome(
      db,
      auth({ grants: [grant(FunctionalRole.FellowshipLeader, 'fellowship', 'f1')] }),
    );
    const group = home.groups.find((g) => g.id === 'f1');
    expect(group).toMatchObject({
      kind: 'fellowship',
      name: 'Grace Fellowship',
      headcount: 24,
      lastPresent: 18,
      lastTotal: 24,
    });
  });

  it('lists branches instead of groups at church altitude', async () => {
    mockListBranchSummaries.mockResolvedValue([
      { kind: 'branch', id: 'b1', name: 'London', headcount: 412, lastPresent: 412, lastTotal: null },
    ]);
    const home = await getMyHome(db, auth({ systemRole: 'admin' }));
    expect(home.groups[0]).toMatchObject({ kind: 'branch', name: 'London' });
  });

  it('returns the streak for a plain member and omits it above group altitude', async () => {
    mockGetAttendanceStreak.mockResolvedValue(7);
    const personal = await getMyHome(db, auth());
    expect(personal.streakWeeks).toBe(7);

    const admin = await getMyHome(db, auth({ systemRole: 'admin' }));
    expect(admin.streakWeeks).toBeNull();
  });
});

describe('getMyHome — pulse warnings', () => {
  const branchAdmin = () =>
    auth({ grants: [grant(FunctionalRole.BranchAdmin, 'branch', TEST_IDS.branchId)] });

  it('has no warnings when nothing is outstanding', async () => {
    const home = await getMyHome(db, branchAdmin());
    expect(home.pulse?.warnings).toEqual([]);
  });

  it('flags a service whose attendance was never recorded', async () => {
    mockFindUnrecordedService.mockResolvedValue({
      serviceId: 'svc-1',
      serviceDate: '2026-09-27T10:00:00.000Z',
    });
    const home = await getMyHome(db, branchAdmin());
    const warning = home.pulse!.warnings.find((w) => w.kind === 'attendance_unrecorded');
    expect(warning).toBeDefined();
    expect(warning!.text).toContain('Attendance not recorded for');
    expect(warning!.refs.serviceId).toBe('svc-1');
  });

  it('counts drifting members over the same window the linked screen defaults to', async () => {
    mockGetMissingMembers.mockResolvedValue([{ memberId: 'a' }, { memberId: 'b' }]);
    const home = await getMyHome(db, branchAdmin());
    const warning = home.pulse!.warnings.find((w) => w.kind === 'members_drifting');
    expect(warning!.text).toBe('2 members have missed the last 3 services');
    expect(mockGetMissingMembers).toHaveBeenCalledWith(
      db,
      expect.anything(),
      expect.objectContaining({ services: 3 }),
    );
  });

  it('uses the singular for one drifting member', async () => {
    mockGetMissingMembers.mockResolvedValue([{ memberId: 'a' }]);
    const home = await getMyHome(db, branchAdmin());
    expect(home.pulse!.warnings.find((w) => w.kind === 'members_drifting')!.text).toBe(
      '1 member has missed the last 3 services',
    );
  });

  it('flags branches behind on attendance and without a pastor at church altitude', async () => {
    mockCountBranchesBehind.mockResolvedValue(3);
    mockCountBranchesWithoutPastor.mockResolvedValue(1);
    const home = await getMyHome(db, auth({ systemRole: 'admin' }));
    const kinds = home.pulse!.warnings.map((w) => w.kind);
    expect(kinds).toEqual(['branches_behind', 'branch_without_pastor']);
    expect(home.pulse!.warnings[0]!.text).toBe(
      "3 branches haven't recorded attendance in 14 days",
    );
    expect(home.pulse!.warnings[1]!.text).toBe('1 branch has no Main Pastor assigned');
  });

  it('does not ask for branch warnings at personal altitude', async () => {
    await getMyHome(db, auth());
    expect(mockFindUnrecordedService).not.toHaveBeenCalled();
    expect(mockGetMissingMembers).not.toHaveBeenCalled();
  });
});

describe("getMyHome — the Main Pastor on today's service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T08:00:00.000Z'));
    mockGetBranchMainPastorName.mockResolvedValue('Jude Fletcher');
    mockListUpcomingServices.mockResolvedValue([
      { id: 's1', serviceName: 'Sunday Service', serviceDate: '2026-10-04T10:00:00.000Z', branchName: 'London' },
      { id: 's2', serviceName: 'Midweek', serviceDate: '2026-10-07T19:00:00.000Z', branchName: 'London' },
    ]);
  });

  it("appends the pastor to today's service only", async () => {
    const home = await getMyHome(db, auth());
    expect(home.today.find((i) => i.id === 's1')!.subtitle).toBe('London · Jude Fletcher');
    expect(home.thisWeek.find((i) => i.id === 's2')!.subtitle).toBe('London');
    vi.useRealTimers();
  });

  it('falls back to the branch name when no Main Pastor is recorded', async () => {
    mockGetBranchMainPastorName.mockResolvedValue(null);
  mockListRecentActivity.mockResolvedValue([]);
    const home = await getMyHome(db, auth());
    expect(home.today.find((i) => i.id === 's1')!.subtitle).toBe('London');
    vi.useRealTimers();
  });
});

describe('getMyHome — recent activity', () => {
  it('passes the altitude through so scope is enforced in the query, not after it', async () => {
    await getMyHome(
      db,
      auth({ grants: [grant(FunctionalRole.FellowshipLeader, 'fellowship', 'f1')] }),
    );
    expect(mockListRecentActivity).toHaveBeenCalledWith(db, expect.anything(), 'group');
  });

  it('carries the feed through to the payload', async () => {
    mockListRecentActivity.mockResolvedValue([
      {
        kind: 'membership_graduated',
        id: 'en-1',
        title: 'Ada Okoro completed the membership class',
        subtitle: 'Kharis London',
        at: '2026-10-03T18:00:00.000Z',
        refs: { memberId: 'm-1' },
      },
    ]);
    const home = await getMyHome(db, auth({ systemRole: 'admin' }));
    expect(home.recentActivity).toHaveLength(1);
    expect(home.recentActivity[0]!.kind).toBe('membership_graduated');
  });

  it('is empty at personal altitude', async () => {
    const home = await getMyHome(db, auth());
    expect(mockListRecentActivity).toHaveBeenCalledWith(db, expect.anything(), 'personal');
    expect(home.recentActivity).toEqual([]);
  });
});
