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
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthContext;
    c.set('auth', payload);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

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
    const bsa = auth.branchSystemAdminBranchIds ?? [];
    const ok = auth.systemRole === 'admin' || bsa.includes(branchId);
    if (!ok) throw new UnauthorizedError('Insufficient permissions');
    await next();
  };
}

export function getAuth(c: Context): AuthContext {
  return c.get('auth');
}
