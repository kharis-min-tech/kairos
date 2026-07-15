import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthSecrets } from '../lib/auth-secrets';

const TEST_SECRETS: AuthSecrets = {
  accessSecret: 'dev-secret-change-me',
  refreshSecret: 'dev-refresh-secret-change-me',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
};

// ── Flexible Drizzle mock builder ─────────────────────────
function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'offset',
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
const secondaryBranchId = '220e8400-0000-0000-0000-000000000099';
const memberId = '330e8400-0000-0000-0000-000000000003';
const roleId = '550e8400-0000-0000-0000-000000000005';
const roleAssignmentId = '660e8400-0000-0000-0000-000000000006';

const adminAuth = { memberId: '000-admin', email: 'admin@test.com', systemRole: 'admin' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const memberAuth = { memberId, email: 'member@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const otherAuth = { memberId: '000-other', email: 'other@test.com', systemRole: 'member' as const, branchId: 'other-branch', branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

const sampleMember = {
  id: memberId, firstName: 'John', lastName: 'Doe', email: 'john@test.com',
  phone: '123456', homeBranchId: branchId, branchName: 'Lagos Branch',
  gender: 'Male', membershipDate: '2024-01-01', approvalStatus: 'approved',
  systemRole: 'member', isActive: true, createdAt: new Date(),
};

const sampleMemberFull = {
  ...sampleMember, middleName: null, dateOfBirth: null,
  address: null, city: null, postalCode: null,
  secondaryBranchId: null, secondaryAddress: null, secondaryCity: null, secondaryPostalCode: null,
  isAtSecondaryBranch: false, photoUrl: null, emergencyContactName: null, emergencyContactPhone: null,
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
  createMember,
  reactivateMember,
  importMembers,
  exportMembersCsv,
  listRoles,
  switchActiveBranch,
  getHealthRecord,
  upsertHealthRecord,
  listUnguardedMinors,
  setMembershipClassCompleted,
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

  it('rejects access to a member in another branch', async () => {
    // otherAuth is a plain member in 'other-branch'; the target lives in branchId.
    setupSelect([sampleMemberFull]);
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

  it('forces isAtSecondaryBranch to false when secondaryBranchId is cleared', async () => {
    setupSelect([{ id: memberId }]);
    setupUpdate([{ ...sampleMemberFull, secondaryBranchId: null, isAtSecondaryBranch: false }]);
    const result = await updateMember(mockDb, memberId, { secondaryBranchId: null }, adminAuth);
    expect(result).toBeDefined();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('converts pg 22001 (value too long) to ValidationError', async () => {
    setupSelect([{ id: memberId }]);
    const pgErr = Object.assign(new Error('value too long'), { code: '22001' });
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const methods = ['set', 'where', 'returning'];
      for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
      chain['then'] = (_: unknown, reject: (e: unknown) => void) => reject(pgErr);
      return chain;
    });
    await expect(updateMember(mockDb, memberId, { photoUrl: 'x'.repeat(300) }, adminAuth))
      .rejects.toThrow('One or more values are too long');
  });

  it('converts pg 23505 (unique violation) to ValidationError', async () => {
    setupSelect([{ id: memberId }]);
    const pgErr = Object.assign(new Error('duplicate key value'), { code: '23505' });
    (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const methods = ['set', 'where', 'returning'];
      for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
      chain['then'] = (_: unknown, reject: (e: unknown) => void) => reject(pgErr);
      return chain;
    });
    await expect(updateMember(mockDb, memberId, { phone: '123' }, adminAuth))
      .rejects.toThrow('A member with this phone number or email already exists');
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

  it('refuses cross-branch assignment from a branch-scoped admin', async () => {
    const otherBranchId = '550e8400-0000-0000-0000-0000000000ff';
    const scopedAuth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      assignRole(mockDb, memberId, { roleId, branchId: otherBranchId }, scopedAuth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('allows in-scope assignment for a branch-scoped admin', async () => {
    const scopedAuth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    setupSelectSequence(
      [{ id: memberId }],
      [{ id: roleId }],
      [{ id: branchId }],
      [],
    );
    setupInsert([{ id: roleAssignmentId, memberId, roleId, branchId, isActive: true }]);
    const result = await assignRole(mockDb, memberId, { roleId, branchId }, scopedAuth);
    expect(result).toBeDefined();
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

  it('refuses cross-branch revoke from a branch-scoped admin', async () => {
    const otherBranchId = '550e8400-0000-0000-0000-0000000000ff';
    // Assignment is owned by another branch; the scoped admin is locked to
    // branchId. Scope check must fire after the membership lookup so the
    // service knows which branch the assignment belongs to.
    setupSelect([{ id: roleAssignmentId, memberId, branchId: otherBranchId }]);
    const scopedAuth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    await expect(
      removeRole(mockDb, memberId, roleAssignmentId, scopedAuth),
    ).rejects.toThrow(/outside your current branch scope/);
  });

  it('allows in-scope revoke for a branch-scoped admin', async () => {
    setupSelect([{ id: roleAssignmentId, memberId, branchId }]);
    setupUpdate([{ id: roleAssignmentId, isActive: false }]);
    const scopedAuth = { ...adminAuth, scope: { kind: 'branch' as const, id: branchId } };
    const result = await removeRole(mockDb, memberId, roleAssignmentId, scopedAuth);
    expect(result).toBeDefined();
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
      .rejects.toThrow('Only branch-tier admins can deactivate members');
  });
  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(deactivateMember(mockDb, memberId, adminAuth))
      .rejects.toThrow('Member not found');
  });
});

// ── listRoles ─────────────────────────────────────────────

describe('listRoles', () => {
  it('returns all active roles', async () => {
    const roles = [
      { id: roleId, roleName: 'Usher', description: 'Ushering team' },
      { id: 'role-2', roleName: 'Deacon', description: 'Deacon role' },
    ];
    setupSelect(roles);
    const result = await listRoles(mockDb);
    expect(result).toEqual(roles);
    expect(mockDb.select).toHaveBeenCalled();
  });
});

// ── createMember ──────────────────────────────────────────

describe('createMember', () => {
  const createInput = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@test.com',
    homeBranchId: branchId,
    phone: '999888',
  };

  const createdMember = {
    ...sampleMemberFull,
    id: 'new-member-id',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@test.com',
    phone: '999888',
    approvalStatus: 'approved',
    emailVerified: true,
  };

  it('creates a member with generated password for admin', async () => {
    // 1) email check → empty, 2) phone check → empty
    setupSelectSequence([], []);
    setupInsert([createdMember]);
    const result = await createMember(mockDb, createInput, adminAuth);
    expect(result.member).toEqual(createdMember);
    expect(result.generatedPassword).toBeDefined();
    expect(typeof result.generatedPassword).toBe('string');
  });
  it('creates a member with secondary branch fields', async () => {
    setupSelectSequence([], []);
    const createdWithSecondary = {
      ...createdMember,
      secondaryBranchId,
      secondaryAddress: '10 Side St',
      secondaryCity: 'Manchester',
      secondaryPostalCode: 'M1 1AA',
    };
    setupInsert([createdWithSecondary]);
    const result = await createMember(mockDb, { ...createInput, secondaryBranchId, secondaryAddress: '10 Side St', secondaryCity: 'Manchester', secondaryPostalCode: 'M1 1AA' }, adminAuth);
    expect(result.member.secondaryBranchId).toBe(secondaryBranchId);
    expect(result.member.secondaryAddress).toBe('10 Side St');
    expect(result.member.secondaryCity).toBe('Manchester');
    expect(result.member.secondaryPostalCode).toBe('M1 1AA');
  });

  it('throws ForbiddenError for regular member', async () => {
    await expect(createMember(mockDb, createInput, memberAuth))
      .rejects.toThrow('Only admins and pastors can create members');
  });

  it('throws ConflictError for duplicate email', async () => {
    // email check → found
    setupSelect([{ id: 'existing-id' }]);
    await expect(createMember(mockDb, createInput, adminAuth))
      .rejects.toThrow('A member with this email already exists');
  });

  it('throws ConflictError for duplicate phone', async () => {
    // 1) email check → empty, 2) phone check → found
    setupSelectSequence([], [{ id: 'existing-id' }]);
    await expect(createMember(mockDb, createInput, adminAuth))
      .rejects.toThrow('A member with this phone number already exists');
  });
});

// ── reactivateMember ──────────────────────────────────────

describe('reactivateMember', () => {
  it('reactivates an inactive member', async () => {
    setupSelect([{ id: memberId, isActive: false }]);
    const reactivated = { ...sampleMemberFull, isActive: true, approvalStatus: 'approved' };
    setupUpdate([reactivated]);
    const result = await reactivateMember(mockDb, memberId, adminAuth);
    expect(result).toEqual(reactivated);
  });

  it('throws ForbiddenError for non-admin', async () => {
    await expect(reactivateMember(mockDb, memberId, memberAuth))
      .rejects.toThrow('Only branch-tier admins can reactivate members');
  });
  it('throws NotFoundError for missing member', async () => {
    setupSelect([]);
    await expect(reactivateMember(mockDb, memberId, adminAuth))
      .rejects.toThrow('Member not found');
  });

  it('throws ConflictError if member is already active', async () => {
    setupSelect([{ id: memberId, isActive: true }]);
    await expect(reactivateMember(mockDb, memberId, adminAuth))
      .rejects.toThrow('Member is already active');
  });
});

// ── setMembershipClassCompleted (Task #33 P1) ─────────────

describe('setMembershipClassCompleted', () => {
  const completedAt = new Date('2026-06-01T00:00:00.000Z');
  const memberRow = {
    id: memberId,
    firstName: 'John',
    lastName: 'Doe',
    homeBranchId: branchId,
    previousCompletedAt: null,
    branchName: 'Lagos Branch',
  };

  it('stamps the timestamp for an admin and dispatches lifecycle.member_confirmed', async () => {
    setupSelect([memberRow]);
    const updated = { ...sampleMemberFull, membershipClassCompletedAt: completedAt };
    setupUpdate([updated]);
    const result = await setMembershipClassCompleted(mockDb, memberId, completedAt, adminAuth);
    expect(result).toEqual(updated);
    // Initial lookup + dispatch fan-out (branch authority + recipients + preferences).
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
  });

  it('does not dispatch when the timestamp is being re-set (idempotent)', async () => {
    setupSelect([{ ...memberRow, previousCompletedAt: new Date('2025-01-01T00:00:00.000Z') }]);
    const updated = { ...sampleMemberFull, membershipClassCompletedAt: completedAt };
    setupUpdate([updated]);
    await setMembershipClassCompleted(mockDb, memberId, completedAt, adminAuth);
    // Only the initial lookup — no dispatch fan-out.
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('clears the timestamp when given null and does not dispatch', async () => {
    setupSelect([memberRow]);
    const updated = { ...sampleMemberFull, membershipClassCompletedAt: null };
    setupUpdate([updated]);
    const result = await setMembershipClassCompleted(mockDb, memberId, null, adminAuth);
    expect(result).toEqual(updated);
    expect(result?.membershipClassCompletedAt).toBeNull();
    expect((mockDb.select as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('throws ForbiddenError for a plain member', async () => {
    await expect(setMembershipClassCompleted(mockDb, memberId, completedAt, memberAuth))
      .rejects.toThrow('Only branch-tier admins can certify membership');
  });

  it('throws NotFoundError when the member is missing', async () => {
    setupSelect([]);
    await expect(setMembershipClassCompleted(mockDb, memberId, completedAt, adminAuth))
      .rejects.toThrow('Member not found');
  });

  it('narrows the lookup to the caller branch for non-admins', async () => {
    // Simulate cross-branch grant: caller has branch:write but the lookup
    // filters by homeBranchId === auth.branchId, so the member is not visible.
    const branchAdmin = {
      ...memberAuth,
      branchId: 'other-branch',
      grants: [
        {
          role: 'BranchAdmin' as const,
          scope: { kind: 'branch' as const, id: 'other-branch' },
          branchId: 'other-branch',
        },
      ],
    };
    setupSelect([]); // narrowed lookup returns nothing
    await expect(setMembershipClassCompleted(mockDb, memberId, completedAt, branchAdmin))
      .rejects.toThrow('Member not found');
  });
});

// ── importMembers ─────────────────────────────────────────

describe('importMembers', () => {
  it('imports valid CSV rows', async () => {
    const csv = `firstName,lastName,email\nJane,Doe,jane@test.com\nBob,Lee,bob@test.com`;
    // Each createMember call: email check → empty, insert → created
    // No phone provided so no phone check
    setupSelect([]);
    setupInsert([{ id: 'new-1' }]);
    const result = await importMembers(mockDb, csv, adminAuth);
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for rows missing required fields', async () => {
    const csv = `firstName,lastName,email\n,Doe,jane@test.com\nBob,Lee,bob@test.com`;
    // First row missing firstName → error, second row succeeds
    setupSelect([]);
    setupInsert([{ id: 'new-1' }]);
    const result = await importMembers(mockDb, csv, adminAuth);
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Row 2');
  });

  it('throws ValidationError for CSV with only header', async () => {
    const csv = `firstName,lastName,email`;
    await expect(importMembers(mockDb, csv, adminAuth))
      .rejects.toThrow('CSV must have a header row and at least one data row');
  });

  it('catches createMember errors per row and continues', async () => {
    const csv = `firstName,lastName,email\nJane,Doe,existing@test.com\nBob,Lee,bob@test.com`;
    // First row: email check → conflict, second row: email check → empty + insert
    let emailCallCount = 0;
    (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      emailCallCount++;
      // First call (email check for row 1) returns existing, rest return empty
      return createChain(emailCallCount === 1 ? [{ id: 'dup' }] : []);
    });
    setupInsert([{ id: 'new-1' }]);
    const result = await importMembers(mockDb, csv, adminAuth);
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('email already exists');
  });
});

// ── exportMembersCsv ──────────────────────────────────────

describe('exportMembersCsv', () => {
  it('exports CSV with headers and member rows for admin', async () => {
    const row = {
      firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '123456',
      gender: 'Male', dateOfBirth: null, address: null, city: 'Lagos',
      branchName: 'Lagos Branch', membershipDate: '2024-01-01',
      emergencyContactName: null, emergencyContactPhone: null,
      emergencyContactRelationship: null, systemRole: 'member', approvalStatus: 'approved',
    };
    setupSelect([row]);
    const csv = await exportMembersCsv(mockDb, adminAuth);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('firstName,lastName,email,phone,gender,dateOfBirth,address,city,branchName,membershipDate,emergencyContactName,emergencyContactPhone,emergencyContactRelationship,systemRole,approvalStatus');
    expect(lines[1]).toContain('John');
    expect(lines[1]).toContain('Doe');
    expect(lines).toHaveLength(2);
  });

  it('escapes CSV values containing commas', async () => {
    const row = {
      firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '123456',
      gender: 'Male', dateOfBirth: null, address: '123, Main Street', city: 'Lagos',
      branchName: 'Lagos Branch', membershipDate: '2024-01-01',
      emergencyContactName: null, emergencyContactPhone: null,
      emergencyContactRelationship: null, systemRole: 'member', approvalStatus: 'approved',
    };
    setupSelect([row]);
    const csv = await exportMembersCsv(mockDb, adminAuth);
    expect(csv).toContain('"123, Main Street"');
  });

  it('returns only headers when no members found', async () => {
    setupSelect([]);
    const csv = await exportMembersCsv(mockDb, adminAuth);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('firstName');
  });
});

// ── switchActiveBranch ────────────────────────────────────

describe('switchActiveBranch', () => {
  const sampleMemberForSwitch = {
    id: memberId,
    homeBranchId: branchId,
    secondaryBranchId,
    isAtSecondaryBranch: false,
    systemRole: 'member',
    email: 'member@test.com',
    activeRole: 'member',
  };

  it('toggles from home to secondary, returns secondaryBranchId as activeBranchId', async () => {
    setupSelect([sampleMemberForSwitch]);
    setupUpdate([]);
    const result = await switchActiveBranch(mockDb, memberAuth, memberId, TEST_SECRETS);
    expect(result.isAtSecondaryBranch).toBe(true);
    expect(result.activeBranchId).toBe(secondaryBranchId);
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('toggles from secondary to home, returns homeBranchId as activeBranchId', async () => {
    setupSelect([{ ...sampleMemberForSwitch, isAtSecondaryBranch: true }]);
    setupUpdate([]);
    const result = await switchActiveBranch(mockDb, memberAuth, memberId, TEST_SECRETS);
    expect(result.isAtSecondaryBranch).toBe(false);
    expect(result.activeBranchId).toBe(branchId);
  });

  it('throws ForbiddenError when switching another member\'s branch', async () => {
    await expect(switchActiveBranch(mockDb, otherAuth, memberId, TEST_SECRETS))
      .rejects.toThrow('You can only switch your own active branch');
  });

  it('throws ValidationError when member has no secondaryBranchId', async () => {
    setupSelect([{ ...sampleMemberForSwitch, secondaryBranchId: null }]);
    await expect(switchActiveBranch(mockDb, memberAuth, memberId, TEST_SECRETS))
      .rejects.toThrow('No secondary branch assigned');
  });

  it('throws NotFoundError when member does not exist', async () => {
    setupSelect([]);
    await expect(switchActiveBranch(mockDb, memberAuth, memberId, TEST_SECRETS))
      .rejects.toThrow('Member not found');
  });
});

// ── Minor data protection ─────────────────────────────────

const otherBranchId = '220e8400-0000-0000-0000-000000000077';
const guardianId = '440e8400-0000-0000-0000-000000000004';

// A minor member living in `branchId`, with `guardianId` as their guardian.
const minorMember = {
  ...sampleMemberFull,
  id: 'minor-1',
  firstName: 'Tiny',
  lastName: 'Tot',
  dateOfBirth: '2016-01-01',
  email: 'kid@test.com',
  phone: '555000',
  address: '1 Kid St',
  city: 'Lagos',
  postalCode: 'LG1',
  emergencyContactName: 'Mum',
  emergencyContactPhone: '555111',
  emergencyContactRelationship: 'Parent',
  homeBranchId: branchId,
  branchName: 'Lagos Branch',
  memberType: 'member',
  guardianMemberId: guardianId,
};

// Auth contexts for the various viewers.
const leaderAuth = { memberId: '000-leader', email: 'leader@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const guardianAuth = { memberId: guardianId, email: 'guardian@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
const sgLeadSameBranchAuth = { memberId: '000-sg-same', email: 'sg-same@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };
// Physically present in `branchId` (so the detail read gate passes) but only
// holds the Safeguarding Lead role in a DIFFERENT branch (otherBranchId).
const sgLeadOtherBranchAuth = { memberId: '000-sg-other', email: 'sg-other@test.com', systemRole: 'member' as const, branchId, branchSystemAdminBranchIds: [], branchDataAdminBranchIds: [], grants: [] };

describe('getMember — minor redaction', () => {
  it('admin sees full minor record (not redacted)', async () => {
    // select 1: member row; the viewer-capability prefetch is skipped for admin/pastor
    setupSelect([minorMember]);
    const result = await getMember(mockDb, 'minor-1', adminAuth);
    expect(result.isMinor).toBe(true);
    expect(result.redacted).toBe(false);
    expect(result.dateOfBirth).toBe('2016-01-01');
    expect(result.email).toBe('kid@test.com');
  });

  it('guardian sees their own child full record', async () => {
    // select 1: member row; guardian match short-circuits capability lookup
    setupSelect([minorMember]);
    const result = await getMember(mockDb, 'minor-1', guardianAuth);
    expect(result.redacted).toBe(false);
    expect(result.phone).toBe('555000');
    expect(result.emergencyContactName).toBe('Mum');
  });

  it('guardian active in a DIFFERENT branch still sees their own child full record', async () => {
    // The guardian link is branch-independent — a guardian scoped to another
    // branch must not be locked out of their own child's record.
    const crossBranchGuardian = { ...guardianAuth, branchId: otherBranchId };
    setupSelect([minorMember]); // guardian match short-circuits, no capability query
    const result = await getMember(mockDb, 'minor-1', crossBranchGuardian);
    expect(result.redacted).toBe(false);
    expect(result.dateOfBirth).toBe('2016-01-01');
    expect(result.emergencyContactName).toBe('Mum');
  });

  it('unrelated in-branch leader gets a REDACTED minor record', async () => {
    // select 1: member row; select 2: viewer safeguarding-lead branches → none
    setupSelectSequence([minorMember], []);
    const result = await getMember(mockDb, 'minor-1', leaderAuth);
    expect(result.isMinor).toBe(true);
    expect(result.redacted).toBe(true);
    expect(result.dateOfBirth).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.city).toBeNull();
    expect(result.postalCode).toBeNull();
    expect(result.emergencyContactName).toBeNull();
    expect(result.emergencyContactPhone).toBeNull();
    expect(result.emergencyContactRelationship).toBeNull();
    // Non-sensitive fields are kept
    expect(result.firstName).toBe('Tiny');
    expect(result.homeBranchId).toBe(branchId);
    expect(result.photoUrl).toBeNull();
  });

  it('Safeguarding Lead in the member branch sees full record', async () => {
    // select 1: member row; select 2: viewer holds SG-Lead in branchId
    setupSelectSequence([minorMember], [{ branchId }]);
    const result = await getMember(mockDb, 'minor-1', sgLeadSameBranchAuth);
    expect(result.redacted).toBe(false);
    expect(result.email).toBe('kid@test.com');
  });

  it('Safeguarding Lead in a DIFFERENT branch does NOT see full record', async () => {
    // select 1: member row (in branchId); select 2: viewer holds SG-Lead only in otherBranchId
    setupSelectSequence([minorMember], [{ branchId: otherBranchId }]);
    const result = await getMember(mockDb, 'minor-1', sgLeadOtherBranchAuth);
    expect(result.redacted).toBe(true);
    expect(result.email).toBeNull();
  });

  it('admin sees a non-minor record unredacted', async () => {
    const adult = { ...minorMember, dateOfBirth: '1980-01-01', memberType: 'member' };
    setupSelect([adult]);
    const result = await getMember(mockDb, 'minor-1', adminAuth);
    expect(result.isMinor).toBe(false);
    expect(result.redacted).toBe(false);
    expect(result.email).toBe('kid@test.com');
  });

  it('an unrelated in-branch leader CANNOT read an adult record (adult privacy preserved)', async () => {
    // Adults keep the original strict gate: admin/pastor/self only. A general
    // in-branch leader is forbidden — they must NOT see another adult's address
    // or emergency contacts via the detail endpoint.
    const adult = { ...minorMember, dateOfBirth: '1980-01-01', memberType: 'member' };
    setupSelect([adult]);
    await expect(getMember(mockDb, 'minor-1', leaderAuth)).rejects.toThrow(
      'You can only access your own profile',
    );
  });
});

describe('listMembers — minor redaction', () => {
  it('redacts in-list minors for an unrelated in-branch leader', async () => {
    const adult = { ...minorMember, id: 'adult-1', dateOfBirth: '1980-01-01' };
    // select 1: viewer SG-Lead branches → none; select 2: rows; select 3: count
    setupSelectSequence([], [minorMember, adult], [{ count: 2 }]);
    const result = await listMembers(mockDb, leaderAuth, { page: 1, limit: 20 });
    const minorRow = result.data.find((m) => m.id === 'minor-1')!;
    const adultRow = result.data.find((m) => m.id === 'adult-1')!;
    expect(minorRow.isMinor).toBe(true);
    expect(minorRow.redacted).toBe(true);
    expect(minorRow.email).toBeNull();
    expect(minorRow.phone).toBeNull();
    expect(adultRow.isMinor).toBe(false);
    expect(adultRow.redacted).toBe(false);
    expect(adultRow.email).toBe('kid@test.com');
  });

  it('does not redact for a guardian viewing their own child in the list', async () => {
    // guardian has no SG-Lead role; select 1: SG branches → none; select 2: rows; select 3: count
    setupSelectSequence([], [minorMember], [{ count: 1 }]);
    const result = await listMembers(mockDb, guardianAuth, { page: 1, limit: 20 });
    const minorRow = result.data[0]!;
    expect(minorRow.redacted).toBe(false);
    expect(minorRow.email).toBe('kid@test.com');
  });

  it('admin sees all list rows unredacted without a capability prefetch', async () => {
    setupSelectSequence([minorMember], [{ count: 1 }]);
    const result = await listMembers(mockDb, adminAuth, { page: 1, limit: 20 });
    expect(result.data[0]!.redacted).toBe(false);
    expect(result.data[0]!.email).toBe('kid@test.com');
  });
});

// ── Health Record ─────────────────────────────────────────

const healthRecord = {
  id: 'hr-1',
  memberId: 'minor-1',
  branchId,
  medicalConditions: 'Asthma',
  allergies: null,
  medications: null,
  dietaryNeeds: null,
  additionalNotes: null,
  photoMediaConsent: null,
  medicalTreatmentConsent: null,
  dataProcessingConsent: null,
  consentRecordedBy: null,
  consentDate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getHealthRecord', () => {
  it('returns the record for a Safeguarding Lead in the member branch', async () => {
    // select 1: member (id/homeBranchId/memberType/dob/guardian); select 2: SG branches; select 3: record
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [{ branchId }],
      [healthRecord],
    );
    const result = await getHealthRecord(mockDb, 'minor-1', sgLeadSameBranchAuth);
    expect(result).toEqual(healthRecord);
  });

  it('returns null when no record exists (admin)', async () => {
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [],
    );
    const result = await getHealthRecord(mockDb, 'minor-1', adminAuth);
    expect(result).toBeNull();
  });

  it('throws NotFoundError for a missing member', async () => {
    setupSelectSequence([]);
    await expect(getHealthRecord(mockDb, 'minor-1', adminAuth))
      .rejects.toThrow('Member not found');
  });

  it('throws ForbiddenError when the viewer lacks safeguarding access', async () => {
    // member exists; viewer is a leader with no SG-Lead role
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [],
    );
    await expect(getHealthRecord(mockDb, 'minor-1', leaderAuth))
      .rejects.toThrow('do not have safeguarding access');
  });

  it('allows the guardian to read their child record', async () => {
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [healthRecord],
    );
    const result = await getHealthRecord(mockDb, 'minor-1', guardianAuth);
    expect(result).toEqual(healthRecord);
  });

  it('allows a guardian active in a DIFFERENT branch to read their child record', async () => {
    // The member lookup is no longer pre-filtered by the viewer's branch, so a
    // cross-branch guardian resolves the child and the guardian match grants access.
    const crossBranchGuardian = { ...guardianAuth, branchId: otherBranchId };
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [healthRecord],
    );
    const result = await getHealthRecord(mockDb, 'minor-1', crossBranchGuardian);
    expect(result).toEqual(healthRecord);
  });
});

describe('upsertHealthRecord', () => {
  it('inserts a new record when none exists and stamps consent', async () => {
    // select 1: member; select 2: SG branches (admin → skipped, but harness tolerates); select 3: existing record → none
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [],
    );
    setupInsert([{ ...healthRecord, photoMediaConsent: true, consentRecordedBy: adminAuth.memberId }]);
    const result = await upsertHealthRecord(
      mockDb,
      'minor-1',
      { medicalConditions: 'Asthma', photoMediaConsent: true },
      adminAuth,
    );
    expect(mockDb.insert).toHaveBeenCalled();
    expect(result.consentRecordedBy).toBe(adminAuth.memberId);
    expect(result.photoMediaConsent).toBe(true);
  });

  it('updates an existing record when present', async () => {
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [{ id: 'hr-1' }],
    );
    setupUpdate([{ ...healthRecord, medicalConditions: 'Peanut allergy' }]);
    const result = await upsertHealthRecord(
      mockDb,
      'minor-1',
      { medicalConditions: 'Peanut allergy' },
      adminAuth,
    );
    expect(mockDb.update).toHaveBeenCalled();
    expect(result.medicalConditions).toBe('Peanut allergy');
  });

  it('throws ForbiddenError when the viewer lacks safeguarding access', async () => {
    setupSelectSequence(
      [{ id: 'minor-1', homeBranchId: branchId, memberType: 'member', dateOfBirth: '2016-01-01', guardianMemberId: guardianId }],
      [],
    );
    await expect(upsertHealthRecord(mockDb, 'minor-1', { medicalConditions: 'x' }, leaderAuth))
      .rejects.toThrow('do not have safeguarding access');
  });

  it('throws NotFoundError for a missing member', async () => {
    setupSelectSequence([]);
    await expect(upsertHealthRecord(mockDb, 'minor-1', { medicalConditions: 'x' }, adminAuth))
      .rejects.toThrow('Member not found');
  });
});

describe('listUnguardedMinors', () => {
  const unguardedRow = {
    id: 'minor-1',
    firstName: 'Lily',
    lastName: 'Thompson',
    dateOfBirth: '2016-01-01',
    branchName: 'Lagos Branch',
    guardianMemberId: null,
    guardianFirstName: null,
    guardianLastName: null,
  };

  it('admin gets the list (no capability query) with guardianStatus "none"', async () => {
    setupSelect([unguardedRow]); // single select: the minors query
    const result = await listUnguardedMinors(mockDb, adminAuth, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.guardianStatus).toBe('none');
    expect(result[0]!.guardianName).toBeNull();
  });

  it('maps an inactive-guardian row to guardianStatus "inactive" with the name', async () => {
    setupSelect([
      { ...unguardedRow, guardianMemberId: guardianId, guardianFirstName: 'Emma', guardianLastName: 'Thompson' },
    ]);
    const result = await listUnguardedMinors(mockDb, adminAuth, {});
    expect(result[0]!.guardianStatus).toBe('inactive');
    expect(result[0]!.guardianName).toBe('Emma Thompson');
  });

  it('allows a Safeguarding Lead scoped to the branch', async () => {
    // select 1: viewer SG-Lead branches → includes branchId; select 2: minors
    setupSelectSequence([{ branchId }], [unguardedRow]);
    const result = await listUnguardedMinors(mockDb, sgLeadSameBranchAuth, {});
    expect(result).toHaveLength(1);
  });

  it('forbids a leader without the Safeguarding Lead role', async () => {
    setupSelectSequence([]); // viewer SG-Lead branches → none
    await expect(listUnguardedMinors(mockDb, leaderAuth, {}))
      .rejects.toThrow('need safeguarding access');
  });

  it('forbids a Safeguarding Lead querying a branch they do not cover', async () => {
    // viewer holds SG-Lead only in otherBranchId; queries branchId
    setupSelectSequence([{ branchId: otherBranchId }]);
    await expect(listUnguardedMinors(mockDb, sgLeadSameBranchAuth, { branchId }))
      .rejects.toThrow('need safeguarding access');
  });
});
