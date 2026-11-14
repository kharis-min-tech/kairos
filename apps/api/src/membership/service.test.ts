import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHURCH_SCOPE, FunctionalRole } from '@kairos/types';

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate', 'onConflictDoNothing',
    'update', 'set', 'delete', 'groupBy',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert(result: unknown = []) {
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}
function setupUpdate(result: unknown = []) {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

// The single certification path is shared with the manual admin override in
// members/service.ts. Mock it so these tests assert the membership module
// delegates rather than re-implementing the stamp.
const setMembershipClassCompleted = vi.fn((..._args: unknown[]) => Promise.resolve({}));
vi.mock('../members/service', () => ({
  setMembershipClassCompleted: (...args: unknown[]) => setMembershipClassCompleted(...args),
}));

import {
  createCohort,
  updateCohort,
  upsertSession,
  expressInterest,
  withdrawInterest,
  listInterest,
  admitMembers,
  saveSessionRecords,
  recordFinalTest,
  graduateMembers,
  withdrawEnrollment,
} from './service';

// ── Fixtures ──────────────────────────────────────────────

const cohortId = '110e8400-0000-0000-0000-000000000001';
const branchId = '220e8400-0000-0000-0000-000000000002';
const memberId = '440e8400-0000-0000-0000-000000000004';
const teacherId = '550e8400-0000-0000-0000-000000000005';
const enrollmentId = '660e8400-0000-0000-0000-000000000006';
const sessionId = '770e8400-0000-0000-0000-000000000007';

const base = {
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  grants: [],
};
const adminAuth = { memberId: '000-admin', email: 'a@t.com', systemRole: 'admin' as const, branchId, ...base };
const memberAuth = { memberId, email: 'm@t.com', systemRole: 'member' as const, branchId, ...base };

/**
 * A Membership Admin who is NOT a platform admin. This is the case the module
 * exists to serve: the church has people who run the membership class and
 * should not hold platform-wide authority to do it.
 */
const membershipAdminAuth = {
  memberId: '000-mem-admin',
  email: 'ma@t.com',
  systemRole: 'member' as const,
  branchId,
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  grants: [
    {
      role: FunctionalRole.MembershipAdmin,
      scope: CHURCH_SCOPE,
      branchId,
    },
  ],
};

/**
 * Someone named on `membershipSessions.teacherId`. Teaching a session confers
 * NO permissions — different people teach different sessions of the same
 * cohort, and admins do the marking. This auth exists to prove that.
 */
const sessionTeacherAuth = { memberId: teacherId, email: 't@t.com', systemRole: 'member' as const, branchId, ...base };

/** A branch leader with real authority, but none of it over a church-wide cohort. */
const branchLeaderAuth = {
  memberId: '000-leader',
  email: 'l@t.com',
  systemRole: 'member' as const,
  branchId,
  branchSystemAdminBranchIds: [],
  branchDataAdminBranchIds: [],
  grants: [
    {
      role: FunctionalRole.BranchAdmin,
      scope: { kind: 'branch' as const, id: branchId },
      branchId,
    },
  ],
};

const cohort = {
  id: cohortId,
  name: 'Autumn 2026',
  startDate: '2026-09-01',
  graduationDate: '2026-10-01',
  finalTestDeadline: '2026-09-28',
  status: 'active',
  enrolmentOpen: true,
  homeworkPassMark: 50,
  quizPassMark: 50,
  finalTestPassMark: 60,
  isActive: true,
  notes: null,
};

const enrollment = {
  id: enrollmentId,
  cohortId,
  memberId,
  branchId,
  status: 'enrolled',
  finalTestPassed: true,
  finalTestTakenAt: new Date('2026-09-20T10:00:00Z'),
  inductionAttended: true,
  notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  setupInsert([]);
  setupUpdate([]);
});

// ── Authority: cohorts are church-wide, so church-scoped ──
//
// The point of the `church` scope is that a Membership Admin who is NOT a
// platform admin can run the class, and that no amount of branch authority
// substitutes for it.

