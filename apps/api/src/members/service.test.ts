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
  createMember,
  reactivateMember,
  importMembers,
  exportMembersCsv,
  listRoles,
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
      .rejects.toThrow('Only admins and pastors can deactivate members');
  });

  it('pastor can deactivate member in same branch', async () => {
    setupSelect([{ id: memberId }]);
    setupUpdate([{ ...sampleMemberFull, isActive: false }]);
    const result = await deactivateMember(mockDb, memberId, pastorAuth);
    expect(result).toBeDefined();
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

  it('allows pastor to create members', async () => {
    setupSelectSequence([], []);
    setupInsert([createdMember]);
    const result = await createMember(mockDb, createInput, pastorAuth);
    expect(result.member).toEqual(createdMember);
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
      .rejects.toThrow('Only admins and pastors can reactivate members');
  });

  it('pastor can reactivate member in same branch', async () => {
    setupSelect([{ id: memberId, isActive: false }]);
    const reactivated = { ...sampleMemberFull, isActive: true, approvalStatus: 'approved' };
    setupUpdate([reactivated]);
    const result = await reactivateMember(mockDb, memberId, pastorAuth);
    expect(result).toEqual(reactivated);
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
