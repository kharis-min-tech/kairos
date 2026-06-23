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
let insertValuesArgs: unknown[];
let updateSetArgs: unknown[];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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

function setupInsert(...results: unknown[]) {
  insertValuesArgs = [];
  let idx = 0;
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = results[idx] ?? results[results.length - 1] ?? [];
    idx++;
    const chain = createChain(r);
    chain.values = vi.fn((arg: unknown) => {
      insertValuesArgs.push(arg);
      return chain;
    });
    return chain;
  });
}

function setupUpdate(...results: unknown[]) {
  updateSetArgs = [];
  let idx = 0;
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = results[idx] ?? results[results.length - 1] ?? [];
    idx++;
    const chain = createChain(r);
    chain.set = vi.fn((arg: unknown) => {
      updateSetArgs.push(arg);
      return chain;
    });
    return chain;
  });
}

// ── Mock bcrypt (shell minting) and createEnrollment ───────
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(() => Promise.resolve('hashed')) },
  hash: vi.fn(() => Promise.resolve('hashed')),
}));

const createEnrollmentMock = vi.fn();
vi.mock('../new-believers/service', () => ({
  createEnrollmentInternal: (...args: unknown[]) => createEnrollmentMock(...args),
}));

// ── Fixtures ──────────────────────────────────────────────
const branchId = '220e8400-0000-0000-0000-000000000002';
const otherBranchId = '330e8400-0000-0000-0000-000000000003';
const memberId = '440e8400-0000-0000-0000-000000000004';
const subjectId = '550e8400-0000-0000-0000-000000000005';
const enrollmentId = '660e8400-0000-0000-0000-000000000006';
const submissionId = '770e8400-0000-0000-0000-000000000007';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

/**
 * The Phase 1 read gates call `getVisibleFormTypes`, which for non-admin/non-pastor
 * callers issues up to 3 dept-check SELECTs in this order:
 *   1. isAdminDeptLeader
 *   2. isInAdminDepartment
 *   3. isNewBelieversDeptLeader
 * Helpers below seed the select queue with the three results.
 *
 * For prospects flows, only #1 (isAdminDeptLeader) is consulted by `canSeeProspects`.
 */
const POSITIVE = [{ id: 'dept-stub' }];
const EMPTY: unknown[] = [];
function visAdminDeptLeader(): unknown[] {
  return [POSITIVE]; // first dept-check returns positive → short-circuit
}
function visInAdminDept(): unknown[] {
  return [EMPTY, POSITIVE]; // first negative, second (isInAdminDepartment) positive
}
function visNone(): unknown[] {
  return [EMPTY, EMPTY, EMPTY];
}

// Phase 2 — Zod schema (submitFormSchema) requires consentGivenAt + consentPolicyVersion
// at the route boundary; the service's `consentFields` helper falls back to the current
// time + DEFAULT_CONSENT_POLICY_VERSION when those are absent (existing tests don't pass them).

const altarCallPayload = {
  todaysDate: '2026-05-22',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '07123456789',
};

const testimonyPayload = {
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '07123456789',
  todaysDate: '2026-05-22',
  dateOfTestimony: '2026-05-20',
  category: 'Health/Healing',
  details: 'Healed',
  shareAnonymously: false,
  happyToShareSunday: true,
  acknowledged: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  createEnrollmentMock.mockReset();
});

