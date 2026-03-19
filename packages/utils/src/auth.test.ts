import { describe, it, expect } from 'vitest';
import { enforceBranchAccess } from './auth';
import { ForbiddenError } from './errors';
import type { AuthContext } from '@kairos/types';

const makeMemberAuth = (branchId: string): AuthContext => ({
  memberId: 'member-1',
  email: 'member@example.com',
  branchId,
  systemRole: 'member',
  activeRole: 'member',
});

const makeAdminAuth = (): AuthContext => ({
  memberId: 'admin-1',
  email: 'admin@example.com',
  branchId: 'branch-admin',
  systemRole: 'admin',
  activeRole: 'admin',
});

describe('enforceBranchAccess', () => {
  it('allows access when member belongs to the branch', () => {
    const auth = makeMemberAuth('branch-abc');
    expect(() => enforceBranchAccess(auth, 'branch-abc')).not.toThrow();
  });

  it('throws ForbiddenError when member belongs to a different branch', () => {
    const auth = makeMemberAuth('branch-abc');
    expect(() => enforceBranchAccess(auth, 'branch-xyz')).toThrow(ForbiddenError);
  });

  it('includes a descriptive message in the ForbiddenError', () => {
    const auth = makeMemberAuth('branch-abc');
    expect(() => enforceBranchAccess(auth, 'branch-xyz')).toThrow(
      'You do not have access to this branch',
    );
  });

  it('allows admin to access any branch regardless of their own branchId', () => {
    const auth = makeAdminAuth();
    expect(() => enforceBranchAccess(auth, 'any-branch-id')).not.toThrow();
  });

  it('admin bypasses check even when branchId differs', () => {
    const auth = makeAdminAuth();
    expect(() => enforceBranchAccess(auth, 'branch-admin')).not.toThrow();
    expect(() => enforceBranchAccess(auth, 'completely-different-branch')).not.toThrow();
  });
});
