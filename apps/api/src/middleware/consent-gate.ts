import type { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import type { AuthContext } from '@kairos/types';
import { db } from '../db';
import { getAuthSecrets } from '../lib/auth-secrets';
import { hasPrivilegedRole } from '../me/service';
import { listConsentStatuses } from '../consent/service';

/**
 * Consent enforcement gate. Runs after routes are matched at the app level
 * for every `/api/*` request. When the caller has any REQUIRED consent that
 * hasn't been accepted (or the version has bumped past the last acceptance),
 * every route except the ones the caller needs to accept or opt out returns
 * 403 with `{ code: 'CONSENT_REQUIRED' }`.
 *
 * This is a belt to the client-side redirect on the dashboard layout. Without
 * server enforcement, a technical user could bypass the gate via `curl` after
 * being made an admin and never accept the Confidentiality Undertaking.
 *
 * The middleware verifies the JWT locally rather than depending on the module
 * routers' `authMiddleware`, which mounts inside each router and therefore
 * hasn't run yet at the app level. Duplicate work is one extra JWT verify per
 * request (~sub-ms) — cheap for the security value.
 */
export async function consentGateMiddleware(c: Context, next: Next) {
  // Under Vitest the router tests build tightly-sequenced Drizzle mocks that
  // don't account for the two extra selects this middleware issues per
  // request. Rather than sprinkle mocks across ten test files, skip the gate
  // in the test framework — its own coverage lives in consent-gate.test.ts,
  // which opts back in.
  if (process.env['VITEST'] === 'true' && process.env['ENABLE_CONSENT_GATE'] !== 'true') {
    return next();
  }

  const path = c.req.path;
  const method = c.req.method;

  // Unauthenticated paths pass through untouched.
  if (path.startsWith('/api/auth/') || path.startsWith('/api/public/')) {
    return next();
  }
  if (!path.startsWith('/api/')) {
    return next();
  }

  // Consent-flow + GDPR escape-hatch allowlist. Even a gated user must be
  // able to read their own profile (so the dashboard/gate can hydrate), see
  // which consents are pending, accept them, sign out, or nuke their account.
  if (isAllowlisted(path, method)) {
    return next();
  }

  // If no Bearer token is present, defer to the module's own authMiddleware
  // to return 401 — pre-empting that here would swallow the real reason.
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  let auth: AuthContext;
  try {
    const token = header.slice(7);
    const { accessSecret } = getAuthSecrets(c);
    const key = new TextEncoder().encode(accessSecret);
    const { payload } = await jwtVerify(token, key);
    auth = payload as unknown as AuthContext;
  } catch {
    // Invalid token — let the downstream authMiddleware surface the 401.
    return next();
  }

  // Role-selection session tokens must be rejected downstream by the module
  // authMiddleware, which is where that check already lives. Skip gating.
  if ((auth as unknown as { kind?: string }).kind === 'role-selection') {
    return next();
  }

  if (!auth.memberId) return next();

  const isPrivileged = await hasPrivilegedRole(db, auth);
  const statuses = await listConsentStatuses(db, auth.memberId, isPrivileged);
  const pending = statuses.filter((s) => s.required && s.needsAccept);

  if (pending.length > 0) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message:
            'You must accept required policies before continuing. Sign in to Kairos and complete the consent screen.',
          pending: pending.map((p) => ({
            consentType: p.consentType,
            currentVersion: p.currentVersion,
          })),
        },
      },
      403,
    );
  }

  return next();
}

function isAllowlisted(path: string, method: string): boolean {
  // Self-read + hydration surfaces the dashboard and gate depend on.
  if (path === '/api/members/me' && method === 'GET') return true;
  if (path === '/api/me' && method === 'GET') return true;
  if (path === '/api/me/leadership' && method === 'GET') return true;

  // The consent flow itself.
  if (path === '/api/me/consent') return true; // GET + POST

  // GDPR escape hatches — a user must be able to opt out or export their
  // data even if they refuse to accept a new policy version.
  if (path === '/api/me/delete-account' && method === 'POST') return true;
  if (path === '/api/me/export' && method === 'GET') return true;

  return false;
}
