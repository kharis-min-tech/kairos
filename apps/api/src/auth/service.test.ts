import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
} as unknown as import('@kairos/database').Database;

function setupSelectChain(result: unknown[]) {
  // First .select() returns the primary chain (used for the member lookup
  // in login / refreshAccessToken). Subsequent .select() calls (for the
  // branch-admin authority lookups added in 2026-06 RBAC work) get a
  // chain that resolves to an empty array — those lookups are exercised
  // in a dedicated test below.
  let firstCall = true;
  mockSelect.mockImplementation(() => {
    if (firstCall) {
      firstCall = false;
      return { from: mockFrom };
    }
    // Empty-result chain that supports .from().innerJoin().where()
    // as well as .from().where().limit() so both legacy and new
    // service calls keep typechecking through.
    const empty: Record<string, unknown> = {};
    const passthrough = () => empty;
    for (const m of ['from', 'innerJoin', 'where', 'limit', 'orderBy']) {
      empty[m] = passthrough;
    }
    empty.then = (resolve: (v: unknown) => unknown) => resolve([]);
    return empty;
  });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue(Promise.resolve(result));
}

function setupInsertChain(result: unknown[]) {
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockReturnValue(Promise.resolve(result));
}

function setupUpdateChain() {
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
}

const baseMember = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'John',
  lastName: 'Doe',
  middleName: null,
  dateOfBirth: null,
  gender: 'Male',
  email: 'john@example.com',
  phone: null,
  address: null,
  city: null,
  postalCode: null,
  homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
  membershipDate: '2024-01-01',
  isActive: true,
  photoUrl: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRelationship: null,
  passwordHash: '$2b$10$hashedpassword',
  emailVerified: true,
  mustChangePassword: false,
  approvalStatus: 'approved',
  systemRole: 'member',
  secondaryBranchId: null,
  secondaryAddress: null,
  secondaryCity: null,
  secondaryPostalCode: null,
  isAtSecondaryBranch: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signup', () => {
  it('should create a new member with hashed password', async () => {
    const { signup } = await import('./service');

    // First select: check existing email — empty
    setupSelectChain([]);

    // After the email check, phone check will re-call select
    const selectCall2 = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) });
    mockSelect.mockReturnValueOnce({ from: mockFrom }); // email check
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockReturnValueOnce(Promise.resolve([])); // no existing email

    mockSelect.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) });

    void selectCall2;

    const created = { ...baseMember, isActive: false, approvalStatus: 'pending', emailVerified: false };
    setupInsertChain([created]);

    const result = await signup(mockDb, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
      phone: '1234567890',
    });

    expect(result.member).toBeDefined();
    expect(result.member.email).toBe('john@example.com');
    expect(result.verificationToken).toBeDefined();
    expect(result.verificationToken.length).toBeGreaterThan(0);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('refuses self-registration when the date of birth implies under 16', async () => {
    const { signup } = await import('./service');

    setupSelectChain([]); // email check — no existing account

    await expect(signup(mockDb, {
      firstName: 'Tim',
      lastName: 'Young',
      email: 'tim@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
      dateOfBirth: '2015-01-01',
    })).rejects.toThrow('under 16 cannot create their own account');

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('persists secondary branch fields when provided', async () => {
    const { signup } = await import('./service');

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockReturnValueOnce(Promise.resolve([])); // no existing email

    const created = { ...baseMember, isActive: false, approvalStatus: 'pending', emailVerified: false, secondaryBranchId: '660e8400-e29b-41d4-a716-000000000099', secondaryAddress: '10 Side St', secondaryCity: 'Manchester', secondaryPostalCode: 'M1 1AA' };
    setupInsertChain([created]);

    const result = await signup(mockDb, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
      secondaryBranchId: '660e8400-e29b-41d4-a716-000000000099',
      secondaryAddress: '10 Side St',
      secondaryCity: 'Manchester',
      secondaryPostalCode: 'M1 1AA',
    });

    expect(result.member).toBeDefined();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
      secondaryBranchId: '660e8400-e29b-41d4-a716-000000000099',
      secondaryAddress: '10 Side St',
      secondaryCity: 'Manchester',
      secondaryPostalCode: 'M1 1AA',
    }));
  });

  it('should throw ConflictError for duplicate email', async () => {
    const { signup } = await import('./service');

    setupSelectChain([{ id: 'existing-id' }]);

    await expect(signup(mockDb, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'john@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
    })).rejects.toThrow('A member with this email already exists');
  });
});

