import { eq, and, gt, asc } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import {
  members,
  oauthAccounts,
  oauthVerificationTokens,
  branches,
} from '@kairos/database';
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  verifyPassword,
  randomTokenHex,
  logger,
} from '@kairos/utils';
import type { ProviderId } from './providers';

/**
 * SHA-256 hex of the plaintext token. Verification tokens are already
 * 32 random bytes (high entropy) — bcrypt is inappropriate here (a) it's
 * a slow O(N) scan when we can't hash-lookup, and (b) bcrypt is designed
 * for low-entropy user passwords, not random secrets. SHA-256 lets us
 * put a UNIQUE index on `token` and do an O(1) hash-column lookup.
 */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, '0');
  return hex;
}

export interface OAuthProfile {
  provider: ProviderId;
  /** ID-token `sub` claim — stable across email changes. */
  providerUserId: string;
  /** ID-token `email` — Apple hide-my-email may omit. */
  email: string | null;
  emailVerified: boolean;
  /** Optional `name` claim (Google/Apple) — for firstName/lastName seed. */
  displayName?: string | null;
  /** Full ID-token claim payload — passed through for audit metadata only. */
  raw: Record<string, unknown>;
}

export type LinkResult =
  | {
      kind: 'signed_in';
      memberId: string;
      wasNewLink: boolean;
      wasNewMember: boolean;
    }
  | {
      kind: 'confirm_password';
      /** Plaintext token — put in the redirect URL, hashed copy sits in DB. */
      confirmationToken: string;
      /** Masked (e.g. `f***@gmail.com`) — safe to render on the confirm page. */
      conflictingMemberEmail: string;
    };

// ── Helpers ────────────────────────────────────────────────

function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function splitDisplayName(name: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return { firstName: 'Pending', lastName: 'Signup' };
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) return { firstName: trimmed, lastName: '(pending)' };
  return { firstName: trimmed.slice(0, lastSpace), lastName: trimmed.slice(lastSpace + 1) };
}

async function resolveDefaultHomeBranchId(db: Database, envDefault?: string): Promise<string> {
  if (envDefault) return envDefault;
  // Fallback: pick the oldest branch. Signup normally requires a branch; SSO
  // can't collect it up-front, so we default it and let the admin correct
  // during approval. Documented in BETTER_AUTH_SETUP.md.
  const [row] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.createdAt))
    .limit(1);
  if (!row) throw new NotFoundError('No active branches configured, so cannot create OAuth signup');
  return row.id;
}

// ── Core linker ────────────────────────────────────────────

interface FindOrCreateOpts {
  /** Optional default home branch id (from env). Falls through to oldest branch. */
  defaultHomeBranchId?: string;
}