describe('membership authority', () => {
  it('refuses cohort creation to a plain member', async () => {
    await expect(
      createCohort(mockDb, memberAuth, { name: 'X', startDate: '2026-01-01' }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('refuses cohort creation to a branch admin — a branch cannot contain a church', async () => {
    await expect(
      createCohort(mockDb, branchLeaderAuth, { name: 'X', startDate: '2026-01-01' }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('refuses cohort updates to a plain member', async () => {
    await expect(updateCohort(mockDb, memberAuth, cohortId, { name: 'Y' })).rejects.toThrow(
      /membership admins/i,
    );
  });

  it('refuses session scheduling to a plain member', async () => {
    await expect(
      upsertSession(mockDb, memberAuth, cohortId, { sessionNumber: 1, title: 'Week 1' }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('lets a Membership Admin who is not a platform admin create a cohort', async () => {
    setupSelectSequence([]); // assertNameFree finds no clash
    setupInsert([{ id: cohortId, name: 'Autumn 2026' }]);
    const created = await createCohort(mockDb, membershipAdminAuth, {
      name: 'Autumn 2026',
      startDate: '2026-09-01',
    });
    expect(created).toMatchObject({ id: cohortId });
  });

  it('still lets a platform admin through, as the break-glass path', async () => {
    setupSelectSequence([]);
    setupInsert([{ id: cohortId, name: 'Autumn 2026' }]);
    const created = await createCohort(mockDb, adminAuth, {
      name: 'Autumn 2026',
      startDate: '2026-09-01',
    });
    expect(created).toMatchObject({ id: cohortId });
  });

  it('rejects a duplicate cohort name', async () => {
    setupSelectSequence([{ id: 'other' }]);
    await expect(
      createCohort(mockDb, membershipAdminAuth, { name: 'Autumn 2026', startDate: '2026-09-01' }),
    ).rejects.toThrow(/already exists/i);
  });
});

// ── Marking is an admin action, not a teacher's ───────────
//
// It used to be delegated to a `membership_cohort_teachers` row. It is not
// any more: teaching is per session, varies within a cohort, and confers
// nothing.

describe('marking authority', () => {
  it('lets a membership admin save the register', async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }],        // requireSession
      [cohort],                             // requireCohort
      [{ id: enrollmentId }],               // enrolments belong to cohort
      [],                                   // existing records
    );
    setupInsert([{ sessionId, enrollmentId, attended: true }]);

    const res = await saveSessionRecords(mockDb, membershipAdminAuth, sessionId, {
      records: [{ enrollmentId, attended: true, homeworkScore: 70, quizScore: 80 }],
    });
    expect(res.saved).toBe(1);
  });

  it('refuses the register to the session teacher — teaching is not marking', async () => {
    setupSelectSequence([{ id: sessionId, cohortId }]);
    await expect(
      saveSessionRecords(mockDb, sessionTeacherAuth, sessionId, {
        records: [{ enrollmentId, attended: true }],
      }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('refuses the register to a plain member', async () => {
    setupSelectSequence([{ id: sessionId, cohortId }]);
    await expect(
      saveSessionRecords(mockDb, memberAuth, sessionId, {
        records: [{ enrollmentId, attended: true }],
      }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('rejects enrolments that belong to a different cohort', async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }],
      [cohort],
      [], // no matching enrolments in this cohort
    );
    await expect(
      saveSessionRecords(mockDb, membershipAdminAuth, sessionId, {
        records: [{ enrollmentId, attended: true }],
      }),
    ).rejects.toThrow(/do not belong to this cohort/i);
  });
});

// ── Marks are graded against the cohort's pass marks ──────

describe('grading', () => {
  it("derives pass flags from the cohort's own pass marks", async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }],
      [{ ...cohort, homeworkPassMark: 75, quizPassMark: 40 }],
      [{ id: enrollmentId }],
      [],
    );
    const insertSpy = vi.fn(() => createChain([{ sessionId, enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await saveSessionRecords(mockDb, membershipAdminAuth, sessionId, {
      records: [{ enrollmentId, homeworkScore: 70, quizScore: 45 }],
    });

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['values']!.mock.calls[0]![0] as Record<string, unknown>;
    // 70 < 75 fails homework; 45 >= 40 passes the quiz.
    expect(written['homeworkPassed']).toBe(false);
    expect(written['quizPassed']).toBe(true);
  });

  it('marks the final test against the cohort pass mark', async () => {
    setupSelectSequence([enrollment], [cohort]);
    const updateSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(updateSpy);

    await recordFinalTest(mockDb, membershipAdminAuth, { enrollmentId, score: 59 });

    const chain = updateSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['set']!.mock.calls[0]![0] as Record<string, unknown>;
    // Cohort pass mark is 60, so 59 fails.
    expect(written['finalTestPassed']).toBe(false);
    expect(written['finalTestScore']).toBe(59);
  });
});

// ── The interest pool ─────────────────────────────────────
//
// Enrolment is not self-service. Expressing interest is the caller's own
// action and needs no capability; getting into a cohort is the admin's.

describe('expressing interest', () => {
  it('needs no capability — a plain member may join the pool', async () => {
    setupSelectSequence(
      [{ homeBranchId: branchId, completedAt: null }], // the caller
      [],                                             // no open enrolment
      [],                                             // not already waiting
    );
    setupInsert([{ id: 'interest-1', status: 'waiting' }]);

    const created = await expressInterest(mockDb, memberAuth);
    expect(created).toMatchObject({ status: 'waiting' });
  });

  it('refuses when the caller has already completed the class', async () => {
    setupSelectSequence([{ homeBranchId: branchId, completedAt: new Date('2026-01-01') }]);
    await expect(expressInterest(mockDb, memberAuth)).rejects.toThrow(/already completed/i);
  });

  it('refuses when the caller is already enrolled in a cohort', async () => {
    setupSelectSequence(
      [{ homeBranchId: branchId, completedAt: null }],
      [{ id: enrollmentId }],
    );
    await expect(expressInterest(mockDb, memberAuth)).rejects.toThrow(/already enrolled/i);
  });

  it('refuses a second live entry for the same member', async () => {
    setupSelectSequence(
      [{ homeBranchId: branchId, completedAt: null }],
      [],
      [{ id: 'interest-1' }], // already waiting
    );
    await expect(expressInterest(mockDb, memberAuth)).rejects.toThrow(/already on the/i);
  });

  it('stamps the home branch and an expiry so the entry can lapse', async () => {
    setupSelectSequence([{ homeBranchId: branchId, completedAt: null }], [], []);
    const insertSpy = vi.fn(() => createChain([{ id: 'interest-1' }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await expressInterest(mockDb, memberAuth);

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['values']!.mock.calls[0]![0] as Record<string, unknown>;
    expect(written).toMatchObject({ memberId, branchId, status: 'waiting' });
    // An entry with no expiry would sit in the pool for ever, which is exactly
    // what the two-stage model exists to prevent.
    expect(written['expiresAt']).toBeDefined();
  });

  it('settles expired entries before reading whether one is live', async () => {
    setupSelectSequence([{ homeBranchId: branchId, completedAt: null }], [], []);
    setupInsert([{ id: 'interest-1' }]);

    await expressInterest(mockDb, memberAuth);

    // Without the sweep, a long-expired 'waiting' row would trip the
    // one-live-entry check and lock the member out of re-joining for ever.
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('lets a member take themselves back out', async () => {
    setupUpdate([{ id: 'interest-1', status: 'withdrawn' }]);
    const res = await withdrawInterest(mockDb, memberAuth);
    expect(res).toMatchObject({ status: 'withdrawn' });
  });

  it('404s when withdrawing without a live entry', async () => {
    setupUpdate([]);
    await expect(withdrawInterest(mockDb, memberAuth)).rejects.toThrow(/not on the/i);
  });
});

describe('reading the pool', () => {
  it('is membership-admin only', async () => {
    await expect(listInterest(mockDb, memberAuth, {})).rejects.toThrow(/membership admins/i);
  });

  it('is closed to a branch admin', async () => {
    await expect(listInterest(mockDb, branchLeaderAuth, {})).rejects.toThrow(
      /membership admins/i,
    );
  });

  it('carries the wait length and recent attendance so admission is an informed call', async () => {
    setupSelectSequence(
      [
        {
          interest: { id: 'interest-1', memberId, status: 'waiting' },
          memberFirstName: 'Ada',
          memberLastName: 'Bell',
          memberEmail: null,
          memberPhone: null,
          branchName: 'Main',
          waitingDays: 42,
          recentAttendanceCount: 0,
        },
      ],
      [{ value: 1 }],
    );

    const res = await listInterest(mockDb, membershipAdminAuth, {});
    expect(res.interest[0]).toMatchObject({
      memberFirstName: 'Ada',
      waitingDays: 42,
      recentAttendanceCount: 0,
    });
  });
});

// ── Admission ─────────────────────────────────────────────

describe('admission', () => {
  it('is membership-admin only', async () => {
    await expect(
      admitMembers(mockDb, memberAuth, cohortId, { memberIds: [memberId] }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('refuses when the cohort is closed to admissions', async () => {
    setupSelectSequence([{ ...cohort, enrolmentOpen: false }]);
    await expect(
      admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] }),
    ).rejects.toThrow(/not accepting admissions/i);
  });

  it('refuses when a selected member is enrolled in another cohort', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [{ memberId }], // open elsewhere
    );
    await expect(
      admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] }),
    ).rejects.toThrow(/already enrolled in another/i);
  });

  it('flags an enrolment that came through the pool', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [],           // none enrolled elsewhere
      [{ memberId }], // waiting in the pool
    );
    const insertSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] });

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const rows = chain['values']!.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ branchId, memberId, fromPool: true });
  });

  it('admits someone with no pool entry — the paper-signup case — and says so', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [],
      [], // nobody waiting
    );
    const insertSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] });

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const rows = chain['values']!.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ fromPool: false });
  });

  it('closes the pool entry so nobody sits in the pool and a cohort at once', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [],
      [{ memberId }],
    );
    setupInsert([{ id: enrollmentId }]);
    const updateSpy = vi.fn(() => createChain([]));
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(updateSpy);

    await admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] });

    // Two updates: the lapse sweep, then the admission close.
    const closing = updateSpy.mock.results.at(-1)!.value as Record<
      string,
      ReturnType<typeof vi.fn>
    >;
    const written = closing['set']!.mock.calls[0]![0] as Record<string, unknown>;
    expect(written).toMatchObject({ status: 'admitted', admittedCohortId: cohortId });
  });

  it('refuses someone who has already completed the class', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: new Date('2026-01-01') }],
    );
    await expect(
      admitMembers(mockDb, membershipAdminAuth, cohortId, { memberIds: [memberId] }),
    ).rejects.toThrow(/already completed/i);
  });
});

