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

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelect(result: unknown) {
  selectResults = [result];
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert(result: unknown) {
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

function setupUpdate(result: unknown = undefined) {
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => createChain(result));
}

// ── Mock email sender (fire-and-forget) ───────────────────
vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    sendJoinRequestReceivedEmail: vi.fn(() => Promise.resolve()),
    sendJoinRequestApprovedEmail: vi.fn(() => Promise.resolve()),
    sendJoinRequestRejectedEmail: vi.fn(() => Promise.resolve()),
    sendInterviewScheduledEmail: vi.fn(() => Promise.resolve()),
    sendOfferExtendedEmail: vi.fn(() => Promise.resolve()),
    sendProbationStartedEmail: vi.fn(() => Promise.resolve()),
    sendProbationPassedEmail: vi.fn(() => Promise.resolve()),
  };
});

// ── Fixtures ──────────────────────────────────────────────

const branchId = '220e8400-0000-0000-0000-000000000002';
const branchDeptId = '440e8400-0000-0000-0000-000000000004';
const memberId = '330e8400-0000-0000-0000-000000000003';
const departmentId = '550e8400-0000-0000-0000-000000000005';
const requestId = '660e8400-0000-0000-0000-000000000006';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const otherAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };

const sampleBranchDept = {
  id: branchDeptId,
  branchId,
  branchName: 'London Central',
  departmentId,
  departmentName: 'Choir',
  iconKey: 'music',
  leadMemberId: leaderAuth.memberId,
  leadFirstName: 'Lara',
  leadLastName: 'Lead',
  leadPhotoUrl: null,
  deputyMemberId: null,
  description: 'The choir',
  startDate: '2024-01-01',
  endDate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleJoinRequest = {
  id: requestId,
  branchDepartmentId: branchDeptId,
  memberId: memberAuth.memberId,
  status: 'applied' as const,
  notes: 'I would like to join',
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  interviewScheduledAt: null as Date | null,
  interviewFormat: null as string | null,
  interviewLocation: null as string | null,
  interviewerOneId: null as string | null,
  interviewerTwoId: null as string | null,
  interviewOutcome: 'pending' as string,
  interviewNotes: null as string | null,
  offeredAt: null as Date | null,
  offerExpiresAt: null as Date | null,
  offerMessage: null as string | null,
  offerRespondedAt: null as Date | null,
  offerResponse: null as string | null,
  probationDays: null as number | null,
  probationStartDate: null as string | null,
  probationEndDate: null as string | null,
  probationOutcome: 'pending' as string,
  probationNotes: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

import {
  listGlobalDepartments,
  createGlobalDepartment,
  updateGlobalDepartment,
  listBranchDepartments,
  getBranchDepartment,
  createBranchDepartment,
  updateBranchDepartment,
  deactivateBranchDepartment,
  listDepartmentMembers,
  addDepartmentMember,
  removeDepartmentMember,
  createJoinRequest,
  listJoinRequests,
  scheduleJoinRequestInterview,
  recordJoinRequestInterview,
  extendJoinRequestOffer,
  respondToJoinRequestOffer,
  withdrawJoinRequest,
  rejectJoinRequest,
  evaluateJoinRequestProbation,
  listMyDepartments,
} from './service';

// ── Global catalogue ──────────────────────────────────────

describe('listGlobalDepartments', () => {
  it('returns active global departments', async () => {
    setupSelect([{ id: departmentId, departmentName: 'Choir' }]);
    const result = await listGlobalDepartments(mockDb);
    expect(result).toHaveLength(1);
  });
});

describe('createGlobalDepartment', () => {
  it('creates a new global department for admin', async () => {
    setupSelect([]); // name uniqueness check — empty
    setupInsert([{ id: departmentId, departmentName: 'Drama' }]);
    const result = await createGlobalDepartment(mockDb, adminAuth, { departmentName: 'Drama' });
    expect(result.id).toBe(departmentId);
  });

  it('throws ForbiddenError for non-admin', async () => {
    await expect(
      createGlobalDepartment(mockDb, pastorAuth, { departmentName: 'Drama' }),
    ).rejects.toThrow('Only admins can create global departments');
  });

  it('throws ConflictError if name exists', async () => {
    setupSelect([{ id: departmentId }]);
    await expect(
      createGlobalDepartment(mockDb, adminAuth, { departmentName: 'Choir' }),
    ).rejects.toThrow('Department with this name already exists');
  });
});

describe('updateGlobalDepartment', () => {
  it('updates for admin', async () => {
    setupUpdate([{ id: departmentId, departmentName: 'Updated' }]);
    const result = await updateGlobalDepartment(mockDb, adminAuth, departmentId, {
      departmentName: 'Updated',
    });
    expect(result.departmentName).toBe('Updated');
  });

  it('throws ForbiddenError for non-admin', async () => {
    await expect(
      updateGlobalDepartment(mockDb, pastorAuth, departmentId, {}),
    ).rejects.toThrow('Only admins can update global departments');
  });

  it('throws NotFoundError if not found', async () => {
    setupUpdate([]);
    await expect(
      updateGlobalDepartment(mockDb, adminAuth, departmentId, {}),
    ).rejects.toThrow('Department not found');
  });
});

// ── listBranchDepartments ─────────────────────────────────

describe('listBranchDepartments', () => {
  it('returns paginated list for admin', async () => {
    setupSelectSequence([sampleBranchDept], [{ value: 1 }]);
    const result = await listBranchDepartments(mockDb, adminAuth, { page: 1, limit: 20 });
    expect(result.data).toEqual([sampleBranchDept]);
    expect(result.meta.total).toBe(1);
  });

  it('scopes to branch for regular members', async () => {
    setupSelectSequence([], [{ value: 0 }]);
    const result = await listBranchDepartments(mockDb, memberAuth, { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
  });

  it('scopes leaders to departments they lead or co-lead', async () => {
    setupSelectSequence([sampleBranchDept], [{ value: 1 }]);
    const result = await listBranchDepartments(mockDb, leaderAuth, { page: 1, limit: 20 });
    expect(result.data).toEqual([sampleBranchDept]);
  });

  it('returns empty list for a leader who leads no department (e.g. fellowship-only leader)', async () => {
    setupSelectSequence([], [{ value: 0 }]);
    const otherLeader = { memberId: 'other-leader', email: 'x@test.com', systemRole: 'leader' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [] };
    const result = await listBranchDepartments(mockDb, otherLeader, { page: 1, limit: 20 });
    expect(result.data).toEqual([]);
  });
});

// ── getBranchDepartment ───────────────────────────────────

describe('getBranchDepartment', () => {
  it('returns dept for admin', async () => {
    setupSelect([sampleBranchDept]);
    const result = await getBranchDepartment(mockDb, adminAuth, branchDeptId);
    expect(result.departmentName).toBe('Choir');
  });

  it('throws NotFoundError if not found', async () => {
    setupSelect([]);
    await expect(getBranchDepartment(mockDb, adminAuth, 'bad-id')).rejects.toThrow('Department not found');
  });

  it('throws ForbiddenError for member in different branch', async () => {
    setupSelect([sampleBranchDept]);
    await expect(getBranchDepartment(mockDb, otherAuth, branchDeptId)).rejects.toThrow(
      'This department belongs to a different branch',
    );
  });
});

// ── createBranchDepartment ────────────────────────────────

describe('createBranchDepartment', () => {
  const createData = {
    branchId,
    departmentId,
    leadMemberId: leaderAuth.memberId,
  };

  it('creates dept and auto-adds lead as member', async () => {
    // 1) branch, 2) global dept, 3) lead member, 4) one-active check
    setupSelectSequence(
      [{ id: branchId }],
      [{ id: departmentId }],
      [{ id: leaderAuth.memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [],
    );
    let insertCount = 0;
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      insertCount++;
      return createChain(insertCount === 1 ? [{ id: branchDeptId, ...createData }] : [{ id: 'dm-1' }]);
    });

    const result = await createBranchDepartment(mockDb, adminAuth, createData);
    expect(result.id).toBe(branchDeptId);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // branch_departments + lead auto-add
  });

  it('also adds deputy when provided', async () => {
    const withDeputy = { ...createData, deputyMemberId: '000-deputy' };
    // 1) branch, 2) global dept, 3) lead, 4) deputy, 5) one-active
    setupSelectSequence(
      [{ id: branchId }],
      [{ id: departmentId }],
      [{ id: leaderAuth.memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [{ id: '000-deputy', homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [],
    );
    let insertCount = 0;
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      insertCount++;
      return createChain(insertCount === 1 ? [{ id: branchDeptId, ...withDeputy }] : [{ id: 'dm' }]);
    });
    const result = await createBranchDepartment(mockDb, adminAuth, withDeputy);
    expect(result.id).toBe(branchDeptId);
    expect(mockDb.insert).toHaveBeenCalledTimes(3); // dept + lead + deputy
  });

  it('throws ForbiddenError for member', async () => {
    await expect(
      createBranchDepartment(mockDb, memberAuth, createData),
    ).rejects.toThrow('Only admins and pastors');
  });

  it('throws ValidationError if branch not found', async () => {
    setupSelect([]);
    await expect(
      createBranchDepartment(mockDb, adminAuth, createData),
    ).rejects.toThrow('Branch not found');
  });

  it('throws ValidationError if global dept not found', async () => {
    setupSelectSequence([{ id: branchId }], []);
    await expect(
      createBranchDepartment(mockDb, adminAuth, createData),
    ).rejects.toThrow('Department not found');
  });

  it('throws ValidationError if lead member not in same branch', async () => {
    setupSelectSequence(
      [{ id: branchId }],
      [{ id: departmentId }],
      [{ id: leaderAuth.memberId, homeBranchId: 'other-branch', secondaryBranchId: null, isAtSecondaryBranch: false }],
    );
    await expect(
      createBranchDepartment(mockDb, adminAuth, createData),
    ).rejects.toThrow('Lead member must belong to the same branch');
  });

  it('throws ValidationError when deputy equals lead', async () => {
    setupSelectSequence(
      [{ id: branchId }],
      [{ id: departmentId }],
      [{ id: leaderAuth.memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
    );
    await expect(
      createBranchDepartment(mockDb, adminAuth, { ...createData, deputyMemberId: leaderAuth.memberId }),
    ).rejects.toThrow('Deputy must be different from lead');
  });

  it('throws ConflictError if dept already active in branch', async () => {
    setupSelectSequence(
      [{ id: branchId }],
      [{ id: departmentId }],
      [{ id: leaderAuth.memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [{ id: 'existing' }],
    );
    await expect(
      createBranchDepartment(mockDb, adminAuth, createData),
    ).rejects.toThrow('already has an active instance');
  });
});

// ── updateBranchDepartment ────────────────────────────────

describe('updateBranchDepartment', () => {
  it('updates for admin', async () => {
    setupSelect([sampleBranchDept]);
    setupUpdate([{ ...sampleBranchDept, description: 'Updated' }]);
    const result = await updateBranchDepartment(mockDb, adminAuth, branchDeptId, {
      description: 'Updated',
    });
    expect(result.description).toBe('Updated');
  });

  it('allows lead to update non-leadership fields', async () => {
    setupSelect([sampleBranchDept]);
    setupUpdate([{ ...sampleBranchDept, description: 'Lead-edited' }]);
    const result = await updateBranchDepartment(mockDb, leaderAuth, branchDeptId, {
      description: 'Lead-edited',
    });
    expect(result.description).toBe('Lead-edited');
  });

  it('throws ForbiddenError when lead tries to change leadership', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      updateBranchDepartment(mockDb, leaderAuth, branchDeptId, { leadMemberId: '000-other' }),
    ).rejects.toThrow('Only admins and pastors can change department leadership');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      updateBranchDepartment(mockDb, memberAuth, branchDeptId, { description: 'x' }),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── deactivateBranchDepartment ────────────────────────────

describe('deactivateBranchDepartment', () => {
  it('soft-deletes dept and cascades members', async () => {
    setupSelect([sampleBranchDept]);
    let updateCount = 0;
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      updateCount++;
      return createChain(updateCount === 2 ? [{ ...sampleBranchDept, isActive: false }] : undefined);
    });
    const result = await deactivateBranchDepartment(mockDb, adminAuth, branchDeptId);
    expect(result.isActive).toBe(false);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  it('throws ForbiddenError for regular member', async () => {
    await expect(
      deactivateBranchDepartment(mockDb, memberAuth, branchDeptId),
    ).rejects.toThrow('Only admins and pastors');
  });
});

// ── listDepartmentMembers ─────────────────────────────────

describe('listDepartmentMembers', () => {
  it('returns full PII (email + phone) for admin', async () => {
    const memberRows = [{ id: 'dm-1', memberFirstName: 'Jane', memberLastName: 'Doe', memberEmail: 'jane@test.com', memberPhone: '555-0100' }];
    setupSelectSequence([sampleBranchDept], memberRows);
    const result = await listDepartmentMembers(mockDb, adminAuth, branchDeptId);
    expect(result).toEqual(memberRows);
  });

  it('returns full PII for the department lead', async () => {
    const memberRows = [{ id: 'dm-1', memberFirstName: 'Jane', memberLastName: 'Doe', memberEmail: 'jane@test.com', memberPhone: '555-0100' }];
    setupSelectSequence([sampleBranchDept], memberRows);
    const result = await listDepartmentMembers(mockDb, leaderAuth, branchDeptId);
    expect(result).toEqual(memberRows);
  });

  it('redacts email + phone for peer members (active but not lead)', async () => {
    const memberRows = [{ id: 'dm-1', memberFirstName: 'Jane', memberLastName: 'Doe', memberEmail: 'jane@test.com', memberPhone: '555-0100' }];
    // 1) getBranchDepartment, 2) check active membership, 3) roster query
    setupSelectSequence([sampleBranchDept], [{ id: 'dm-1' }], memberRows);
    const result = await listDepartmentMembers(mockDb, memberAuth, branchDeptId);
    expect(result).toEqual([
      { id: 'dm-1', memberFirstName: 'Jane', memberLastName: 'Doe', memberEmail: null, memberPhone: null, nbStage: null },
    ]);
  });

  it('returns empty for non-member', async () => {
    setupSelectSequence([sampleBranchDept], []);
    const result = await listDepartmentMembers(mockDb, memberAuth, branchDeptId);
    expect(result).toEqual([]);
  });
});

// ── addDepartmentMember ───────────────────────────────────

describe('addDepartmentMember', () => {
  it('adds member to dept', async () => {
    // 1) getBranchDepartment, 2) member lookup, 3) duplicate check, 4) cap count, 5) prior membership check
    setupSelectSequence(
      [sampleBranchDept],
      [{ id: memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [],
      [{ value: 0 }],
      [],
    );
    setupInsert([{ id: 'dm-new', branchDepartmentId: branchDeptId, memberId }]);
    const result = await addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId });
    expect(result.memberId).toBe(memberId);
  });

  it('reactivates prior membership instead of inserting new', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [{ id: memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [],
      [{ value: 0 }],
      [{ id: 'prior-dm' }],
    );
    setupUpdate([{ id: 'prior-dm', isActive: true }]);
    const result = await addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId });
    expect(result.id).toBe('prior-dm');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      addDepartmentMember(mockDb, memberAuth, branchDeptId, { memberId }),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError if member not found', async () => {
    setupSelectSequence([sampleBranchDept], []);
    await expect(
      addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId: 'bad' }),
    ).rejects.toThrow('Member not found');
  });

  it('throws ValidationError if different branch', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [{ id: memberId, homeBranchId: 'other-branch', secondaryBranchId: null, isAtSecondaryBranch: false }],
    );
    await expect(
      addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId }),
    ).rejects.toThrow('same branch');
  });

  it('throws ConflictError if already active member', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [{ id: memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [{ id: 'existing-dm' }],
    );
    await expect(
      addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId }),
    ).rejects.toThrow('already in this department');
  });

  it('throws ConflictError when at max-departments cap', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [{ id: memberId, homeBranchId: branchId, secondaryBranchId: null, isAtSecondaryBranch: false }],
      [],
      [{ value: 2 }],
    );
    await expect(
      addDepartmentMember(mockDb, adminAuth, branchDeptId, { memberId }),
    ).rejects.toThrow('already in 2 departments');
  });
});

