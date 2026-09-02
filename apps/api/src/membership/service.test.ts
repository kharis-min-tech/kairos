import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  assignTeacher,
  upsertSession,
  enrolSelf,
  enrolMembers,
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
const teacherAuth = { memberId: teacherId, email: 't@t.com', systemRole: 'member' as const, branchId, ...base };

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

// ── Authority: cohorts are church-wide, so admin-only ─────

describe('membership authority', () => {
  it('refuses cohort creation to a non-admin, even a branch leader', async () => {
    await expect(
      createCohort(mockDb, memberAuth, { name: 'X', startDate: '2026-01-01' }),
    ).rejects.toThrow(/platform admins/i);
  });

  it('refuses cohort updates to a non-admin', async () => {
    await expect(updateCohort(mockDb, memberAuth, cohortId, { name: 'Y' })).rejects.toThrow(
      /platform admins/i,
    );
  });

  it('refuses teacher assignment to a non-admin', async () => {
    await expect(
      assignTeacher(mockDb, memberAuth, cohortId, { memberId: teacherId }),
    ).rejects.toThrow(/platform admins/i);
  });

  it('refuses session scheduling to a non-admin', async () => {
    await expect(
      upsertSession(mockDb, memberAuth, cohortId, { sessionNumber: 1, title: 'Week 1' }),
    ).rejects.toThrow(/platform admins/i);
  });

  it('creates a cohort for an admin when the name is free', async () => {
    setupSelectSequence([]); // assertNameFree finds no clash
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
      createCohort(mockDb, adminAuth, { name: 'Autumn 2026', startDate: '2026-09-01' }),
    ).rejects.toThrow(/already exists/i);
  });
});

// ── Marking authority is the teacher table, not a grant ───

describe('marking authority', () => {
  it('lets a cohort teacher save the register', async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }],        // requireSession
      [{ memberId: teacherId }],            // isCohortTeacher — yes
      [cohort],                             // requireCohort
      [{ id: enrollmentId }],               // enrolments belong to cohort
      [],                                   // existing records
    );
    setupInsert([{ sessionId, enrollmentId, attended: true }]);

    const res = await saveSessionRecords(mockDb, teacherAuth, sessionId, {
      records: [{ enrollmentId, attended: true, homeworkScore: 70, quizScore: 80 }],
    });
    expect(res.saved).toBe(1);
  });

  it('refuses the register to someone who is not a teacher on this cohort', async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }], // requireSession
      [],                            // isCohortTeacher — no row
    );
    await expect(
      saveSessionRecords(mockDb, memberAuth, sessionId, {
        records: [{ enrollmentId, attended: true }],
      }),
    ).rejects.toThrow(/teacher on this cohort/i);
  });

  it('rejects enrolments that belong to a different cohort', async () => {
    setupSelectSequence(
      [{ id: sessionId, cohortId }],
      [{ memberId: teacherId }],
      [cohort],
      [], // no matching enrolments in this cohort
    );
    await expect(
      saveSessionRecords(mockDb, teacherAuth, sessionId, {
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
      [{ memberId: teacherId }],
      [{ ...cohort, homeworkPassMark: 75, quizPassMark: 40 }],
      [{ id: enrollmentId }],
      [],
    );
    const insertSpy = vi.fn(() => createChain([{ sessionId, enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await saveSessionRecords(mockDb, teacherAuth, sessionId, {
      records: [{ enrollmentId, homeworkScore: 70, quizScore: 45 }],
    });

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['values']!.mock.calls[0]![0] as Record<string, unknown>;
    // 70 < 75 fails homework; 45 >= 40 passes the quiz.
    expect(written['homeworkPassed']).toBe(false);
    expect(written['quizPassed']).toBe(true);
  });

  it('marks the final test against the cohort pass mark', async () => {
    setupSelectSequence([enrollment], [{ memberId: teacherId }], [cohort]);
    const updateSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(updateSpy);

    await recordFinalTest(mockDb, teacherAuth, { enrollmentId, score: 59 });

    const chain = updateSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const written = chain['set']!.mock.calls[0]![0] as Record<string, unknown>;
    // Cohort pass mark is 60, so 59 fails.
    expect(written['finalTestPassed']).toBe(false);
    expect(written['finalTestScore']).toBe(59);
  });
});

// ── Self-enrolment ────────────────────────────────────────

describe('self-enrolment', () => {
  it('refuses when the cohort is closed to enrolment', async () => {
    setupSelectSequence([{ ...cohort, enrolmentOpen: false }]);
    await expect(enrolSelf(mockDb, memberAuth, cohortId)).rejects.toThrow(
      /not accepting enrolments/i,
    );
  });

  it('refuses when the caller already completed the class', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: new Date('2026-01-01') }],
    );
    await expect(enrolSelf(mockDb, memberAuth, cohortId)).rejects.toThrow(
      /already completed/i,
    );
  });

  it('refuses when the caller has an open enrolment in another cohort', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [{ memberId }], // open elsewhere
    );
    await expect(enrolSelf(mockDb, memberAuth, cohortId)).rejects.toThrow(
      /already enrolled in another/i,
    );
  });

  it('stamps the home branch and the self-enrolled flag', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [],
    );
    const insertSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await enrolSelf(mockDb, memberAuth, cohortId);

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const rows = chain['values']!.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ branchId, selfEnrolled: true, memberId });
  });

  it('admin enrolment is not flagged as self-enrolled', async () => {
    setupSelectSequence(
      [cohort],
      [{ id: memberId, homeBranchId: branchId, completedAt: null }],
      [],
    );
    const insertSpy = vi.fn(() => createChain([{ id: enrollmentId }]));
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(insertSpy);

    await enrolMembers(mockDb, adminAuth, cohortId, { memberIds: [memberId] });

    const chain = insertSpy.mock.results[0]!.value as Record<string, ReturnType<typeof vi.fn>>;
    const rows = chain['values']!.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ selfEnrolled: false });
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

  it('is admin-only', async () => {
    await expect(
      graduateMembers(mockDb, teacherAuth, cohortId, { enrollmentIds: [enrollmentId] }),
    ).rejects.toThrow(/platform admins/i);
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

  it('refuses a third party who is not an admin', async () => {
    setupSelectSequence([enrollment]);
    await expect(
      withdrawEnrollment(mockDb, teacherAuth, enrollmentId, { reason: 'withdrew' }),
    ).rejects.toThrow(/platform admins/i);
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
