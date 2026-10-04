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

vi.mock('./home-queries', () => ({
  listUpcomingServices: (...a: unknown[]) => mockListUpcomingServices(...a),
  listMyUpcomingMeetings: (...a: unknown[]) => mockListMyUpcomingMeetings(...a),
  listRegistersMissing: (...a: unknown[]) => mockListRegistersMissing(...a),
  listBranchSummaries: (...a: unknown[]) => mockListBranchSummaries(...a),
  listMyGroupSummaries: (...a: unknown[]) => mockListMyGroupSummaries(...a),
  getAttendanceStreak: (...a: unknown[]) => mockGetAttendanceStreak(...a),
  getProfileCompleteness: (...a: unknown[]) => mockGetProfileCompleteness(...a),
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