// ── removeDepartmentMember ────────────────────────────────

describe('removeDepartmentMember', () => {
  it('soft-removes member', async () => {
    setupSelect([sampleBranchDept]);
    setupUpdate([{ id: 'dm-1', isActive: false }]);
    const result = await removeDepartmentMember(mockDb, adminAuth, branchDeptId, memberId);
    expect(result.isActive).toBe(false);
  });

  it('refuses to remove the lead', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      removeDepartmentMember(mockDb, adminAuth, branchDeptId, leaderAuth.memberId),
    ).rejects.toThrow('Cannot remove the department lead');
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      removeDepartmentMember(mockDb, memberAuth, branchDeptId, memberId),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError when no active membership', async () => {
    setupSelect([sampleBranchDept]);
    setupUpdate([]);
    await expect(
      removeDepartmentMember(mockDb, adminAuth, branchDeptId, memberId),
    ).rejects.toThrow('Department member not found');
  });
});

// ── createJoinRequest ─────────────────────────────────────

describe('createJoinRequest', () => {
  const sampleApplicant = {
    homeBranchId: branchId,
    secondaryBranchId: null,
    isAtSecondaryBranch: false,
  };

  it('creates a request for a member', async () => {
    // 1) getBranchDept, 2) applicant branch, 3) active check, 4) pending check, 5) cap count, 6) requester email
    setupSelectSequence(
      [sampleBranchDept],
      [sampleApplicant],
      [],
      [],
      [{ value: 0 }],
      [{ email: memberAuth.email, firstName: 'M' }],
    );
    setupInsert([sampleJoinRequest]);
    const result = await createJoinRequest(mockDb, memberAuth, branchDeptId, { notes: 'x' });
    expect(result).toEqual(sampleJoinRequest);
  });

  it('throws ForbiddenError when applicant is in a different branch', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [{ ...sampleApplicant, homeBranchId: 'other-branch' }],
    );
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('You can only join departments in your own branch');
  });

  it('throws ConflictError when already a member', async () => {
    setupSelectSequence([sampleBranchDept], [sampleApplicant], [{ id: 'existing-dm' }]);
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('You are already a member of this department');
  });

  it('throws ConflictError when pending request exists', async () => {
    setupSelectSequence([sampleBranchDept], [sampleApplicant], [], [sampleJoinRequest]);
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('open application');
  });

  it('throws ConflictError when at max-departments cap', async () => {
    setupSelectSequence([sampleBranchDept], [sampleApplicant], [], [], [{ value: 2 }]);
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('already in 2 departments');
  });
});

