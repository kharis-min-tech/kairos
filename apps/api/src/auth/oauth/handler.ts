import type { Context } from 'hono';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { eq } from 'drizzle-orm';
import { members } from '@kairos/database';
import { db } from '../../db';
import { logger, ValidationError } from '@kairos/utils';
import { NotificationEventType, AuditAction, AuditOutcome } from '@kairos/types';
import { getAuthSecrets } from '../../lib/auth-secrets';
import { recordAuditEvent, hasPriorSigninFromUserAgent } from '../../audit/service';
import { extractRequestContext } from '../../audit/context';
import { dispatchNotification } from '../../notifications/service';
import { issueAuthenticatedSession } from '../service';
import { PROVIDERS, type ProviderId } from './providers';
import { readOAuthEnv } from './env';
import {
  generatePkcePair,
  generateStateCookie,
  generateStateNonce,
  parseStateCookie,
  readCookie,
  stateCookieClearHeader,
  stateCookieSetHeader,
  OAUTH_STATE_COOKIE_NAME,
} from './state';
import {
  findOrCreateMemberFromOAuth,
  type OAuthProfile,
} from './service';

/**
 * JWKS caches — createRemoteJWKSet is expensive and idempotent per URL.
 * Keyed by jwksUrl so each provider gets its own cache.
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(url: string) {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, jwks);
  }
  return jwks;
}

// ── Helpers ────────────────────────────────────────────────

function frontendUrl(c: Context): string {
  const env = readOAuthEnv(c);
  return env.FRONTEND_URL ?? 'http://localhost:3002';
}

function computeRedirectUri(c: Context, provider: ProviderId): string {
  // Reconstruct the origin from the incoming request. Never trust a query
  // param — that would let an attacker point the callback at their server.
  const url = new URL(c.req.url);
  return `${url.origin}/api/auth/oauth/${provider}/callback`;
}

function isSafeReturnTo(candidate: string | null | undefined): candidate is string {
  if (!candidate) return false;
  if (!candidate.startsWith('/')) return false;
  if (candidate.startsWith('//')) return false;
  // Reject obvious control-char injection.
  if (/[\r\n]/.test(candidate)) return false;
  return true;
}

async function exchangeAuthorizationCode(
  provider: (typeof PROVIDERS)[ProviderId],
  code: string,
  redirectUri: string,
  verifier: string,
  clientId: string,
  clientSecret: string | undefined,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    // Do NOT log the response body — some providers echo the code back.
    logger.warn('oauth.callback.token_exchange_failed', {
      module: 'auth.oauth',
      provider: provider.id,
      status: res.status,
    });
    throw new ValidationError('token_exchange_failed');
  }
  const json = (await res.json()) as Record<string, unknown>;
  return json;
}

async function verifyIdToken(
  provider: (typeof PROVIDERS)[ProviderId],
  idToken: string,
  audience: string,
): Promise<Record<string, unknown>> {
  const jwks = getJwks(provider.jwksUrl);
  const { payload } = await jwtVerify(idToken, jwks, {
    audience,
    // Provider issuer handling: Microsoft is per-tenant, so we let the custom
    // `issuerMatches` handle it and skip jose's built-in check.
    ...(provider.issuerMatches ? {} : { issuer: provider.issuer }),
  });
  if (provider.issuerMatches) {
    const iss = typeof payload['iss'] === 'string' ? (payload['iss'] as string) : '';
    if (!provider.issuerMatches(iss)) {
      throw new Error('id_token_invalid_issuer');
    }
  }
  return payload as Record<string, unknown>;
}

function buildProfile(
  provider: (typeof PROVIDERS)[ProviderId],
  claims: Record<string, unknown>,
): OAuthProfile {
  const sub = typeof claims['sub'] === 'string' ? (claims['sub'] as string) : '';
  if (!sub) throw new Error('id_token_missing_sub');
  const email = typeof claims['email'] === 'string' ? (claims['email'] as string) : null;
  const emailVerified = provider.isEmailVerified(claims);
  let displayName: string | null = null;
  const nameClaim = claims['name'];
  if (typeof nameClaim === 'string') displayName = nameClaim;
  return {
    provider: provider.id,
    providerUserId: sub,
    email,
    emailVerified,
    displayName,
    raw: claims,
  };
}

// ── Start ──────────────────────────────────────────────────

export async function handleOAuthStart(c: Context, providerId: ProviderId): Promise<Response> {
  const provider = PROVIDERS[providerId];
  const env = readOAuthEnv(c);
  const clientId = provider.getClientId(env);
  if (!clientId) {
    return c.json(
      { success: false, message: 'Provider not configured' },
      501,
    );
  }

  const returnToQ = c.req.query('returnTo');
  const returnTo = isSafeReturnTo(returnToQ) ? returnToQ : undefined;

  const { verifier, challenge } = await generatePkcePair();
  const nonce = generateStateNonce();
  const secret = getAuthSecrets(c).accessSecret;
  const cookieValue = await generateStateCookie(
    { provider: providerId, verifier, nonce, ...(returnTo ? { returnTo } : {}) },
    secret,
  );

  const redirectUri = computeRedirectUri(c, providerId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes,
    state: nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  if (providerId === 'apple') {
    // Apple requires form_post so the callback POSTs id_token/code back to
    // us as application/x-www-form-urlencoded from a top-level nav.
    params.set('response_mode', 'form_post');
  }
  if (providerId === 'microsoft') {
    // Force fresh consent for the requested scopes on first sign-in so
    // multi-tenant + personal accounts don't silently reuse a stale grant.
    params.set('prompt', 'select_account');
  }

  const authorizeUrl = `${provider.authorizeUrl}?${params.toString()}`;

  logger.info('oauth.start', {
    module: 'auth.oauth',
    provider: providerId,
    hasReturnTo: Boolean(returnTo),
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl,
      'Set-Cookie': stateCookieSetHeader(cookieValue),
    },
  });
}

// ── Callback ───────────────────────────────────────────────

async function readCallbackParams(c: Context): Promise<{ code: string | null; state: string | null }> {
  if (c.req.method === 'POST') {
    // Apple form_post — application/x-www-form-urlencoded
    const raw = await c.req.text();
    const params = new URLSearchParams(raw);
    return { code: params.get('code'), state: params.get('state') };
  }
  return { code: c.req.query('code') ?? null, state: c.req.query('state') ?? null };
}

function redirectError(c: Context, code: string): Response {
  const url = new URL('/login', frontendUrl(c));
  url.searchParams.set('oauth_error', code);
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': stateCookieClearHeader(),
    },
  });
}

/**
 * Record a SigninFailure audit row for an OAuth error, then redirect. Mirrors
 * the password-login parity in `apps/api/src/auth/router.ts` — every rejected
 * sign-in attempt lands in audit_log with `method=<provider>`. `actorMemberId`
 * is null because at the point of these failures we haven't identified a
 * Kairos member (state mismatch, id_token invalid, etc.).
 */