describe('login', () => {
  it('should return tokens and member profile on valid credentials', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    const member = { ...baseMember, passwordHash: hashed, lastLoginAt: null };
    setupSelectChain([member]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!');

    expect(result.tokens!.accessToken).toBeDefined();
    expect(result.tokens!.refreshToken).toBeDefined();
    expect(result.member!.email).toBe('john@example.com');
    expect(result.isFirstLogin).toBe(true);

    // Verify access token is valid JWT
    const decoded = jwt.verify(result.tokens!.accessToken, 'dev-secret-change-me') as Record<string, unknown>;
    expect(decoded['memberId']).toBe(baseMember.id);
    expect(decoded['email']).toBe('john@example.com');
    expect(decoded['systemRole']).toBe('member');
  });

  it('should throw UnauthorizedError for non-existent email', async () => {
    const { login } = await import('./service');
    setupSelectChain([]);

    await expect(login(mockDb, 'nope@example.com', 'password'))
      .rejects.toThrow('Invalid email or password');
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('CorrectPass1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed }]);

    await expect(login(mockDb, 'john@example.com', 'WrongPassword'))
      .rejects.toThrow('Invalid email or password');
  });

  it('should throw ValidationError for unverified email', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, emailVerified: false }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!'))
      .rejects.toThrow('Email not verified');
  });

  it('should throw ValidationError for unapproved member', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, approvalStatus: 'pending' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!'))
      .rejects.toThrow('pending approval');
  });

  it('should reject a minor (memberType child) from signing in', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, memberType: 'child' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!'))
      .rejects.toThrow('belongs to a minor');
  });

  it('should reject a minor (DOB under 16) from signing in', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, dateOfBirth: '2015-01-01' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!'))
      .rejects.toThrow('belongs to a minor');
  });

  it('should reject admin trying to login as pastor', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, systemRole: 'admin' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', 'pastor'))
      .rejects.toThrow("You don't have pastor access");
  });

  it('should reject member trying to login as admin', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, systemRole: 'member' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', 'admin'))
      .rejects.toThrow("You don't have admin access");
  });

  it('should allow any role to login as member', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, systemRole: 'admin', lastLoginAt: new Date() }]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', 'member');
    expect(result.tokens!.accessToken).toBeDefined();
  });

  it('should allow exact role match login', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectChain([{ ...baseMember, passwordHash: hashed, systemRole: 'pastor', lastLoginAt: new Date() }]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', 'pastor');
    expect(result.tokens!.accessToken).toBeDefined();
  });

  it('JWT branchId is secondaryBranchId when member is at secondary branch', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    const secondaryBranchId = '770e8400-e29b-41d4-a716-000000000077';
    setupSelectChain([{ ...baseMember, passwordHash: hashed, secondaryBranchId, isAtSecondaryBranch: true, lastLoginAt: null }]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!');
    const decoded = jwt.verify(result.tokens!.accessToken, 'dev-secret-change-me') as Record<string, unknown>;
    expect(decoded['branchId']).toBe(secondaryBranchId);
  });
});

