// @kairos/auth-context - Permission check helpers and branch isolation enforcement

import type { AuthContext, UserRole } from './context';
import { ForbiddenError } from '../error-handler/errors';

/**
 * Checks if the user has the Admin role.
 * Admins have full access to all branches and resources.
 */
export function isAdmin(ctx: AuthContext): boolean {
  return ctx.roles.includes('Admin');
}

/**
 * Checks if the user has the Pastor role.
 * Pastors have access to their assigned branch data only.
 */
export function isPastor(ctx: AuthContext): boolean {
  return ctx.roles.includes('Pastor');
}

/**
 * Checks if the user has the Leader role.
 * Leaders have access to their department/fellowship data only.
 */
export function isLeader(ctx: AuthContext): boolean {
  return ctx.roles.includes('Leader');
}

/**
 * Checks if the user has the Member role.
 * Members have access to their own profile and public data only.
 */
export function isMember(ctx: AuthContext): boolean {
  return ctx.roles.includes('Member');
}

/**
 * Checks if the user has a specific role.
 *
 * @param ctx - Auth context
 * @param role - Role to check for
 * @returns true if the user has the specified role
 */
export function hasRole(ctx: AuthContext, role: UserRole): boolean {
  return ctx.roles.includes(role);
}

/**
 * Checks if a user can access data for a given branch.
 * - Admins can access any branch
 * - Pastors/Leaders/Members can only access their own branch
 *
 * @param ctx - Auth context
 * @param targetBranchId - The branch ID being accessed
 * @returns true if the user can access the branch
 */
export function canAccessBranch(
  ctx: AuthContext,
  targetBranchId: string
): boolean {
  // Admins can access all branches
  if (isAdmin(ctx)) {
    return true;
  }

  // All other roles can only access their own branch
  return ctx.branchId === targetBranchId;
}

/**
 * Enforces branch-level data isolation.
 * Throws ForbiddenError if the user cannot access the target branch.
 * Use this in Lambda handlers to enforce branch isolation.
 *
 * @param ctx - Auth context
 * @param targetBranchId - The branch ID being accessed
 * @throws ForbiddenError if access is denied
 */
export function enforceBranchAccess(
  ctx: AuthContext,
  targetBranchId: string
): void {
  if (!canAccessBranch(ctx, targetBranchId)) {
    throw new ForbiddenError(
      'Access denied: you do not have permission to access this branch'
    );
  }
}
