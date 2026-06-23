import { beforeEach, describe, it, expect } from 'vitest';
import { decodeScopeFromAccessToken, useAuthStore } from './auth-store';
import type { Member, RoleOption } from '@kairos/types';

const mockMember: Member = {
  id: 'member-1',
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: null,
  dateOfBirth: null,
  gender: null,
  email: 'jane@example.com',
  phone: null,
  address: null,
  city: null,
  postalCode: null,
  homeBranchId: 'branch-1',
  secondaryBranchId: null,
  isAtSecondaryBranch: false,
  secondaryAddress: null,
  secondaryCity: null,
  secondaryPostalCode: null,
  membershipDate: '2024-01-01',
  isActive: true,
  photoUrl: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRelationship: null,
  approvalStatus: 'approved',
  systemRole: 'member',
  memberType: 'member',
  guardianMemberId: null,
  emailVerified: true,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleRoles: RoleOption[] = [
  { activeRole: 'admin', displayLabel: 'System Admin', key: 'k-admin' },
  {
    activeRole: 'leader' as any,
    scope: { kind: 'fellowship', id: 'f-1' },
    displayLabel: 'Fellowship Lead — Joy',
    key: 'k-lead-f1',
  },
];

/** Mint a JWT-shaped string with the given payload. Signature is bogus —
 *  the client-side decoder doesn't verify, it only reads the payload. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeRole: null,
      scope: null,
      availableRoles: [],
      branchSystemAdminBranchIds: [],
      branchDataAdminBranchIds: [],
    });
  });

  it('has null tokens and user in initial state', () => {
    const { accessToken, refreshToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(user).toBeNull();
  });

  it('has empty branch-admin authority arrays in initial state', () => {
    const { branchSystemAdminBranchIds, branchDataAdminBranchIds } = useAuthStore.getState();
    expect(branchSystemAdminBranchIds).toEqual([]);
    expect(branchDataAdminBranchIds).toEqual([]);
  });

  it('has null scope and empty availableRoles in initial state', () => {
    const { scope, availableRoles } = useAuthStore.getState();
    expect(scope).toBeNull();
    expect(availableRoles).toEqual([]);
  });

  it('setBranchAdminAuthority stores both arrays', () => {
    useAuthStore.getState().setBranchAdminAuthority({
      branchSystemAdminBranchIds: ['b-1', 'b-2'],
      branchDataAdminBranchIds: ['b-3'],
    });

    const state = useAuthStore.getState();
    expect(state.branchSystemAdminBranchIds).toEqual(['b-1', 'b-2']);
    expect(state.branchDataAdminBranchIds).toEqual(['b-3']);
  });

  it('setScope stores a fellowship scope', () => {
    useAuthStore.getState().setScope({ kind: 'fellowship', id: 'f-1' });
    expect(useAuthStore.getState().scope).toEqual({ kind: 'fellowship', id: 'f-1' });
  });

  it('setScope can clear back to null', () => {
    useAuthStore.getState().setScope({ kind: 'branch', id: 'b-1' });
    useAuthStore.getState().setScope(null);
    expect(useAuthStore.getState().scope).toBeNull();
  });

  it('setAvailableRoles stores the role-option list', () => {
    useAuthStore.getState().setAvailableRoles(sampleRoles);
    expect(useAuthStore.getState().availableRoles).toEqual(sampleRoles);
  });

  it('logout clears branch-admin authority too', () => {
    useAuthStore.setState({
      branchSystemAdminBranchIds: ['b-1'],
      branchDataAdminBranchIds: ['b-2'],
    });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.branchSystemAdminBranchIds).toEqual([]);
    expect(state.branchDataAdminBranchIds).toEqual([]);
  });

  it('logout clears scope and availableRoles too', () => {
    useAuthStore.setState({
      scope: { kind: 'department', id: 'd-1' },
      availableRoles: sampleRoles,
    });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.scope).toBeNull();
    expect(state.availableRoles).toEqual([]);
  });

  it('setTokens stores access and refresh tokens', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
    });

    const { accessToken, refreshToken } = useAuthStore.getState();
    expect(accessToken).toBe('access-abc');
    expect(refreshToken).toBe('refresh-xyz');
  });

  it('setUser stores the member', () => {
    useAuthStore.getState().setUser(mockMember);
    expect(useAuthStore.getState().user).toEqual(mockMember);
  });

  it('setUser with null clears the user', () => {
    useAuthStore.getState().setUser(mockMember);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout clears tokens and user', () => {
    useAuthStore.setState({
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      user: mockMember,
    });

    useAuthStore.getState().logout();

    const { accessToken, refreshToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(user).toBeNull();
  });
});

describe('decodeScopeFromAccessToken', () => {
  it('returns the scope from a JWT payload', () => {
    const jwt = fakeJwt({
      memberId: 'm-1',
      email: 'a@b.c',
      activeRole: 'leader' as any,
      scope: { kind: 'fellowship', id: 'f-1' },
    });
    expect(decodeScopeFromAccessToken(jwt)).toEqual({ kind: 'fellowship', id: 'f-1' });
  });

  it('returns null when the JWT has no scope claim', () => {
    const jwt = fakeJwt({ memberId: 'm-1', activeRole: 'admin' });
    expect(decodeScopeFromAccessToken(jwt)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(decodeScopeFromAccessToken('not-a-jwt')).toBeNull();
    expect(decodeScopeFromAccessToken('a.b')).toBeNull();
    expect(decodeScopeFromAccessToken('a.@@@.c')).toBeNull();
  });
});
