// @kairos/auth-context - Extract user context from API Gateway authorizer event
// Supports two authorizer modes:
// 1. Full context: member_id, branch_id, roles (authorizer did DB lookup)
// 2. JWT-only: email, role, sub (authorizer outside VPC, no DB access)
//    In JWT-only mode, we need the route Lambda to call resolveAuthContext() first.

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { UnauthorizedError } from '../error-handler/errors';

/** User roles for RBAC */
export type UserRole = 'Admin' | 'Pastor' | 'Leader' | 'Member';

/** Auth context extracted from the Custom Authorizer Lambda */
export interface AuthContext {
  /** The authenticated member's ID */
  memberId: number;
  /** The member's home branch ID */
  branchId: number;
  /** The member's roles (can have multiple) */
  roles: UserRole[];
  /** The member's email address */
  email?: string;
}

/**
 * Extracts the auth context from an API Gateway proxy event.
 * Works with both full-context and JWT-only authorizer modes.
 *
 * In JWT-only mode (no member_id in context), performs a DB lookup
 * using the email from the JWT claims.
 */
export function getAuthContext(event: APIGatewayProxyEvent): AuthContext {
  // HTTP API v2 nests authorizer context under .lambda
  const rawAuthorizer = event.requestContext?.authorizer as Record<string, unknown> | undefined;
  const authorizer: Record<string, unknown> | undefined =
    (rawAuthorizer?.['lambda'] as Record<string, unknown>) ?? rawAuthorizer;

  if (!authorizer) {
    throw new UnauthorizedError('Missing authorization context');
  }

  // Check the `authorized` flag (CORS-safe authorizer pattern)
  if (authorizer['authorized'] === 'false') {
    throw new UnauthorizedError('Invalid or missing authentication token');
  }

  // Try full-context mode first (authorizer provided member_id + branch_id)
  const memberId = parseNumericField(authorizer, 'member_id') ??
    parseNumericField(authorizer, 'memberId') ??
    parseNumericField(authorizer, 'userId');

  const branchId = parseNumericField(authorizer, 'branch_id') ??
    parseNumericField(authorizer, 'branchId');

  if (memberId !== undefined && branchId !== undefined) {
    const roles = parseRoles(authorizer);
    if (roles.length === 0) roles.push('Member');
    return { memberId, branchId, roles, email: getStringField(authorizer, 'email') };
  }

  // JWT-only mode: check if _resolved context was attached by resolveAuthContext()
  const resolved = (event as any).__resolvedAuth as AuthContext | undefined;
  if (resolved) return resolved;

  // If we get here, the context hasn't been resolved yet.
  // This shouldn't happen if resolveAuthContext() middleware is used.
  throw new UnauthorizedError(
    'Invalid authorization context: missing memberId or branchId. ' +
    'Call resolveAuthContext(event) first for JWT-only authorizer mode.'
  );
}

/**
 * Resolves auth context by doing a DB lookup when the authorizer
 * only provided JWT claims (email, role) without member_id.
 *
 * Call this at the start of every route Lambda handler.
 * It's a no-op if the authorizer already provided full context.
 */
export async function resolveAuthContext(event: APIGatewayProxyEvent): Promise<AuthContext> {
  // HTTP API v2 nests authorizer context under .lambda
  const rawAuthorizer = event.requestContext?.authorizer as Record<string, unknown> | undefined;
  const authorizer: Record<string, unknown> | undefined =
    (rawAuthorizer?.['lambda'] as Record<string, unknown>) ?? rawAuthorizer;

  if (!authorizer) {
    throw new UnauthorizedError('Missing authorization context');
  }

  // Check the `authorized` flag set by the authorizer Lambda.
  // The authorizer always returns isAuthorized: true (for CORS), but sets
  // authorized: 'false' when the JWT is invalid/missing.
  if (authorizer['authorized'] === 'false') {
    throw new UnauthorizedError('Invalid or missing authentication token');
  }

  // Already have full context? Return immediately.
  const memberId = parseNumericField(authorizer, 'member_id') ??
    parseNumericField(authorizer, 'memberId') ??
    parseNumericField(authorizer, 'userId');

  const branchId = parseNumericField(authorizer, 'branch_id') ??
    parseNumericField(authorizer, 'branchId');

  if (memberId !== undefined && branchId !== undefined) {
    const roles = parseRoles(authorizer);
    if (roles.length === 0) roles.push('Member');
    const ctx: AuthContext = { memberId, branchId, roles, email: getStringField(authorizer, 'email') };
    (event as any).__resolvedAuth = ctx;
    return ctx;
  }

  // JWT-only mode: need email for DB lookup
  const email = getStringField(authorizer, 'email');
  if (!email) {
    throw new UnauthorizedError('Invalid authorization context: missing email');
  }

  const cognitoRole = getStringField(authorizer, 'role');

  // DB lookup
  const { initDb } = await import('../db-client/client');
  const { sql } = await import('drizzle-orm');
  const db = await initDb();

  let result: any;
  try {
    result = await db.execute(
      sql`SELECT member_id, home_branch_id, is_active FROM members WHERE email = ${email} LIMIT 1`
    );
  } catch (dbError: any) {
    const detail = dbError?.message ?? dbError?.cause?.message ?? JSON.stringify(dbError);
    throw new UnauthorizedError(`DB lookup failed: ${detail}`);
  }

  const rows = (result as any).rows ?? result;
  if (!rows || (rows as any[]).length === 0) {
    throw new UnauthorizedError(`Member not found for email: ${email}`);
  }

  const row = (rows as any[])[0];
  if (!row.is_active) {
    throw new UnauthorizedError('Member account is inactive');
  }

  const roles = buildRoles(cognitoRole);

  const ctx: AuthContext = {
    memberId: row.member_id,
    branchId: row.home_branch_id,
    roles,
    email,
  };

  // Cache on the event so getAuthContext() can find it
  (event as any).__resolvedAuth = ctx;
  return ctx;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function buildRoles(cognitoRole: string | undefined): UserRole[] {
  const roles: UserRole[] = [];
  if (cognitoRole === 'Admin' || cognitoRole === 'admin') roles.push('Admin');
  if (cognitoRole === 'Pastor' || cognitoRole === 'pastor') roles.push('Pastor');
  if (cognitoRole === 'Leader' || cognitoRole === 'leader') roles.push('Leader');
  if (!roles.includes('Member')) roles.push('Member');
  return roles;
}

function parseNumericField(
  authorizer: Record<string, unknown>,
  field: string
): number | undefined {
  const value = authorizer[field];
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  return isNaN(num) ? undefined : num;
}

function parseRoles(authorizer: Record<string, unknown>): UserRole[] {
  const rolesValue = authorizer['roles'] ?? authorizer['role'];
  if (!rolesValue) return [];

  const rolesStr = String(rolesValue);

  try {
    const parsed: unknown = JSON.parse(rolesStr);
    if (Array.isArray(parsed)) return parsed.filter(isValidRole);
  } catch { /* not JSON */ }

  if (rolesStr.includes(',')) {
    return rolesStr.split(',').map((r) => r.trim()).filter(isValidRole);
  }

  if (isValidRole(rolesStr)) return [rolesStr];
  return [];
}

const VALID_ROLES = new Set<string>(['Admin', 'Pastor', 'Leader', 'Member']);

function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && VALID_ROLES.has(value);
}

function getStringField(
  authorizer: Record<string, unknown>,
  field: string
): string | undefined {
  const value = authorizer[field];
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}
