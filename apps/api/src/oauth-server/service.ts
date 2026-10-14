import type { Context } from 'hono';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database, OAuthClient } from '@kairos/database';
import {
  members,
  oauthAuthorizationCodes,
  oauthClients,
  oauthGrants,
  oauthRefreshTokens,
} from '@kairos/database';
import { NotFoundError } from '@kairos/utils';
import { resolveGrants } from '../lib/grants';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
  REFRESH_ABSOLUTE_TTL_SECONDS,
  REFRESH_IDLE_TTL_SECONDS,
  getIssuer,
} from './config';
import { randomToken, sha256Hex, timingSafeEqual, verifyPkceS256 } from './crypto';
import { AuthorizeError, OAuthError, TokenReuseError } from './errors';
import { OAUTH_SCOPES, isKnownScope, parseScopes } from './scopes';
import type { AuthorizeParams } from './schemas';
import { identityClaims, signAccessToken, signIdToken, verifyAccessToken } from './tokens';

const SECOND = 1000;
const secondsFromNow = (s: number) => new Date(Date.now() + s * SECOND);

// ── Authorization request ───────────────────────────────────

export interface ValidatedAuthorizeRequest {
  client: OAuthClient;
  redirectUri: string;
  scopes: string[];
  state?: string;
  codeChallenge: string;
  nonce?: string;
}

/**
 * Validates an authorization request, in the order that matters: the client
 * and redirect_uri are proven FIRST and failures there are not redirectable;
 * everything after can safely be reported back to the client's redirect_uri.
 */
export async function validateAuthorizeRequest(
  db: Database,
  params: AuthorizeParams,
): Promise<ValidatedAuthorizeRequest> {
  const [client] = await db
    .select()
    .from(oauthClients)
    .where(and(eq(oauthClients.clientId, params.client_id), eq(oauthClients.isActive, true)))
    .limit(1);
  if (!client) throw new AuthorizeError('invalid_client', 'Unknown or disabled application.', false);

  if (!params.redirect_uri) {
    throw new AuthorizeError('invalid_request', 'redirect_uri is required.', false);
  }
  // Exact string match. No prefixes, no wildcards, no normalisation.
  if (!client.redirectUris.includes(params.redirect_uri)) {
    throw new AuthorizeError('invalid_request', 'redirect_uri is not registered for this application.', false);
  }

  if (params.response_type !== 'code') {
    throw new AuthorizeError('unsupported_response_type', 'Only response_type=code is supported.', true);
  }
  // PKCE is mandatory for every client (OAuth 2.1), and only S256: `plain`
  // protects nothing once the challenge is observable.
  if (!params.code_challenge) {
    throw new AuthorizeError('invalid_request', 'code_challenge is required (PKCE).', true);
  }
  if (params.code_challenge_method !== 'S256') {
    throw new AuthorizeError('invalid_request', 'code_challenge_method must be S256.', true);
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(params.code_challenge)) {
    throw new AuthorizeError('invalid_request', 'code_challenge is malformed.', true);
  }

  const scopes = parseScopes(params.scope);
  if (scopes.length === 0 || !scopes.includes('openid')) {
    throw new AuthorizeError('invalid_scope', 'The openid scope is required.', true);
  }
  const unknown = scopes.find((s) => !isKnownScope(s));
  if (unknown) throw new AuthorizeError('invalid_scope', `Unknown scope: ${unknown}.`, true);
  const forbidden = scopes.find((s) => !client.allowedScopes.includes(s));
  if (forbidden) {
    throw new AuthorizeError('invalid_scope', `This application may not request: ${forbidden}.`, true);
  }

  return {
    client,
    redirectUri: params.redirect_uri,
    scopes,
    ...(params.state !== undefined && { state: params.state }),
    codeChallenge: params.code_challenge,
    ...(params.nonce !== undefined && { nonce: params.nonce }),
  };
}

async function findLiveGrant(db: Database, memberId: string, clientRowId: string) {
  const [grant] = await db
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.memberId, memberId), eq(oauthGrants.clientId, clientRowId), isNull(oauthGrants.revokedAt)))
    .limit(1);
  return grant ?? null;
}