// ── listJoinRequests ──────────────────────────────────────

describe('listJoinRequests', () => {
  it('returns pending requests for lead', async () => {
    const requests = [{ ...sampleJoinRequest, memberFirstName: 'Jane' }];
    setupSelectSequence([sampleBranchDept], requests);
    const result = await listJoinRequests(mockDb, leaderAuth, branchDeptId);
    expect(result).toEqual(requests);
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      listJoinRequests(mockDb, memberAuth, branchDeptId),
    ).rejects.toThrow('Only department leads or above');
  });
});

// ── Recruitment state machine ─────────────────────────────

const interviewerOne = { id: 'int-1', isActive: true, isAtSecondaryBranch: false, homeBranchId: branchId, secondaryBranchId: null };

describe('scheduleJoinRequestInterview', () => {
  it('transitions applied → interview_scheduled and persists interviewer + format', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],          // loadJoinRequest expects 'applied' — sample is 'applied'
      [interviewerOne],             // interviewer 1 lookup
      [{ email: 'm@x', firstName: 'M' }], // requester email
    );
    setupUpdate([{ ...sampleJoinRequest, status: 'interview_scheduled' }]);
    const result = await scheduleJoinRequestInterview(mockDb, adminAuth, branchDeptId, requestId, {
      interviewScheduledAt: new Date().toISOString(),
      interviewFormat: 'in_person',
      interviewerOneId: 'int-1',
    });
    expect(result.status).toBe('interview_scheduled');
  });

  it('rejects when interviewers are not distinct', async () => {
    setupSelectSequence([sampleBranchDept], [sampleJoinRequest]);
    await expect(
      scheduleJoinRequestInterview(mockDb, adminAuth, branchDeptId, requestId, {
        interviewScheduledAt: new Date().toISOString(),
        interviewFormat: 'in_person',
        interviewerOneId: 'int-1',
        interviewerTwoId: 'int-1',
      }),
    ).rejects.toThrow('Interviewers must be distinct');
  });

  it('forbids non-leader', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      scheduleJoinRequestInterview(mockDb, memberAuth, branchDeptId, requestId, {
        interviewScheduledAt: new Date().toISOString(),
        interviewFormat: 'in_person',
        interviewerOneId: 'int-1',
      }),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('recordJoinRequestInterview', () => {
  it('transitions interview_scheduled → interviewed with outcome', async () => {
    const scheduled = { ...sampleJoinRequest, status: 'interview_scheduled' as const };
    setupSelectSequence([sampleBranchDept], [scheduled]);
    setupUpdate([{ ...scheduled, status: 'interviewed', interviewOutcome: 'pass' }]);
    const result = await recordJoinRequestInterview(mockDb, adminAuth, branchDeptId, requestId, {
      interviewOutcome: 'pass',
    });
    expect(result.status).toBe('interviewed');
    expect(result.interviewOutcome).toBe('pass');
  });

  it('rejects when source state is wrong', async () => {
    setupSelectSequence([sampleBranchDept], [sampleJoinRequest]); // sample is 'applied'
    await expect(
      recordJoinRequestInterview(mockDb, adminAuth, branchDeptId, requestId, {
        interviewOutcome: 'pass',
      }),
    ).rejects.toThrow();
  });
});

describe('extendJoinRequestOffer', () => {
  it('transitions interviewed (pass) → offered with branch default probation', async () => {
    const interviewed = { ...sampleJoinRequest, status: 'interviewed' as const, interviewOutcome: 'pass' };
    setupSelectSequence(
      [{ ...sampleBranchDept, probationDays: 30 }],
      [interviewed],
      [{ email: 'm@x', firstName: 'M' }],
    );
    setupUpdate([{ ...interviewed, status: 'offered', probationDays: 30 }]);
    const result = await extendJoinRequestOffer(mockDb, adminAuth, branchDeptId, requestId, {});
    expect(result.status).toBe('offered');
    expect(result.probationDays).toBe(30);
  });

  it('refuses to offer when interview outcome is not pass', async () => {
    const interviewed = { ...sampleJoinRequest, status: 'interviewed' as const, interviewOutcome: 'fail' };
    setupSelectSequence([sampleBranchDept], [interviewed]);
    await expect(
      extendJoinRequestOffer(mockDb, adminAuth, branchDeptId, requestId, {}),
    ).rejects.toThrow();
  });
});

describe('respondToJoinRequestOffer', () => {
  it('member accepts → probation status + dept_member insert', async () => {
    const offered = {
      ...sampleJoinRequest,
      status: 'offered' as const,
      offeredAt: new Date(),
      offerExpiresAt: null,
      probationDays: 28,
    };
    setupSelectSequence(
      [sampleBranchDept],
      [offered],
      [{ value: 0 }],            // cap re-check
      [],                        // existing dept_member lookup — none
      [{ email: 'm@x', firstName: 'M' }], // probation started email
    );
    setupUpdate([{ ...offered, status: 'probation' }]);
    setupInsert([{ id: 'dm-new' }]);
    const result = await respondToJoinRequestOffer(mockDb, memberAuth, branchDeptId, requestId, {
      offerResponse: 'accepted',
    });
    expect(result.status).toBe('probation');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('member declines → status rejected with offerResponse declined', async () => {
    const offered = { ...sampleJoinRequest, status: 'offered' as const, offerExpiresAt: null };
    setupSelectSequence([sampleBranchDept], [offered]);
    setupUpdate([{ ...offered, status: 'rejected', offerResponse: 'declined' }]);
    const result = await respondToJoinRequestOffer(mockDb, memberAuth, branchDeptId, requestId, {
      offerResponse: 'declined',
    });
    expect(result.status).toBe('rejected');
    expect(result.offerResponse).toBe('declined');
  });

  it('rejects when caller is not the requesting member', async () => {
    setupSelectSequence([sampleBranchDept], [{ ...sampleJoinRequest, status: 'offered' }]);
    await expect(
      respondToJoinRequestOffer(mockDb, otherAuth, branchDeptId, requestId, { offerResponse: 'accepted' }),
    ).rejects.toThrow();
  });
});

describe('withdrawJoinRequest', () => {
  it('member withdraws from applied state', async () => {
    setupSelectSequence([sampleBranchDept], [sampleJoinRequest]);
    setupUpdate([{ ...sampleJoinRequest, status: 'withdrawn' }]);
    const result = await withdrawJoinRequest(mockDb, memberAuth, branchDeptId, requestId);
    expect(result.status).toBe('withdrawn');
  });

  it('forbids other members from withdrawing on their behalf', async () => {
    setupSelectSequence([sampleBranchDept], [sampleJoinRequest]);
    await expect(
      withdrawJoinRequest(mockDb, otherAuth, branchDeptId, requestId),
    ).rejects.toThrow();
  });
});

describe('rejectJoinRequest', () => {
  it('lead rejects an applied request and emails requester', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],
      [{ email: 'm@x', firstName: 'M' }],
    );
    setupUpdate([{ ...sampleJoinRequest, status: 'rejected' }]);
    const result = await rejectJoinRequest(mockDb, adminAuth, branchDeptId, requestId, { reviewNotes: 'no fit' });
    expect(result.status).toBe('rejected');
  });

  it('forbids regular member from rejecting', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      rejectJoinRequest(mockDb, memberAuth, branchDeptId, requestId, {}),
    ).rejects.toThrow('Only department leads or above');
  });
});