describe('resolveBranchAdminAuthority', () => {
  it('returns deduplicated branch IDs from BSA role + Admin-dept membership', async () => {
    const { resolveBranchAdminAuthority } = await import('./service');

    const branchA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const branchB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const branchC = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    // BSA query returns two rows (branchA twice → deduped), BDA returns one
    let call = 0;
    mockSelect.mockImplementation(() => {
      call += 1;
      const data = call === 1
        ? [{ branchId: branchA }, { branchId: branchA }, { branchId: branchB }]
        : [{ branchId: branchC }];
      const chain: Record<string, unknown> = {};
      const passthrough = () => chain;
      for (const m of ['from', 'innerJoin', 'where']) chain[m] = passthrough;
      chain.then = (resolve: (v: unknown) => unknown) => resolve(data);
      return chain;
    });

    const result = await resolveBranchAdminAuthority(mockDb, 'mem-1');
    expect(result.branchSystemAdminBranchIds.sort()).toEqual([branchA, branchB].sort());
    expect(result.branchDataAdminBranchIds).toEqual([branchC]);
  });
});

describe('refreshAccessToken', () => {
  it('should return new tokens for valid refresh token', async () => {
    const { refreshAccessToken } = await import('./service');

    const refreshSecret = 'dev-refresh-secret-change-me';
    const token = jwt.sign({ memberId: baseMember.id }, refreshSecret, { expiresIn: '7d' });

    setupSelectChain([baseMember]);

    const result = await refreshAccessToken(mockDb, token);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should throw UnauthorizedError for invalid refresh token', async () => {
    const { refreshAccessToken } = await import('./service');

    await expect(refreshAccessToken(mockDb, 'invalid-token'))
      .rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw UnauthorizedError for inactive member', async () => {
    const { refreshAccessToken } = await import('./service');

    const refreshSecret = 'dev-refresh-secret-change-me';
    const token = jwt.sign({ memberId: baseMember.id }, refreshSecret, { expiresIn: '7d' });

    setupSelectChain([]);

    await expect(refreshAccessToken(mockDb, token))
      .rejects.toThrow('Member not found or inactive');
  });
});

describe('verifyEmail', () => {
  it('should mark email as verified', async () => {
    const { verifyEmail } = await import('./service');

    setupSelectChain([{ ...baseMember, emailVerified: false }]);
    setupUpdateChain();

    await expect(verifyEmail(mockDb, baseMember.id)).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should throw NotFoundError for invalid token', async () => {
    const { verifyEmail } = await import('./service');

    setupSelectChain([]);

    await expect(verifyEmail(mockDb, 'bad-token'))
      .rejects.toThrow('not found');
  });
});

describe('forgotPassword', () => {
  it('should return reset token for existing email', async () => {
    const { forgotPassword } = await import('./service');

    setupSelectChain([{ id: baseMember.id, email: baseMember.email }]);

    const result = await forgotPassword(mockDb, 'john@example.com');
    expect(result.resetToken).toBeDefined();
    expect(result.resetToken.length).toBeGreaterThan(0);
  });

  it('should return empty token for non-existent email (no enumeration)', async () => {
    const { forgotPassword } = await import('./service');

    setupSelectChain([]);

    const result = await forgotPassword(mockDb, 'nope@example.com');
    expect(result.resetToken).toBe('');
  });
});

describe('resetPassword', () => {
  it('should update password hash', async () => {
    const { resetPassword } = await import('./service');

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([{
      id: baseMember.id,
      passwordResetToken: 'hashed-token-value',
      passwordResetExpiry: new Date(Date.now() + 3_600_000).toISOString(),
    }]);

    vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
    setupUpdateChain();

    await expect(resetPassword(mockDb, baseMember.id, 'NewPassword123!'))
      .resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should throw UnauthorizedError for invalid token', async () => {
    const { resetPassword } = await import('./service');

    setupSelectChain([]);

    await expect(resetPassword(mockDb, 'bad-token', 'NewPass'))
      .rejects.toThrow('Invalid or expired reset token');
  });
});

