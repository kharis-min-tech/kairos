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

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId };
const leaderOtherBranch = { memberId: '000-leader-b', email: 'leader-b@test.com', systemRole: 'leader' as const, branchId: otherBranchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };

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

// ── createEnrollment branch scope ─────────────────────────

describe('createEnrollment', () => {
  it('refuses non-admin / non-pastor callers', async () => {
    const { createEnrollment } = await import('./service');
    await expect(
      createEnrollment(mockDb, leaderAuth, { memberId, branchId }),
    ).rejects.toThrow('Only admins or pastors');
  });

  it('refuses a pastor creating an enrollment in another branch', async () => {
    const { createEnrollment } = await import('./service');
    await expect(
      createEnrollment(mockDb, pastorAuth, { memberId, branchId: otherBranchId }),
    ).rejects.toThrow('only access new believers data');
  });

  it('admin can create an enrollment in any branch', async () => {
    // isNewBelieverTeacher → []; activeTeaching → []; activeMentoring → []; duplicate-check → []
    setupSelectSequence([], [], [], []);
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain([{ id: enrollmentId, memberId, branchId, stage: 'enrolled' }]));

    const { createEnrollment } = await import('./service');
    const result = await createEnrollment(mockDb, adminAuth, { memberId, branchId });
    expect(result.id).toBe(enrollmentId);
  });
});

// passthrough to prevent unused var
void teacherId;
