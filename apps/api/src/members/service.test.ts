import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'returning',
    'update', 'set',
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

// ── Fixtures ──────────────────────────────────────────────

const branchId = '220e8400-0000-0000-0000-000000000002';
const memberId = '330e8400-0000-0000-0000-000000000003';
const roleId = '550e8400-0000-0000-0000-000000000005';
const roleAssignmentId = '660e8400-0000-0000-0000-000000000006';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId };
const pastorAuth = { memberId: '000-pastor', email: 'pastor@test.com', systemRole: 'pastor' as const, branchId };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId };
const otherAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch' };

const sampleMember = {
  id: memberId, firstName: 'John', lastName: 'Doe', email: 'john@test.com',
  phone: '123456', homeBranchId: branchId, branchName: 'Lagos Branch',
  gender: 'Male', membershipDate: '2024-01-01', approvalStatus: 'approved',
  systemRole: 'member', isActive: true, createdAt: new Date(),
};

const sampleMemberFull = {
  ...sampleMember, middleName: null, dateOfBirth: null,
  address: null, city: null, postalCode: null,
  photoUrl: null, emergencyContactName: null, emergencyContactPhone: null,
  emailVerified: true, updatedAt: new Date(),
};

const sampleRoleAssignment = {
  id: roleAssignmentId, roleId, roleName: 'Usher', branchId,
  branchName: 'Lagos Branch', assignedDate: '2024-01-01', endDate: null,
  isActive: true, notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ── Import ────────────────────────────────────────────────

import {
  listMembers,
  getMember,
  getMyProfile,
  updateMember,
  approveMember,
  assignRole,
  removeRole,
  getMemberRoles,
  deactivateMember,
} from './service';

// ── listMembers ───────────────────────────────────────────

describe('listMembers', () => {
  it('returns paginated members for admin', async () => {
    // listMembers uses Promise.all with two selects
    setupSelectSequence(
      [sampleMember, sampleMember], // rows
      [{ count: 2 }],               // total count
    );
    const result = await listMembers(mockDb, adminAuth, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it('filters by branch for non-admin', async () => {
    setupSelectSequence([sampleMember], [{ count: 1 }]);
    const result = await listMembers(mockDb, memberAuth, { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
  });
});

// ── getMember ─────────────────────────────────────────────

describe('getMember', () => {
  it('returns member for admin', async () => {
    setupSelect([sampleMemberFull]);
    const result = await getMember(mockDb, memberId, adminAuth);
    expect(result.firstName).toBe('John');
  });

  it('returns own profile for member', async () => {
    setupSelect([sampleMemberFull]);
    const result = await getMember(mockDb, memberId, memberAuth);
    expect(result.email).toBe('john@test.com');
  });

  it('rejects access to other member profile', async () => {
    await expect(getMember(mockDb, memberId, otherAuth)).rejects.toThrow('You can only access your own profile');
  });

  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(getMember(mockDb, memberId, adminAuth)).rejects.toThrow('Member not found');
  });
});

// ── getMyProfile ──────────────────────────────────────────

describe('getMyProfile', () => {
  it('returns own profile', async () => {
    setupSelect([sampleMemberFull]);
    const result = await getMyProfile(mockDb, memberAuth);
    expect(result.firstName).toBe('John');
  });
});

// ── updateMember ──────────────────────────────────────────

describe('updateMember', () => {
  it('updates member for admin', async () => {
    setupSelect([{ id: memberId }]);
    setupUpdate([{ ...sampleMemberFull, firstName: 'Jane' }]);
    const result = await updateMember(mockDb, memberId, { firstName: 'Jane' }, adminAuth);
    expect(result).toBeDefined();
  });

  it('allows self-update', async () => {
    setupSelect([{ id: memberId }]);
    setupUpdate([{ ...sampleMemberFull, phone: '999' }]);
    const result = await updateMember(mockDb, memberId, { phone: '999' }, memberAuth);
    expect(result).toBeDefined();
  });

  it('rejects update from other member', async () => {
    await expect(updateMember(mockDb, memberId, { phone: '999' }, otherAuth))
      .rejects.toThrow('You can only access your own profile');
  });

  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(updateMember(mockDb, memberId, { phone: '999' }, adminAuth))
      .rejects.toThrow('Member not found');
  });
});

// ── approveMember ─────────────────────────────────────────

describe('approveMember', () => {
  it('approves pending member', async () => {
    setupSelect([{ id: memberId, approvalStatus: 'pending' }]);
    setupUpdate([{ ...sampleMemberFull, approvalStatus: 'approved' }]);
    const result = await approveMember(mockDb, memberId, true, adminAuth);
    expect(result).toBeDefined();
  });

  it('rejects member', async () => {
    setupSelect([{ id: memberId, approvalStatus: 'pending' }]);
    setupUpdate([{ ...sampleMemberFull, approvalStatus: 'rejected' }]);
    const result = await approveMember(mockDb, memberId, false, pastorAuth);
    expect(result).toBeDefined();
  });

  it('rejects non-admin/pastor', async () => {
    await expect(approveMember(mockDb, memberId, true, memberAuth))
      .rejects.toThrow('Only admins and pastors can approve members');
  });

  it('rejects already approved member', async () => {
    setupSelect([{ id: memberId, approvalStatus: 'approved' }]);
    await expect(approveMember(mockDb, memberId, true, adminAuth))
      .rejects.toThrow('Member is not pending approval');
  });

  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(approveMember(mockDb, memberId, true, adminAuth))
      .rejects.toThrow('Member not found');
  });
});