// ── Graduation gate ───────────────────────────────────────

describe('graduation', () => {
  const fullRecords = [1, 2, 3, 4].map((n) => ({
    sessionNumber: n,
    attended: true,
    homeworkPassed: true,
    quizPassed: true,
  }));

  it('is membership-admin only', async () => {
    await expect(
      graduateMembers(mockDb, sessionTeacherAuth, cohortId, { enrollmentIds: [enrollmentId] }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('graduates an eligible member and delegates the stamp to members/service', async () => {
    setupSelectSequence(
      [cohort],            // requireCohort
      [enrollment],        // requireEnrollment (loop)
      [enrollment],        // readinessFor -> requireEnrollment
      [cohort],            // readinessFor -> requireCohort
      [{ value: 4 }],      // session count
      fullRecords,         // records
    );
    const res = await graduateMembers(mockDb, adminAuth, cohortId, {
      enrollmentIds: [enrollmentId],
    });

    expect(res.graduated).toBe(1);
    expect(res.blocked).toEqual([]);
    // Certification goes through the one shared path, not a second stamp here.
    expect(setMembershipClassCompleted).toHaveBeenCalledTimes(1);
  });

  it('blocks a member who has not attended the induction, and does not stamp them', async () => {
    setupSelectSequence(
      [cohort],
      [{ ...enrollment, inductionAttended: false }],
      [{ ...enrollment, inductionAttended: false }],
      [cohort],
      [{ value: 4 }],
      fullRecords,
    );
    const res = await graduateMembers(mockDb, adminAuth, cohortId, {
      enrollmentIds: [enrollmentId],
    });

    expect(res.graduated).toBe(0);
    expect(res.blocked[0]?.outstanding).toContain('Has not attended the induction ceremony');
    expect(setMembershipClassCompleted).not.toHaveBeenCalled();
  });

  it('override bypasses the gate and still certifies', async () => {
    setupSelectSequence([cohort], [{ ...enrollment, inductionAttended: false }]);
    const res = await graduateMembers(mockDb, adminAuth, cohortId, {
      enrollmentIds: [enrollmentId],
      override: true,
      overrideReason: 'Attended the ceremony at another branch',
    });

    expect(res.graduated).toBe(1);
    expect(setMembershipClassCompleted).toHaveBeenCalledTimes(1);
  });

  it('records the override reason on the enrolment for the audit trail', async () => {
    setupSelectSequence([cohort], [{ ...enrollment, inductionAttended: false }]);
    const updateSpy = vi.fn(() => createChain([]));
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(updateSpy);

    await graduateMembers(mockDb, adminAuth, cohortId, {
      enrollmentIds: [enrollmentId],
      override: true,
      overrideReason: 'Ceremony attended elsewhere',
    });

    const chain = updateSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['set']!.mock.calls[0]![0] as Record<string, unknown>;
    expect(String(written['notes'])).toMatch(/Ceremony attended elsewhere/);
  });

  it('rejects an enrolment belonging to a different cohort', async () => {
    setupSelectSequence([cohort], [{ ...enrollment, cohortId: 'someone-else' }]);
    await expect(
      graduateMembers(mockDb, adminAuth, cohortId, { enrollmentIds: [enrollmentId] }),
    ).rejects.toThrow(/does not belong to this cohort/i);
  });
});

// ── Withdrawal ────────────────────────────────────────────

describe('withdrawal', () => {
  it('lets a member withdraw themselves', async () => {
    setupSelectSequence([enrollment]);
    setupUpdate([{ id: enrollmentId, status: 'withdrawn' }]);
    const res = await withdrawEnrollment(mockDb, memberAuth, enrollmentId, {
      reason: 'withdrew',
    });
    expect(res).toMatchObject({ status: 'withdrawn' });
  });

  it('refuses a third party who is not a membership admin', async () => {
    setupSelectSequence([enrollment]);
    await expect(
      withdrawEnrollment(mockDb, sessionTeacherAuth, enrollmentId, { reason: 'withdrew' }),
    ).rejects.toThrow(/membership admins/i);
  });

  it('maps deferred_to_next onto the deferred status rather than withdrawn', async () => {
    setupSelectSequence([enrollment]);
    const updateSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(updateSpy);

    await withdrawEnrollment(mockDb, memberAuth, enrollmentId, {
      reason: 'deferred_to_next',
    });

    const chain = updateSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['set']!.mock.calls[0]![0] as Record<string, unknown>;
    expect(written['status']).toBe('deferred');
  });

  it('refuses to withdraw someone already graduated', async () => {
    setupSelectSequence([{ ...enrollment, status: 'graduated' }]);
    await expect(
      withdrawEnrollment(mockDb, memberAuth, enrollmentId, { reason: 'withdrew' }),
    ).rejects.toThrow(/cannot be withdrawn/i);
  });
});
