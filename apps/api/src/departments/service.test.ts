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
  };
});

// ── Fixtures ──────────────────────────────────────────────

const branchId = '220e8400-0000-0000-0000-000000000002';
const branchDeptId = '440e8400-0000-0000-0000-000000000004';
const memberId = '330e8400-0000-0000-0000-000000000003';
const departmentId = '550e8400-0000-0000-0000-000000000005';
const requestId = '660e8400-0000-0000-0000-000000000006';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };
const otherAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch' };
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'leader' as const, branchId };

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
  status: 'pending' as const,
  notes: 'I would like to join',
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
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
  reviewJoinRequest,
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
      'You can only access departments in your branch',
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
  it('returns all members for admin', async () => {
    const memberRows = [{ id: 'dm-1', memberFirstName: 'Jane', memberLastName: 'Doe' }];
    setupSelectSequence([sampleBranchDept], memberRows);
    const result = await listDepartmentMembers(mockDb, adminAuth, branchDeptId);
    expect(result).toEqual(memberRows);
  });

  it('returns roster to active member', async () => {
    const memberRows = [{ id: 'dm-1' }];
    // 1) getBranchDepartment, 2) check active, 3) roster query
    setupSelectSequence([sampleBranchDept], [{ id: 'dm-1' }], memberRows);
    const result = await listDepartmentMembers(mockDb, memberAuth, branchDeptId);
    expect(result).toEqual(memberRows);
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
  it('creates a request for a member', async () => {
    // 1) getBranchDept, 2) active check, 3) pending check, 4) cap count, 5) requester email
    setupSelectSequence(
      [sampleBranchDept],
      [],
      [],
      [{ value: 0 }],
      [{ email: memberAuth.email, firstName: 'M' }],
    );
    setupInsert([sampleJoinRequest]);
    const result = await createJoinRequest(mockDb, memberAuth, branchDeptId, { notes: 'x' });
    expect(result).toEqual(sampleJoinRequest);
  });

  it('throws ConflictError when already a member', async () => {
    setupSelectSequence([sampleBranchDept], [{ id: 'existing-dm' }]);
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('You are already a member of this department');
  });

  it('throws ConflictError when pending request exists', async () => {
    setupSelectSequence([sampleBranchDept], [], [sampleJoinRequest]);
    await expect(
      createJoinRequest(mockDb, memberAuth, branchDeptId, {}),
    ).rejects.toThrow('pending join request');
  });

  it('throws ConflictError when at max-departments cap', async () => {
    setupSelectSequence([sampleBranchDept], [], [], [{ value: 2 }]);
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

// ── reviewJoinRequest ─────────────────────────────────────

describe('reviewJoinRequest', () => {
  it('approves and inserts new department member', async () => {
    // 1) getBranchDept, 2) pending request lookup, 3) cap count (approve path), 4) existing membership check, 5) reviewee email
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],
      [{ value: 0 }],
      [],
      [{ email: 'm@x', firstName: 'M' }],
    );
    setupUpdate([{ ...sampleJoinRequest, status: 'approved' }]);
    setupInsert([{ id: 'dm-new' }]);
    const result = await reviewJoinRequest(mockDb, adminAuth, branchDeptId, requestId, {
      status: 'approved',
    });
    expect(result.status).toBe('approved');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('approves and reactivates existing membership', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],
      [{ value: 0 }],
      [{ id: 'prior-dm' }],
      [{ email: 'm@x', firstName: 'M' }],
    );
    let updCount = 0;
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      updCount++;
      return createChain(updCount === 1 ? [{ ...sampleJoinRequest, status: 'approved' }] : undefined);
    });
    const result = await reviewJoinRequest(mockDb, adminAuth, branchDeptId, requestId, {
      status: 'approved',
    });
    expect(result.status).toBe('approved');
    expect(updCount).toBe(2); // request status + reactivate membership
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('rejects without modifying membership', async () => {
    // 1) getBranchDept, 2) pending lookup, 3) reviewee email (no cap/existing checks on reject)
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],
      [{ email: 'm@x', firstName: 'M' }],
    );
    setupUpdate([{ ...sampleJoinRequest, status: 'rejected' }]);
    const result = await reviewJoinRequest(mockDb, adminAuth, branchDeptId, requestId, {
      status: 'rejected',
      reviewNotes: 'no thanks',
    });
    expect(result.status).toBe('rejected');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError for regular member', async () => {
    setupSelect([sampleBranchDept]);
    await expect(
      reviewJoinRequest(mockDb, memberAuth, branchDeptId, requestId, { status: 'approved' }),
    ).rejects.toThrow('Only department leads or above');
  });

  it('throws NotFoundError if request missing or not pending', async () => {
    setupSelectSequence([sampleBranchDept], []);
    await expect(
      reviewJoinRequest(mockDb, adminAuth, branchDeptId, requestId, { status: 'approved' }),
    ).rejects.toThrow('Join request not found or already reviewed');
  });

  it('refuses to approve when target member at cap', async () => {
    setupSelectSequence(
      [sampleBranchDept],
      [sampleJoinRequest],
      [{ value: 2 }],
    );
    await expect(
      reviewJoinRequest(mockDb, adminAuth, branchDeptId, requestId, { status: 'approved' }),
    ).rejects.toThrow('Member is already in 2 departments');
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
