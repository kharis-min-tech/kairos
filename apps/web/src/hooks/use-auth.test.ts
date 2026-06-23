import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useLogin,
  useSignup,
  useVerifyEmail,
  useForgotPassword,
  useResetPassword,
  persistAuthSuccess,
} from './use-auth';
import { useAuthStore } from '@/lib/auth-store';
import type { Member } from '@kairos/types';

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      signup: vi.fn(),
      verifyEmail: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    },
  },
}));

/** Mint a JWT-shaped string whose payload carries `scope`. The decoder
 *  in auth-store only reads the payload — signature is irrelevant. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

import { api } from '@/lib/api';

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
  systemRole: 'member', honorific: null,
  memberType: 'member',
  guardianMemberId: null,
  emailVerified: true,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    activeRole: null,
    scope: null,
    mustChangePassword: false,
  });
});

describe('useLogin', () => {
  it('calls api.auth.login with just email + password (no activeRole)', async () => {
    vi.mocked(api.auth.login).mockResolvedValue({
      data: {
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        member: mockMember as never,
        isFirstLogin: false,
      },
    } as never);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ email: 'jane@example.com', password: 'pass123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.login).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'pass123' });
  });

  it('returns the single-role envelope unchanged — does NOT auto-persist tokens', async () => {
    vi.mocked(api.auth.login).mockResolvedValue({
      data: {
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        member: mockMember as never,
        isFirstLogin: false,
      },
    } as never);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ email: 'jane@example.com', password: 'pass123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Page-side persist is now responsible; hook stays a thin wrapper.
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(result.current.data?.tokens?.accessToken).toBe('at');
  });

  it('surfaces error when api.auth.login rejects', async () => {
    vi.mocked(api.auth.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ email: 'bad@example.com', password: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Invalid credentials');
  });
});

// RBAC Phase 5/6: useFinalizeRole / useSwitchRole removed alongside the
// role-selection envelope and in-app role switcher. Tests for them
// removed too.

describe('persistAuthSuccess', () => {
  it('writes tokens, user, mustChangePassword, and activeRole to the store', () => {
    persistAuthSuccess({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member: { ...mockMember, mustChangePassword: true } as never,
      activeRole: 'member',
    });
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('at');
    expect(state.refreshToken).toBe('rt');
    expect(state.user?.id).toBe('member-1');
    expect(state.mustChangePassword).toBe(true);
    expect(state.activeRole).toBe('member');
  });

  it('decodes scope out of the access-token JWT payload', () => {
    const jwt = fakeJwt({
      memberId: 'm-1',
      activeRole: 'member',
      scope: { kind: 'fellowship', id: 'f-99' },
    });
    persistAuthSuccess({
      tokens: { accessToken: jwt, refreshToken: 'rt' },
      member: mockMember as never,
      activeRole: 'member',
    });
    expect(useAuthStore.getState().scope).toEqual({ kind: 'fellowship', id: 'f-99' });
  });

  it('clears scope to null when the JWT has no scope claim', () => {
    useAuthStore.setState({ scope: { kind: 'branch', id: 'b-stale' } });
    const jwt = fakeJwt({ memberId: 'm-1', activeRole: 'admin' });
    persistAuthSuccess({
      tokens: { accessToken: jwt, refreshToken: 'rt' },
      member: mockMember as never,
      activeRole: 'admin',
    });
    expect(useAuthStore.getState().scope).toBeNull();
  });

  // availableRoles persistence tests removed — persistAuthSuccess no longer
  // touches availableRoles (login is single-step, no envelope).
});

// useSwitchRole tests removed in Phase 5b.

describe('useSignup', () => {
  it('calls api.auth.signup with provided data', async () => {
    vi.mocked(api.auth.signup).mockResolvedValue({ data: { message: 'Verify your email' } } as never);

    const { result } = renderHook(() => useSignup(), { wrapper: createWrapper() });

    const signupData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'pass123',
      branchId: 'branch-1',
    };

    await act(async () => {
      result.current.mutate(signupData as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.signup).toHaveBeenCalledWith(signupData);
  });
});

describe('useVerifyEmail', () => {
  it('calls api.auth.verifyEmail with token string', async () => {
    vi.mocked(api.auth.verifyEmail).mockResolvedValue({} as never);

    const { result } = renderHook(() => useVerifyEmail(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('verify-token-abc');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.verifyEmail).toHaveBeenCalledWith({ token: 'verify-token-abc' });
  });
});

describe('useForgotPassword', () => {
  it('calls api.auth.forgotPassword with email string', async () => {
    vi.mocked(api.auth.forgotPassword).mockResolvedValue({} as never);

    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('jane@example.com');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.forgotPassword).toHaveBeenCalledWith({ email: 'jane@example.com' });
  });
});

describe('useResetPassword', () => {
  it('calls api.auth.resetPassword with token and newPassword', async () => {
    vi.mocked(api.auth.resetPassword).mockResolvedValue({} as never);

    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ token: 'reset-tok', newPassword: 'newpass456' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.auth.resetPassword).toHaveBeenCalledWith({ token: 'reset-tok', newPassword: 'newpass456' });
  });
});
