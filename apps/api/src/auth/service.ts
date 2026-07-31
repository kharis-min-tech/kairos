import { SignJWT, jwtVerify } from 'jose';
import { eq, and, or, gt, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  memberRoles,
  roles,
  branchDepartments,
  departments,
  consentRecords,
} from '@kairos/database';
import { getCurrentConsentVersions } from '../consent/service';
import type {
  AuthContext,
  AuthTokens,
  LoginResponse,
  MemberProfile,
} from '@kairos/types';
import type { SystemRole } from '@kairos/types';
import { isMinorMember } from '@kairos/types';
import { resolveGrants } from '../lib/grants';
import type { AuthSecrets } from '../lib/auth-secrets';
import { dispatchNotification } from '../notifications/service';
import { recordAuditEvent } from '../audit/service';
import { NotificationEventType, AuditAction, AuditOutcome } from '@kairos/types';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  logger,
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
  hashPassword,
  verifyPassword,
  randomTokenHex,
  isMailerLive,
} from '@kairos/utils';

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
    secondaryBranchId: row.secondaryBranchId,
    isAtSecondaryBranch: row.isAtSecondaryBranch,
    secondaryAddress: row.secondaryAddress,
    secondaryCity: row.secondaryCity,
    secondaryPostalCode: row.secondaryPostalCode,
    membershipDate: row.membershipDate,
    isActive: row.isActive,
    photoUrl: row.photoUrl,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    emergencyContactRelationship: row.emergencyContactRelationship,
    approvalStatus: row.approvalStatus as MemberProfile['approvalStatus'],
    systemRole: row.systemRole as MemberProfile['systemRole'],
    honorific: row.honorific,
    memberType: row.memberType as MemberProfile['memberType'],
    guardianMemberId: row.guardianMemberId,
    membershipClassCompletedAt: row.membershipClassCompletedAt
      ? row.membershipClassCompletedAt.toISOString()
      : null,
    emailVerified: row.emailVerified,
    mustChangePassword: row.mustChangePassword,
  };
}

/** Returns the branch the member is currently active at (secondary if toggled, else home). */
export function getActiveBranchId(member: { homeBranchId: string; secondaryBranchId: string | null; isAtSecondaryBranch: boolean }): string {
  if (member.isAtSecondaryBranch && member.secondaryBranchId !== null) {
    return member.secondaryBranchId;
  }
  return member.homeBranchId;
}

async function signAccessToken(payload: AuthContext, secrets: AuthSecrets): Promise<string> {
  const key = new TextEncoder().encode(secrets.accessSecret);
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(secrets.accessTokenExpiry)
    .sign(key);
}

async function signRefreshToken(memberId: string, secrets: AuthSecrets): Promise<string> {
  const key = new TextEncoder().encode(secrets.refreshSecret);
  return new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(secrets.refreshTokenExpiry)
    .sign(key);
}