describe('evaluateJoinRequestProbation', () => {
  it('passes probation → status active, dept_member promoted', async () => {
    const probation = { ...sampleJoinRequest, status: 'probation' as const };
    setupSelectSequence(
      [sampleBranchDept],
      [probation],
      [{ email: 'm@x', firstName: 'M' }],
    );
    let updCount = 0;
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      updCount++;
      return createChain(updCount === 1 ? [{ ...probation, status: 'active' }] : undefined);
    });
    const result = await evaluateJoinRequestProbation(mockDb, adminAuth, branchDeptId, requestId, {
      probationOutcome: 'passed',
    });
    expect(result.status).toBe('active');
    expect(updCount).toBe(2); // request status + dept_member promote
  });

  it('fails probation → status probation_failed, dept_member deactivated', async () => {
    const probation = { ...sampleJoinRequest, status: 'probation' as const };
    setupSelectSequence(
      [sampleBranchDept],
      [probation],
      [{ email: 'm@x', firstName: 'M' }],
    );
    let updCount = 0;
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      updCount++;
      return createChain(updCount === 1 ? [{ ...probation, status: 'probation_failed' }] : undefined);
    });
    const result = await evaluateJoinRequestProbation(mockDb, adminAuth, branchDeptId, requestId, {
      probationOutcome: 'failed',
    });
    expect(result.status).toBe('probation_failed');
    expect(updCount).toBe(2);
  });
});