export interface AuthorizeContext {
  client: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    homepageUrl: string | null;
    privacyUrl: string | null;
    termsUrl: string | null;
    isTrusted: boolean;
  };
  scopes: { scope: string; description: string }[];
  /** The consent screen can be skipped: trusted client, or already granted. */
  skipConsent: boolean;
  redirectHost: string;
}

export async function getAuthorizeContext(
  db: Database,
  memberId: string,
  params: AuthorizeParams,
): Promise<AuthorizeContext> {
  const req = await validateAuthorizeRequest(db, params);
  const grant = await findLiveGrant(db, memberId, req.client.id);
  const alreadyCovered = !!grant && req.scopes.every((s) => grant.scopes.includes(s));
  return {
    client: {
      name: req.client.name,
      description: req.client.description,
      logoUrl: req.client.logoUrl,
      homepageUrl: req.client.homepageUrl,
      privacyUrl: req.client.privacyUrl,
      termsUrl: req.client.termsUrl,
      isTrusted: req.client.isTrusted,
    },
    scopes: req.scopes.map((scope) => ({ scope, description: OAUTH_SCOPES[scope as keyof typeof OAUTH_SCOPES] })),
    skipConsent: req.client.isTrusted || alreadyCovered,
    redirectHost: new URL(req.redirectUri).host,
  };
}

function buildRedirect(c: Context | undefined, redirectUri: string, query: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v);
  // RFC 9207: tell the client which issuer answered, so a mix-up attack is detectable.
  url.searchParams.set('iss', getIssuer(c));
  return url.toString();
}

export interface AuthorizeDecision {
  redirectTo: string;
  approved: boolean;
  clientId: string;
  clientRowId: string;
  scopes: string[];
}

export async function decideAuthorization(
  db: Database,
  c: Context | undefined,
  memberId: string,
  params: AuthorizeParams,
  approve: boolean,
): Promise<AuthorizeDecision> {
  const req = await validateAuthorizeRequest(db, params);

  if (!approve) {
    return {
      redirectTo: buildRedirect(c, req.redirectUri, {
        error: 'access_denied',
        error_description: 'The user declined the request.',
        state: req.state,
      }),
      approved: false,
      clientId: req.client.clientId,
      clientRowId: req.client.id,
      scopes: req.scopes,
    };
  }

  // Signed in is not the same as approved: a member still awaiting approval
  // must not be able to hand their identity to another application.
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.isActive, true), eq(members.approvalStatus, 'approved')))
    .limit(1);
  if (!member) throw new AuthorizeError('access_denied', 'This account cannot authorise applications.', true);

  const existing = await findLiveGrant(db, memberId, req.client.id);
  let grantId: string;
  if (existing) {
    const merged = Array.from(new Set([...existing.scopes, ...req.scopes]));
    await db.update(oauthGrants).set({ scopes: merged, updatedAt: new Date() }).where(eq(oauthGrants.id, existing.id));
    grantId = existing.id;
  } else {
    const [created] = await db
      .insert(oauthGrants)
      .values({ memberId, clientId: req.client.id, scopes: req.scopes })
      .returning({ id: oauthGrants.id });
    if (!created) throw new Error('Grant insert returned no row');
    grantId = created.id;
  }

  const code = randomToken(32);
  await db.insert(oauthAuthorizationCodes).values({
    codeHash: await sha256Hex(code),
    grantId,
    redirectUri: req.redirectUri,
    scopes: req.scopes,
    codeChallenge: req.codeChallenge,
    nonce: req.nonce ?? null,
    expiresAt: secondsFromNow(AUTH_CODE_TTL_SECONDS),
  });

  return {
    redirectTo: buildRedirect(c, req.redirectUri, { code, state: req.state }),
    approved: true,
    clientId: req.client.clientId,
    clientRowId: req.client.id,
    scopes: req.scopes,
  };
}

// ── Token endpoint ──────────────────────────────────────────

export interface ClientCredentials {
  clientId: string;
  clientSecret?: string;
}

