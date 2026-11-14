import { SignJWT, jwtVerify } from 'jose';
import type { Context } from 'hono';
import { eq, and, or, gt, sql } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  memberRoles,
  roles,
  branchDepartments,
  departments,
  consentRecords,
  branches,
} from '@kairos/database';
import { getCurrentConsentVersions } from '../consent/service';
import type {
  AuthContext,
  AuthTokens,
  LoginResponse,
  MemberProfile,
  MfaChallenge,
} from '@kairos/types';
import type { SystemRole } from '@kairos/types';
import { isMinorMember } from '@kairos/types';
import { resolveGrants } from '../lib/grants';
import { readSetting } from '../lib/secret-env';
import { MFA_TOKEN_KIND } from '../lib/token-kinds';
import { hasConfirmedFactor, mfaIsRequiredFor } from './mfa';
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
    profession: row.profession,
    memberType: row.memberType as MemberProfile['memberType'],
    membershipClassCompletedAt: row.membershipClassCompletedAt
      ? row.membershipClassCompletedAt.toISOString()
      : null,
    emailVerified: row.emailVerified,
    mustChangePassword: row.mustChangePassword,
    mustCompleteProfile: row.mustCompleteProfile,
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

/**
 * `mfa` records whether the sign-in this token descends from actually passed
 * a second factor.
 *
 * It has to live in the refresh token, because the refresh token is the only
 * thing a long-lived session carries. On mobile it is sealed behind the
 * keychain for a YEAR, so without this claim the biometric path would be
 * permanently exempt from MFA: sign in once before enrolling, and every
 * refresh for the next twelve months mints a full access token on the
 * strength of a sign-in that never saw a code.
 *
 * Stamped honestly, including `false` for a member who did not need a factor
 * at the time. If they are later granted a role and enrol, `refreshAccessToken`
 * sees `mfa: false` against a now-enrolled account and makes them sign in
 * again — which is right, because a token minted before the factor existed
 * proves nothing about it.
 */
async function signRefreshToken(
  memberId: string,
  secrets: AuthSecrets,
  mfa: boolean,
  tokenVersion: number,
): Promise<string> {
  const key = new TextEncoder().encode(secrets.refreshSecret);
  // `tv` is the generation this token belongs to. Bumping members.token_version
  // strands every token minted before the bump, which is how a password change
  // or an administrator's factor reset evicts sessions that already exist.
  return new SignJWT({ memberId, mfa, tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(secrets.refreshTokenExpiry)
    .sign(key);
}

/**
 * The token kind issued between a correct password and a correct code.
 *
 * `authMiddleware` refuses it for every `/api/*` route, exactly as it already
 * refuses the role-selection token, so holding one grants nothing except the
 * right to finish signing in. Five minutes because it is a step in a flow a
 * person is actively in the middle of, not a session.
 */
export { MFA_TOKEN_KIND };
const MFA_TOKEN_EXPIRY = '5m';

export async function signMfaToken(
  memberId: string,
  stage: 'challenge' | 'enrolment',
  secrets: AuthSecrets,
): Promise<string> {
  const key = new TextEncoder().encode(secrets.accessSecret);
  return new SignJWT({ kind: MFA_TOKEN_KIND, memberId, stage })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(MFA_TOKEN_EXPIRY)
    .sign(key);
}

/** Verify a pre-MFA token. Throws 401 for anything else, including a real access token. */
export async function verifyMfaToken(
  token: string,
  secrets: AuthSecrets,
): Promise<{ memberId: string; stage: 'challenge' | 'enrolment' }> {
  const key = new TextEncoder().encode(secrets.accessSecret);
  try {
    const { payload } = await jwtVerify(token, key);
    // The kind check is the load-bearing half. Both token kinds are signed
    // with the same secret, so without it an ordinary access token would be
    // accepted here — and an expired-session user could walk through the MFA
    // exchange to mint a fresh one.
    if (payload['kind'] !== MFA_TOKEN_KIND) throw new Error('wrong kind');
    const memberId = payload['memberId'];
    const stage = payload['stage'];
    if (typeof memberId !== 'string') throw new Error('invalid payload');
    if (stage !== 'challenge' && stage !== 'enrolment') throw new Error('invalid stage');
    return { memberId, stage };
  } catch {
    throw new UnauthorizedError('Your sign-in attempt has expired. Please sign in again.');
  }
}

/**
 * Generate a fresh access+refresh token pair for a given auth context.
 *
 * `mfaSatisfied` defaults to true because every caller is re-minting tokens
 * for a session that is ALREADY past `authMiddleware` — the branch toggle is
 * the only one. Defaulting it to false would silently demote such a session
 * and 401 the user at their next refresh for doing nothing but switching
 * branch.
 */
export async function generateTokenPair(
  authContext: AuthContext,
  secrets: AuthSecrets,
  mfaSatisfied = true,
  tokenVersion = 0,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(authContext, secrets),
    signRefreshToken(authContext.memberId, secrets, mfaSatisfied, tokenVersion),
  ]);
  return { accessToken, refreshToken };
}