// ── listMyDepartments ─────────────────────────────────────

describe('listMyDepartments', () => {
  it('returns active departments for the current member', async () => {
    const rows = [{ id: branchDeptId, departmentName: 'Choir' }];
    setupSelect(rows);
    const result = await listMyDepartments(mockDb, memberAuth);
    expect(result).toEqual(rows);
  });
});

// ── Phase 4: scope-aware leader writes ────────────────────
//
// A `leader` who technically leads multiple departments but logs in with
// scope=department:D1 should ONLY act on D1. Same pattern as fellowships.

describe('scope-aware leader writes', () => {
  const otherBranchDeptId = '110e8400-0000-0000-0000-000000000099';

  it('allows a department-scoped lead to add a member to their scoped department', async () => {
    const scopedLeadAuth = {
      ...leaderAuth,
      scope: { kind: 'department' as const, id: branchDeptId },
    };
    // getBranchDepartment, then member lookup, then duplicate check, then
    // active-count check, then prior-membership check, then insert.
    setupSelectSequence(
      [sampleBranchDept],
      [{
        id: memberAuth.memberId,
        homeBranchId: branchId,
        secondaryBranchId: null,
        isAtSecondaryBranch: false,
      }],
      [], // no duplicate active
      [{ value: 0 }], // active dept count
      [], // no prior membership
    );
    setupInsert([{ id: 'dm-1' }]);
    const result = await addDepartmentMember(mockDb, scopedLeadAuth, branchDeptId, {
      memberId: memberAuth.memberId,
    });
    expect(result).toBeDefined();
  });

  it('rejects a department-scoped lead writing to a DIFFERENT department they lead', async () => {
    const scopedLeadAuth = {
      ...leaderAuth,
      scope: { kind: 'department' as const, id: branchDeptId },
    };
    // The other dept lists the same person as lead — without scope they'd
    // pass; with scope they must be rejected.
    const otherBranchDept = { ...sampleBranchDept, id: otherBranchDeptId };
    setupSelect([otherBranchDept]);
    await expect(
      addDepartmentMember(mockDb, scopedLeadAuth, otherBranchDeptId, {
        memberId: memberAuth.memberId,
      }),
    ).rejects.toThrow(/outside your current department scope/);
  });

  it('admins ignore scope (system role overrides per-entity narrowing)', async () => {
    const scopedAdminAuth = {
      ...adminAuth,
      scope: { kind: 'department' as const, id: otherBranchDeptId },
    };
    setupSelectSequence(
      [sampleBranchDept],
      [{
        id: memberAuth.memberId,
        homeBranchId: branchId,
        secondaryBranchId: null,
        isAtSecondaryBranch: false,
      }],
      [],
      [{ value: 0 }],
      [],
    );
    setupInsert([{ id: 'dm-1' }]);
    const result = await addDepartmentMember(mockDb, scopedAdminAuth, branchDeptId, {
      memberId: memberAuth.memberId,
    });
    expect(result).toBeDefined();
  });
});