/** Authenticates the calling client. Public clients present no secret and rely on PKCE. */
export async function authenticateClient(db: Database, creds: ClientCredentials): Promise<OAuthClient> {
  const [client] = await db
    .select()
    .from(oauthClients)
    .where(and(eq(oauthClients.clientId, creds.clientId), eq(oauthClients.isActive, true)))
    .limit(1);
  // One message for unknown, disabled and wrong-secret: do not reveal which.
  const fail = () => new OAuthError('invalid_client', 'Client authentication failed.', 401);
  if (!client) throw fail();

  if (client.clientType === 'confidential') {
    if (!creds.clientSecret) throw fail();
    const presented = await sha256Hex(creds.clientSecret);
    const current = !!client.secretHash && timingSafeEqual(presented, client.secretHash);
    const previous =
      !!client.previousSecretHash &&
      !!client.previousSecretExpiresAt &&
      client.previousSecretExpiresAt > new Date() &&
      timingSafeEqual(presented, client.previousSecretHash);
    if (!current && !previous) throw fail();
  }
  return client;
}

async function revokeGrant(db: Database, grantId: string): Promise<void> {
  const now = new Date();
  await db.update(oauthGrants).set({ revokedAt: now, updatedAt: now }).where(and(eq(oauthGrants.id, grantId), isNull(oauthGrants.revokedAt)));
  await db.update(oauthRefreshTokens).set({ revokedAt: now }).where(and(eq(oauthRefreshTokens.grantId, grantId), isNull(oauthRefreshTokens.revokedAt)));
}

async function revokeFamily(db: Database, familyId: string): Promise<void> {
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(oauthRefreshTokens.familyId, familyId), isNull(oauthRefreshTokens.revokedAt)));
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
  id_token?: string;
}

/** What the audit trail needs to know about a token request. */
export interface TokenOutcome {
  response: TokenResponse;
  memberId: string;
  clientRowId: string;
  grantType: 'authorization_code' | 'refresh_token';
}

/** A member who may act through OAuth: active AND approved. */
function isUsable(member: { isActive: boolean; approvalStatus: string } | null): boolean {
  return !!member && member.isActive && member.approvalStatus === 'approved';
}

async function loadMember(db: Database, memberId: string) {
  const [member] = await db
    .select({
      id: members.id,
      email: members.email,
      emailVerified: members.emailVerified,
      firstName: members.firstName,
      lastName: members.lastName,
      homeBranchId: members.homeBranchId,
      isActive: members.isActive,
      approvalStatus: members.approvalStatus,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  return member ?? null;
}

async function issueRefreshToken(
  db: Database,
  input: { grantId: string; scopes: string[]; familyId: string; familyExpiresAt: Date },
): Promise<string> {
  const token = randomToken(32);
  const idle = secondsFromNow(REFRESH_IDLE_TTL_SECONDS);
  await db.insert(oauthRefreshTokens).values({
    tokenHash: await sha256Hex(token),
    familyId: input.familyId,
    grantId: input.grantId,
    scopes: input.scopes,
    // Rotation renews the idle window, never the absolute cap.
    expiresAt: idle < input.familyExpiresAt ? idle : input.familyExpiresAt,
    familyExpiresAt: input.familyExpiresAt,
  });
  return token;
}

async function touch(db: Database, clientRowId: string, grantId: string): Promise<void> {
  const now = new Date();
  await Promise.all([
    db.update(oauthClients).set({ lastUsedAt: now }).where(eq(oauthClients.id, clientRowId)),
    db.update(oauthGrants).set({ lastUsedAt: now }).where(eq(oauthGrants.id, grantId)),
  ]);
}

export async function exchangeAuthorizationCode(
  db: Database,
  c: Context | undefined,
  client: OAuthClient,
  input: { code?: string; redirectUri?: string; codeVerifier?: string },
): Promise<TokenOutcome> {
  if (!input.code || !input.redirectUri || !input.codeVerifier) {
    throw new OAuthError('invalid_request', 'code, redirect_uri and code_verifier are required.');
  }
  const invalid = () => new OAuthError('invalid_grant', 'The authorization code is invalid or has expired.');

  const [row] = await db
    .select({ code: oauthAuthorizationCodes, grant: oauthGrants })
    .from(oauthAuthorizationCodes)
    .innerJoin(oauthGrants, eq(oauthGrants.id, oauthAuthorizationCodes.grantId))
    .where(eq(oauthAuthorizationCodes.codeHash, await sha256Hex(input.code)))
    .limit(1);
  if (!row || row.grant.clientId !== client.id) throw invalid();

  // Redeeming twice means the code leaked or the client is replaying it. RFC
  // 6749 §4.1.2: revoke what the first redemption produced.
  if (row.code.consumedAt) {
    await revokeGrant(db, row.grant.id);
    throw invalid();
  }
  if (row.code.expiresAt < new Date() || row.grant.revokedAt) throw invalid();
  if (row.code.redirectUri !== input.redirectUri) throw invalid();
  if (!(await verifyPkceS256(input.codeVerifier, row.code.codeChallenge))) throw invalid();

  // Atomic claim: of two concurrent redemptions only one gets a row back.
  const claimed = await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(oauthAuthorizationCodes.id, row.code.id), isNull(oauthAuthorizationCodes.consumedAt)))
    .returning({ id: oauthAuthorizationCodes.id });
  if (claimed.length === 0) {
    await revokeGrant(db, row.grant.id);
    throw invalid();
  }

  const member = await loadMember(db, row.grant.memberId);
  if (!member || !isUsable(member)) throw invalid();

  const scopes = row.code.scopes;
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c, { memberId: member.id, client, scopes, grantId: row.grant.id }),
    issueRefreshToken(db, {
      grantId: row.grant.id,
      scopes,
      familyId: crypto.randomUUID(),
      familyExpiresAt: secondsFromNow(REFRESH_ABSOLUTE_TTL_SECONDS),
    }),
  ]);
  const idToken = scopes.includes('openid')
    ? await signIdToken(c, { member, client, scopes, nonce: row.code.nonce })
    : undefined;

  await touch(db, client.id, row.grant.id);
  return {
    memberId: member.id,
    clientRowId: client.id,
    grantType: 'authorization_code',
    response: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: scopes.join(' '),
      ...(idToken && { id_token: idToken }),
    },
  };
}

