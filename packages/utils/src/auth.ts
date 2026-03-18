import type { AuthContext } from '@kairos/types';
import { ForbiddenError } from './errors';

/**
 * Enforce that the authenticated user belongs to the specified branch.
 * Admin users bypass this check.
 */
export function enforceBranchAccess(auth: AuthContext, branchId: string): void {
  if (auth.systemRole === 'admin') return;
  if (auth.branchId !== branchId) {
    throw new ForbiddenError('You do not have access to this branch');
  }
}
