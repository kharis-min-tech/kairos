import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, or, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { Database } from '@kairos/database';
import {
  members,
  memberRoles,
  roles,
  branchDepartments,
  departments,
} from '@kairos/database';
import type {
  AuthContext,
  AuthTokens,
  FinalizeRoleResponse,
  LoginResponse,
  MemberProfile,
  RoleOption,
  RoleScope,
  SwitchRoleResponse,
} from '@kairos/types';
import type { SystemRole } from '@kairos/types';
import { isMinorMember } from '@kairos/types';
import { computeAvailableRoles } from './role-options';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
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
// 5-minute window between credentials-pass and role-finalize. Long enough
// for a thoughtful pick, short enough that a stolen sessionToken can't be
// hoarded.
const SESSION_TOKEN_EXPIRY = '5m';

/** Payload shape of the short-lived role-selection JWT. */
interface SessionTokenPayload {
  /** Discriminator so authMiddleware can reject session tokens. */
  kind: 'role-selection';
  memberId: string;
}

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
    memberType: row.memberType as MemberProfile['memberType'],
    guardianMemberId: row.guardianMemberId,
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

function signAccessToken(payload: AuthContext): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(memberId: string): string {
  return jwt.sign({ memberId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Mint a short-lived session token carrying only the validated memberId.
 * Signed with `JWT_SECRET` so the same key family covers it, but the
 * `kind: 'role-selection'` discriminator means `authMiddleware` will refuse
 * to treat it as an access token.
 */
function signSessionToken(memberId: string): string {
  const payload: SessionTokenPayload = { kind: 'role-selection', memberId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TOKEN_EXPIRY });
}

/**
 * Verify a session token and return the memberId. Throws UnauthorizedError
 * for any failure (expired, tampered, wrong kind). The `kind` check guards
 * against an attacker passing an access token here to bypass role selection.
 */
function verifySessionToken(token: string): string {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Session token expired or invalid. Please sign in again.');
  }
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    (decoded as Record<string, unknown>)['kind'] !== 'role-selection' ||
    typeof (decoded as Record<string, unknown>)['memberId'] !== 'string'
  ) {
    throw new UnauthorizedError('Session token expired or invalid. Please sign in again.');
  }
  return (decoded as SessionTokenPayload).memberId;
}

/** Generate a fresh access+refresh token pair for a given auth context. */
export function generateTokenPair(authContext: AuthContext): { accessToken: string; refreshToken: string } {
  return {
    accessToken: signAccessToken(authContext),
    refreshToken: signRefreshToken(authContext.memberId),
  };
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

/**
 * Build the AuthContext + tokens for a successfully-authenticated member
 * acting under the given activeRole + scope. Stamps `lastLoginAt` as a side
 * effect. Used by the single-role login fast-path AND by `finalizeRole`.
 */
async function issueAuthenticatedSession(
  db: Database,
  member: typeof members.$inferSelect,
  activeRole: SystemRole,
  scope: RoleScope | undefined,
): Promise<{ tokens: AuthTokens; member: MemberProfile }> {
  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = await resolveBranchAdminAuthority(
    db,
    member.id,
  );

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as SystemRole,
    branchId: getActiveBranchId(member),
    activeRole,
    ...(scope ? { scope } : {}),
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    // RBAC Phase 1: grants are populated fresh on every request by
    // authMiddleware → resolveGrants. We don't bake them into the JWT
    // because role assignments can change without re-issuing tokens.
    grants: [],
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
  };
}

/**
 * Two-step login:
 *  1. Validate email + password + activation gates.
 *  2. Compute the caller's available role options.
 *  3. Branch:
 *     - Legacy callers pass `activeRole` explicitly → validate against the
 *       options list, finalize in one trip. Preserves backwards compatibility
 *       with the existing web flow and all existing tests.
 *     - New callers omit `activeRole`. If the member has only one option,
 *       finalize directly. Otherwise return a `role-selection-required`
 *       envelope with a 5-minute sessionToken — the caller follows up with
 *       POST /api/auth/finalize-role.
 *
 * Important: we NEVER reveal what permission tiers exist to a visitor who
 * hasn't authenticated. The role-selection envelope is only emitted AFTER
 * the bcrypt check passes.
 */