export async function exchangeRefreshToken(
  db: Database,
  c: Context | undefined,
  client: OAuthClient,
  input: { refreshToken?: string; scope?: string },
): Promise<TokenOutcome> {
  if (!input.refreshToken) throw new OAuthError('invalid_request', 'refresh_token is required.');
  const invalid = () => new OAuthError('invalid_grant', 'The refresh token is invalid or has expired.');

  const [row] = await db
    .select({ token: oauthRefreshTokens, grant: oauthGrants })
    .from(oauthRefreshTokens)
    .innerJoin(oauthGrants, eq(oauthGrants.id, oauthRefreshTokens.grantId))
    .where(eq(oauthRefreshTokens.tokenHash, await sha256Hex(input.refreshToken)))
    .limit(1);
  if (!row || row.grant.clientId !== client.id) throw invalid();

  // A rotated token turning up again means two parties hold it. We cannot tell
  // which is the thief, so end the whole family; the member signs in again.
  if (row.token.rotatedAt) {
    await revokeFamily(db, row.token.familyId);
    throw new TokenReuseError(row.grant.memberId, client.id);
  }
  const now = new Date();
  if (row.token.revokedAt || row.grant.revokedAt || row.token.expiresAt < now || row.token.familyExpiresAt < now) {
    throw invalid();
  }

  // Scope may only narrow on refresh (RFC 6749 §6).
  let scopes = row.token.scopes;
  if (input.scope) {
    const requested = parseScopes(input.scope);
    if (requested.some((s) => !row.token.scopes.includes(s))) {
      throw new OAuthError('invalid_scope', 'Requested scope exceeds the original grant.');
    }
    scopes = requested;
  }

  const member = await loadMember(db, row.grant.memberId);
  if (!member || !isUsable(member)) throw invalid();

  // Atomic rotation: only one concurrent refresh may win.
  const claimed = await db
    .update(oauthRefreshTokens)
    .set({ rotatedAt: now })
    .where(and(eq(oauthRefreshTokens.id, row.token.id), isNull(oauthRefreshTokens.rotatedAt), isNull(oauthRefreshTokens.revokedAt)))
    .returning({ id: oauthRefreshTokens.id });
  if (claimed.length === 0) {
    await revokeFamily(db, row.token.familyId);
    throw invalid();
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c, { memberId: member.id, client, scopes, grantId: row.grant.id }),
    // The rotated token keeps the FULL scope set, so a narrowed refresh does
    // not permanently shrink the grant.
    issueRefreshToken(db, {
      grantId: row.grant.id,
      scopes: row.token.scopes,
      familyId: row.token.familyId,
      familyExpiresAt: row.token.familyExpiresAt,
    }),
  ]);

  await touch(db, client.id, row.grant.id);
  return {
    memberId: member.id,
    clientRowId: client.id,
    grantType: 'refresh_token',
    response: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    },
  };
}

