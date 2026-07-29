import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { hashPassword } from '@kairos/utils';
import type { AuthSecrets } from '../lib/auth-secrets';

const TEST_SECRETS: AuthSecrets = {
  accessSecret: 'dev-secret-change-me',
  refreshSecret: 'dev-refresh-secret-change-me',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
};

async function verifyAccess(token: string): Promise<Record<string, unknown>> {
  const key = new TextEncoder().encode(TEST_SECRETS.accessSecret);
  const { payload } = await jwtVerify(token, key);
  return payload as Record<string, unknown>;
}

async function signTestRefresh(memberId: string): Promise<string> {
  const key = new TextEncoder().encode(TEST_SECRETS.refreshSecret);
  return new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TEST_SECRETS.refreshTokenExpiry)
    .sign(key);
}

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
      acceptedPolicies: true,
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
      acceptedPolicies: true,
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
      acceptedPolicies: true,
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
      acceptedPolicies: true,
    })).rejects.toThrow('A member with this email already exists');
  });

  it('records terms + privacy consent inline when acceptedPolicies is true', async () => {
    const { signup } = await import('./service');

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockReturnValueOnce(Promise.resolve([]));

    const created = { ...baseMember, isActive: false, approvalStatus: 'pending', emailVerified: false };
    setupInsertChain([created]);

    await signup(mockDb, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
      acceptedPolicies: true,
    });

    const consentCall = mockValues.mock.calls.find(
      (c) => Array.isArray(c[0]) && c[0].some((r: { consentType?: string }) => r.consentType === 'terms'),
    );
    expect(consentCall).toBeTruthy();
    const rows = consentCall![0] as Array<{ consentType: string; granted: boolean }>;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.consentType).sort()).toEqual(['privacy', 'terms']);
    expect(rows.every((r) => r.granted === true)).toBe(true);
  });

  it('skips inline consent inserts when acceptedPolicies is false (admin-invited path)', async () => {
    const { signup } = await import('./service');

    mockSelect.mockReturnValueOnce({ from: mockFrom });
    mockFrom.mockReturnValueOnce({ where: mockWhere });
    mockWhere.mockReturnValueOnce({ limit: mockLimit });
    mockLimit.mockReturnValueOnce(Promise.resolve([]));

    const created = { ...baseMember, isActive: false, approvalStatus: 'pending', emailVerified: false };
    setupInsertChain([created]);

    await signup(mockDb, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      homeBranchId: '660e8400-e29b-41d4-a716-446655440000',
      password: 'StrongPass123!',
      // acceptedPolicies omitted — service should fall through to banner-driven consent
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

describe('login', () => {
  it('should return tokens and member profile on valid credentials', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    const member = { ...baseMember, passwordHash: hashed, lastLoginAt: null };
    setupSelectChain([member]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS);

    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.member.email).toBe('john@example.com');
    expect(result.isFirstLogin).toBe(true);

    // Verify access token is valid JWT
    const decoded = await verifyAccess(result.tokens.accessToken);
    expect(decoded['memberId']).toBe(baseMember.id);
    expect(decoded['email']).toBe('john@example.com');
    expect(decoded['systemRole']).toBe('member');
  });

  it('should throw UnauthorizedError for non-existent email', async () => {
    const { login } = await import('./service');
    setupSelectChain([]);

    await expect(login(mockDb, 'nope@example.com', 'password', TEST_SECRETS))
      .rejects.toThrow('Invalid email or password');
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('CorrectPass1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed }]);

    await expect(login(mockDb, 'john@example.com', 'WrongPassword', TEST_SECRETS))
      .rejects.toThrow('Invalid email or password');
  });

  it('should throw ValidationError for unverified email', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed, emailVerified: false }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS))
      .rejects.toThrow('Email not verified');
  });

  it('should throw ValidationError for unapproved member', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed, approvalStatus: 'pending' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS))
      .rejects.toThrow('pending approval');
  });

  it('should reject a minor (memberType child) from signing in', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed, memberType: 'child' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS))
      .rejects.toThrow('belongs to a minor');
  });

  it('should reject a minor (DOB under 16) from signing in', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed, dateOfBirth: '2015-01-01' }]);

    await expect(login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS))
      .rejects.toThrow('belongs to a minor');
  });

  it('mints tokens regardless of stored systemRole — login no longer narrows by role', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    setupSelectChain([{ ...baseMember, passwordHash: hashed, systemRole: 'admin', lastLoginAt: new Date() }]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS);
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('JWT branchId is secondaryBranchId when member is at secondary branch', async () => {
    const { login } = await import('./service');

    const hashed = await hashPassword('MyPassword1!');
    const secondaryBranchId = '770e8400-e29b-41d4-a716-000000000077';
    setupSelectChain([{ ...baseMember, passwordHash: hashed, secondaryBranchId, isAtSecondaryBranch: true, lastLoginAt: null }]);
    setupUpdateChain();

    const result = await login(mockDb, 'john@example.com', 'MyPassword1!', TEST_SECRETS);
    const decoded = await verifyAccess(result.tokens.accessToken);
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

    const token = await signTestRefresh(baseMember.id);

    setupSelectChain([baseMember]);

    const result = await refreshAccessToken(mockDb, token, TEST_SECRETS);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should throw UnauthorizedError for invalid refresh token', async () => {
    const { refreshAccessToken } = await import('./service');

    await expect(refreshAccessToken(mockDb, 'invalid-token', TEST_SECRETS))
      .rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw UnauthorizedError for inactive member', async () => {
    const { refreshAccessToken } = await import('./service');

    const token = await signTestRefresh(baseMember.id);

    setupSelectChain([]);

    await expect(refreshAccessToken(mockDb, token, TEST_SECRETS))
      .rejects.toThrow('Member not found or inactive');
  });
});

describe('verifyEmail', () => {
  it('should mark email as verified when plaintext token matches stored hash', async () => {
    const { verifyEmail } = await import('./service');
    const plainToken = 'plaintext-verification-token';
    const tokenHash = await hashPassword(plainToken);

    setupSelectChain([
      {
        id: baseMember.id,
        emailVerificationToken: tokenHash,
        emailVerificationExpiry: new Date(Date.now() + 3_600_000),
      },
    ]);
    setupUpdateChain();

    await expect(verifyEmail(mockDb, plainToken)).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should throw NotFoundError when no candidate rows exist', async () => {
    const { verifyEmail } = await import('./service');

    setupSelectChain([]);

    await expect(verifyEmail(mockDb, 'bad-token'))
      .rejects.toThrow('not found');
  });

  it('should throw NotFoundError when plaintext token does not hash-match any candidate', async () => {
    const { verifyEmail } = await import('./service');
    const rightToken = 'the-real-token';
    const wrongToken = 'guessed-token';
    const tokenHash = await hashPassword(rightToken);

    setupSelectChain([
      {
        id: baseMember.id,
        emailVerificationToken: tokenHash,
        emailVerificationExpiry: new Date(Date.now() + 3_600_000),
      },
    ]);

    await expect(verifyEmail(mockDb, wrongToken))
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
    const realTokenHash = await hashPassword(baseMember.id);
    mockLimit.mockResolvedValue([{
      id: baseMember.id,
      passwordResetToken: realTokenHash,
      passwordResetExpiry: new Date(Date.now() + 3_600_000).toISOString(),
    }]);

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
