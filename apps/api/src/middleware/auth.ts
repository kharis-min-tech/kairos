import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import type { AuthContext, Capability, RoleScope } from '@kairos/types';
import { UnauthorizedError } from '@kairos/utils';
import { db } from '../db';
import { resolveGrants, authHasCapability } from '../lib/grants';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = header.slice(7);
  let payload: unknown;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Reject the short-lived role-selection session token here. Without this
  // guard a holder of a pending-role sessionToken could call protected
  // endpoints with no activeRole / scope and bypass the picker entirely.
  if (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as Record<string, unknown>)['kind'] === 'role-selection'
  ) {
    throw new UnauthorizedError('Session token cannot be used as an access token');
  }

  // Phase 5 hardening: normalise legacy tokens so AuthContext consumers can
  // treat branchSystemAdminBranchIds/branchDataAdminBranchIds as always-present
  // arrays. Old tokens (issued before the branch-admin RBAC build) lack these
  // fields entirely; default both to [] so the consumers don't need `?? []`.
  const auth = payload as Partial<AuthContext> & AuthContext;
  auth.branchSystemAdminBranchIds = auth.branchSystemAdminBranchIds ?? [];
  auth.branchDataAdminBranchIds = auth.branchDataAdminBranchIds ?? [];

  // RBAC Phase 1: resolve functional role grants from member_roles + leadership
  // FKs on every request. JWT itself stays minimal — grants change without
  // re-issuing tokens (e.g. an admin grants a role mid-session, the user sees
  // it on next call). Older tokens with no grants field still work — we just
  // populate it freshly.
  auth.grants = await resolveGrants(db, auth.memberId);

  c.set('auth', auth);

  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    if (!roles.includes(auth.systemRole)) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    await next();
  };
}

/**
 * Allow access for system admins, pastors of THIS branch, OR any branch
 * admin (Branch System Admin or Branch Data Admin) of the branch identified
 * by `branchIdParam`. Used to gate branch-scoped operational writes
 * (members, fellowships, departments, attendance) so anyone with branch-tier
 * authority can manage their own branch.
 */
export function requireBranchAdmin(branchIdParam = 'id') {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    const branchId = c.req.param(branchIdParam);
    if (!branchId) throw new UnauthorizedError('Branch ID required');
    // Phase 4: scope-bound branch sessions are narrowed at the gate. A token
    // with scope=branch:X must be acting on branch X — any other branch in
    // the URL is refused before we even check membership.
    if (auth.scope?.kind === 'branch' && auth.scope.id !== branchId) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    const ok =
      auth.systemRole === 'admin' ||
      (authHasCapability(auth, 'branch:read') && auth.branchId === branchId) ||
      auth.branchSystemAdminBranchIds.includes(branchId) ||
      auth.branchDataAdminBranchIds.includes(branchId);
    if (!ok) throw new UnauthorizedError('Insufficient permissions');
    await next();
  };
}

/**
 * Allow access for system admins OR Branch System Admin of the branch
 * identified by `branchIdParam`. Used to gate branch-tier role management
 * and pastoral leadership appointments — Data Admin alone is not enough.
 */
export function requireBranchSystemAdmin(branchIdParam = 'id') {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    const branchId = c.req.param(branchIdParam);
    if (!branchId) throw new UnauthorizedError('Branch ID required');
    // Phase 4: scope-bound branch sessions can only act on their scoped branch.
    if (auth.scope?.kind === 'branch' && auth.scope.id !== branchId) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    const ok = auth.systemRole === 'admin' || auth.branchSystemAdminBranchIds.includes(branchId);
    if (!ok) throw new UnauthorizedError('Insufficient permissions');
    await next();
  };
}

/**
 * RBAC Phase 2: capability-based gate middleware.
 *
 * `cap` is the required capability (e.g. `'branch:rbac'`). `scopeFn` optionally
 * extracts the request-scoped entity to check against (typically the URL
 * param) — without it, the gate passes as long as ANY grant carries `cap`.
 *
 * Scope narrowing: a scope-bound token (`auth.scope`) is refused if the
 * URL targets a different entity of the same scope kind — same shape as
 * the legacy `requireBranchAdmin`/`requireBranchSystemAdmin` checks.
 *
 * Admin + pastor still pass via `hasCapability`'s break-glass / transitional
 * shim (removed in Phase 4).
 */
export function requireCapability(
  cap: Capability,
  scopeFn?: (c: Context) => (RoleScope & { branchId?: string }) | null,
) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    const target = scopeFn?.(c) ?? undefined;
    if (
      target &&
      auth.scope &&
      auth.scope.kind === target.kind &&
      auth.scope.id !== target.id
    ) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    if (!authHasCapability(auth, cap, target)) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    await next();
  };
}

/**
 * Service-level helper re-export. The implementation lives in
 * `lib/grants.ts` so service files can use it without dragging in `../db`
 * (this module imports the db singleton, which throws at module-load time
 * when DATABASE_URL is unset — bad for unit tests).
 */
export { authHasAnyCapability } from '../lib/grants';

/**
 * Wide-gate variant of requireCapability: passes if the caller holds ANY of
 * the listed capabilities, ignoring scope. Used for aggregate read endpoints
 * (e.g. attendance reports) where the URL doesn't name a specific entity and
 * the service layer scopes the result set by what the caller's grants allow.
 */
export function requireAnyCapability(...caps: Capability[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    for (const cap of caps) {
      if (authHasCapability(auth, cap)) {
        await next();
        return;
      }
    }
    throw new UnauthorizedError('Insufficient permissions');
  };
}

export function getAuth(c: Context): AuthContext {
  return c.get('auth');
}