/** RFC 7009. Always succeeds from the caller's view; only revokes what belongs to this client. */
export async function revokeToken(
  db: Database,
  client: OAuthClient,
  token: string,
): Promise<{ grantId: string; memberId: string } | null> {
  const [row] = await db
    .select({ token: oauthRefreshTokens, grant: oauthGrants })
    .from(oauthRefreshTokens)
    .innerJoin(oauthGrants, eq(oauthGrants.id, oauthRefreshTokens.grantId))
    .where(eq(oauthRefreshTokens.tokenHash, await sha256Hex(token)))
    .limit(1);
  if (!row || row.grant.clientId !== client.id) return null;
  await revokeFamily(db, row.token.familyId);
  return { grantId: row.grant.id, memberId: row.grant.memberId };
}

// ── UserInfo ────────────────────────────────────────────────

export async function getUserInfo(
  db: Database,
  c: Context | undefined,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const verified = await verifyAccessToken(c, accessToken);
  if (!verified) throw new OAuthError('invalid_token', 'The access token is invalid or has expired.', 401);

  // Honour revocation immediately rather than waiting out the 15 minutes.
  const [grant] = await db
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.id, verified.grantId), isNull(oauthGrants.revokedAt)))
    .limit(1);
  if (!grant) throw new OAuthError('invalid_token', 'The access token has been revoked.', 401);

  const member = await loadMember(db, verified.memberId);
  if (!member || !isUsable(member)) {
    throw new OAuthError('invalid_token', 'The account is no longer active.', 401);
  }

  const claims: Record<string, unknown> = { sub: member.id, ...identityClaims(member, verified.scopes) };
  if (verified.scopes.includes('kairos:grants')) {
    // Same shape as `grants` on /api/me, resolved live — never baked into a token.
    claims['grants'] = await resolveGrants(db, member.id);
  }
  await db.update(oauthGrants).set({ lastUsedAt: new Date() }).where(eq(oauthGrants.id, grant.id));
  return claims;
}

// ── Connected apps (the member's own view) ──────────────────

export interface ConnectionDto {
  grantId: string;
  clientName: string;
  clientLogoUrl: string | null;
  clientHomepageUrl: string | null;
  scopes: { scope: string; description: string }[];
  connectedAt: string;
  lastUsedAt: string | null;
}

export async function listConnections(db: Database, memberId: string): Promise<ConnectionDto[]> {
  const rows = await db
    .select({ grant: oauthGrants, client: oauthClients })
    .from(oauthGrants)
    .innerJoin(oauthClients, eq(oauthClients.id, oauthGrants.clientId))
    .where(and(eq(oauthGrants.memberId, memberId), isNull(oauthGrants.revokedAt)))
    .orderBy(sql`${oauthGrants.createdAt} DESC`);
  return rows.map(({ grant, client }) => ({
    grantId: grant.id,
    clientName: client.name,
    clientLogoUrl: client.logoUrl,
    clientHomepageUrl: client.homepageUrl,
    scopes: grant.scopes.map((scope) => ({ scope, description: OAUTH_SCOPES[scope as keyof typeof OAUTH_SCOPES] ?? scope })),
    connectedAt: grant.createdAt.toISOString(),
    lastUsedAt: grant.lastUsedAt ? grant.lastUsedAt.toISOString() : null,
  }));
}

/** A member revoking their own grant. Scoped to memberId so it cannot touch anyone else's. */
export async function revokeOwnGrant(db: Database, memberId: string, grantId: string): Promise<{ clientRowId: string }> {
  const [grant] = await db
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.id, grantId), eq(oauthGrants.memberId, memberId), isNull(oauthGrants.revokedAt)))
    .limit(1);
  if (!grant) throw new NotFoundError('Connected app not found');
  await revokeGrant(db, grant.id);
  return { clientRowId: grant.clientId };
}