export async function login(
  db: Database,
  email: string,
  password: string,
  activeRole?: SystemRole,
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

  // Minors (under-16 / memberType 'child') cannot sign in — a guardian manages
  // their record on their behalf. See the U16 data-protection feature.
  if (isMinorMember(member)) {
    throw new ForbiddenError(
      'This account belongs to a minor and cannot be used to sign in. A parent or guardian manages this record.',
    );
  }

  const availableRoles = await computeAvailableRoles(db, {
    memberId: member.id,
    systemRole: member.systemRole as SystemRole,
    homeBranchId: member.homeBranchId,
  });

  // ── Legacy / direct-finalize path ─────────────────────────
  // Callers that send `activeRole` keep the old strict-match semantics. We
  // still enforce that 'member' is a fallback every account has, and that
  // any other activeRole the caller asks for must be present in the
  // computed options.
  if (activeRole !== undefined) {
    if (activeRole === 'member') {
      const session = await issueAuthenticatedSession(db, member, 'member', undefined);
      return { ...session, isFirstLogin };
    }
    const memberSystemRole = member.systemRole as SystemRole;
    if (memberSystemRole !== activeRole) {
      // Preserve the old error message — there are tests asserting on it.
      throw new UnauthorizedError(`You don't have ${activeRole} access`);
    }
    // The unscoped system role (admin / pastor / leader) matches the
    // member's stored systemRole. Find the matching unscoped option to
    // keep the JWT shape consistent with computeAvailableRoles.
    const match = availableRoles.find(
      (opt) => opt.activeRole === activeRole && opt.scope === undefined,
    );
    const session = await issueAuthenticatedSession(
      db,
      member,
      activeRole,
      match?.scope,
    );
    return { ...session, isFirstLogin };
  }

  // ── Two-step path ────────────────────────────────────────
  // Exactly one option → finalize directly, no picker needed. This is the
  // most common case (plain members, single-fellowship leaders).
  if (availableRoles.length === 1) {
    const only = availableRoles[0]!;
    const session = await issueAuthenticatedSession(db, member, only.activeRole, only.scope);
    return { ...session, isFirstLogin };
  }

  // Multiple options → return the role-selection envelope. The sessionToken
  // is short-lived; the picker UI MUST call /finalize-role within 5 minutes
  // or the user re-authenticates.
  return {
    roleSelectionRequired: true,
    sessionToken: signSessionToken(member.id),
    availableRoles,
  };
}

/**
 * Step 2 of the two-step login. Verifies the sessionToken, re-computes the
 * available role list from the trusted memberId (NEVER trusts the request's
 * `availableRoles`), and finalizes the picked role + scope into an access
 * token pair.
 *
 * The `key` field is the integrity check: it must exactly equal one of the
 * server-recomputed options' keys. A tampered request that swaps `scope` or
 * `activeRole` for an unauthorized combination will produce a mismatched
 * key and be rejected.
 */