describe('getActiveBranchId', () => {
  it('returns homeBranchId when isAtSecondaryBranch is false', async () => {
    const { getActiveBranchId } = await import('./service');
    const result = getActiveBranchId({ homeBranchId: 'home-1', secondaryBranchId: 'secondary-1', isAtSecondaryBranch: false });
    expect(result).toBe('home-1');
  });

  it('returns secondaryBranchId when isAtSecondaryBranch is true', async () => {
    const { getActiveBranchId } = await import('./service');
    const result = getActiveBranchId({ homeBranchId: 'home-1', secondaryBranchId: 'secondary-1', isAtSecondaryBranch: true });
    expect(result).toBe('secondary-1');
  });

  it('returns homeBranchId when isAtSecondaryBranch is true but secondaryBranchId is null', async () => {
    const { getActiveBranchId } = await import('./service');
    const result = getActiveBranchId({ homeBranchId: 'home-1', secondaryBranchId: null, isAtSecondaryBranch: true });
    expect(result).toBe('home-1');
  });
});

describe('getMe', () => {
  it('should return member profile', async () => {
    const { getMe } = await import('./service');

    setupSelectChain([baseMember]);

    const result = await getMe(mockDb, baseMember.id);
    expect(result.email).toBe('john@example.com');
    expect(result.firstName).toBe('John');
  });

  it('should throw NotFoundError for non-existent member', async () => {
    const { getMe } = await import('./service');

    setupSelectChain([]);

    await expect(getMe(mockDb, 'non-existent-id'))
      .rejects.toThrow('not found');
  });
});

// ─────────────────────────────────────────────────────────────
// Two-step login (Phase 1 of roadmap item 9)
// ─────────────────────────────────────────────────────────────

/**
 * Test helper that wires a sequence of select-call results onto mockSelect.
 * Each entry corresponds to one db.select() invocation in order. Each chain
 * supports the methods used by service queries: from/where/limit/innerJoin/
 * orderBy. Resolves via `.then`, so it works with `await`-driven selects
 * regardless of whether they end in `.limit()` or not.
 */
function setupSelectSequence(results: unknown[][]) {
  const queue = [...results];
  mockSelect.mockImplementation(() => {
    const data = queue.length > 0 ? queue.shift()! : [];
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'limit', 'orderBy']) {
      chain[m] = passthrough;
    }
    chain.then = (resolve: (v: unknown) => unknown) => resolve(data);
    return chain;
  });
}

