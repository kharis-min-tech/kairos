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
  mockSelect.mockReturnValue({ from: mockFrom });
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
  passwordHash: '$2b$10$hashedpassword',
  emailVerified: true,
  approvalStatus: 'approved',
  systemRole: 'member',
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

    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.member.email).toBe('john@example.com');
    expect(result.isFirstLogin).toBe(true);

    // Verify access token is valid JWT
    const decoded = jwt.verify(result.tokens.accessToken, 'dev-secret-change-me') as Record<string, unknown>;
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