/**
 * The generation a refresh token belongs to.
 *
 * Absent on every token minted before `token_version` existed. Those are read
 * as generation zero, which is the generation every member is on until
 * something revokes, so deploying this signs nobody out. A token claiming a
 * non-numeric generation is not a token this system minted.
 */
function tokenGenerationOf(payload: Record<string, unknown>): number {
  const claimed = payload['tv'];
  return typeof claimed === 'number' ? claimed : 0;
}

/**
 * End every session this member currently has.
 *
 * Call it from anywhere a credential changes or is taken away. It strands
 * refresh tokens immediately; access tokens already issued keep working until
 * they expire, at most 15 minutes, because checking this on every request
 * would mean a database read per request and would give up the reason access
 * tokens are stateless.
 */
export async function revokeSessions(db: Database, memberId: string): Promise<void> {
  await db
    .update(members)
    .set({ tokenVersion: sql`${members.tokenVersion} + 1`, updatedAt: sql`NOW()` })
    .where(eq(members.id, memberId));
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

export async function signup(db: Database, input: SignupInput): Promise<{ member: MemberProfile; verificationToken?: string; sendVerificationEmail: Promise<void> }> {
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

  // Return the send as a promise so the router can hand it to
  // `c.executionCtx.waitUntil(...)`. CF Workers cancel un-awaited promises
  // the moment fetch() returns; a floating `.catch(...)` here would silently
  // kill every verification email in staging/prod.
  const sendVerificationEmail = sendAccountVerificationEmail(
    created.email,
    created.firstName,
    verifyLink,
  ).catch((err) => {
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
    sendVerificationEmail,
    ...(mailerLive ? {} : { verificationToken }),
  };
}

export async function issueAuthenticatedSession(
  db: Database,
  member: typeof members.$inferSelect,
  secrets: AuthSecrets,
  options: { mfaSatisfied?: boolean; c?: Context } = {},
): Promise<{ tokens?: AuthTokens; member: MemberProfile; mfa?: MfaChallenge; mfaSetupRecommended?: boolean }> {
  // Last line of defence: every sign-in door funnels through here — password
  // login, the OAuth callback and the OAuth confirm-link exchange. `login()`
  // rejects a deactivated member earlier with a friendlier message; the OAuth
  // paths carried no account-state checks at all, so without this guard a
  // deactivated member could sign straight back in via a linked provider.
  if (!member.isActive) {
    throw new ForbiddenError('This account has been deactivated.');
  }

  const [authority, grants] = await Promise.all([
    resolveBranchAdminAuthority(db, member.id),
    resolveGrants(db, member.id),
  ]);
  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = authority;

  // The second factor, decided at the one place every sign-in door passes
  // through. Password login, the OAuth callback and the OAuth confirm-link
  // exchange all land here, so a factor required here is required by all
  // three — there is no door left to walk around it.
  const mfaRequired = mfaIsRequiredFor(member.systemRole as SystemRole, grants);
  if (mfaRequired && !options.mfaSatisfied) {
    const enrolled = await hasConfirmedFactor(db, member.id);

    if (enrolled) {
      return {
        member: toMemberProfile(member),
        mfa: {
          token: await signMfaToken(member.id, 'challenge', secrets),
          stage: 'challenge',
        },
      };
    }

    // No factor yet. Whether that blocks sign-in is a rollout decision, not a
    // security one: on the day this ships nobody is enrolled, so blocking
    // immediately would lock every leader out of the system at once. Before
    // MFA_REQUIRED_FROM they are signed in and nagged; after it they must
    // enrol before they get a usable token.
    if (mfaCutoverPassed(options.c)) {
      return {
        member: toMemberProfile(member),
        mfa: {
          token: await signMfaToken(member.id, 'enrolment', secrets),
          stage: 'enrolment',
        },
      };
    }
  }

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
    // Honest, not convenient: `false` for a privileged member signed in
    // during the grace period with no factor. If they enrol later, this
    // token stops working and they sign in again, because a token minted
    // before the factor existed proves nothing about it.
    signRefreshToken(member.id, secrets, Boolean(options.mfaSatisfied) || !mfaRequired, member.tokenVersion),
  ]);

  await db
    .update(members)
    .set({ lastLoginAt: new Date() })
    .where(eq(members.id, member.id));

  return {
    tokens: { accessToken, refreshToken },
    member: toMemberProfile(member),
    ...(mfaRequired && !options.mfaSatisfied ? { mfaSetupRecommended: true } : {}),
  };
}