export async function findOrCreateMemberFromOAuth(
  db: Database,
  profile: OAuthProfile,
  opts: FindOrCreateOpts = {},
): Promise<LinkResult> {
  // 1. Existing (provider, providerUserId) link → straight sign-in.
  const [existingLink] = await db
    .select({ id: oauthAccounts.id, memberId: oauthAccounts.memberId })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, profile.provider),
        eq(oauthAccounts.providerUserId, profile.providerUserId),
        eq(oauthAccounts.isActive, true),
      ),
    )
    .limit(1);

  if (existingLink) {
    await db
      .update(oauthAccounts)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(oauthAccounts.id, existingLink.id));
    logger.info('oauth.callback.match_existing', {
      module: 'auth.oauth',
      provider: profile.provider,
      memberId: existingLink.memberId,
    });
    return {
      kind: 'signed_in',
      memberId: existingLink.memberId,
      wasNewLink: false,
      wasNewMember: false,
    };
  }

  const email = normalizeEmail(profile.email);

  // 2. Apple hide-my-email + no email at all → create a pending shell with a
  //    synthetic placeholder so we can still key oauth_accounts to a member.
  if (!email) {
    const created = await createPendingMemberFromOAuth(db, profile, opts.defaultHomeBranchId);
    logger.info('oauth.callback.create_pending', {
      module: 'auth.oauth',
      provider: profile.provider,
      memberId: created.id,
      synthetic: true,
    });
    return {
      kind: 'signed_in',
      memberId: created.id,
      wasNewLink: true,
      wasNewMember: true,
    };
  }

  // 3. Email matches an existing member.
  const [existingMember] = await db
    .select({
      id: members.id,
      email: members.email,
    })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (existingMember) {
    if (profile.emailVerified) {
      // Auto-link — the IdP is our verifier.
      await db.insert(oauthAccounts).values({
        memberId: existingMember.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: email,
        providerEmailVerified: true,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
        isActive: true,
      });
      logger.info('oauth.callback.auto_link_verified', {
        module: 'auth.oauth',
        provider: profile.provider,
        memberId: existingMember.id,
      });
      return {
        kind: 'signed_in',
        memberId: existingMember.id,
        wasNewLink: true,
        wasNewMember: false,
      };
    }

    // Unverified IdP email + existing account. Do NOT auto-link — force the
    // user through a password confirmation to prove ownership.
    const plainToken = randomTokenHex(32);
    const tokenHash = await sha256Hex(plainToken);
    await db.insert(oauthVerificationTokens).values({
      identifier: existingMember.id,
      token: tokenHash,
      kind: 'link_confirmation',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: email,
      },
      isActive: true,
    });
    logger.info('oauth.callback.reject_conflict', {
      module: 'auth.oauth',
      provider: profile.provider,
      memberId: existingMember.id,
    });
    return {
      kind: 'confirm_password',
      confirmationToken: plainToken,
      conflictingMemberEmail: maskEmail(existingMember.email),
    };
  }

  // 4. No matching member — create a pending shell + link.
  const created = await createPendingMemberFromOAuth(db, profile, opts.defaultHomeBranchId);
  logger.info('oauth.callback.create_pending', {
    module: 'auth.oauth',
    provider: profile.provider,
    memberId: created.id,
  });
  return {
    kind: 'signed_in',
    memberId: created.id,
    wasNewLink: true,
    wasNewMember: true,
  };
}

// ── Pending-member creation ────────────────────────────────

export async function createPendingMemberFromOAuth(
  db: Database,
  profile: OAuthProfile,
  defaultHomeBranchId?: string,
): Promise<typeof members.$inferSelect> {
  const homeBranchId = await resolveDefaultHomeBranchId(db, defaultHomeBranchId);
  const { firstName, lastName } = splitDisplayName(profile.displayName ?? null);
  const email =
    normalizeEmail(profile.email) ??
    // Synthetic placeholder for Apple's hide-my-email path. Uniqueness is
    // guaranteed by providerUserId being globally unique per-provider.
    `${profile.providerUserId}@${profile.provider}.private-relay.local`;

  const [created] = await db
    .insert(members)
    .values({
      firstName,
      lastName,
      email,
      homeBranchId,
      // passwordHash is `notNull` in schema. Empty string is intentional:
      // bcrypt.compare(anyInput, '') always returns false, so password
      // login on this account is impossible until the user completes the
      // forgot-password flow to set one. See auth-service loginPath.
      passwordHash: '',
      // The IdP is our verifier — a member arriving via SSO for the first
      // time has demonstrated mailbox control at the provider. Force to
      // true even when a provider inexplicably returns email_verified=false
      // for a create-new flow (setup doc §5 documents this contract).
      // Only reachable when NO existing Kairos member matches the email —
      // the existing-member auto-link path already gates on this flag.
      emailVerified: true,
      approvalStatus: 'pending',
      systemRole: 'member',
      memberType: 'attendee',
      isActive: false,
      mustChangePassword: false,
      // Phase 1.5: SSO signup captured firstName/lastName/email from the
      // IdP but never asked the user for phone, T&C consent, or a chosen
      // home branch (we used DEFAULT_HOME_BRANCH_ID or the oldest branch
      // as a placeholder). The dashboard guard redirects here to
      // /profile?onboarding=1 until POST /api/auth/complete-oauth-profile
      // clears the flag.
      mustCompleteProfile: true,
    })
    .returning();

  if (!created) throw new Error('Failed to create OAuth pending member');

  await db.insert(oauthAccounts).values({
    memberId: created.id,
    provider: profile.provider,
    providerUserId: profile.providerUserId,
    providerEmail: normalizeEmail(profile.email),
    providerEmailVerified: profile.emailVerified,
    connectedAt: new Date(),
    lastUsedAt: new Date(),
    isActive: true,
  });

  return created;
}