export async function finalizeRole(
  db: Database,
  input: {
    sessionToken: string;
    activeRole: SystemRole;
    scope?: RoleScope;
    key: string;
  },
): Promise<FinalizeRoleResponse> {
  const memberId = verifySessionToken(input.sessionToken);

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true)))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Account no longer available');
  }

  const isFirstLogin = member.lastLoginAt === null;

  const availableRoles = await computeAvailableRoles(db, {
    memberId: member.id,
    systemRole: member.systemRole as SystemRole,
    homeBranchId: member.homeBranchId,
  });

  // Recompute the canonical key and require an exact match. This catches:
  //  - clients echoing back stale option lists,
  //  - clients tampering with activeRole/scope to gain unauthorized authority,
  //  - leadership changes between login and finalize.
  // The matched option's activeRole+scope MUST equal the input's. Catches
  // a tampered payload like { key: 'leader:fellowship:X:lead', activeRole:
  // 'admin', scope: undefined } — the key resolves to a legitimate option
  // but the claimed authority doesn't.
  const match = availableRoles.find((opt) => opt.key === input.key);
  if (!match) {
    throw new UnauthorizedError('Role selection is invalid');
  }
  if (match.activeRole !== input.activeRole) {
    throw new UnauthorizedError('Role selection is invalid');
  }
  const matchScopeKey = match.scope ? `${match.scope.kind}:${match.scope.id}` : '';
  const inputScopeKey = input.scope ? `${input.scope.kind}:${input.scope.id}` : '';
  if (matchScopeKey !== inputScopeKey) {
    throw new UnauthorizedError('Role selection is invalid');
  }

  const session = await issueAuthenticatedSession(
    db,
    member,
    match.activeRole,
    match.scope,
  );
  return { ...session, isFirstLogin };
}

/**
 * Mint a fresh access+refresh pair under a different activeRole + scope for
 * an already-authenticated caller. Used by the header dropdown in Phase 3
 * so the user can swap between e.g. "Fellowship Leader — K-Groups" and
 * "Member" without signing back in.
 *
 * Re-validates against the caller's CURRENTLY available roles (recomputed
 * from auth.memberId) — leadership revocations propagate immediately.
 */
export async function switchRole(
  db: Database,
  auth: AuthContext,
  input: {
    activeRole: SystemRole;
    scope?: RoleScope;
    key: string;
  },
): Promise<SwitchRoleResponse> {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, auth.memberId), eq(members.isActive, true)))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Account no longer available');
  }

  const availableRoles = await computeAvailableRoles(db, {
    memberId: member.id,
    systemRole: member.systemRole as SystemRole,
    homeBranchId: member.homeBranchId,
  });

  // The matched option's activeRole+scope MUST equal the input's. Catches
  // a tampered payload like { key: 'leader:fellowship:X:lead', activeRole:
  // 'admin', scope: undefined } — the key resolves to a legitimate option
  // but the claimed authority doesn't.
  const match = availableRoles.find((opt) => opt.key === input.key);
  if (!match) {
    throw new UnauthorizedError('Role selection is invalid');
  }
  if (match.activeRole !== input.activeRole) {
    throw new UnauthorizedError('Role selection is invalid');
  }
  const matchScopeKey = match.scope ? `${match.scope.kind}:${match.scope.id}` : '';
  const inputScopeKey = input.scope ? `${input.scope.kind}:${input.scope.id}` : '';
  if (matchScopeKey !== inputScopeKey) {
    throw new UnauthorizedError('Role selection is invalid');
  }

  const session = await issueAuthenticatedSession(
    db,
    member,
    match.activeRole,
    match.scope,
  );
  return session;
}

/**
 * Re-expose the available role list for the currently-authenticated caller.
 * Lets the header dropdown render without making the client recompute. No
 * sessionToken needed — caller is already authenticated through the access
 * token.
 */
export async function listAvailableRolesForCurrent(
  db: Database,
  auth: AuthContext,
): Promise<RoleOption[]> {
  const [member] = await db
    .select({
      id: members.id,
      systemRole: members.systemRole,
      homeBranchId: members.homeBranchId,
    })
    .from(members)
    .where(and(eq(members.id, auth.memberId), eq(members.isActive, true)))
    .limit(1);

  if (!member) {
    throw new UnauthorizedError('Account no longer available');
  }

  return computeAvailableRoles(db, {
    memberId: member.id,
    systemRole: member.systemRole as SystemRole,
    homeBranchId: member.homeBranchId,
  });
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
