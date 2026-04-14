import { describe, it, expect } from 'vitest';
import type { AuthContext } from './context';
import {
  isAdmin,
  isPastor,
  isLeader,
  isMember,
  hasRole,
  canAccessBranch,
  enforceBranchAccess,
} from './permissions';
import { ForbiddenError } from '../error-handler/errors';

function createCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    memberId: "member-1",
    branchId: "branch-1",
    roles: ['Member'],
    ...overrides,
  };
}

describe('Role check helpers', () => {
  it('isAdmin returns true for Admin role', () => {
    expect(isAdmin(createCtx({ roles: ['Admin'] }))).toBe(true);
    expect(isAdmin(createCtx({ roles: ['Member'] }))).toBe(false);
  });

  it('isPastor returns true for Pastor role', () => {
    expect(isPastor(createCtx({ roles: ['Pastor'] }))).toBe(true);
    expect(isPastor(createCtx({ roles: ['Member'] }))).toBe(false);
  });

  it('isLeader returns true for Leader role', () => {
    expect(isLeader(createCtx({ roles: ['Leader'] }))).toBe(true);
    expect(isLeader(createCtx({ roles: ['Member'] }))).toBe(false);
  });

  it('isMember returns true for Member role', () => {
    expect(isMember(createCtx({ roles: ['Member'] }))).toBe(true);
    expect(isMember(createCtx({ roles: ['Admin'] }))).toBe(false);
  });

  it('hasRole checks for specific role', () => {
    const ctx = createCtx({ roles: ['Admin', 'Pastor'] });
    expect(hasRole(ctx, 'Admin')).toBe(true);
    expect(hasRole(ctx, 'Pastor')).toBe(true);
    expect(hasRole(ctx, 'Member')).toBe(false);
  });
});

describe('canAccessBranch', () => {
  it('Admin can access any branch', () => {
    const ctx = createCtx({ roles: ['Admin'], branchId: 'branch-1' });
    expect(canAccessBranch(ctx, 'branch-1')).toBe(true);
    expect(canAccessBranch(ctx, 'branch-2')).toBe(true);
    expect(canAccessBranch(ctx, 'branch-999')).toBe(true);
  });

  it('Pastor can only access their own branch', () => {
    const ctx = createCtx({ roles: ['Pastor'], branchId: 'branch-1' });
    expect(canAccessBranch(ctx, 'branch-1')).toBe(true);
    expect(canAccessBranch(ctx, 'branch-2')).toBe(false);
  });

  it('Leader can only access their own branch', () => {
    const ctx = createCtx({ roles: ['Leader'], branchId: 'branch-3' });
    expect(canAccessBranch(ctx, 'branch-3')).toBe(true);
    expect(canAccessBranch(ctx, 'branch-4')).toBe(false);
  });

  it('Member can only access their own branch', () => {
    const ctx = createCtx({ roles: ['Member'], branchId: 'branch-5' });
    expect(canAccessBranch(ctx, 'branch-5')).toBe(true);
    expect(canAccessBranch(ctx, 'branch-6')).toBe(false);
  });
});

describe('enforceBranchAccess', () => {
  it('should not throw for Admin accessing any branch', () => {
    const ctx = createCtx({ roles: ['Admin'], branchId: 'branch-1' });
    expect(() => enforceBranchAccess(ctx, 'branch-999')).not.toThrow();
  });

  it('should not throw for user accessing their own branch', () => {
    const ctx = createCtx({ roles: ['Pastor'], branchId: 'branch-1' });
    expect(() => enforceBranchAccess(ctx, 'branch-1')).not.toThrow();
  });

  it('should throw ForbiddenError for cross-branch access', () => {
    const ctx = createCtx({ roles: ['Pastor'], branchId: 'branch-1' });
    expect(() => enforceBranchAccess(ctx, 'branch-2')).toThrow(ForbiddenError);
  });
});
