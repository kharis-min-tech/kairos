import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { AuditAction, AuditOutcome } from '@kairos/types';
import { successResponse } from '@kairos/utils';
import { db } from '../db';
import { authMiddleware, getAuth, requireRole } from '../middleware/auth';
import { recordAuditEvent } from '../audit/service';
import { extractRequestContext } from '../audit/context';
import { getAuthorizationEndpoint, getIssuer } from './config';
import { getJwks } from './keys';
import { OAUTH_SCOPE_LIST } from './scopes';
import { AuthorizeError, OAuthError, TokenReuseError } from './errors';
import {
  authorizeDecisionSchema,
  authorizeParamsSchema,
  createClientSchema,
  updateClientSchema,
  type AuthorizeParams,
} from './schemas';
import {
  authenticateClient,
  decideAuthorization,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  getAuthorizeContext,
  getUserInfo,
  listConnections,
  revokeOwnGrant,
  revokeToken,
  type ClientCredentials,
} from './service';
import {
  createClient,
  deleteClient,
  expirePreviousSecret,
  getClient,
  listClientActivity,
  listClientGrants,
  listClients,
  revokeAllClientGrants,
  rotateClientSecret,
  updateClient,
} from './clients';

export const oauthServerRouter = new Hono();

// ── Public protocol endpoints ───────────────────────────────
// Called by other applications, so they answer in the RFC's own error shape
// and are open to any origin (no cookies are involved, only bearer values).
const openCors = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  maxAge: 3600,
});
for (const path of ['/.well-known/*', '/jwks', '/token', '/userinfo', '/revoke']) {
  oauthServerRouter.use(path, openCors);
}

/** Path params are always present on a matched route; this narrows the type once. */
function param(c: Context, name: string): string {
  return c.req.param(name) ?? '';
}

const NO_STORE = { 'Cache-Control': 'no-store', Pragma: 'no-cache' } as const;

function oauthErrorResponse(c: Context, err: OAuthError) {
  const headers: Record<string, string> = { ...NO_STORE };
  if (err.status === 401) {
    headers['WWW-Authenticate'] =
      err.error === 'invalid_client' ? 'Basic realm="kairos"' : `Bearer error="${err.error}"`;
  }
  return c.json({ error: err.error, error_description: err.description }, err.status, headers);
}

