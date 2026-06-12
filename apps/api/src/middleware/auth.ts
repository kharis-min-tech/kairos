import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import type { AuthContext } from '@kairos/types';
import { UnauthorizedError } from '@kairos/utils';

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

  c.set('auth', payload as AuthContext);

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
    const bsa = auth.branchSystemAdminBranchIds ?? [];
    const bda = auth.branchDataAdminBranchIds ?? [];
    const ok =
      auth.systemRole === 'admin' ||
      (auth.systemRole === 'pastor' && auth.branchId === branchId) ||
      bsa.includes(branchId) ||
      bda.includes(branchId);
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
    const bsa = auth.branchSystemAdminBranchIds ?? [];
    const ok = auth.systemRole === 'admin' || bsa.includes(branchId);
    if (!ok) throw new UnauthorizedError('Insufficient permissions');
    await next();
  };
}

export function getAuth(c: Context): AuthContext {
  return c.get('auth');
}