describe('computeAvailableRoles', () => {
  it('plain member: returns only the member option', async () => {
    const { computeAvailableRoles } = await import('./role-options');

    setupSelectSequence([
      [], // BSA roles
      [], // BDA dept rows
      [], // fellowship leadership rows
      [], // department leadership rows
      // no branches lookup needed — branchIdsNeeded is empty
    ]);

    const options = await computeAvailableRoles(mockDb, {
      memberId: baseMember.id,
      systemRole: 'member',
      homeBranchId: baseMember.homeBranchId,
    });

    expect(options).toHaveLength(1);
    expect(options[0]).toEqual({
      activeRole: 'member',
      displayLabel: 'Member',
      key: 'member',
    });
  });

  it('fellowship leader: emits fellowship leader option + member option', async () => {
    const { computeAvailableRoles } = await import('./role-options');

    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    setupSelectSequence([
      [], // BSA
      [], // BDA
      [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }],
      [], // dept leadership
    ]);

    const options = await computeAvailableRoles(mockDb, {
      memberId: baseMember.id,
      systemRole: 'member',
      homeBranchId: baseMember.homeBranchId,
    });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      activeRole: 'leader',
      scope: { kind: 'fellowship', id: fellowshipId },
      displayLabel: 'Fellowship Leader — K-Groups',
    });
    expect(options[0]!.key).toBe(`leader:fellowship:${fellowshipId}:lead`);
    expect(options[1]!.activeRole).toBe('member');
  });

  it('pastor: emits Administrator-tier-equivalent pastor option for the home branch', async () => {
    const { computeAvailableRoles } = await import('./role-options');

    setupSelectSequence([
      [], // BSA
      [], // BDA
      [], // fellowship leadership
      [], // dept leadership
      [{ id: baseMember.homeBranchId, branchName: 'London' }], // branches lookup
    ]);

    const options = await computeAvailableRoles(mockDb, {
      memberId: baseMember.id,
      systemRole: 'pastor',
      homeBranchId: baseMember.homeBranchId,
    });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      activeRole: 'pastor',
      scope: { kind: 'branch', id: baseMember.homeBranchId },
      displayLabel: 'Pastor — London',
    });
    expect(options[1]!.activeRole).toBe('member');
  });

  it('branch system admin: emits BSA option (admin tier, branch-scoped) + member', async () => {
    const { computeAvailableRoles } = await import('./role-options');

    const branchA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    setupSelectSequence([
      [{ branchId: branchA }], // BSA
      [], // BDA
      [], // fellowship leadership
      [], // dept leadership
      [{ id: branchA, branchName: 'Manchester' }], // branches lookup
    ]);

    const options = await computeAvailableRoles(mockDb, {
      memberId: baseMember.id,
      systemRole: 'member',
      homeBranchId: baseMember.homeBranchId,
    });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      activeRole: 'admin',
      scope: { kind: 'branch', id: branchA },
      displayLabel: 'Branch System Admin — Manchester',
    });
    expect(options[0]!.key).toBe(`admin:branch:${branchA}`);
  });

  it('dual: BSA + fellowship leader produces all three options ordered admin > leader > member', async () => {
    const { computeAvailableRoles } = await import('./role-options');

    const branchA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    setupSelectSequence([
      [{ branchId: branchA }], // BSA
      [], // BDA
      [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }],
      [], // dept leadership
      [{ id: branchA, branchName: 'Manchester' }],
    ]);

    const options = await computeAvailableRoles(mockDb, {
      memberId: baseMember.id,
      systemRole: 'member',
      homeBranchId: baseMember.homeBranchId,
    });

    expect(options.map((o) => o.activeRole)).toEqual(['admin', 'leader', 'member']);
    expect(options[0]!.displayLabel).toBe('Branch System Admin — Manchester');
    expect(options[1]!.displayLabel).toBe('Fellowship Leader — K-Groups');
  });
});