// ── submitForm: altar_call ────────────────────────────────
describe('submitForm — altar_call', () => {
  it('creates a prospect shell + enrollment when no subject and no phone match, sets converted', async () => {
    setupSelectSequence(
      [], // phone safety-net lookup → no match
      [], // existing active enrollment lookup → none
    );
    setupInsert(
      [{ id: subjectId }], // new member shell
      [{ id: submissionId, status: 'converted' }], // submission row
    );
    setupUpdate();
    createEnrollmentMock.mockResolvedValue({ id: enrollmentId });

    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'altar_call', { payload: altarCallPayload });

    // Shell minted with prospect type + temp email
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('prospect');
    expect(String(shell.email)).toContain('@temp.kairos.local');
    expect(shell.homeBranchId).toBe(branchId);
    expect(shell.approvalStatus).toBe('approved');
    expect(shell.isActive).toBe(true);

    // Enrollment created via reused helper
    expect(createEnrollmentMock).toHaveBeenCalledTimes(1);

    // Submission row linked + converted
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('new_believer_enrollment');
    expect(submission.linkedEntityId).toBe(enrollmentId);
    expect(submission.status).toBe('converted');
    expect(submission.branchId).toBe(branchId);
    expect(submission.submittedBy).toBe(memberId);
    expect(result.id).toBe(submissionId);
  });

  it('phone safety-net links an existing active member instead of creating a shell', async () => {
    setupSelectSequence(
      [{ id: subjectId }], // phone match found
      [], // no active enrollment
    );
    setupInsert([{ id: submissionId }]);
    createEnrollmentMock.mockResolvedValue({ id: enrollmentId });

    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'altar_call', { payload: altarCallPayload });

    // Only ONE insert (the submission) — no shell minted
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(createEnrollmentMock).toHaveBeenCalledTimes(1);
  });

  it('explicit subjectMemberId links to that member (verified in branch)', async () => {
    setupSelectSequence(
      [{ id: subjectId, branchId }], // subject lookup → in branch
      [], // no active enrollment
    );
    setupInsert([{ id: submissionId }]);
    createEnrollmentMock.mockResolvedValue({ id: enrollmentId });

    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'altar_call', {
      subjectMemberId: subjectId,
      payload: altarCallPayload,
    });

    expect(insertValuesArgs.length).toBe(1); // submission only
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
  });

  it('reuses an existing active enrollment rather than duplicating', async () => {
    setupSelectSequence(
      [{ id: subjectId }], // phone match
      [{ id: enrollmentId }], // existing active enrollment found
    );
    setupInsert([{ id: submissionId }]);

    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'altar_call', { payload: altarCallPayload });

    expect(createEnrollmentMock).not.toHaveBeenCalled();
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.linkedEntityId).toBe(enrollmentId);
    expect(submission.status).toBe('converted');
    expect(result.id).toBe(submissionId);
  });

  it('rejects when the phone belongs to an active member in another branch (no shell minted)', async () => {
    setupSelectSequence(
      [], // phone safety-net (in-branch) → no match
      [{ id: 'other-branch-member' }], // global phone-owner check → exists elsewhere
    );
    setupInsert([{ id: submissionId }]);
    const { submitForm } = await import('./service');
    const { ConflictError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'altar_call', { payload: altarCallPayload })
    ).rejects.toBeInstanceOf(ConflictError);
    // No shell and no submission were inserted
    expect(insertValuesArgs.length).toBe(0);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('rejects a cross-branch explicit subjectMemberId', async () => {
    setupSelectSequence([{ id: subjectId, branchId: otherBranchId }]);
    const { submitForm } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'altar_call', {
        subjectMemberId: subjectId,
        payload: altarCallPayload,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects an unknown subjectMemberId with NotFound', async () => {
    setupSelectSequence([]);
    const { submitForm } = await import('./service');
    const { NotFoundError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'altar_call', {
        subjectMemberId: subjectId,
        payload: altarCallPayload,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── submitForm: store-only + validation ───────────────────
describe('submitForm — store-only', () => {
  it('persists testimony with status new and no shell/enrollment', async () => {
    // testimonyPayload has shareAnonymously:false, so submitTestimony now does a
    // link-only phone lookup. No match → subjectMemberId stays null; link-only
    // NEVER mints, so there is no shell insert — only the submission insert.
    setupSelectSequence([]); // in-branch phone lookup → no match
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'testimony', { payload: testimonyPayload });

    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.status).toBe('new');
    expect(submission.subjectMemberId).toBeNull();
    expect(submission.branchId).toBe(branchId);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
    expect(result.id).toBe(submissionId);
  });

  it('forces branchId to auth.branchId, ignoring client-sent branchId', async () => {
    // baptism now mints a prospect shell FIRST (no subject, no phone match), so
    // insertValuesArgs[0] is the member shell and [1] is the submission.
    setupSelectSequence(
      [], // in-branch phone safety-net → no match
      [], // global phone-owner check → none
    );
    setupInsert([{ id: subjectId }], [{ id: submissionId }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', {
      branchId: otherBranchId,
      payload: { firstName: 'A', lastName: 'B', phone: '07000' },
    });
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.branchId).toBe(branchId);
  });

  it('throws NotFound for an unknown formType', async () => {
    const { submitForm } = await import('./service');
    const { NotFoundError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'wedding', { payload: {} })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects testimony payload with acknowledged:false (Zod ValidationError)', async () => {
    const { submitForm } = await import('./service');
    const { ValidationError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'testimony', {
        payload: { ...testimonyPayload, acknowledged: false },
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects testimony payload with an invalid category', async () => {
    const { submitForm } = await import('./service');
    const { ValidationError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'testimony', {
        payload: { ...testimonyPayload, category: 'NotACategory' },
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

// ── submitForm: baptism ───────────────────────────────────
//
// Baptism resolves a subject via the shared resolveOrMintSubject ladder with a
// mint policy (memberType=prospect). No conversion/enrollment — status stays
// 'new', linkedEntityType is 'member' when a subject is resolved.
describe('submitForm — baptism', () => {
  const baptismPayload = { firstName: 'Jane', lastName: 'Doe', phone: '07123456789' };

  it('mints a prospect shell and links it when no subject and no phone match, status new', async () => {
    setupSelectSequence(
      [], // in-branch phone safety-net → no match
      [], // global phone-owner check → none
    );
    setupInsert(
      [{ id: subjectId }], // prospect shell
      [{ id: submissionId, status: 'new' }], // submission
    );
    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'baptism', { payload: baptismPayload });

    // [0] minted shell, [1] submission
    expect(insertValuesArgs.length).toBe(2);
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('prospect');
    expect(shell.firstName).toBe('Jane');
    expect(shell.lastName).toBe('Doe');
    expect(shell.phone).toBe('07123456789');
    expect(shell.homeBranchId).toBe(branchId);

    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.formType).toBe('baptism');
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
    expect(submission.linkedEntityId).toBe(subjectId);
    expect(submission.status).toBe('new');
    expect(submission.branchId).toBe(branchId);
    expect(submission.submittedBy).toBe(memberId);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
    expect(result.id).toBe(submissionId);
  });

  it('links an existing in-branch active member by phone instead of minting', async () => {
    setupSelectSequence(
      [{ id: subjectId }], // in-branch phone match found
    );
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', { payload: baptismPayload });

    // Only the submission is inserted — no shell minted.
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
  });

  it('links an explicit in-branch subjectMemberId without minting', async () => {
    setupSelectSequence([{ id: subjectId, branchId }]); // subject lookup in branch
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', {
      subjectMemberId: subjectId,
      payload: baptismPayload,
    });
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
  });

  it('rejects a cross-branch explicit subjectMemberId with Forbidden', async () => {
    setupSelectSequence([{ id: subjectId, branchId: otherBranchId }]);
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'baptism', {
        subjectMemberId: subjectId,
        payload: baptismPayload,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(insertValuesArgs.length).toBe(0);
  });

  it('rejects when the phone belongs to an active member in another branch (Conflict, no insert)', async () => {
    setupSelectSequence(
      [], // in-branch phone safety-net → none
      [{ id: 'other-branch-member' }], // global phone-owner → exists elsewhere
    );
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ConflictError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'baptism', { payload: baptismPayload })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(insertValuesArgs.length).toBe(0);
  });

  it('explicit in-branch subject wins over a supplied phone — no phone lookup is performed', async () => {
    // resolveOrMintSubject returns at the explicit-selection step, so only ONE
    // select (the explicit-subject verification) is issued — the phone safety-net
    // and global phone-owner lookups never run. Arming a single select row proves
    // the explicit path short-circuits before any phone query.
    setupSelectSequence([{ id: subjectId, branchId }]); // explicit subject lookup only
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', {
      subjectMemberId: subjectId,
      // A phone that, if matched, would resolve to a DIFFERENT member — it must
      // be ignored entirely because the explicit subject takes precedence.
      payload: { firstName: 'Jane', lastName: 'Doe', phone: '07123456789' },
    });

    // Exactly one select issued (the explicit-subject verification); no phone lookups.
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
    expect(submission.linkedEntityId).toBe(subjectId);
  });
});

// ── submitForm: testimony ─────────────────────────────────
//
// Testimony links to an existing member only (mode linkOnly — NEVER mints), and
// skips matching entirely when shareAnonymously is set. Status stays 'new'.
describe('submitForm — testimony', () => {
  it('does no matching at all when shareAnonymously is true (subject null, no shell)', async () => {
    // No select should be issued — assert by arming an empty sequence and
    // confirming subjectMemberId is null with only the submission inserted.
    setupSelectSequence([]);
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'testimony', {
      payload: { ...testimonyPayload, shareAnonymously: true },
    });

    // select must not have been called — matching is skipped for anonymous.
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBeNull();
    expect(submission.linkedEntityType).toBeNull();
    expect(submission.status).toBe('new');
  });

  it('links an existing in-branch active member by phone when not anonymous', async () => {
    setupSelectSequence([{ id: subjectId }]); // in-branch phone match
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'testimony', {
      payload: { ...testimonyPayload, shareAnonymously: false },
    });

    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
    expect(submission.linkedEntityId).toBe(subjectId);
  });

  it('leaves subjectMemberId null and NEVER mints when not anonymous and no match', async () => {
    setupSelectSequence([]); // in-branch phone lookup → no match (linkOnly stops here)
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'testimony', {
      payload: { ...testimonyPayload, shareAnonymously: false },
    });

    // linkOnly never mints — only the submission insert occurred.
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBeNull();
    expect(submission.linkedEntityType).toBeNull();
    expect(submission.status).toBe('new');
  });

  it('rejects a cross-branch explicit subjectMemberId with Forbidden', async () => {
    setupSelectSequence([{ id: subjectId, branchId: otherBranchId }]);
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'testimony', {
        subjectMemberId: subjectId,
        payload: { ...testimonyPayload, shareAnonymously: false },
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(insertValuesArgs.length).toBe(0);
  });
});

// ── submitForm: baby_naming / baby_dedication ─────────────
//
// The subject is the baby, minted as a `child` shell with name split from
// babyFullName. A matched parent (explicit pick, else in-branch phone) becomes
// the baby's guardianMemberId. The parent is never minted. Status stays 'new'.
describe('submitForm — baby forms', () => {
  const babyPayload = {
    babyFullName: 'Baby Grace Doe',
    dateOfBirth: '2026-01-15',
    gender: 'Female' as const,
    fathersName: 'John Doe',
    mothersName: 'Mary Doe',
    parentContactPhone: '07123456789',
  };

  it('mints the baby as a child shell with split name and links it as the subject (no parent match)', async () => {
    setupSelectSequence([]); // parentContactPhone lookup → no match
    setupInsert(
      [{ id: subjectId }], // baby shell
      [{ id: submissionId, status: 'new' }], // submission
    );
    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'baby_naming', { payload: babyPayload });

    // [0] baby shell, [1] submission
    expect(insertValuesArgs.length).toBe(2);
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('child');
    // "Baby Grace Doe" → first 'Baby', last 'Grace Doe'
    expect(shell.firstName).toBe('Baby');
    expect(shell.lastName).toBe('Grace Doe');
    expect(shell.homeBranchId).toBe(branchId);
    // No parent matched → guardian null.
    expect(shell.guardianMemberId).toBeNull();

    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.formType).toBe('baby_naming');
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
    expect(submission.linkedEntityId).toBe(subjectId);
    expect(submission.status).toBe('new');
    expect(submission.branchId).toBe(branchId);
    expect(createEnrollmentMock).not.toHaveBeenCalled();
    expect(result.id).toBe(submissionId);
  });

  it('links a parent matched by parentContactPhone as the baby shell guardian', async () => {
    const parentId = '111e8400-0000-0000-0000-000000000111';
    setupSelectSequence([{ id: parentId }]); // in-branch active parent phone match
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baby_dedication', { payload: babyPayload });

    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('child');
    expect(shell.guardianMemberId).toBe(parentId);

    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.formType).toBe('baby_dedication');
    // Matched guardian surfaced on payload for the triage drawer.
    expect((submission.payload as Record<string, unknown>).matchedGuardianMemberId).toBe(parentId);
  });

  it('uses an explicit body.subjectMemberId (a parent) as the guardian', async () => {
    const parentId = '111e8400-0000-0000-0000-000000000111';
    setupSelectSequence([{ id: parentId, branchId }]); // explicit parent lookup in branch
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baby_naming', {
      subjectMemberId: parentId,
      payload: babyPayload,
    });

    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.guardianMemberId).toBe(parentId);
    // The baby (not the parent) remains the submission subject.
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
  });

  it('rejects a cross-branch explicit parent with Forbidden (no insert)', async () => {
    const parentId = '111e8400-0000-0000-0000-000000000111';
    setupSelectSequence([{ id: parentId, branchId: otherBranchId }]);
    setupInsert([{ id: subjectId }], [{ id: submissionId }]); // should never be hit
    const { submitForm } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'baby_naming', {
        subjectMemberId: parentId,
        payload: babyPayload,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(insertValuesArgs.length).toBe(0);
  });

  it('forces branchId to auth.branchId, ignoring a client-sent branchId', async () => {
    setupSelectSequence([]); // no parent match
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baby_dedication', {
      branchId: otherBranchId,
      payload: babyPayload,
    });
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(shell.homeBranchId).toBe(branchId);
    expect(submission.branchId).toBe(branchId);
  });

  it('splitFullName: a single-token babyFullName fills BOTH firstName and lastName', async () => {
    setupSelectSequence([]); // no parent match
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baby_naming', {
      payload: { ...babyPayload, babyFullName: 'Grace' },
    });
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.firstName).toBe('Grace');
    expect(shell.lastName).toBe('Grace');
  });

  it('splitFullName: a >100-char last-name portion is clamped to 100 chars on the minted shell', async () => {
    setupSelectSequence([]); // no parent match
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const longLast = 'a'.repeat(150);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baby_naming', {
      payload: { ...babyPayload, babyFullName: `Baby ${longLast}` },
    });
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.firstName).toBe('Baby');
    expect(String(shell.lastName).length).toBe(100);
    expect(shell.lastName).toBe('a'.repeat(100));
  });
});

