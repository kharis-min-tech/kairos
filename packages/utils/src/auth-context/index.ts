// @kairos/auth-context - Auth context layer for the Kairos platform
// Extracts user context from API Gateway authorizer and provides permission helpers

export { getAuthContext, resolveAuthContext } from './context';
export type { AuthContext } from './context';

export {
  isAdmin,
  isPastor,
  isLeader,
  isMember,
  hasRole,
  enforceBranchAccess,
  canAccessBranch,
} from './permissions';