async function auditFailureAndRedirect(
  c: Context,
  providerId: ProviderId,
  slug: string,
): Promise<Response> {
  const ctx = extractRequestContext(c);
  await recordAuditEvent(db, {
    actorMemberId: null,
    action: AuditAction.SigninFailure,
    outcome: AuditOutcome.Failure,
    ctx,
    metadata: { method: providerId, reason: slug },
  });
  return redirectError(c, slug);
}

export async function handleOAuthCallback(c: Context, providerId: ProviderId): Promise<Response> {
  const provider = PROVIDERS[providerId];
  const env = readOAuthEnv(c);
  const clientId = provider.getClientId(env);
  if (!clientId) {
    return c.json({ success: false, message: 'Provider not configured' }, 501);
  }

  const { code, state } = await readCallbackParams(c);
  if (!code || !state) return auditFailureAndRedirect(c, providerId, 'provider_error');

  // Load + verify the state cookie.
  const cookieValue = readCookie(c.req.header('Cookie'), OAUTH_STATE_COOKIE_NAME);
  if (!cookieValue) return auditFailureAndRedirect(c, providerId, 'state_mismatch');
  const secret = getAuthSecrets(c).accessSecret;
  let payload;
  try {
    payload = await parseStateCookie(cookieValue, secret);
  } catch {
    return auditFailureAndRedirect(c, providerId, 'state_mismatch');
  }
  if (payload.provider !== providerId || payload.nonce !== state) {
    return auditFailureAndRedirect(c, providerId, 'state_mismatch');
  }

  const redirectUri = computeRedirectUri(c, providerId);

  try {
    const clientSecret = await provider.getClientSecret(env);
    const tokens = await exchangeAuthorizationCode(
      provider,
      code,
      redirectUri,
      payload.verifier,
      clientId,
      clientSecret,
    );
    const idToken = tokens['id_token'];
    if (typeof idToken !== 'string') throw new Error('id_token_missing');

    let claims;
    try {
      claims = await verifyIdToken(provider, idToken, clientId);
    } catch (err) {
      logger.warn('oauth.callback.id_token_invalid', {
        module: 'auth.oauth',
        provider: providerId,
        reason: err instanceof Error ? err.message : 'unknown',
      });
      return auditFailureAndRedirect(c, providerId, 'id_token_invalid');
    }

    const profile = buildProfile(provider, claims);

    const link = await findOrCreateMemberFromOAuth(db, profile, {
      defaultHomeBranchId: env.DEFAULT_HOME_BRANCH_ID,
    });

    if (link.kind === 'confirm_password') {
      const url = new URL('/oauth-confirm-link', frontendUrl(c));
      url.searchParams.set('token', link.confirmationToken);
      url.searchParams.set('email', link.conflictingMemberEmail);
      url.searchParams.set('provider', providerId);
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.toString(),
          'Set-Cookie': stateCookieClearHeader(),
        },
      });
    }

    // Sign in — reuse existing session issuer.
    const [member] = await db.select().from(members).where(eq(members.id, link.memberId)).limit(1);
    if (!member) return auditFailureAndRedirect(c, providerId, 'provider_error');

    const session = await issueAuthenticatedSession(db, member, getAuthSecrets(c));

    const ctx = extractRequestContext(c);

    // Parity with password login: fire the new-device notification whenever
    // the caller's user-agent hasn't been seen on a successful sign-in
    // before — regardless of whether the OAuth link is fresh or the member
    // is brand-new. Brand-new members trivially match (no prior UA on file)
    // and still get the notification; returning users on a new phone /
    // browser also get it, which is the whole point of the security alert.
    const isNewDevice = ctx.userAgent
      ? !(await hasPriorSigninFromUserAgent(db, member.id, ctx.userAgent))
      : false;

    await recordAuditEvent(db, {
      actorMemberId: member.id,
      action: AuditAction.SigninSuccess,
      outcome: AuditOutcome.Success,
      ctx,
      metadata: {
        method: providerId,
        wasNewLink: link.wasNewLink,
        wasNewMember: link.wasNewMember,
        provider_sub_claim: profile.providerUserId,
      },
    });

    if (isNewDevice) {
      void dispatchNotification(db, {
        eventType: NotificationEventType.SecuritySigninNewDevice,
        recipientMemberIds: [member.id],
        payload: {
          occurredAt: new Date(),
          ip: ctx.ip ?? null,
          country: ctx.country ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
    }

    // Tokens go in the URL fragment — never in query/history/logs. The web
    // app's /oauth-callback page reads them from window.location.hash.
    const fragment = new URLSearchParams({
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
      method: providerId,
      ...(payload.returnTo ? { returnTo: payload.returnTo } : {}),
    });
    const url = new URL('/oauth-callback', frontendUrl(c));
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.toString()}#${fragment.toString()}`,
        'Set-Cookie': stateCookieClearHeader(),
      },
    });
  } catch (err) {
    logger.error('oauth.callback.error', {
      module: 'auth.oauth',
      provider: providerId,
      // Deliberately shallow — never include response bodies, codes, or tokens.
      error: err instanceof Error ? err.name : 'unknown',
    });
    return auditFailureAndRedirect(c, providerId, 'provider_error');
  }
}