describe('login (two-step)', () => {
  it('legacy: activeRole sent + matches → direct finalize (back-compat)', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectSequence([
      [{ ...baseMember, passwordHash: hashed, systemRole: 'pastor', lastLoginAt: new Date() }],
      [], [], [], [], // computeAvailableRoles footprint
      [{ id: baseMember.homeBranchId, branchName: 'London' }], // branches lookup for pastor
    ]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', 'pastor');

    expect(result.roleSelectionRequired).toBeUndefined();
    expect(result.tokens).toBeDefined();
    expect(result.member!.email).toBe('john@example.com');
  });

  it('no activeRole + single-role user (plain member) → direct finalize', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    setupSelectSequence([
      [{ ...baseMember, passwordHash: hashed, lastLoginAt: null }],
      [], [], [], [], // footprint queries — all empty
      // no branches lookup — member has no scoped authority
    ]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!');

    expect(result.roleSelectionRequired).toBeUndefined();
    expect(result.tokens).toBeDefined();
    expect(result.sessionToken).toBeUndefined();
  });

  it('no activeRole + multi-role user → role-selection-required envelope', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    setupSelectSequence([
      [{ ...baseMember, passwordHash: hashed, lastLoginAt: new Date() }],
      [], // BSA
      [], // BDA
      [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }],
      [], // dept leadership
      // no branches lookup needed (fellowship scope only)
    ]);

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!');

    expect(result.roleSelectionRequired).toBe(true);
    expect(result.sessionToken).toBeDefined();
    expect(result.availableRoles).toBeDefined();
    expect(result.availableRoles!.map((r) => r.activeRole)).toContain('leader');
    expect(result.availableRoles!.map((r) => r.activeRole)).toContain('member');
    expect(result.tokens).toBeUndefined();
    expect(result.member).toBeUndefined();
  });

  it('multi-role envelope does NOT stamp lastLoginAt — only finalize-role does', async () => {
    const { login } = await import('./service');

    const hashed = await bcrypt.hash('MyPassword1!', 10);
    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    setupSelectSequence([
      [{ ...baseMember, passwordHash: hashed, lastLoginAt: new Date() }],
      [], [], [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }], [],
    ]);
    // Intentionally do NOT call setupUpdateChain — login should not touch
    // members.lastLoginAt when it returns the role-selection envelope.

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!');
    expect(result.roleSelectionRequired).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('finalizeRole', () => {
  it('issues access token with chosen activeRole + scope when key matches', async () => {
    const { finalizeRole, computeAvailableRoles: _compute } = await import('./service').then(async (svc) => ({
      finalizeRole: svc.finalizeRole,
      computeAvailableRoles: (await import('./role-options')).computeAvailableRoles,
    }));
    void _compute;
    const { roleOptionKey } = await import('./role-options');

    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';

    // Sign a valid session token first so verification succeeds.
    const sessionToken = jwt.sign(
      { kind: 'role-selection', memberId: baseMember.id },
      'dev-secret-change-me',
      { expiresIn: '5m' },
    );

    setupSelectSequence([
      [{ ...baseMember, lastLoginAt: new Date() }], // member lookup
      [], // BSA
      [], // BDA
      [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }],
      [], // dept leadership
      // issueAuthenticatedSession will call resolveBranchAdminAuthority → 2 more selects
      [], // BSA in resolveBranchAdminAuthority
      [], // BDA in resolveBranchAdminAuthority
    ]);
    setupUpdateChain();

    const scope = { kind: 'fellowship' as const, id: fellowshipId };
    const key = roleOptionKey('leader', scope, 'lead');
    const result = await finalizeRole(mockDb, {
      sessionToken,
      activeRole: 'leader',
      scope,
      key,
    });

    expect(result.tokens.accessToken).toBeDefined();
    const decoded = jwt.verify(result.tokens.accessToken, 'dev-secret-change-me') as Record<string, unknown>;
    expect(decoded['activeRole']).toBe('leader');
    expect(decoded['scope']).toEqual(scope);
  });

  it('rejects expired session token', async () => {
    const { finalizeRole } = await import('./service');

    // Expired = signed with a negative exp via a past iat. Easiest: sign with
    // expiresIn '-1s' so jwt.verify throws TokenExpiredError.
    const expired = jwt.sign(
      { kind: 'role-selection', memberId: baseMember.id },
      'dev-secret-change-me',
      { expiresIn: '-1s' },
    );

    await expect(
      finalizeRole(mockDb, {
        sessionToken: expired,
        activeRole: 'member',
        key: 'member',
      }),
    ).rejects.toThrow('Session token expired or invalid');
  });

  it('rejects a session-token-shaped JWT whose kind is wrong', async () => {
    const { finalizeRole } = await import('./service');

    // An access-token-shaped JWT must NOT pass as a sessionToken — that
    // would let an attacker who exfiltrated an access token bypass the
    // finalize flow's role re-validation.
    const accessTokenLike = jwt.sign(
      { memberId: baseMember.id, systemRole: 'admin', email: 'x@y.z', branchId: 'b' },
      'dev-secret-change-me',
      { expiresIn: '5m' },
    );

    await expect(
      finalizeRole(mockDb, {
        sessionToken: accessTokenLike,
        activeRole: 'member',
        key: 'member',
      }),
    ).rejects.toThrow('Session token expired or invalid');
  });

  it('rejects key that is not in the available role list (tampered request)', async () => {
    const { finalizeRole } = await import('./service');

    const sessionToken = jwt.sign(
      { kind: 'role-selection', memberId: baseMember.id },
      'dev-secret-change-me',
      { expiresIn: '5m' },
    );

    setupSelectSequence([
      [{ ...baseMember, lastLoginAt: new Date() }], // member lookup
      [], [], [], [], // footprint: empty → only 'member' option available
    ]);

    // User tries to claim admin authority they don't have.
    await expect(
      finalizeRole(mockDb, {
        sessionToken,
        activeRole: 'admin',
        key: 'admin',
      }),
    ).rejects.toThrow('Role selection is invalid');
  });

  it('rejects when key does not match the activeRole+scope hash (handcrafted payload)', async () => {
    const { finalizeRole } = await import('./service');

    const sessionToken = jwt.sign(
      { kind: 'role-selection', memberId: baseMember.id },
      'dev-secret-change-me',
      { expiresIn: '5m' },
    );

    setupSelectSequence([
      [{ ...baseMember, lastLoginAt: new Date() }],
      [], [], [], [],
    ]);

    // activeRole='member' with key='admin' — never a legal combination.
    await expect(
      finalizeRole(mockDb, {
        sessionToken,
        activeRole: 'member',
        key: 'admin',
      }),
    ).rejects.toThrow('Role selection is invalid');
  });
});