// ── assignRole ────────────────────────────────────────────

describe('assignRole', () => {
  it('assigns role successfully', async () => {
    // member check, role check, branch check, duplicate check
    setupSelectSequence(
      [{ id: memberId }],
      [{ id: roleId }],
      [{ id: branchId }],
      [],
    );
    setupInsert([{ id: roleAssignmentId, memberId, roleId, branchId, isActive: true }]);
    const result = await assignRole(mockDb, memberId, { roleId, branchId }, adminAuth);
    expect(result).toBeDefined();
  });

  it('rejects non-admin', async () => {
    await expect(assignRole(mockDb, memberId, { roleId, branchId }, memberAuth))
      .rejects.toThrow('Only admins can assign roles');
  });

  it('rejects missing member', async () => {
    setupSelectSequence([]);
    await expect(assignRole(mockDb, memberId, { roleId, branchId }, adminAuth))
      .rejects.toThrow('Member not found');
  });

  it('rejects missing role', async () => {
    setupSelectSequence([{ id: memberId }], []);
    await expect(assignRole(mockDb, memberId, { roleId, branchId }, adminAuth))
      .rejects.toThrow('Role not found or inactive');
  });

  it('rejects missing branch', async () => {
    setupSelectSequence([{ id: memberId }], [{ id: roleId }], []);
    await expect(assignRole(mockDb, memberId, { roleId, branchId }, adminAuth))
      .rejects.toThrow('Branch not found or inactive');
  });

  it('rejects duplicate active role', async () => {
    setupSelectSequence(
      [{ id: memberId }],
      [{ id: roleId }],
      [{ id: branchId }],
      [{ id: 'existing-id' }],
    );
    await expect(assignRole(mockDb, memberId, { roleId, branchId }, adminAuth))
      .rejects.toThrow('Member already has this role in this branch');
  });
});

// ── removeRole ────────────────────────────────────────────

describe('removeRole', () => {
  it('removes role successfully', async () => {
    setupSelect([{ id: roleAssignmentId, memberId }]);
    setupUpdate([{ id: roleAssignmentId, isActive: false }]);
    const result = await removeRole(mockDb, memberId, roleAssignmentId, adminAuth);
    expect(result).toBeDefined();
  });

  it('rejects non-admin', async () => {
    await expect(removeRole(mockDb, memberId, roleAssignmentId, memberAuth))
      .rejects.toThrow('Only admins can remove roles');
  });

  it('throws NotFoundError for missing assignment', async () => {
    setupSelect([]);
    await expect(removeRole(mockDb, memberId, roleAssignmentId, adminAuth))
      .rejects.toThrow('Role assignment not found');
  });
});

// ── getMemberRoles ────────────────────────────────────────

describe('getMemberRoles', () => {
  it('returns roles for admin', async () => {
    setupSelect([sampleRoleAssignment, sampleRoleAssignment]);
    const result = await getMemberRoles(mockDb, memberId, adminAuth);
    expect(result).toHaveLength(2);
  });

  it('returns own roles for member', async () => {
    setupSelect([sampleRoleAssignment]);
    const result = await getMemberRoles(mockDb, memberId, memberAuth);
    expect(result).toHaveLength(1);
  });

  it('rejects access to other member roles', async () => {
    await expect(getMemberRoles(mockDb, memberId, otherAuth))
      .rejects.toThrow('You can only access your own profile');
  });
});

// ── deactivateMember ──────────────────────────────────────

describe('deactivateMember', () => {
  it('deactivates member and cascades role deactivation', async () => {
    setupSelect([{ id: memberId }]);
    setupUpdate([{ ...sampleMemberFull, isActive: false }]);
    const result = await deactivateMember(mockDb, memberId, adminAuth);
    expect(result).toBeDefined();
    expect(mockDb.update).toHaveBeenCalledTimes(2); // roles + member
  });

  it('rejects non-admin', async () => {
    await expect(deactivateMember(mockDb, memberId, memberAuth))
      .rejects.toThrow('Only admins can deactivate members');
  });

  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(deactivateMember(mockDb, memberId, adminAuth))
      .rejects.toThrow('Member not found');
  });
});
