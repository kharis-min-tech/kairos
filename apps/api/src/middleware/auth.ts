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

export function getAuth(c: Context): AuthContext {
  return c.get('auth');
}
