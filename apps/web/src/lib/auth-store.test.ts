import { beforeEach, describe, it, expect } from 'vitest';
import { useAuthStore } from './auth-store';
import type { Member } from '@kairos/types';

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
  emailVerified: true,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  });

  it('has null tokens and user in initial state', () => {
    const { accessToken, refreshToken, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(user).toBeNull();
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
