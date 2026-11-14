import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { successResponse, NotFoundError } from '@kairos/utils';
import { db } from '../../db';
import { authMiddleware, getAuth } from '../../middleware/auth';
import { getAuthSecrets } from '../../lib/auth-secrets';
import { recordAuditEvent } from '../../audit/service';
import { extractRequestContext } from '../../audit/context';
import { AuditAction, AuditOutcome } from '@kairos/types';
import { issueAuthenticatedSession } from '../service';
import { handleOAuthStart, handleOAuthCallback } from './handler';
import { isProviderId, type ProviderId } from './providers';
import {
  listOAuthConnections,
  disconnectOAuthProvider,
  confirmPasswordLink,
} from './service';
import { confirmLinkSchema } from './schemas';

export const oauthRouter = new Hono();

/**
 * Route ordering matters — static + parameter-based public routes are declared
 * first, then the `/connections` group is gated with `authMiddleware` inline
 * per route (we intentionally do NOT `oauthRouter.use('*', authMiddleware)` so
 * the /start + /callback endpoints stay reachable without a session).
 */

// ── Provider param guard ────────────────────────────────────
function requireProviderParam(param: string | undefined): ProviderId {
  if (!param || !isProviderId(param)) {
    throw new NotFoundError('Unknown OAuth provider');
  }
  return param;
}

// ── /start ──────────────────────────────────────────────────
oauthRouter.get('/:provider/start', async (c) => {
  const provider = requireProviderParam(c.req.param('provider'));
  return handleOAuthStart(c, provider);
});

// ── /callback (GET for Google/Microsoft, POST form_post for Apple) ──
oauthRouter.get('/:provider/callback', async (c) => {
  const provider = requireProviderParam(c.req.param('provider'));
  return handleOAuthCallback(c, provider);
});
oauthRouter.post('/:provider/callback', async (c) => {
  const provider = requireProviderParam(c.req.param('provider'));
  return handleOAuthCallback(c, provider);
});

// ── /confirm-link (XHR from the confirm page) ───────────────
oauthRouter.post('/confirm-link', zValidator('json', confirmLinkSchema), async (c) => {
  const { confirmationToken, password } = c.req.valid('json');
  const member = await confirmPasswordLink(db, confirmationToken, password);
  const session = await issueAuthenticatedSession(db, member, getAuthSecrets(c));
  const ctx = extractRequestContext(c);
  await recordAuditEvent(db, {
    actorMemberId: member.id,
    action: AuditAction.SigninSuccess,
    outcome: AuditOutcome.Success,
    ctx,
    metadata: { method: 'oauth_confirm_link' },
  });
  return c.json(successResponse({ ...session, isFirstLogin: false }, 'Link confirmed'));
});

// ── /connections (authed) ───────────────────────────────────
oauthRouter.get('/connections', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const rows = await listOAuthConnections(db, auth.memberId);
  return c.json(
    successResponse(
      rows.map((r) => ({
        provider: r.provider,
        providerEmail: r.providerEmail,
        connectedAt: r.connectedAt.toISOString(),
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
      })),
    ),
  );
});

oauthRouter.delete('/connections/:provider', authMiddleware, async (c) => {
  const auth = getAuth(c);
  const provider = requireProviderParam(c.req.param('provider'));
  await disconnectOAuthProvider(db, auth.memberId, provider);
  // Return the updated connection list so the client can reconcile in a
  // single round-trip.
  const rows = await listOAuthConnections(db, auth.memberId);
  return c.json(
    successResponse(
      rows.map((r) => ({
        provider: r.provider,
        providerEmail: r.providerEmail,
        connectedAt: r.connectedAt.toISOString(),
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
      })),
    ),
  );
});