// ── firstTimeVisitorPayloadSchema validation ──────────────
//
// The under-16/guardian/children branching is enforced in superRefine,
// reusing evaluateCondition. These cases exercise each branch of the schema
// directly (parse), independent of the submit/db plumbing.
describe('firstTimeVisitorPayloadSchema', () => {
  const over16Base = {
    firstName: 'Tunde',
    lastName: 'Bakare',
    dateOfBirth: '1990-01-01',
    isUnder16: 'No' as const,
    email: 'tunde@example.com',
    phone: '07123456789',
  };

  const under16ByFlag = {
    firstName: 'Ada',
    lastName: 'Okoro',
    dateOfBirth: '2014-01-01',
    isUnder16: 'Yes' as const,
    guardianName: 'Mary Okoro',
    guardianPhone: '07999000111',
    guardianRelationship: 'Mother',
  };

  it('accepts a valid over-16 payload (email + phone present)', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse(over16Base);
    expect(r.success).toBe(true);
  });

  it('rejects an over-16 payload missing email', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...over16Base, email: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'email');
      expect(issue?.message).toBe('Email is required');
    }
  });

  it('rejects an over-16 payload missing phone', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...over16Base, phone: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'phone');
      expect(issue?.message).toBe('Phone is required');
    }
  });

  it('accepts a valid under-16 payload (isUnder16=Yes) with guardian fields and no email/phone', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse(under16ByFlag);
    expect(r.success).toBe(true);
  });

  it('treats under-16 by DOB (age < 16) the same as the flag', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    // No isUnder16 flag; DOB implies age < 16 relative to 2026. Guardian required.
    const r = firstTimeVisitorPayloadSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Okoro',
      dateOfBirth: '2015-06-01',
      guardianName: 'Mary Okoro',
      guardianPhone: '07999000111',
      guardianRelationship: 'Mother',
    });
    expect(r.success).toBe(true);
  });

  it('a DOB-derived under-16 still requires guardian fields even when email/phone are absent', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Okoro',
      dateOfBirth: '2015-06-01',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.errors.map((e) => e.path.join('.'));
      expect(paths).toContain('guardianName');
      expect(paths).toContain('guardianPhone');
      expect(paths).toContain('guardianRelationship');
      // Email/phone are NOT demanded for under-16
      expect(paths).not.toContain('email');
      expect(paths).not.toContain('phone');
    }
  });

  it('rejects an under-16 payload missing guardianName', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...under16ByFlag, guardianName: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'guardianName');
      expect(issue?.message).toBe('Guardian name is required for visitors under 16');
    }
  });

  it('rejects an under-16 payload missing guardianPhone', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...under16ByFlag, guardianPhone: '   ' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'guardianPhone');
      expect(issue?.message).toBe('Guardian phone is required for visitors under 16');
    }
  });

  it('rejects an under-16 payload missing guardianRelationship', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({
      ...under16ByFlag,
      guardianRelationship: undefined,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'guardianRelationship');
      expect(issue?.message).toBe('Guardian relationship is required for visitors under 16');
    }
  });

  it('rejects broughtChildren=true with an empty children array', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({
      ...over16Base,
      broughtChildren: true,
      children: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.errors.find((e) => e.path.join('.') === 'children');
      expect(issue?.message).toBe('At least one child is required when you came with children');
    }
  });

  it('rejects broughtChildren=true with children omitted', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...over16Base, broughtChildren: true });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.errors.map((e) => e.path.join('.'));
      expect(paths).toContain('children');
    }
  });

  it('accepts broughtChildren=true with a non-empty children array', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({
      ...over16Base,
      broughtChildren: true,
      children: [{ firstName: 'Kid', lastName: 'Bakare', dateOfBirth: '2020-01-01' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a child entry missing required sub-fields', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({
      ...over16Base,
      broughtChildren: true,
      children: [{ firstName: 'Kid' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid email format on an over-16 payload', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...over16Base, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid interest enum value', async () => {
    const { firstTimeVisitorPayloadSchema } = await import('./schemas');
    const r = firstTimeVisitorPayloadSchema.safeParse({ ...over16Base, interest: 'whatever' });
    expect(r.success).toBe(false);
  });
});

// ── submitForm: first_time_visitor ────────────────────────
//
// Mirrors the altar_call shell pattern but WITHOUT new-believer enrollment:
// status stays 'new', linkedEntityType is 'member', and child shells are
// minted with guardianMemberId pointing at the subject.
describe('submitForm — first_time_visitor', () => {
  const over16Payload = {
    firstName: 'Tunde',
    lastName: 'Bakare',
    dateOfBirth: '1990-01-01',
    isUnder16: 'No' as const,
    email: 'tunde@example.com',
    phone: '07123456789',
  };

  const under16Payload = {
    firstName: 'Ada',
    lastName: 'Okoro',
    dateOfBirth: '2014-01-01',
    isUnder16: 'Yes' as const,
    guardianName: 'Mary Okoro',
    guardianPhone: '07999000111',
    guardianRelationship: 'Mother',
  };

  it('mints a visitor shell (memberType=visitor) for an over-16 with no match, status new', async () => {
    setupSelectSequence(
      [], // phone safety-net (in-branch) → no match
      [], // global phone-owner check → none
    );
    setupInsert(
      [{ id: subjectId }], // visitor shell
      [{ id: submissionId, status: 'new' }], // submission
    );
    const { submitForm } = await import('./service');
    const result = await submitForm(mockDb, memberAuth, 'first_time_visitor', {
      payload: over16Payload,
    });

    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('visitor');
    expect(shell.homeBranchId).toBe(branchId);
    expect(shell.email).toBe('tunde@example.com');
    expect(shell.phone).toBe('07123456789');
    expect(shell.isActive).toBe(true);
    expect(shell.guardianMemberId).toBeNull();

    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.formType).toBe('first_time_visitor');
    expect(submission.status).toBe('new');
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityType).toBe('member');
    expect(submission.linkedEntityId).toBe(subjectId);
    expect(submission.branchId).toBe(branchId);
    expect(submission.submittedBy).toBe(memberId);

    // No new-believer enrollment for first-time visitors.
    expect(createEnrollmentMock).not.toHaveBeenCalled();
    expect(result.id).toBe(submissionId);
  });

  it('mints a child shell (memberType=child) for an under-16 with no match', async () => {
    // Under-16 has no phone, so the safety-net lookups are skipped entirely.
    setupInsert(
      [{ id: subjectId }], // child shell
      [{ id: submissionId, status: 'new' }], // submission
    );
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', { payload: under16Payload });

    const shell = insertValuesArgs[0] as Record<string, unknown>;
    expect(shell.memberType).toBe('child');
    expect(shell.firstName).toBe('Ada');
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });

  it('links to an in-branch active member by phone instead of minting a shell', async () => {
    setupSelectSequence(
      [{ id: subjectId }], // phone match found in branch
    );
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', { payload: over16Payload });

    // Only the submission is inserted — no shell minted.
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
    expect(submission.linkedEntityId).toBe(subjectId);
    expect(submission.status).toBe('new');
  });

  it('mints a child shell per children[] entry, each linked via guardianMemberId', async () => {
    const child1 = '880e8400-0000-0000-0000-000000000008';
    const child2 = '990e8400-0000-0000-0000-000000000009';
    setupSelectSequence([], []); // no phone match, no global owner
    setupInsert(
      [{ id: subjectId }], // subject (visitor) shell
      [{ id: child1 }], // child 1
      [{ id: child2 }], // child 2
      [{ id: submissionId, status: 'new' }], // submission
    );
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', {
      payload: {
        ...over16Payload,
        broughtChildren: true,
        children: [
          { firstName: 'Kid', lastName: 'Bakare', dateOfBirth: '2020-01-01' },
          { firstName: 'Tot', lastName: 'Bakare', dateOfBirth: '2022-01-01' },
        ],
      },
    });

    // [0] subject, [1] child1, [2] child2, [3] submission
    expect(insertValuesArgs.length).toBe(4);

    const c1 = insertValuesArgs[1] as Record<string, unknown>;
    const c2 = insertValuesArgs[2] as Record<string, unknown>;
    expect(c1.memberType).toBe('child');
    expect(c1.guardianMemberId).toBe(subjectId);
    expect(c1.firstName).toBe('Kid');
    expect(c2.memberType).toBe('child');
    expect(c2.guardianMemberId).toBe(subjectId);
    expect(c2.firstName).toBe('Tot');

    // Minted child ids are persisted onto the submission payload.
    const submission = insertValuesArgs[3] as Record<string, unknown>;
    const payload = submission.payload as Record<string, unknown>;
    expect(payload.childMemberIds).toEqual([child1, child2]);
    expect(submission.status).toBe('new');
  });

  it('does not mint child shells when broughtChildren is false', async () => {
    setupSelectSequence([], []);
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', {
      payload: { ...over16Payload, broughtChildren: false },
    });
    // subject + submission only
    expect(insertValuesArgs.length).toBe(2);
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect((submission.payload as Record<string, unknown>).childMemberIds).toEqual([]);
  });

  it('links an explicit in-branch subjectMemberId without minting', async () => {
    setupSelectSequence([{ id: subjectId, branchId }]); // subject lookup in branch
    setupInsert([{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', {
      subjectMemberId: subjectId,
      payload: over16Payload,
    });
    expect(insertValuesArgs.length).toBe(1);
    const submission = insertValuesArgs[0] as Record<string, unknown>;
    expect(submission.subjectMemberId).toBe(subjectId);
  });

  it('rejects a cross-branch explicit subjectMemberId with Forbidden', async () => {
    setupSelectSequence([{ id: subjectId, branchId: otherBranchId }]);
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'first_time_visitor', {
        subjectMemberId: subjectId,
        payload: over16Payload,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(insertValuesArgs.length).toBe(0);
  });

  it('rejects an unknown explicit subjectMemberId with NotFound', async () => {
    setupSelectSequence([]);
    const { submitForm } = await import('./service');
    const { NotFoundError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'first_time_visitor', {
        subjectMemberId: subjectId,
        payload: over16Payload,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects when the phone belongs to an active member in another branch (Conflict, no shell)', async () => {
    setupSelectSequence(
      [], // in-branch phone safety-net → none
      [{ id: 'other-branch-member' }], // global phone-owner → exists elsewhere
    );
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ConflictError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'first_time_visitor', { payload: over16Payload })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(insertValuesArgs.length).toBe(0);
  });

  it('forces branchId to auth.branchId, ignoring a client-sent branchId', async () => {
    setupSelectSequence([], []);
    setupInsert([{ id: subjectId }], [{ id: submissionId, status: 'new' }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'first_time_visitor', {
      branchId: otherBranchId,
      payload: over16Payload,
    });
    const shell = insertValuesArgs[0] as Record<string, unknown>;
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(shell.homeBranchId).toBe(branchId);
    expect(submission.branchId).toBe(branchId);
  });

  it('propagates a ValidationError for an invalid payload (over-16 missing phone)', async () => {
    setupInsert([{ id: submissionId }]); // arm + reset insert tracking; should never be hit
    const { submitForm } = await import('./service');
    const { ValidationError } = await import('@kairos/utils');
    await expect(
      submitForm(mockDb, memberAuth, 'first_time_visitor', {
        payload: { ...over16Payload, phone: undefined },
      })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(insertValuesArgs.length).toBe(0);
  });
});

// ── listSubmissions ───────────────────────────────────────
describe('listSubmissions', () => {
  it('returns rows for a leader scoped to their branch', async () => {
    setupSelectSequence([{ id: submissionId, branchId, formType: 'testimony' }]);
    const { listSubmissions } = await import('./service');
    const rows = await listSubmissions(mockDb, leaderAuth, {});
    expect(rows.length).toBe(1);
  });

  it('returns an empty list to a plain member (visible-form set is empty)', async () => {
    // No dept memberships → visible set is [] → endpoint returns [] (does not throw).
    setupSelectSequence(...visNone());
    const { listSubmissions } = await import('./service');
    const rows = await listSubmissions(mockDb, memberAuth, {});
    expect(rows).toEqual([]);
  });

  it('forbids a leader requesting another branch', async () => {
    const { listSubmissions } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      listSubmissions(mockDb, leaderAuth, { branchId: otherBranchId })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('admin may filter by formType/status/date and a foreign branch', async () => {
    setupSelectSequence([]);
    const { listSubmissions } = await import('./service');
    const rows = await listSubmissions(mockDb, adminAuth, {
      branchId: otherBranchId,
      formType: 'baptism',
      status: 'new',
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(rows.length).toBe(0);
  });
});

// ── getSubmission ─────────────────────────────────────────
describe('getSubmission', () => {
  it('returns a submission for an Admin-dept leader', async () => {
    // 1: select row, 2-?: dept-check ladder (positive on first → short-circuit)
    setupSelectSequence([{ id: submissionId, branchId, formType: 'altar_call' }], ...visAdminDeptLeader());
    const { getSubmission } = await import('./service');
    const row = await getSubmission(mockDb, leaderAuth, submissionId);
    expect(row.id).toBe(submissionId);
  });

  it('forbids a plain member with no dept membership', async () => {
    setupSelectSequence([{ id: submissionId, branchId, formType: 'altar_call' }], ...visNone());
    const { getSubmission } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(getSubmission(mockDb, memberAuth, submissionId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('forbids an Admin-dept member trying to read a testimony (out-of-set form type)', async () => {
    // Admin-dept member sees FRONT_DESK forms only — testimony is restricted to pastor+admin+admin-lead.
    setupSelectSequence([{ id: submissionId, branchId, formType: 'testimony' }], ...visInAdminDept());
    const { getSubmission } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(getSubmission(mockDb, memberAuth, submissionId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws NotFound when missing', async () => {
    setupSelectSequence([]);
    const { getSubmission } = await import('./service');
    const { NotFoundError } = await import('@kairos/utils');
    await expect(getSubmission(mockDb, leaderAuth, submissionId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('forbids cross-branch read for a leader', async () => {
    setupSelectSequence([{ id: submissionId, branchId: otherBranchId }]);
    const { getSubmission } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(getSubmission(mockDb, leaderAuth, submissionId)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ── updateSubmission ──────────────────────────────────────
describe('updateSubmission', () => {
  it('updates status + notes for an Admin-dept leader in branch', async () => {
    setupSelectSequence(
      [{ id: submissionId, branchId, formType: 'altar_call' }],
      ...visAdminDeptLeader(),
    );
    setupUpdate([{ id: submissionId, status: 'reviewed', notes: 'ok' }]);
    const { updateSubmission } = await import('./service');
    const row = await updateSubmission(mockDb, leaderAuth, submissionId, { status: 'reviewed', notes: 'ok' });
    expect(row.status).toBe('reviewed');
    const setArg = updateSetArgs[0] as Record<string, unknown>;
    expect(setArg.status).toBe('reviewed');
    expect(setArg.notes).toBe('ok');
  });

  it('forbids cross-branch update', async () => {
    setupSelectSequence([{ id: submissionId, branchId: otherBranchId }]);
    const { updateSubmission } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      updateSubmission(mockDb, leaderAuth, submissionId, { status: 'reviewed' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ── exportSubmissionsToCSV ────────────────────────────────
describe('exportSubmissionsToCSV', () => {
  it('projects testimony payload columns into the CSV', async () => {
    setupSelectSequence([
      {
        id: submissionId,
        formType: 'testimony',
        status: 'new',
        createdAt: new Date('2026-05-22T00:00:00Z'),
        payload: testimonyPayload,
      },
    ]);
    const { exportSubmissionsToCSV } = await import('./service');
    const csv = await exportSubmissionsToCSV(mockDb, leaderAuth, { formType: 'testimony' });
    expect(csv).toContain('category');
    expect(csv).toContain('Health/Healing');
    expect(csv).toContain('details');
  });

  it('redacts name + phone for an anonymous testimony', async () => {
    setupSelectSequence([
      {
        id: submissionId,
        formType: 'testimony',
        status: 'new',
        createdAt: new Date('2026-05-22T00:00:00Z'),
        payload: { ...testimonyPayload, shareAnonymously: true },
      },
    ]);
    const { exportSubmissionsToCSV } = await import('./service');
    const csv = await exportSubmissionsToCSV(mockDb, leaderAuth, { formType: 'testimony' });
    // Identity columns redacted, testimony content preserved
    expect(csv).not.toContain('Jane');
    expect(csv).not.toContain('Doe');
    expect(csv).not.toContain('07123456789');
    expect(csv).toContain('(anonymous)');
    expect(csv).toContain('Health/Healing');
  });

  it('forbids a plain member from exporting (testimony out of their visible set)', async () => {
    setupSelectSequence(...visNone());
    const { exportSubmissionsToCSV } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      exportSubmissionsToCSV(mockDb, memberAuth, { formType: 'testimony' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('forbids an Admin-dept member exporting testimony (out of FRONT_DESK set)', async () => {
    setupSelectSequence(...visInAdminDept());
    const { exportSubmissionsToCSV } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      exportSubmissionsToCSV(mockDb, memberAuth, { formType: 'testimony' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('forbids a leader exporting another branch', async () => {
    const { exportSubmissionsToCSV } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      exportSubmissionsToCSV(mockDb, leaderAuth, { formType: 'testimony', branchId: otherBranchId })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ── member search ─────────────────────────────────────────
describe('searchMembers', () => {
  it('returns capped active member/prospect rows in the branch', async () => {
    setupSelectSequence([
      { id: subjectId, firstName: 'Jane', lastName: 'Doe', phone: '07123', memberType: 'prospect' },
    ]);
    const { searchMembers } = await import('./service');
    const rows = await searchMembers(mockDb, memberAuth, { q: 'Jane' });
    expect(rows.length).toBe(1);
    expect(rows[0]!.memberType).toBe('prospect');
  });

  it('forbids a member searching another branch', async () => {
    const { searchMembers } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      searchMembers(mockDb, memberAuth, { q: 'Jane', branchId: otherBranchId })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ── dormant prospects ─────────────────────────────────────
describe('listDormantProspects', () => {
  it('returns dormant prospects with enrollment flag for an Admin-dept leader', async () => {
    // canSeeProspects calls isAdminDeptLeader once; then the main query.
    setupSelectSequence(
      POSITIVE, // isAdminDeptLeader → positive
      [
        {
          id: subjectId,
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '07123',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          enrollmentCount: 0,
        },
      ],
    );
    const { listDormantProspects } = await import('./service');
    const rows = await listDormantProspects(mockDb, leaderAuth, {});
    expect(rows.length).toBe(1);
    expect(rows[0]!.hasEnrollment).toBe(false);
  });

  it('forbids a plain member (not the Admin-dept leader)', async () => {
    setupSelectSequence(EMPTY); // isAdminDeptLeader → negative
    const { listDormantProspects } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(listDormantProspects(mockDb, memberAuth, {})).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('forbids an Admin-dept member who is NOT the leader', async () => {
    setupSelectSequence(EMPTY); // isAdminDeptLeader returns nothing — even Admin-dept membership isn't enough
    const { listDormantProspects } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(listDormantProspects(mockDb, memberAuth, {})).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('archiveProspects', () => {
  it('soft-deletes prospect members in the branch and returns the count', async () => {
    // assertion select: all ids are prospects in branch
    setupSelectSequence([
      { id: subjectId, memberType: 'prospect', homeBranchId: branchId },
    ]);
    setupUpdate([{ id: subjectId }]);
    const { archiveProspects } = await import('./service');
    const result = await archiveProspects(mockDb, leaderAuth, { memberIds: [subjectId] });
    expect(result.archived).toBe(1);
    const setArg = updateSetArgs[0] as Record<string, unknown>;
    expect(setArg.isActive).toBe(false);
  });

  it('refuses to archive a non-prospect member', async () => {
    setupSelectSequence([
      { id: subjectId, memberType: 'member', homeBranchId: branchId },
    ]);
    const { archiveProspects } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      archiveProspects(mockDb, leaderAuth, { memberIds: [subjectId] })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses to archive a cross-branch member', async () => {
    setupSelectSequence([
      { id: subjectId, memberType: 'prospect', homeBranchId: otherBranchId },
    ]);
    const { archiveProspects } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(
      archiveProspects(mockDb, leaderAuth, { memberIds: [subjectId] })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws NotFound when a memberId does not exist', async () => {
    setupSelectSequence([]);
    const { archiveProspects } = await import('./service');
    const { NotFoundError } = await import('@kairos/utils');
    await expect(
      archiveProspects(mockDb, leaderAuth, { memberIds: [subjectId] })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── Consent envelope persisted on every submission (Phase 2) ──
describe('Phase 2 consent persistence', () => {
  it('persists consentGivenAt, consentBy, consentPolicyVersion on altar_call submission', async () => {
    setupSelectSequence([], []);
    setupInsert(
      [{ id: subjectId }],
      [{ id: submissionId, status: 'converted' }],
    );
    setupUpdate();
    createEnrollmentMock.mockResolvedValue({ id: enrollmentId });

    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'altar_call', {
      payload: altarCallPayload,
      consentGivenAt: '2026-06-09T11:22:33Z',
      consentPolicyVersion: '2026-06-v1',
    });

    // The submission insert is the 2nd insert (shell mint is 1st).
    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.consentBy).toBe(memberId);
    expect(submission.consentPolicyVersion).toBe('2026-06-v1');
    expect(submission.consentGivenAt).toBeInstanceOf(Date);
    expect((submission.consentGivenAt as Date).toISOString()).toBe('2026-06-09T11:22:33.000Z');
  });

  it('persists consent on a baptism submission too', async () => {
    setupSelectSequence([], []);
    setupInsert([{ id: subjectId }], [{ id: submissionId }]);

    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', {
      payload: { firstName: 'A', lastName: 'B', phone: '07123' },
      consentGivenAt: '2026-06-09T10:00:00Z',
      consentPolicyVersion: '2026-06-v1',
    });

    const submission = insertValuesArgs[1] as Record<string, unknown>;
    expect(submission.consentBy).toBe(memberId);
    expect(submission.consentPolicyVersion).toBe('2026-06-v1');
  });
});

// ── Schema-level consent enforcement (Phase 2) ───────────
describe('Phase 2 schema enforces consent', () => {
  it('submitFormSchema rejects bodies without consentGivenAt', async () => {
    const { submitFormSchema } = await import('./schemas');
    const result = submitFormSchema.safeParse({
      payload: { firstName: 'A', lastName: 'B', phone: '07' },
      consentPolicyVersion: '2026-06-v1',
    });
    expect(result.success).toBe(false);
  });

  it('submitFormSchema rejects bodies without consentPolicyVersion', async () => {
    const { submitFormSchema } = await import('./schemas');
    const result = submitFormSchema.safeParse({
      payload: { firstName: 'A', lastName: 'B', phone: '07' },
      consentGivenAt: '2026-06-09T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('submitFormSchema accepts a body with both consent fields', async () => {
    const { submitFormSchema } = await import('./schemas');
    const result = submitFormSchema.safeParse({
      payload: { firstName: 'A', lastName: 'B', phone: '07' },
      consentGivenAt: '2026-06-09T10:00:00Z',
      consentPolicyVersion: '2026-06-v1',
    });
    expect(result.success).toBe(true);
  });
});

// ── getMyFormsCapabilities (Phase 1) ──────────────────────
describe('getMyFormsCapabilities', () => {
  it('admin sees all form types + prospects', async () => {
    const { getMyFormsCapabilities } = await import('./service');
    const result = await getMyFormsCapabilities(mockDb, adminAuth);
    expect(result.visibleFormTypes.length).toBe(6);
    expect(result.canSeeProspects).toBe(true);
  });
  it('Admin-dept leader sees all form types + prospects (branch-superuser)', async () => {
    // getVisibleFormTypes runs the ladder; then canSeeProspects runs isAdminDeptLeader again.
    setupSelectSequence(POSITIVE, POSITIVE);
    const { getMyFormsCapabilities } = await import('./service');
    const result = await getMyFormsCapabilities(mockDb, leaderAuth);
    expect(result.visibleFormTypes.length).toBe(6);
    expect(result.canSeeProspects).toBe(true);
  });

  it('Admin-dept member (non-leader) sees FRONT_DESK forms only, no prospects', async () => {
    // visibility ladder: isAdminDeptLeader → no, isInAdminDepartment → yes
    // prospects ladder: isAdminDeptLeader → no
    setupSelectSequence(EMPTY, POSITIVE, EMPTY);
    const { getMyFormsCapabilities } = await import('./service');
    const result = await getMyFormsCapabilities(mockDb, memberAuth);
    expect(result.visibleFormTypes).toEqual(['altar_call', 'first_time_visitor', 'baptism']);
    expect(result.canSeeProspects).toBe(false);
  });

  it('NB-dept leader sees FRONT_DESK forms only, no prospects', async () => {
    setupSelectSequence(EMPTY, EMPTY, POSITIVE, EMPTY);
    const { getMyFormsCapabilities } = await import('./service');
    const result = await getMyFormsCapabilities(mockDb, memberAuth);
    expect(result.visibleFormTypes).toEqual(['altar_call', 'first_time_visitor', 'baptism']);
    expect(result.canSeeProspects).toBe(false);
  });

  it('a regular member with no dept memberships sees nothing', async () => {
    setupSelectSequence(EMPTY, EMPTY, EMPTY, EMPTY);
    const { getMyFormsCapabilities } = await import('./service');
    const result = await getMyFormsCapabilities(mockDb, memberAuth);
    expect(result.visibleFormTypes).toEqual([]);
    expect(result.canSeeProspects).toBe(false);
  });
});
