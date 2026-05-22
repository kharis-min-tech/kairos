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

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };

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
    setupInsert([{ id: submissionId }]);
    const { submitForm } = await import('./service');
    await submitForm(mockDb, memberAuth, 'baptism', {
      branchId: otherBranchId,
      payload: { firstName: 'A', lastName: 'B', phone: '07000' },
    });
    const submission = insertValuesArgs[0] as Record<string, unknown>;
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

// ── listSubmissions ───────────────────────────────────────
describe('listSubmissions', () => {
  it('returns rows for a leader scoped to their branch', async () => {
    setupSelectSequence([{ id: submissionId, branchId, formType: 'testimony' }]);
    const { listSubmissions } = await import('./service');
    const rows = await listSubmissions(mockDb, leaderAuth, {});
    expect(rows.length).toBe(1);
  });

  it('forbids a plain member from listing', async () => {
    const { listSubmissions } = await import('./service');
    const { ForbiddenError } = await import('@kairos/utils');
    await expect(listSubmissions(mockDb, memberAuth, {})).rejects.toBeInstanceOf(ForbiddenError);
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
  it('returns a submission in the caller branch', async () => {
    setupSelectSequence([{ id: submissionId, branchId }]);
    const { getSubmission } = await import('./service');
    const row = await getSubmission(mockDb, leaderAuth, submissionId);
    expect(row.id).toBe(submissionId);
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
  it('updates status + notes for a leader in branch', async () => {
    setupSelectSequence([{ id: submissionId, branchId }]);
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

  it('forbids a plain member from exporting', async () => {
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
  it('returns dormant prospects with enrollment flag for a leader', async () => {
    setupSelectSequence([
      {
        id: subjectId,
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '07123',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        enrollmentCount: 0,
      },
    ]);
    const { listDormantProspects } = await import('./service');
    const rows = await listDormantProspects(mockDb, leaderAuth, {});
    expect(rows.length).toBe(1);
    expect(rows[0]!.hasEnrollment).toBe(false);
  });

  it('forbids a plain member', async () => {
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
