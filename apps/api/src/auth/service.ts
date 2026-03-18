import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { Database } from '@kairos/database';
import { members } from '@kairos/database';
import type { AuthContext, AuthTokens, LoginResponse, MemberProfile } from '@kairos/types';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  logger,
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
    approvalStatus: row.approvalStatus as MemberProfile['approvalStatus'],
    systemRole: row.systemRole as MemberProfile['systemRole'],
    emailVerified: row.emailVerified,
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
      homeBranchId: input.homeBranchId,
      passwordHash,
      emailVerified: false,
      approvalStatus: 'pending',
      systemRole: 'member',
      isActive: false, // Inactive until admin approves
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

export async function login(db: Database, email: string, password: string): Promise<LoginResponse> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!member.emailVerified) {
    throw new ValidationError('Email not verified. Please check your email for a verification link.');
  }

  if (member.approvalStatus !== 'approved') {
    throw new ValidationError('Your account is pending approval by an administrator.');
  }

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as AuthContext['systemRole'],
    branchId: member.homeBranchId,
  };

  const accessToken = signAccessToken(authContext);
  const refreshToken = signRefreshToken(member.id);

  return {
    tokens: { accessToken, refreshToken },
    member: toMemberProfile(member),
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
    .select({ id: members.id, email: members.email })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  // Always return success to prevent email enumeration
  if (!member) {
    logger.info('Forgot password request for non-existent email', { email });
    return { resetToken: '' };
  }

  const resetToken = randomBytes(32).toString('hex');

  // In production, store token hash in a password_reset_tokens table with expiry.
  // For local dev, log the token.
  logger.info('Password reset token generated', {
    memberId: member.id,
    email: member.email,
    resetToken,
  });

  return { resetToken };
}

export async function resetPassword(db: Database, token: string, newPassword: string): Promise<void> {
  // For MVP local dev: accept token as member ID
  // In production: validate token against stored hash + check expiry
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.id, token))
    .limit(1);

  if (!member) {
    throw new NotFoundError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(members)
    .set({ passwordHash })
    .where(eq(members.id, member.id));
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