oauthServerRouter.get('/.well-known/openid-configuration', (c) => {
  const issuer = getIssuer(c);
  return c.json(
    {
      issuer,
      authorization_endpoint: getAuthorizationEndpoint(c),
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      revocation_endpoint: `${issuer}/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256'],
      scopes_supported: OAUTH_SCOPE_LIST,
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
      code_challenge_methods_supported: ['S256'],
      claims_supported: ['sub', 'name', 'given_name', 'family_name', 'home_branch_id', 'email', 'email_verified', 'nonce'],
      authorization_response_iss_parameter_supported: true,
    },
    200,
    { 'Cache-Control': 'public, max-age=3600' },
  );
});

oauthServerRouter.get('/jwks', async (c) =>
  c.json(await getJwks(c), 200, { 'Cache-Control': 'public, max-age=3600' }),
);

/** client_secret_basic first, then client_secret_post; public clients send only client_id. */
function readClientCredentials(c: Context, body: Record<string, unknown>): ClientCredentials {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(':');
      if (idx > 0) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, idx)),
          clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
        };
      }
    } catch {
      // fall through to invalid_client below
    }
    throw new OAuthError('invalid_client', 'Malformed Basic credentials.', 401);
  }
  const clientId = typeof body['client_id'] === 'string' ? body['client_id'] : '';
  if (!clientId) throw new OAuthError('invalid_client', 'Client authentication failed.', 401);
  return {
    clientId,
    ...(typeof body['client_secret'] === 'string' && body['client_secret'] && { clientSecret: body['client_secret'] }),
  };
}

async function readForm(c: Context): Promise<Record<string, unknown>> {
  try {
    return (await c.req.parseBody()) as Record<string, unknown>;
  } catch {
    throw new OAuthError('invalid_request', 'The request body must be application/x-www-form-urlencoded.');
  }
}

oauthServerRouter.post('/token', async (c) => {
  const audit = (action: (typeof AuditAction)[keyof typeof AuditAction], outcome: AuditOutcome, extra: {
    memberId?: string | null; clientRowId?: string; metadata?: Record<string, unknown>;
  }) =>
    recordAuditEvent(db, {
      actorMemberId: extra.memberId ?? null,
      action,
      outcome,
      ...(extra.clientRowId && { targetType: 'oauth_client', targetId: extra.clientRowId }),
      ...(extra.metadata && { metadata: extra.metadata }),
      ctx: extractRequestContext(c),
    });

  let clientRowId: string | undefined;
  try {
    const body = await readForm(c);
    const client = await authenticateClient(db, readClientCredentials(c, body));
    clientRowId = client.id;
    const grantType = body['grant_type'];

    let outcome;
    if (grantType === 'authorization_code') {
      outcome = await exchangeAuthorizationCode(db, c, client, {
        code: typeof body['code'] === 'string' ? body['code'] : undefined,
        redirectUri: typeof body['redirect_uri'] === 'string' ? body['redirect_uri'] : undefined,
        codeVerifier: typeof body['code_verifier'] === 'string' ? body['code_verifier'] : undefined,
      });
    } else if (grantType === 'refresh_token') {
      outcome = await exchangeRefreshToken(db, c, client, {
        refreshToken: typeof body['refresh_token'] === 'string' ? body['refresh_token'] : undefined,
        scope: typeof body['scope'] === 'string' ? body['scope'] : undefined,
      });
    } else {
      throw new OAuthError('unsupported_grant_type', 'Supported grant types: authorization_code, refresh_token.');
    }

    void audit(AuditAction.OauthTokenIssued, AuditOutcome.Success, {
      memberId: outcome.memberId,
      clientRowId: outcome.clientRowId,
      metadata: { grantType: outcome.grantType },
    });
    return c.json(outcome.response, 200, NO_STORE);
  } catch (err) {
    if (err instanceof TokenReuseError) {
      void audit(AuditAction.OauthTokenReuse, AuditOutcome.Failure, {
        memberId: err.memberId,
        clientRowId: err.clientRowId,
        metadata: { note: 'A rotated refresh token was reused; the token family was revoked.' },
      });
    }
    if (err instanceof OAuthError) {
      if (err.error !== 'invalid_client' && clientRowId && !(err instanceof TokenReuseError)) {
        void audit(AuditAction.OauthTokenFailure, AuditOutcome.Failure, {
          clientRowId,
          metadata: { error: err.error },
        });
      }
      return oauthErrorResponse(c, err);
    }
    throw err;
  }
});

oauthServerRouter.get('/userinfo', async (c) => userinfoHandler(c));
oauthServerRouter.post('/userinfo', async (c) => userinfoHandler(c));

async function userinfoHandler(c: Context) {
  try {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new OAuthError('invalid_token', 'A bearer access token is required.', 401);
    }
    return c.json(await getUserInfo(db, c, header.slice(7)), 200, NO_STORE);
  } catch (err) {
    if (err instanceof OAuthError) return oauthErrorResponse(c, err);
    throw err;
  }
}

oauthServerRouter.post('/revoke', async (c) => {
  try {
    const body = await readForm(c);
    const client = await authenticateClient(db, readClientCredentials(c, body));
    const token = typeof body['token'] === 'string' ? body['token'] : '';
    if (token) {
      const revoked = await revokeToken(db, client, token);
      if (revoked) {
        void recordAuditEvent(db, {
          actorMemberId: revoked.memberId,
          action: AuditAction.OauthGrantRevoked,
          outcome: AuditOutcome.Success,
          targetType: 'oauth_client',
          targetId: client.id,
          metadata: { by: 'client', scope: 'token_family' },
          ctx: extractRequestContext(c),
        });
      }
    }
    // RFC 7009 §2.2: respond 200 whether or not the token was known.
    return c.body(null, 200, NO_STORE);
  } catch (err) {
    if (err instanceof OAuthError) return oauthErrorResponse(c, err);
    throw err;
  }
});

// ── Consent (the signed-in member, via the web app) ─────────
// The member's session is a bearer token in the browser, so /authorize is a
// web page that calls these two endpoints rather than a server-side redirect.

function errorRedirect(c: Context, params: AuthorizeParams, err: AuthorizeError): string | null {
  if (!err.redirectable || !params.redirect_uri) return null;
  const url = new URL(params.redirect_uri);
  url.searchParams.set('error', err.error);
  url.searchParams.set('error_description', err.description);
  if (params.state) url.searchParams.set('state', params.state);
  url.searchParams.set('iss', getIssuer(c));
  return url.toString();
}

oauthServerRouter.get('/authorize/context', authMiddleware, zValidator('query', authorizeParamsSchema), async (c) => {
  const auth = getAuth(c);
  const params = c.req.valid('query');
  try {
    const context = await getAuthorizeContext(db, auth.memberId, params);
    return c.json(successResponse({ status: 'ok' as const, ...context }));
  } catch (err) {
    if (err instanceof AuthorizeError) {
      return c.json(
        successResponse({
          status: 'error' as const,
          error: err.error,
          description: err.description,
          redirectTo: errorRedirect(c, params, err),
        }),
      );
    }
    throw err;
  }
});

oauthServerRouter.post('/authorize/decision', authMiddleware, zValidator('json', authorizeDecisionSchema), async (c) => {
  const auth = getAuth(c);
  const { approve, ...params } = c.req.valid('json');
  try {
    const decision = await decideAuthorization(db, c, auth.memberId, params, approve);
    await recordAuditEvent(db, {
      actorMemberId: auth.memberId,
      action: decision.approved ? AuditAction.OauthAuthorized : AuditAction.OauthDenied,
      outcome: AuditOutcome.Success,
      targetType: 'oauth_client',
      targetId: decision.clientRowId,
      metadata: { clientId: decision.clientId, scopes: decision.scopes },
      ctx: extractRequestContext(c),
    });
    return c.json(successResponse({ status: 'ok' as const, redirectTo: decision.redirectTo }));
  } catch (err) {
    if (err instanceof AuthorizeError) {
      return c.json(
        successResponse({
          status: 'error' as const,
          error: err.error,
          description: err.description,
          redirectTo: errorRedirect(c, params, err),
        }),
      );
    }
    throw err;
  }
});

// ── The member's connected apps ─────────────────────────────

oauthServerRouter.get('/connections', authMiddleware, async (c) => {
  return c.json(successResponse(await listConnections(db, getAuth(c).memberId)));
});

oauthServerRouter.delete('/connections/:grantId', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const { clientRowId } = await revokeOwnGrant(db, auth.memberId, param(c, 'grantId'));
  await recordAuditEvent(db, {
    actorMemberId: auth.memberId,
    action: AuditAction.OauthGrantRevoked,
    outcome: AuditOutcome.Success,
    targetType: 'oauth_client',
    targetId: clientRowId,
    metadata: { by: 'member' },
    ctx: extractRequestContext(c),
  });
  return c.json(successResponse({ revoked: true }));
});

// ── Admin: client registry (platform admins only) ───────────

function auditClient(c: Context, action: (typeof AuditAction)[keyof typeof AuditAction], clientRowId: string, metadata?: Record<string, unknown>) {
  return recordAuditEvent(db, {
    actorMemberId: getAuth(c).memberId,
    action,
    outcome: AuditOutcome.Success,
    targetType: 'oauth_client',
    targetId: clientRowId,
    ...(metadata && { metadata }),
    ctx: extractRequestContext(c),
  });
}

oauthServerRouter.get('/clients', authMiddleware, requireRole('admin'), async (c) =>
  c.json(successResponse(await listClients(db))),
);

oauthServerRouter.post('/clients', authMiddleware, requireRole('admin'), zValidator('json', createClientSchema), async (c) => {
  const created = await createClient(db, getAuth(c).memberId, c.req.valid('json'));
  await auditClient(c, AuditAction.OauthClientCreated, created.client.id, { name: created.client.name });
  return c.json(successResponse(created, 'Client created'), 201);
});

oauthServerRouter.get('/clients/:id', authMiddleware, requireRole('admin'), async (c) =>
  c.json(successResponse(await getClient(db, param(c, 'id')))),
);

oauthServerRouter.patch('/clients/:id', authMiddleware, requireRole('admin'), zValidator('json', updateClientSchema), async (c) => {
  const body = c.req.valid('json');
  const updated = await updateClient(db, param(c, 'id'), body);
  await auditClient(c, AuditAction.OauthClientUpdated, updated.id, { fields: Object.keys(body) });
  return c.json(successResponse(updated));
});

oauthServerRouter.post('/clients/:id/rotate-secret', authMiddleware, requireRole('admin'), async (c) => {
  const rotated = await rotateClientSecret(db, param(c, 'id'));
  await auditClient(c, AuditAction.OauthClientSecretRotated, rotated.client.id);
  return c.json(successResponse(rotated, 'Secret rotated'));
});

oauthServerRouter.post('/clients/:id/expire-previous-secret', authMiddleware, requireRole('admin'), async (c) => {
  const updated = await expirePreviousSecret(db, param(c, 'id'));
  await auditClient(c, AuditAction.OauthClientUpdated, updated.id, { fields: ['previousSecret'] });
  return c.json(successResponse(updated));
});

oauthServerRouter.get('/clients/:id/grants', authMiddleware, requireRole('admin'), async (c) =>
  c.json(successResponse(await listClientGrants(db, param(c, 'id')))),
);

oauthServerRouter.post('/clients/:id/revoke-all', authMiddleware, requireRole('admin'), async (c) => {
  const revoked = await revokeAllClientGrants(db, param(c, 'id'));
  await auditClient(c, AuditAction.OauthGrantRevoked, param(c, 'id'), { by: 'admin', grants: revoked });
  return c.json(successResponse({ revoked }));
});

oauthServerRouter.get('/clients/:id/activity', authMiddleware, requireRole('admin'), async (c) =>
  c.json(successResponse(await listClientActivity(db, param(c, 'id')))),
);

oauthServerRouter.delete('/clients/:id', authMiddleware, requireRole('admin'), async (c) => {
  const id = param(c, 'id');
  const { name } = await deleteClient(db, id);
  // The client row is gone, so the audit row carries no FK to it; targetId is a bare uuid.
  await auditClient(c, AuditAction.OauthClientDeleted, id, { name });
  return c.json(successResponse({ deleted: true }));
});