describe('switchRole', () => {
  const baseAuth = {
    memberId: baseMember.id,
    email: baseMember.email,
    systemRole: 'member' as const,
    activeRole: 'member' as const,
    branchId: baseMember.homeBranchId,
    branchSystemAdminBranchIds: [],
    branchDataAdminBranchIds: [],
  };

  it('mints a fresh token pair with the new activeRole + scope', async () => {
    const { switchRole } = await import('./service');
    const { roleOptionKey } = await import('./role-options');

    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    setupSelectSequence([
      [{ ...baseMember, lastLoginAt: new Date() }], // member lookup
      [], [], // BSA, BDA
      [{ id: fellowshipId, fellowshipName: 'K-Groups', leaderId: baseMember.id, coLeaderId: null }],
      [], // dept leadership
      // resolveBranchAdminAuthority inside issueAuthenticatedSession
      [], [],
    ]);
    setupUpdateChain();

    const scope = { kind: 'fellowship' as const, id: fellowshipId };
    const result = await switchRole(mockDb, baseAuth, {
      activeRole: 'leader',
      scope,
      key: roleOptionKey('leader', scope, 'lead'),
    });

    const decoded = jwt.verify(result.tokens.accessToken, 'dev-secret-change-me') as Record<string, unknown>;
    expect(decoded['activeRole']).toBe('leader');
    expect(decoded['scope']).toEqual(scope);
  });

  it('rejects switch to a role the caller no longer holds', async () => {
    const { switchRole } = await import('./service');

    // Caller's auth carries a fellowship-leader role, but the leadership
    // table now shows them as not the leader (someone removed them).
    setupSelectSequence([
      [{ ...baseMember, lastLoginAt: new Date() }], // member lookup
      [], [], [], [], // footprint: nothing → only 'member' available
    ]);

    const fellowshipId = 'f1111111-1111-1111-1111-111111111111';
    await expect(
      switchRole(mockDb, baseAuth, {
        activeRole: 'leader',
        scope: { kind: 'fellowship', id: fellowshipId },
        key: `leader:fellowship:${fellowshipId}:lead`,
      }),
    ).rejects.toThrow('Role selection is invalid');
  });

  it('rejects when the underlying member is deactivated', async () => {
    const { switchRole } = await import('./service');

    setupSelectSequence([[]]); // member lookup → empty (isActive=false filter)

    await expect(
      switchRole(mockDb, baseAuth, {
        activeRole: 'member',
        key: 'member',
      }),
    ).rejects.toThrow('Account no longer available');
  });
});
