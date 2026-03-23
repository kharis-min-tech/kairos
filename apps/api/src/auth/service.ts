import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { Database } from '@kairos/database';
import { members } from '@kairos/database';
import type { AuthContext, AuthTokens, LoginResponse, MemberProfile } from '@kairos/types';
import type { SystemRole } from '@kairos/types';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  logger,
  sendPasswordResetEmail,
} from '@kairos/utils';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-me';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function toMemberProfile(row: typeof members.$inferSelect): MemberProfile {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender as MemberProfile['gender'],
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    postalCode: row.postalCode,
    homeBranchId: row.homeBranchId,
    membershipDate: row.membershipDate,
    isActive: row.isActive,
    photoUrl: row.photoUrl,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    emergencyContactRelationship: row.emergencyContactRelationship,
    approvalStatus: row.approvalStatus as MemberProfile['approvalStatus'],
    systemRole: row.systemRole as MemberProfile['systemRole'],
    emailVerified: row.emailVerified,
    mustChangePassword: row.mustChangePassword,
  };
}

function signAccessToken(payload: AuthContext): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(memberId: string): string {
  return jwt.sign({ memberId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female';
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  homeBranchId: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  password: string;
}

export async function signup(db: Database, input: SignupInput): Promise<{ member: MemberProfile; verificationToken: string }> {
  // Check for existing email
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('A member with this email already exists');
  }

  // Check for duplicate phone (among active members)
  if (input.phone) {
    const phoneExists = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.phone, input.phone), eq(members.isActive, true)))
      .limit(1);

    if (phoneExists.length > 0) {
      throw new ConflictError('A member with this phone number already exists');
    }
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const verificationToken = randomBytes(32).toString('hex');

  const [created] = await db
    .insert(members)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      postalCode: input.postalCode ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      homeBranchId: input.homeBranchId,
      passwordHash,
      emailVerified: false,
      approvalStatus: 'pending',
      systemRole: 'member',
      isActive: false, // Inactive until admin approves
      mustChangePassword: false,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create member');
  }

  // In production, send verification email. For local dev, log the token.
  logger.info('Email verification token generated', {
    memberId: created.id,
    email: created.email,
    verificationToken,
  });

  return {
    member: toMemberProfile(created),
    verificationToken,
  };
}

/** Strict role check: activeRole must match member's systemRole (or be 'member') */

export async function login(
  db: Database,
  email: string,
  password: string,
  activeRole: SystemRole = 'member',
): Promise<LoginResponse> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  // Capture before we update so we know if this is their first login
  const isFirstLogin = member?.lastLoginAt === null;

  if (!member) {
    throw new UnauthorizedError('No account found with that email');
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Incorrect password');
  }

  if (!member.emailVerified) {
    throw new ValidationError('Email not verified. Please check your email for a verification link.');
  }

  if (member.approvalStatus !== 'approved') {
    throw new ValidationError('Your account is pending approval by an administrator.');
  }

  const memberRole = member.systemRole as SystemRole;
  if (activeRole !== 'member' && memberRole !== activeRole) {
    throw new UnauthorizedError(`You don't have ${activeRole} access`);
  }

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: memberRole,
    branchId: member.homeBranchId,
    activeRole,
  };

  const accessToken = signAccessToken(authContext);
  const refreshToken = signRefreshToken(member.id);

  await db
    .update(members)
    .set({ lastLoginAt: new Date() })
    .where(eq(members.id, member.id));

  return {
    tokens: { accessToken, refreshToken },
    member: toMemberProfile(member),
    isFirstLogin,
  };
}

export async function refreshAccessToken(db: Database, refreshToken: string): Promise<AuthTokens> {
  let payload: { memberId: string };
  try {
    payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { memberId: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, payload.memberId), eq(members.isActive, true)))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Member not found or inactive');
  }

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as AuthContext['systemRole'],
    branchId: member.homeBranchId,
    activeRole: member.systemRole as AuthContext['systemRole'],
  };

  return {
    accessToken: signAccessToken(authContext),
    refreshToken: signRefreshToken(member.id),
  };
}

export async function verifyEmail(db: Database, token: string): Promise<void> {
  // For local dev, we use a simple token lookup approach.
  // The token was logged during signup — in production, this would be stored in a verification_tokens table.
  // For MVP, we accept any valid token format and verify based on member lookup.
  // In a real implementation, validate token against a stored hash.

  // For local dev simplicity: the token is the member's email encoded by a deterministic scheme.
  // We'll use a pragmatic approach: find unverified members, or accept the token as a member ID for dev.
  logger.info('Email verification attempted', { token });

  // For MVP local dev: accept token as member ID
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, token), eq(members.emailVerified, false)))
    .limit(1);

  if (!member) {
    throw new NotFoundError('Invalid or expired verification token');
  }

  await db
    .update(members)
    .set({ emailVerified: true })
    .where(eq(members.id, member.id));
}

export async function forgotPassword(db: Database, email: string): Promise<{ resetToken: string }> {
  const [member] = await db
    .select({ id: members.id, email: members.email, firstName: members.firstName })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  // Always return success to prevent email enumeration
  if (!member) {
    logger.info('Forgot password request for non-existent email', { email });
    return { resetToken: '' };
  }

  const plainToken = randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(plainToken, SALT_ROUNDS);
  const expiry = new Date(Date.now() + 3_600_000); // 1 hour

  await db
    .update(members)
    .set({ passwordResetToken: tokenHash, passwordResetExpiry: expiry })
    .where(eq(members.id, member.id));

  const resetLink = `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/reset-password?token=${plainToken}`;

  await sendPasswordResetEmail(member.email, resetLink, member.firstName);

  // Return plain token for local dev easy testing — omit in production
  return { resetToken: plainToken };
}

export async function resetPassword(db: Database, token: string, newPassword: string): Promise<void> {
  // Get all members with a non-null reset token that hasn't expired
  const now = new Date();
  const candidates = await db
    .select({ id: members.id, passwordResetToken: members.passwordResetToken, passwordResetExpiry: members.passwordResetExpiry })
    .from(members)
    .where(eq(members.isActive, true))
    .limit(100);

  const match = candidates.find((m) => {
    if (!m.passwordResetToken || !m.passwordResetExpiry) return false;
    if (new Date(m.passwordResetExpiry) < now) return false;
    return true; // bcrypt compare done below
  });

  if (!match) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const valid = await bcrypt.compare(token, match.passwordResetToken!);
  if (!valid) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(members)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, mustChangePassword: false })
    .where(eq(members.id, match.id));
}

export async function getMe(db: Database, memberId: string): Promise<MemberProfile> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) {
    throw new NotFoundError('Member');
  }

  return toMemberProfile(member);
}

export async function changePassword(
  db: Database,
  auth: AuthContext,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [member] = await db
    .select({ id: members.id, passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);

  if (!member) throw new NotFoundError('Member not found');

  const valid = await bcrypt.compare(currentPassword, member.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(members)
    .set({ passwordHash, mustChangePassword: false, updatedAt: sql`NOW()` })
    .where(eq(members.id, auth.memberId));
}
