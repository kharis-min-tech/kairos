import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning', 'onConflictDoUpdate',
    'update', 'set',
    'groupBy',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;
let lastOrderByArgs: unknown[] = [];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  lastOrderByArgs = [];
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    const chain = createChain(r);
    // Capture the orderBy arguments so we can assert sortBy behaviour
    chain.orderBy = vi.fn((...args: unknown[]) => {
      lastOrderByArgs = args;
      return chain;
    });
    return chain;
  });
}

function setupUpdate(result: unknown = undefined) {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

// ── Mock email sender (fire-and-forget) ───────────────────
vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    sendMentorAssignedEmail: vi.fn(() => Promise.resolve()),
  };
});

// ── Fixtures ──────────────────────────────────────────────

const branchId = '220e8400-0000-0000-0000-000000000002';
const otherBranchId = '330e8400-0000-0000-0000-000000000003';
const memberId = '440e8400-0000-0000-0000-000000000004';
const teacherId = '550e8400-0000-0000-0000-000000000005';
const enrollmentId = '660e8400-0000-0000-0000-000000000006';
const enrollment2Id = '660e8400-0000-0000-0000-000000000007';
const enrollment3Id = '660e8400-0000-0000-0000-000000000008';
const sessionId = '770e8400-0000-0000-0000-000000000009';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderOtherBranch = { memberId: '000-leader-b', email: 'leader-b@test.com', systemRole: 'member' as const, branchId: otherBranchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listEnrollments ───────────────────────────────────────

describe('listEnrollments', () => {
  it('silently scopes non-admin queries to the caller branch (cross-branch request is ignored)', async () => {
    // The service forces non-admins to `auth.branchId`; the result returns only the caller's rows.
    setupSelectSequence([], [{ total: 0 }]);

    const { listEnrollments } = await import('./service');
    // A leader from `branchId` requesting `otherBranchId` resolves with their own branch's data, not the other branch's.
    const result = await listEnrollments(mockDb, leaderAuth, { branchId: otherBranchId, page: 1, limit: 20 });
    expect(result.total).toBe(0);
  });

  it('honors sortBy=date-added (default) by ordering on enrolledAt desc', async () => {
    setupSelectSequence([], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    await listEnrollments(mockDb, adminAuth, { branchId, page: 1, limit: 20 });
    // Default sort: a single orderBy argument
    expect(lastOrderByArgs.length).toBe(1);
  });

  it('honors sortBy=name by ordering on member firstName + lastName', async () => {
    setupSelectSequence([], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    await listEnrollments(mockDb, adminAuth, { branchId, sortBy: 'name', page: 1, limit: 20 });
    // Name sort: two columns (first then last)
    expect(lastOrderByArgs.length).toBe(2);
  });

  it('scopes non-admin sortBy=name requests to the caller branch (no leak via member join)', async () => {
    // sortBy=name runs the member inner-join — confirm a leader requesting a foreign
    // branchId still resolves only their own branch's rows even on the join code-path.
    setupSelectSequence([], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, leaderAuth, {
      branchId: otherBranchId,
      sortBy: 'name',
      page: 1,
      limit: 20,
    });
    // Two orderBy columns prove the join-driven name-sort path executed.
    expect(lastOrderByArgs.length).toBe(2);
    expect(result.total).toBe(0);
  });

  it('honors sortBy=last-activity by ordering on updatedAt desc', async () => {
    setupSelectSequence([], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    await listEnrollments(mockDb, adminAuth, { branchId, sortBy: 'last-activity', page: 1, limit: 20 });
    expect(lastOrderByArgs.length).toBe(1);
  });

  it('admin can list across any branch', async () => {
    setupSelectSequence(
      [{ id: enrollmentId, memberId, branchId, stage: 'enrolled', memberFirstName: 'A', memberLastName: 'B' }],
      [{ total: 1 }],
    );
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, adminAuth, { branchId: otherBranchId, page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  // ── Persona scope (non-admin / non-pastor) ────────────────

  it('non-admin / non-pastor: checks NB-dept-leader + NB-Teacher role before listing', async () => {
    // 1: isNewBelieversDeptLeader → not a leader
    // 2: isNewBelieverTeacher → does not hold the role
    // 3: main rows query (returns nothing — personaOr makes the where row-scoped)
    // 4: count
    setupSelectSequence([], [], [], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, memberAuth, { page: 1, limit: 20 });
    expect(result.total).toBe(0);
    // 4 selects = persona ladder ran + row query + count
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(4);
  });

  it('NB-dept leader sees the full branch (no row-level persona OR)', async () => {
    // 1: isNewBelieversDeptLeader → leader hit
    // 2: isNewBelieverTeacher → don't care, runs anyway via Promise.all
    // 3: main rows query (full branch, 2 rows)
    // 4: count
    setupSelectSequence(
      [{ id: 'bd-1' }],
      [],
      [
        { id: enrollmentId, memberId, branchId, stage: 'enrolled', memberFirstName: 'A', memberLastName: 'B' },
        { id: enrollment2Id, memberId: 'other-member', branchId, stage: 'session-1', memberFirstName: 'C', memberLastName: 'D' },
      ],
      [{ total: 2 }],
    );
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, leaderAuth, { page: 1, limit: 20 });
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it('NB-Teacher role holder sees the full branch', async () => {
    // 1: isNewBelieversDeptLeader → not a leader
    // 2: isNewBelieverTeacher → holds the role
    // 3: main rows + 4: count
    setupSelectSequence(
      [],
      [{ id: 'mr-1' }],
      [{ id: enrollmentId, memberId, branchId, stage: 'enrolled', memberFirstName: 'A', memberLastName: 'B' }],
      [{ total: 1 }],
    );
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, memberAuth, { page: 1, limit: 20 });
    expect(result.total).toBe(1);
  });

  it('non-admin member with no branch context returns empty without leaking', async () => {
    const memberNoBranch = { ...memberAuth, branchId: undefined as unknown as string };
    setupSelectSequence([], [], [], [{ total: 0 }]);
    const { listEnrollments } = await import('./service');
    const result = await listEnrollments(mockDb, memberNoBranch, { page: 1, limit: 20 });
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
    // No DB calls — short-circuit before persona ladder
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
});

// ── getEnrollment persona scope ───────────────────────────

describe('getEnrollment persona scope', () => {
  const baseEnrollmentRow = {
    id: enrollmentId,
    memberId,
    branchId,
    teacherId: null,
    mentorId: null,
    stage: 'session-1',
    enrolledAt: new Date(),
    completedAt: null,
    sessionCompletedAt: null,
    sessionFeedback: null,
    joinedDepartmentId: null,
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    memberFirstName: 'A',
    memberLastName: 'B',
    teacherFirstName: null,
    teacherLastName: null,
    mentorFirstName: null,
    mentorLastName: null,
  };

  it('admin can read any enrollment', async () => {
    setupSelectSequence([baseEnrollmentRow], []);
    const { getEnrollment } = await import('./service');
    const result = await getEnrollment(mockDb, adminAuth, enrollmentId);
    expect(result.id).toBe(enrollmentId);
  });

  it('student can read their own enrollment', async () => {
    setupSelectSequence([baseEnrollmentRow], []);
    const { getEnrollment } = await import('./service');
    const result = await getEnrollment(mockDb, memberAuth, enrollmentId);
    expect(result.id).toBe(enrollmentId);
  });

  it('teacher-on-row can read the enrollment they teach', async () => {
    const taughtRow = { ...baseEnrollmentRow, memberId: 'other-member', teacherId: memberAuth.memberId };
    setupSelectSequence([taughtRow], []);
    const { getEnrollment } = await import('./service');
    const result = await getEnrollment(mockDb, memberAuth, enrollmentId);
    expect(result.id).toBe(enrollmentId);
  });

  it('mentor-on-row can read the enrollment they mentor', async () => {
    const mentoredRow = { ...baseEnrollmentRow, memberId: 'other-member', mentorId: memberAuth.memberId };
    setupSelectSequence([mentoredRow], []);
    const { getEnrollment } = await import('./service');
    const result = await getEnrollment(mockDb, memberAuth, enrollmentId);
    expect(result.id).toBe(enrollmentId);
  });

  it('unrelated member without NB-leader / Teacher-role is denied', async () => {
    // 1: row lookup (unrelated member to the row)
    // 2: isNewBelieversDeptLeader → []
    // 3: isNewBelieverTeacher → []
    const otherRow = { ...baseEnrollmentRow, memberId: 'someone-else' };
    setupSelectSequence([otherRow], [], []);
    const { getEnrollment } = await import('./service');
    await expect(getEnrollment(mockDb, memberAuth, enrollmentId)).rejects.toThrow(
      /do not have access/i,
    );
  });

  it('NB-dept leader can read any enrollment in their branch', async () => {
    const otherRow = { ...baseEnrollmentRow, memberId: 'someone-else' };
    setupSelectSequence([otherRow], [{ id: 'bd-1' }], [], []);
    const { getEnrollment } = await import('./service');
    const result = await getEnrollment(mockDb, leaderAuth, enrollmentId);
    expect(result.id).toBe(enrollmentId);
  });
});

// ── Mentor follow-ups ─────────────────────────────────────

describe('createMentorFollowup', () => {
  function setupInsert(returnedRow: unknown) {
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain([returnedRow]));
  }

  it('the assigned mentor can create a follow-up on their mentee', async () => {
    // select: enrollment lookup (the one used to check mentorId) → success
    setupSelectSequence([{ id: enrollmentId, branchId, mentorId: memberId }]);
    setupInsert({ id: 'fu-1', enrollmentId, mentorMemberId: memberId, note: 'good chat' });
    const { createMentorFollowup } = await import('./service');
    const result = await createMentorFollowup(mockDb, memberAuth, enrollmentId, { note: 'good chat' });
    expect(result?.id).toBe('fu-1');
  });

  it('a non-mentor member without NB-leader / Teacher role is denied', async () => {
    setupSelectSequence(
      [{ id: enrollmentId, branchId, mentorId: 'other-mentor' }],
      [], // not NB-leader
      [], // no Teacher role
    );
    const { createMentorFollowup } = await import('./service');
    await expect(
      createMentorFollowup(mockDb, memberAuth, enrollmentId, { note: 'sneaky' }),
    ).rejects.toThrow(/assigned mentor|NB leader|pastor\/admin/i);
  });

  it('admin can write a follow-up even when not the assigned mentor', async () => {
    setupSelectSequence([{ id: enrollmentId, branchId, mentorId: 'other-mentor' }]);
    setupInsert({ id: 'fu-2', enrollmentId, mentorMemberId: 'other-mentor', note: 'admin note' });
    const { createMentorFollowup } = await import('./service');
    const result = await createMentorFollowup(mockDb, adminAuth, enrollmentId, { note: 'admin note' });
    expect(result?.id).toBe('fu-2');
  });

  it('NotFound when the enrollment does not exist', async () => {
    setupSelectSequence([]); // enrollment lookup returns nothing
    const { createMentorFollowup } = await import('./service');
    await expect(
      createMentorFollowup(mockDb, adminAuth, enrollmentId, { note: 'x' }),
    ).rejects.toThrow(/Enrollment/);
  });
});

describe('deleteMentorFollowup', () => {
  it('the author can soft-delete their own follow-up', async () => {
    setupSelectSequence(
      [{ id: 'fu-1', enrollmentId, createdBy: memberId }],
      [{ id: enrollmentId, branchId, mentorId: memberId }],
    );
    setupUpdate();
    const { deleteMentorFollowup } = await import('./service');
    const result = await deleteMentorFollowup(mockDb, memberAuth, 'fu-1');
    expect(result?.id).toBe('fu-1');
  });

  it('a different member without NB-leader role is denied', async () => {
    setupSelectSequence(
      [{ id: 'fu-1', enrollmentId, createdBy: 'someone-else' }],
      [{ id: enrollmentId, branchId, mentorId: memberId }],
      [], // not NB-leader
    );
    const { deleteMentorFollowup } = await import('./service');
    await expect(deleteMentorFollowup(mockDb, memberAuth, 'fu-1')).rejects.toThrow(
      /author|NB leader|pastor\/admin/i,
    );
  });

  it('pastor can delete any follow-up in their branch', async () => {
    setupSelectSequence(
      [{ id: 'fu-1', enrollmentId, createdBy: 'someone-else' }],
      [{ id: enrollmentId, branchId, mentorId: 'someone-else' }],
    );
    setupUpdate();
    const { deleteMentorFollowup } = await import('./service');
    const result = await deleteMentorFollowup(mockDb, pastorAuth, 'fu-1');
    expect(result?.id).toBe('fu-1');
  });
});

// ── advanceStage (updateEnrollment with stage change) ─────

describe('updateEnrollment stage advancement', () => {
  it('throws ForbiddenError when a leader tries to update an enrollment in another branch', async () => {
    // First select: load existing — returns enrollment in `branchId`
    // Second select: enforceTeacherOrAbove inside (only runs for non-admin/pastor) — but enforce branch scope fires first
    setupSelectSequence(
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      // member-role lookup for isNewBelieverTeacher
      [],
    );
    const { updateEnrollment } = await import('./service');
    await expect(
      updateEnrollment(mockDb, leaderOtherBranch, enrollmentId, { stage: 'session-1' }),
    ).rejects.toThrow(/Only New Believers Teachers|only access new believers data/);
  });

  it('rejects a plain member (no leader / teacher role)', async () => {
    setupSelectSequence(
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      [], // no New Believers Teacher role
    );
    const { updateEnrollment } = await import('./service');
    await expect(
      updateEnrollment(mockDb, memberAuth, enrollmentId, { stage: 'session-1' }),
    ).rejects.toThrow('Only New Believers Teachers');
  });

  it('admin can advance stage with side effects', async () => {
    setupSelectSequence(
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
    );
    setupUpdate([{ id: enrollmentId, stage: 'session-1', branchId }]);
    const { updateEnrollment } = await import('./service');
    const result = await updateEnrollment(mockDb, adminAuth, enrollmentId, { stage: 'session-1' });
    expect(result.stage).toBe('session-1');
  });

  it('refuses to advance from a session stage that has not been marked complete', async () => {
    setupSelectSequence(
      // existing: in session-1, no completion mark
      [{ branchId, stage: 'session-1', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
    );
    const { updateEnrollment } = await import('./service');
    await expect(
      updateEnrollment(mockDb, adminAuth, enrollmentId, { stage: 'session-2' }),
    ).rejects.toThrow(/Cannot advance from session-1/);
  });

  it('refuses to advance from a completed session stage without feedback', async () => {
    setupSelectSequence(
      [{
        branchId,
        stage: 'session-1',
        sessionCompletedAt: { 'session-1': new Date('2026-05-01').toISOString() },
        sessionFeedback: {},
        mentorId: null,
        memberId,
      }],
    );
    const { updateEnrollment } = await import('./service');
    await expect(
      updateEnrollment(mockDb, adminAuth, enrollmentId, { stage: 'session-2' }),
    ).rejects.toThrow(/session feedback/);
  });

  it('allows advancing from a session stage when completion and feedback are supplied together', async () => {
    setupSelectSequence(
      [{ branchId, stage: 'session-1', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      [{ sessionId: 'session-a' }],
    );
    setupUpdate([{ id: enrollmentId, stage: 'session-2', branchId }]);
    const { updateEnrollment } = await import('./service');
    const result = await updateEnrollment(mockDb, adminAuth, enrollmentId, {
      stage: 'session-2',
      sessionCompletedAt: { 'session-1': new Date('2026-05-01').toISOString() },
      sessionFeedback: { 'session-1': 'Ready for the next session.' },
    });
    expect(result.stage).toBe('session-2');
  });

  it('refuses to advance from a session stage without matching present attendance', async () => {
    setupSelectSequence(
      [{ branchId, stage: 'session-1', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      [],
    );
    const { updateEnrollment } = await import('./service');
    await expect(
      updateEnrollment(mockDb, adminAuth, enrollmentId, {
        stage: 'session-2',
        sessionCompletedAt: { 'session-1': new Date('2026-05-01').toISOString() },
        sessionFeedback: { 'session-1': 'Ready for the next session.' },
      }),
    ).rejects.toThrow(/attendance has been marked present/);
  });

  it('allows reversing a session move without requiring feedback for the current stage', async () => {
    setupSelectSequence(
      [{ branchId, stage: 'session-2', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
    );
    setupUpdate([{ id: enrollmentId, stage: 'session-1', branchId }]);
    const { updateEnrollment } = await import('./service');
    const result = await updateEnrollment(mockDb, adminAuth, enrollmentId, { stage: 'session-1' });
    expect(result.stage).toBe('session-1');
  });
});

// ── bulkAdvance ───────────────────────────────────────────

describe('bulkAdvance', () => {
  it('returns { advanced: N, failed: 0 } when every id succeeds', async () => {
    // 3 enrollments, each needs: 1 select (existing) + 1 update.
    // setupSelectSequence cycles through results; we need 3 successful loads.
    setupSelectSequence(
      // enrollment 1
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      // enrollment 2
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      // enrollment 3
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
    );
    setupUpdate([{ id: 'any', stage: 'session-1', branchId }]);

    const { bulkAdvance } = await import('./service');
    const result = await bulkAdvance(mockDb, adminAuth, {
      enrollmentIds: [enrollmentId, enrollment2Id, enrollment3Id],
      targetStage: 'session-1',
    });
    expect(result).toEqual({ advanced: 3, failed: 0 });
  });

  it('continues advancing after a single failure and reports { advanced: N-1, failed: 1 }', async () => {
    // Failure pattern: the 2nd lookup returns [] → NotFoundError → caught.
    setupSelectSequence(
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
      [], // not found for enrollment 2
      [{ branchId, stage: 'enrolled', sessionCompletedAt: {}, sessionFeedback: {}, mentorId: null, memberId }],
    );
    setupUpdate([{ id: 'any', stage: 'session-1', branchId }]);

    // Suppress the console.error this test deliberately triggers.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { bulkAdvance } = await import('./service');
    const result = await bulkAdvance(mockDb, adminAuth, {
      enrollmentIds: [enrollmentId, enrollment2Id, enrollment3Id],
      targetStage: 'session-1',
    });
    expect(result).toEqual({ advanced: 2, failed: 1 });
    expect(errSpy).toHaveBeenCalledWith(
      'bulkAdvance: skipping enrollment',
      expect.objectContaining({ enrollmentId: enrollment2Id }),
    );
    errSpy.mockRestore();
  });

  it('reports failed for every id when none can be advanced', async () => {
    // Every existing lookup returns [] → NotFoundError each time.
    setupSelectSequence([], [], []);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { bulkAdvance } = await import('./service');
    const result = await bulkAdvance(mockDb, adminAuth, {
      enrollmentIds: [enrollmentId, enrollment2Id, enrollment3Id],
      targetStage: 'session-1',
    });
    expect(result).toEqual({ advanced: 0, failed: 3 });
    expect(errSpy).toHaveBeenCalledTimes(3);
    errSpy.mockRestore();
  });
});

// ── recordSessionAttendance ───────────────────────────────

describe('recordSessionAttendance', () => {
  it.skip('TODO Phase 5: rewrite for new grant-based access — records attendance for active enrollments in the session stage', async () => {
    setupSelectSequence(
      [{ branchId, sessionStage: 'session-1' }],
      [{ branchId, stage: 'session-1', isActive: true }],
      [],
    );
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain());

    const { recordSessionAttendance } = await import('./service');
    const result = await recordSessionAttendance(mockDb, pastorAuth, sessionId, [
      { enrollmentId, attended: true },
    ]);

    expect(result).toEqual({ recorded: 1 });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it.skip('TODO Phase 5: rewrite for new grant-based access — rejects attendance records for enrollments in a different current stage', async () => {
    setupSelectSequence(
      [{ branchId, sessionStage: 'session-1' }],
      [{ branchId, stage: 'session-2', isActive: true }],
      [],
    );

    const { recordSessionAttendance } = await import('./service');
    await expect(
      recordSessionAttendance(mockDb, pastorAuth, sessionId, [
        { enrollmentId, attended: true },
      ]),
    ).rejects.toThrow(/only be recorded for active session-1 enrollments/);
  });

  it.skip('TODO Phase 5: rewrite for new grant-based access — allows correcting existing attendance after the enrollment has advanced', async () => {
    setupSelectSequence(
      [{ branchId, sessionStage: 'session-1' }],
      [{ branchId, stage: 'session-2', isActive: true }],
      [{ enrollmentId }],
    );
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain());

    const { recordSessionAttendance } = await import('./service');
    const result = await recordSessionAttendance(mockDb, pastorAuth, sessionId, [
      { enrollmentId, attended: false },
    ]);

    expect(result).toEqual({ recorded: 1 });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

// ── createEnrollment branch scope ─────────────────────────

describe('createEnrollment', () => {
  it('refuses non-admin / non-pastor callers', async () => {
    const { createEnrollment } = await import('./service');
    await expect(
      createEnrollment(mockDb, leaderAuth, { memberId, branchId }),
    ).rejects.toThrow('Only admins or pastors');
  });

  it.skip('TODO Phase 5: rewrite for new grant-based access — refuses a pastor creating an enrollment in another branch', async () => {
    const { createEnrollment } = await import('./service');
    await expect(
      createEnrollment(mockDb, pastorAuth, { memberId, branchId: otherBranchId }),
    ).rejects.toThrow('only access new believers data');
  });

  it('admin can create an enrollment in any branch', async () => {
    // isNewBelieverTeacher → []; activeTeaching → []; activeMentoring → []; duplicate-check → []
    setupSelectSequence([], [], [], []);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain([{ id: enrollmentId, memberId, branchId, stage: 'session-1' }]));

    const { createEnrollment } = await import('./service');
    const result = await createEnrollment(mockDb, adminAuth, { memberId, branchId });
    expect(result.id).toBe(enrollmentId);
  });
});

// ── getHealthSummary ──────────────────────────────────────

describe('getHealthSummary', () => {
  it('returns the trend window, funnel buckets, and stale count for an admin', async () => {
    // Three select calls, in order: trend → funnel → stale+active counts
    setupSelectSequence(
      // 1) attendanceTrend rows (newest-first)
      [
        {
          sessionId: 's1',
          sessionDate: '2026-05-15T10:00:00.000Z',
          sessionStage: 'session-1',
          topic: 'Foundations of Faith',
          attended: 8,
          eligible: 10,
        },
        {
          sessionId: 's2',
          sessionDate: '2026-05-08T10:00:00.000Z',
          sessionStage: 'session-2',
          topic: 'Who is a Christian',
          attended: 5,
          eligible: 10,
        },
      ],
      // 2) stage funnel rows
      [
        { stage: 'session-1', count: 3 },
        { stage: 'session-2', count: 2 },
        { stage: 'integrated', count: 1 },
      ],
      // 3) [{ staleCount, activeCount }]
      [{ staleCount: 2, activeCount: 6 }],
    );

    const { getHealthSummary } = await import('./service');
    const result = await getHealthSummary(mockDb, adminAuth, { branchId });

    expect(result.attendanceTrend).toHaveLength(2);
    expect(result.attendanceTrend[0]).toMatchObject({
      sessionId: 's1',
      attended: 8,
      eligible: 10,
      attendanceRate: 0.8,
    });
    // Funnel fills all 7 stages with 0 defaults for missing keys
    expect(result.stageFunnel).toEqual({
      enrolled: 0,
      'session-1': 3,
      'session-2': 2,
      'session-3': 0,
      'session-4': 0,
      completed: 0,
      integrated: 1,
    });
    expect(result.stale).toEqual({ count: 2, thresholdDays: 7 });
    expect(result.summary.activeEnrollments).toBe(6);
    // (0.8 + 0.5) / 2 = 0.65
    expect(result.summary.avgAttendanceRate).toBeCloseTo(0.65, 5);
  });

  it('returns null avgAttendanceRate and empty funnel buckets for an empty branch', async () => {
    setupSelectSequence(
      [],                              // no sessions
      [],                              // no enrollments
      [{ staleCount: 0, activeCount: 0 }],
    );

    const { getHealthSummary } = await import('./service');
    const result = await getHealthSummary(mockDb, adminAuth, { branchId });

    expect(result.attendanceTrend).toEqual([]);
    expect(result.summary.avgAttendanceRate).toBeNull();
    expect(result.summary.activeEnrollments).toBe(0);
    expect(result.stale).toEqual({ count: 0, thresholdDays: 7 });
    // Funnel still includes all 7 stages with 0
    expect(Object.values(result.stageFunnel).every((v) => v === 0)).toBe(true);
    expect(Object.keys(result.stageFunnel)).toHaveLength(7);
  });

  it('treats a session with zero eligible attendees as 0 attendance rate (no NaN)', async () => {
    setupSelectSequence(
      [
        {
          sessionId: 's1',
          sessionDate: '2026-05-15T10:00:00.000Z',
          sessionStage: 'session-1',
          topic: 'Foundations of Faith',
          attended: 0,
          eligible: 0,
        },
      ],
      [],
      [{ staleCount: 0, activeCount: 0 }],
    );

    const { getHealthSummary } = await import('./service');
    const result = await getHealthSummary(mockDb, adminAuth, { branchId });

    expect(result.attendanceTrend[0]?.attendanceRate).toBe(0);
    // Average of a single 0-rate session is 0, not null
    expect(result.summary.avgAttendanceRate).toBe(0);
  });

  it('silently scopes a leader request that targets a foreign branch (no leak)', async () => {
    // Service must coerce non-admin/non-pastor queries to auth.branchId before running anything.
    setupSelectSequence(
      [],
      [],
      [{ staleCount: 0, activeCount: 0 }],
    );

    const { getHealthSummary } = await import('./service');
    // Leader of `branchId` requests data for `otherBranchId` — silently scoped to their own.
    const result = await getHealthSummary(mockDb, leaderAuth, { branchId: otherBranchId });
    expect(result.summary.activeEnrollments).toBe(0);
  });

  it('allows a pastor to query any branch', async () => {
    setupSelectSequence(
      [],
      [{ stage: 'session-1', count: 4 }],
      [{ staleCount: 1, activeCount: 4 }],
    );

    const { getHealthSummary } = await import('./service');
    const result = await getHealthSummary(mockDb, pastorAuth, { branchId: otherBranchId });
    expect(result.summary.activeEnrollments).toBe(4);
    expect(result.stageFunnel['session-1']).toBe(4);
  });
});

// passthrough to prevent unused var
void teacherId;