/** Generate a fresh access+refresh token pair for a given auth context. */
export async function generateTokenPair(
  authContext: AuthContext,
  secrets: AuthSecrets,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(authContext, secrets),
    signRefreshToken(authContext.memberId, secrets),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Look up the caller's Branch System Admin + Branch Data Admin authority
 * so the access token + AuthContext encode it. System admins still drive
 * authority through `systemRole`; these arrays are derived data only.
 *
 * Branch System Admin = `member_roles` JOIN `roles` (roleName = 'Branch System Admin'), active.
 * Branch Data Admin   = `branch_departments` JOIN `departments` (departmentName = 'Admin'),
 *                       where memberId matches leadMemberId or deputyMemberId, active.
 */
export async function resolveBranchAdminAuthority(
  db: Database,
  memberId: string,
): Promise<{ branchSystemAdminBranchIds: string[]; branchDataAdminBranchIds: string[] }> {
  const [bsaRows, bdaRows] = await Promise.all([
    db
      .select({ branchId: memberRoles.branchId })
      .from(memberRoles)
      .innerJoin(roles, eq(memberRoles.roleId, roles.id))
      .where(
        and(
          eq(memberRoles.memberId, memberId),
          eq(memberRoles.isActive, true),
          eq(roles.roleName, 'Branch System Admin'),
        ),
      ),
    db
      .select({ branchId: branchDepartments.branchId })
      .from(branchDepartments)
      .innerJoin(departments, eq(branchDepartments.departmentId, departments.id))
      .where(
        and(
          eq(branchDepartments.isActive, true),
          eq(departments.departmentName, 'Admin'),
          or(
            eq(branchDepartments.leadMemberId, memberId),
            eq(branchDepartments.deputyMemberId, memberId),
          ),
        ),
      ),
  ]);

  return {
    branchSystemAdminBranchIds: Array.from(new Set(bsaRows.map((r) => r.branchId))),
    branchDataAdminBranchIds: Array.from(new Set(bdaRows.map((r) => r.branchId))),
  };
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
  secondaryBranchId?: string | null;
  secondaryAddress?: string;
  secondaryCity?: string;
  secondaryPostalCode?: string;
  homeBranchId: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  password: string;
  acceptedPolicies?: boolean;
}

export async function signup(db: Database, input: SignupInput): Promise<{ member: MemberProfile; verificationToken?: string }> {
  // Check for existing email
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('A member with this email already exists');
  }

  // Minors cannot self-register — a guardian registers them (e.g. via the
  // first-timer form, which mints a 'child' shell). See U16 data-protection.
  if (isMinorMember({ dateOfBirth: input.dateOfBirth })) {
    throw new ForbiddenError(
      'Registrants under 16 cannot create their own account. Please ask a parent or guardian to register on your behalf.',
    );
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

  const passwordHash = await hashPassword(input.password);
  // Verification token: plaintext goes in the emailed link, hash sits in the DB.
  // Mirrors password_reset. verifyEmail() hash-compares against the row.
  const verificationToken = randomTokenHex(32);
  const verificationTokenHash = await hashPassword(verificationToken);
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
      secondaryBranchId: input.secondaryBranchId ?? null,
      secondaryAddress: input.secondaryAddress ?? null,
      secondaryCity: input.secondaryCity ?? null,
      secondaryPostalCode: input.secondaryPostalCode ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      homeBranchId: input.homeBranchId,
      passwordHash,
      emailVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpiry: verificationExpiry,
      approvalStatus: 'pending',
      systemRole: 'member',
      // Phase 2: signups start as attendees. Once approved + class completed,
      // an admin uses the "Mark complete" CTA on the member profile to
      // promote them to a confirmed Member (sets membershipClassCompletedAt
      // + flips memberType).
      memberType: 'attendee',
      isActive: false, // Inactive until admin approves
      mustChangePassword: false,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create member');
  }

  // Record Terms + Privacy consent inline at the current published version so
  // self-signup users don't have to accept twice (checkbox at signup + banner
  // on first login). Admin-invited members skip this path and still see the
  // banner on first login, which is correct — they never saw the docs before
  // their account was created.
  if (input.acceptedPolicies) {
    const versions = getCurrentConsentVersions();
    const now = new Date();
    await db.insert(consentRecords).values([
      {
        memberId: created.id,
        consentType: 'terms',
        version: versions.terms,
        granted: true,
        grantedAt: now,
      },
      {
        memberId: created.id,
        consentType: 'privacy',
        version: versions.privacy,
        granted: true,
        grantedAt: now,
      },
    ]);
  }

  const verifyLink = `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/verify-email?token=${verificationToken}`;

  // Fire-and-forget the email. If SES fails (or creds are absent in dev), the
  // mailer logs it; we do NOT block signup on delivery — the user can request
  // a resend, and admins can approve manually if needed.
  sendAccountVerificationEmail(created.email, created.firstName, verifyLink).catch((err) => {
    logger.error('Failed to send account verification email', {
      memberId: created.id,
      email: created.email,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // Only return the plaintext token when the mailer is NOT live (local dev
  // without SES creds). In staging/prod the email is the canonical path;
  // returning the token here bypasses the mailer entirely and used to
  // auto-verify users who never received an email — hiding real SES
  // misconfiguration behind a "success" screen.
  const mailerLive = isMailerLive();
  return {
    member: toMemberProfile(created),
    ...(mailerLive ? {} : { verificationToken }),
  };
}

async function issueAuthenticatedSession(
  db: Database,
  member: typeof members.$inferSelect,
  secrets: AuthSecrets,
): Promise<{ tokens: AuthTokens; member: MemberProfile }> {
  const [authority, grants] = await Promise.all([
    resolveBranchAdminAuthority(db, member.id),
    resolveGrants(db, member.id),
  ]);
  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = authority;

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as SystemRole,
    branchId: getActiveBranchId(member),
    activeRole: member.systemRole as SystemRole,
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    grants,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(authContext, secrets),
    signRefreshToken(member.id, secrets),
  ]);

  await db
    .update(members)
    .set({ lastLoginAt: new Date() })
    .where(eq(members.id, member.id));

  return {
    tokens: { accessToken, refreshToken },
    member: toMemberProfile(member),
  };
}

export async function login(
  db: Database,
  email: string,
  password: string,
  secrets: AuthSecrets,
): Promise<LoginResponse> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  // Capture before we update so we know if this is their first login
  const isFirstLogin = member?.lastLoginAt === null;

  // Uniform error for missing-account + wrong-password — keeps the login
  // surface from leaking which emails are registered. Status-specific
  // errors below (unverified / pending / minor) are post-credential and
  // legitimately user-facing because they require correct credentials.
  if (!member) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(password, member.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!member.emailVerified) {
    throw new ValidationError('Email not verified. Please check your email for a verification link.');
  }

  if (member.approvalStatus !== 'approved') {
    throw new ValidationError('Your account is pending approval by an administrator.');
  }

  // Minors (under-16 / memberType 'child') cannot sign in — a guardian manages
  // their record on their behalf. See the U16 data-protection feature.
  if (isMinorMember(member)) {
    throw new ForbiddenError(
      'This account belongs to a minor and cannot be used to sign in. A parent or guardian manages this record.',
    );
  }

  const session = await issueAuthenticatedSession(db, member, secrets);
  return { ...session, isFirstLogin };
}

export async function refreshAccessToken(
  db: Database,
  refreshToken: string,
  secrets: AuthSecrets,
): Promise<AuthTokens> {
  const key = new TextEncoder().encode(secrets.refreshSecret);
  let memberId: string;
  try {
    const { payload } = await jwtVerify(refreshToken, key);
    if (typeof payload['memberId'] !== 'string') {
      throw new Error('invalid payload');
    }
    memberId = payload['memberId'];
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Member not found or inactive');
  }

  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = await resolveBranchAdminAuthority(
    db,
    member.id,
  );

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as AuthContext['systemRole'],
    branchId: getActiveBranchId(member),
    activeRole: member.systemRole as AuthContext['systemRole'],
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    // RBAC Phase 1: grants live outside the JWT; populated per-request.
    grants: [],
  };

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(authContext, secrets),
    signRefreshToken(member.id, secrets),
  ]);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function verifyEmail(db: Database, token: string): Promise<void> {
  // The token in the URL is the plaintext value we emailed on signup. The DB
  // holds only the bcrypt hash + expiry. Fetch all candidate rows (unverified,
  // non-expired, token still present) and hash-compare to find the owner.
  const now = new Date();
  const candidates = await db
    .select({
      id: members.id,
      emailVerificationToken: members.emailVerificationToken,
      emailVerificationExpiry: members.emailVerificationExpiry,
    })
    .from(members)
    .where(
      and(
        eq(members.emailVerified, false),
        // gt() routes through the column encoder — the raw sql`...` template
        // does not, and hands the Date straight to postgres.js which crashes
        // in Buffer.byteLength. Column is nullable; gt() with NULL evaluates
        // false, which is the semantic we want (no expiry = no candidate).
        gt(members.emailVerificationExpiry, now),
      ),
    )
    .limit(200);

  let matched: { id: string } | null = null;
  for (const candidate of candidates) {
    if (!candidate.emailVerificationToken) continue;
    // Sequential hash compares are fine: bcrypt is fast enough at O(hundreds)
    // and signup-verification traffic is low.
    // eslint-disable-next-line no-await-in-loop
    if (await verifyPassword(token, candidate.emailVerificationToken)) {
      matched = { id: candidate.id };
      break;
    }
  }

  if (!matched) {
    throw new NotFoundError('Invalid or expired verification token');
  }

  await db
    .update(members)
    .set({
      emailVerified: true,
      // Null the token so the link is single-use — a second submit gets
      // "invalid or expired" instead of silently succeeding.
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    })
    .where(eq(members.id, matched.id));
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

  const plainToken = randomTokenHex(32);
  const tokenHash = await hashPassword(plainToken);
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
    return true; // hash compare done below
  });

  if (!match) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const valid = await verifyPassword(token, match.passwordResetToken!);
  if (!valid) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(members)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null, mustChangePassword: false })
    .where(eq(members.id, match.id));

  await dispatchNotification(db, {
    eventType: NotificationEventType.SecurityPasswordChanged,
    recipientMemberIds: [match.id],
    payload: {
      occurredAt: new Date(),
      loginUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/login`,
    },
  });

  await recordAuditEvent(db, {
    actorMemberId: match.id,
    action: AuditAction.PasswordChange,
    outcome: AuditOutcome.Success,
    metadata: { via: 'reset_password' },
  });
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

  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(members)
    .set({ passwordHash, mustChangePassword: false, updatedAt: sql`NOW()` })
    .where(eq(members.id, auth.memberId));

  await dispatchNotification(db, {
    eventType: NotificationEventType.SecurityPasswordChanged,
    recipientMemberIds: [auth.memberId],
    payload: {
      occurredAt: new Date(),
      loginUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:3002'}/login`,
    },
  });

  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.PasswordChange,
    outcome: AuditOutcome.Success,
    metadata: { via: 'change_password' },
  });
}