// ── Connections management ─────────────────────────────────

export interface OAuthConnectionRow {
  provider: ProviderId;
  providerEmail: string | null;
  connectedAt: Date;
  lastUsedAt: Date | null;
}

export async function listOAuthConnections(
  db: Database,
  memberId: string,
): Promise<OAuthConnectionRow[]> {
  const rows = await db
    .select({
      provider: oauthAccounts.provider,
      providerEmail: oauthAccounts.providerEmail,
      connectedAt: oauthAccounts.connectedAt,
      lastUsedAt: oauthAccounts.lastUsedAt,
    })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.memberId, memberId), eq(oauthAccounts.isActive, true)));

  return rows.map((r) => ({
    provider: r.provider as ProviderId,
    providerEmail: r.providerEmail,
    connectedAt: r.connectedAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

export async function disconnectOAuthProvider(
  db: Database,
  memberId: string,
  provider: ProviderId,
): Promise<void> {
  const [member] = await db
    .select({ id: members.id, passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) throw new NotFoundError('Member not found');

  const activeConnections = await db
    .select({ provider: oauthAccounts.provider })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.memberId, memberId), eq(oauthAccounts.isActive, true)));

  const target = activeConnections.find((c) => c.provider === provider);
  if (!target) throw new NotFoundError('Connection not found');

  // Lockout guard — refuse to strip the only remaining sign-in method.
  const passwordless = !member.passwordHash || member.passwordHash === '';
  const otherConnections = activeConnections.filter((c) => c.provider !== provider);
  if (passwordless && otherConnections.length === 0) {
    throw new ValidationError(
      "You can't disconnect your only sign-in method. Set a password first.",
    );
  }

  await db
    .update(oauthAccounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(oauthAccounts.memberId, memberId),
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.isActive, true),
      ),
    );
}

// ── Confirm-password link flow ─────────────────────────────

export async function confirmPasswordLink(
  db: Database,
  confirmationToken: string,
  password: string,
): Promise<typeof members.$inferSelect> {
  // Direct hash-column lookup (see `sha256Hex` note above). The token column
  // is UNIQUE, so this returns at most one row — no scan, no bcrypt loop.
  const tokenHash = await sha256Hex(confirmationToken);
  const now = new Date();
  const [matched] = await db
    .select({
      id: oauthVerificationTokens.id,
      identifier: oauthVerificationTokens.identifier,
      metadata: oauthVerificationTokens.metadata,
    })
    .from(oauthVerificationTokens)
    .where(
      and(
        eq(oauthVerificationTokens.token, tokenHash),
        eq(oauthVerificationTokens.kind, 'link_confirmation'),
        eq(oauthVerificationTokens.isActive, true),
        gt(oauthVerificationTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!matched) throw new UnauthorizedError('Invalid or expired confirmation token');

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, matched.identifier))
    .limit(1);
  if (!member) throw new UnauthorizedError('Invalid or expired confirmation token');

  const passwordOk = member.passwordHash
    ? await verifyPassword(password, member.passwordHash)
    : false;
  if (!passwordOk) throw new UnauthorizedError('Incorrect password');

  const md = (matched.metadata ?? {}) as {
    provider?: string;
    providerUserId?: string;
    providerEmail?: string;
  };
  if (!md.provider || !md.providerUserId) {
    throw new UnauthorizedError('Invalid confirmation token payload');
  }

  await db.insert(oauthAccounts).values({
    memberId: member.id,
    provider: md.provider,
    providerUserId: md.providerUserId,
    providerEmail: md.providerEmail ?? null,
    // Password-confirmed link — treat as verified for this account.
    providerEmailVerified: true,
    connectedAt: new Date(),
    lastUsedAt: new Date(),
    isActive: true,
  });

  await db
    .update(oauthVerificationTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(oauthVerificationTokens.id, matched.id));

  return member;
}