/**
 * Whether the church-wide deadline for having a factor has passed.
 *
 * Unset means "not yet", which is the deliberate default: a date nobody has
 * chosen should not lock anybody out. `docs/security/` carries this as a
 * decision for the church to make once enrolment has been walked through
 * with the fellowship leaders.
 */
function mfaCutoverPassed(c?: Context): boolean {
  const configured = readSetting(c, 'MFA_REQUIRED_FROM', '');
  if (!configured) return false;
  const cutover = Date.parse(configured);
  // An unparseable date must not silently mean "enforce now" OR "never".
  // Treating it as "not yet" is the safer of the two and the log says why.
  if (Number.isNaN(cutover)) {
    logger.error('MFA_REQUIRED_FROM is set but is not a parseable date; treating MFA as not yet mandatory', {
      value: configured,
    });
    return false;
  }
  return Date.now() >= cutover;
}

export async function login(
  db: Database,
  email: string,
  password: string,
  secrets: AuthSecrets,
  // Carries the Worker's env bindings, which is where MFA_REQUIRED_FROM lives.
  c?: Context,
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

  // Deactivation is the control used when someone leaves or is suspended, so
  // it has to end access, not just hide the row. Checked ahead of the other
  // state checks because it is the most decisive: telling a deactivated
  // member their email is unverified would send them down the wrong path.
  if (!member.isActive) {
    throw new ValidationError('Your account has been deactivated. Please contact an administrator.');
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

  const session = await issueAuthenticatedSession(db, member, secrets, { c });
  return { ...session, isFirstLogin };
}

export async function refreshAccessToken(
  db: Database,
  refreshToken: string,
  secrets: AuthSecrets,
): Promise<AuthTokens> {
  const key = new TextEncoder().encode(secrets.refreshSecret);
  let memberId: string;
  let mfaSatisfied: boolean;
  let generation: number;
  try {
    const { payload } = await jwtVerify(refreshToken, key);
    if (typeof payload['memberId'] !== 'string') {
      throw new Error('invalid payload');
    }
    memberId = payload['memberId'];
    generation = tokenGenerationOf(payload as Record<string, unknown>);
    // Absent on every token minted before MFA existed, which is correct:
    // those sessions never saw a code, so they must not inherit a pass.
    mfaSatisfied = payload['mfa'] === true;
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

  // The session was revoked: a password change, a password reset, or an
  // administrator resetting this member's second factor. The token is
  // cryptographically valid and belongs to a generation that no longer runs.
  //
  // Checked before the grant and MFA work below, because none of that is
  // worth doing for a session that is already over, and because a 401 here
  // must not depend on anything that could throw first.
  if (generation !== member.tokenVersion) {
    throw new UnauthorizedError('Your session has ended. Please sign in again.');
  }

  const [authority, grants] = await Promise.all([
    resolveBranchAdminAuthority(db, member.id),
    resolveGrants(db, member.id),
  ]);
  const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = authority;

  // Enforcement has to happen HERE as well as at login, or mobile is exempt
  // from MFA entirely. The refresh token is sealed behind the keychain's
  // biometric requirement for a year, and this endpoint mints a full access
  // token from it without a password, let alone a code. A check only at
  // login would mean a privileged user who signed in before enrolling keeps
  // minting unchallenged tokens until the token expires in twelve months.
  //
  // The condition is "enrolled", not "privileged": a privileged member who
  // has not set a factor up yet cannot be asked to produce one, and failing
  // them here would log out every leader the moment this deploys.
  if (!mfaSatisfied && mfaIsRequiredFor(member.systemRole as SystemRole, grants)) {
    if (await hasConfirmedFactor(db, member.id)) {
      // 401 rather than a challenge here on purpose. The api-client treats a
      // failed refresh as terminal and sends the user to sign in, which is
      // exactly where the challenge lives. Inventing a second challenge flow
      // at refresh time would be a second place for it to be got wrong.
      throw new UnauthorizedError('Please sign in again to confirm your authenticator.');
    }
  }

  const authContext: AuthContext = {
    memberId: member.id,
    email: member.email,
    systemRole: member.systemRole as AuthContext['systemRole'],
    branchId: getActiveBranchId(member),
    activeRole: member.systemRole as AuthContext['systemRole'],
    branchSystemAdminBranchIds,
    branchDataAdminBranchIds,
    // The API re-resolves grants from the database on every request, so it
    // never reads these. Both clients do: `useCapabilities()` on web and its
    // mobile twin decode the access token to decide which affordances to
    // offer. Minting a refreshed token with an empty array therefore stripped
    // every capability-gated button, menu and page the moment the first
    // refresh landed — and logging out and back in "fixed" it, because only
    // the login path filled this in. Re-resolve here too.
    grants,
  };

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(authContext, secrets),
    // Carried forward, not re-asserted. Rotation must not launder a session
    // into a stronger one than the sign-in that created it.
    signRefreshToken(member.id, secrets, mfaSatisfied, member.tokenVersion),
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

export async function forgotPassword(db: Database, email: string): Promise<{ resetToken?: string }> {
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

  // Only return the plaintext reset token when the mailer is NOT live (local
  // dev without SES creds) — same gate as the signup verification token
  // above. POST /api/auth/forgot-password is unauthenticated, so returning
  // this in staging/prod made any member's email address sufficient to take
  // over their account: request a reset, read the token out of the response,
  // POST it to /reset-password. The email is the only delivery path once the
  // mailer is bound.
  const mailerLive = isMailerLive();
  return { ...(mailerLive ? {} : { resetToken: plainToken }) };
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

  // Revoked unconditionally here, unlike `changePassword`, and no fresh
  // tokens are handed back. Somebody resetting a forgotten password is the
  // case where an attacker most plausibly already holds a session, and the
  // member is at a sign-in screen anyway: there is no session worth sparing.
  await db
    .update(members)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      mustChangePassword: false,
      tokenVersion: sql`${members.tokenVersion} + 1`,
    })
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

/**
 * Change a password, and end every other session.
 *
 * Returns a fresh token pair for the device doing the change, so the member
 * is not signed out of the session they are sitting in. Without that, this
 * function would log them out of the browser they just used, which is why
 * revocation was never wired up here before.
 *
 * It is also what makes the mobile screen's promise true. That screen has
 * told members "Other devices will need to sign in again on their next
 * request" since it was written, and until now nothing did.
 */
export async function changePassword(
  db: Database,
  auth: AuthContext,
  currentPassword: string,
  newPassword: string,
  secrets?: AuthSecrets,
): Promise<AuthTokens | undefined> {
  const [member] = await db
    .select({ id: members.id, passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);

  if (!member) throw new NotFoundError('Member not found');

  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);

  // One statement, so a crash between the two cannot leave the password
  // changed and the old sessions alive.
  await db
    .update(members)
    .set({
      passwordHash,
      mustChangePassword: false,
      tokenVersion: sql`${members.tokenVersion} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(members.id, auth.memberId));

  // Re-read rather than assume the new value: another revocation could have
  // landed between the read above and this write, and minting a token for a
  // generation that is not the current one would sign this device out too.
  const [updated] = await db
    .select({ tokenVersion: members.tokenVersion })
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);

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

  // No secrets passed means the caller does not want a session back. Nothing
  // in the app does that today; it keeps the function usable from a script.
  if (!secrets) return undefined;

  return generateTokenPair(
    { ...auth, grants: auth.grants ?? [] },
    secrets,
    true,
    updated?.tokenVersion ?? 0,
  );
}

// ── SSO onboarding: complete-oauth-profile ────────────────

export interface CompleteOAuthProfileInput {
  phone: string;
  homeBranchId: string;
  acceptedPolicies?: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

/**
 * Phase 1.5 Better-Auth: finalize an SSO signup. The caller must currently
 * be flagged `mustCompleteProfile === true` — any other state throws a
 * validation error so a normal member can't accidentally overwrite their
 * home branch by hitting this endpoint. On success:
 *   - phone + homeBranchId are persisted
 *   - Terms + Privacy consent records are inserted (only if the user hasn't
 *     already accepted the current published version — checked live so this
 *     path is idempotent if the client double-submits)
 *   - `mustCompleteProfile` flips to FALSE
 *
 * `approvalStatus` is NOT touched here. Admin approval is a separate gate;
 * the caller lands on /pending-approval afterwards and waits.
 */
export async function completeOauthProfile(
  db: Database,
  auth: AuthContext,
  input: CompleteOAuthProfileInput,
): Promise<MemberProfile> {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, auth.memberId))
    .limit(1);

  if (!member) throw new NotFoundError('Member not found');

  if (!member.mustCompleteProfile) {
    throw new ValidationError(
      'This account has already completed onboarding.',
    );
  }

  // Verify the chosen home branch exists + is active. Reject on unknown
  // branch — the dropdown on the client is server-populated so this is
  // only reachable via a crafted request, but a clean 400 is friendlier
  // than a FK-violation 500.
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, input.homeBranchId), eq(branches.isActive, true)))
    .limit(1);
  if (!branch) {
    throw new ValidationError('Please pick an active branch.');
  }

  // Phone-uniqueness guard mirrors signup() — refuse to steal an active
  // member's number.
  const phoneConflict = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.phone, input.phone), eq(members.isActive, true)))
    .limit(1);
  const conflictingId = phoneConflict[0]?.id;
  if (conflictingId && conflictingId !== auth.memberId) {
    throw new ConflictError('A member with this phone number already exists');
  }

  // Insert Terms + Privacy consent only if the user hasn't already accepted
  // the current published version. Guards against double-submit re-inserts
  // and lets us keep the T&C checkbox conditional on the client.
  const versions = getCurrentConsentVersions();
  const [existingTerms, existingPrivacy] = await Promise.all([
    db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.memberId, member.id),
          eq(consentRecords.consentType, 'terms'),
          eq(consentRecords.version, versions.terms),
          eq(consentRecords.granted, true),
          eq(consentRecords.isActive, true),
        ),
      )
      .limit(1),
    db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.memberId, member.id),
          eq(consentRecords.consentType, 'privacy'),
          eq(consentRecords.version, versions.privacy),
          eq(consentRecords.granted, true),
          eq(consentRecords.isActive, true),
        ),
      )
      .limit(1),
  ]);

  const needsConsent = !existingTerms[0] || !existingPrivacy[0];
  if (needsConsent && !input.acceptedPolicies) {
    throw new ValidationError(
      'You must accept the Terms & Conditions and Privacy Notice to continue',
    );
  }

  const now = new Date();
  if (needsConsent && input.acceptedPolicies) {
    const rows: Array<typeof consentRecords.$inferInsert> = [];
    if (!existingTerms[0]) {
      rows.push({
        memberId: member.id,
        consentType: 'terms',
        version: versions.terms,
        granted: true,
        grantedAt: now,
      });
    }
    if (!existingPrivacy[0]) {
      rows.push({
        memberId: member.id,
        consentType: 'privacy',
        version: versions.privacy,
        granted: true,
        grantedAt: now,
      });
    }
    if (rows.length > 0) {
      await db.insert(consentRecords).values(rows);
    }
  }

  // Build a set patch that only writes columns the caller actually sent.
  // Empty strings for optional fields are normalised to null so the DB stores
  // "not provided" rather than a spurious empty string.
  const setPatch: Partial<typeof members.$inferInsert> = {
    phone: input.phone,
    homeBranchId: input.homeBranchId,
    mustCompleteProfile: false,
    updatedAt: now,
  };
  const opt = <T extends string>(v: T | undefined): T | null | undefined =>
    v === undefined ? undefined : v === '' ? null : v;
  if (input.firstName !== undefined && input.firstName !== '') {
    // firstName + lastName are NOT NULL — only overwrite with a non-empty value.
    setPatch.firstName = input.firstName;
  }
  if (input.lastName !== undefined && input.lastName !== '') {
    setPatch.lastName = input.lastName;
  }
  const middleName = opt(input.middleName);
  if (middleName !== undefined) setPatch.middleName = middleName;
  const gender = opt(input.gender);
  if (gender !== undefined) setPatch.gender = gender;
  const dob = opt(input.dateOfBirth);
  if (dob !== undefined) setPatch.dateOfBirth = dob;
  const address = opt(input.address);
  if (address !== undefined) setPatch.address = address;
  const city = opt(input.city);
  if (city !== undefined) setPatch.city = city;
  const postalCode = opt(input.postalCode);
  if (postalCode !== undefined) setPatch.postalCode = postalCode;
  const ecName = opt(input.emergencyContactName);
  if (ecName !== undefined) setPatch.emergencyContactName = ecName;
  const ecPhone = opt(input.emergencyContactPhone);
  if (ecPhone !== undefined) setPatch.emergencyContactPhone = ecPhone;
  const ecRel = opt(input.emergencyContactRelationship);
  if (ecRel !== undefined) setPatch.emergencyContactRelationship = ecRel;

  const [updated] = await db
    .update(members)
    .set(setPatch)
    .where(eq(members.id, member.id))
    .returning();

  if (!updated) throw new Error('Failed to update member during onboarding');

  return toMemberProfile(updated);
}
