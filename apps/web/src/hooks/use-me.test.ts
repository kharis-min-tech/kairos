import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const rotaMock = vi.fn();
const leadershipMock = vi.fn();
const setBranchAdminAuthorityMock = vi.fn();
let authStoreState: {
  accessToken: string | null;
  setBranchAdminAuthority: typeof setBranchAdminAuthorityMock;
} = {
  accessToken: 'token-abc',
  setBranchAdminAuthority: setBranchAdminAuthorityMock,
};

vi.mock('@/lib/api', () => ({
  api: {
    me: {
      rota: (params?: unknown) => rotaMock(params),
      leadership: () => leadershipMock(),
    },
  },
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: <T,>(selector?: (s: typeof authStoreState) => T) =>
    selector ? selector(authStoreState) : (authStoreState as unknown as T),
}));

import { useMyRota, useMyLeadership } from './use-me';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMyRota', () => {
  beforeEach(() => {
    rotaMock.mockReset();
  });

  it('returns the data envelope from api.me.rota', async () => {
    const fixture = [
      {
        assignmentId: 'a-1',
        instanceId: 'i-1',
        branchDepartmentId: 'bd-1',
        templateId: 't-1',
        templateName: 'Sunday Ushers',
        serviceDate: '2026-05-24',
        startTime: '09:00',
        slotRoleName: 'Front of house',
        status: 'confirmed',
        instanceStatus: 'published',
      },
    ];
    rotaMock.mockResolvedValueOnce({ success: true, data: fixture });

    const { result } = renderHook(() => useMyRota(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(fixture);
    expect(rotaMock).toHaveBeenCalledWith(undefined);
  });

  it('passes from/to params through to the api client', async () => {
    rotaMock.mockResolvedValueOnce({ success: true, data: [] });

    const params = { from: '2026-05-18', to: '2026-06-18' };
    const { result } = renderHook(() => useMyRota(params), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rotaMock).toHaveBeenCalledWith(params);
  });
});

describe('useMyLeadership', () => {
  beforeEach(() => {
    leadershipMock.mockReset();
    setBranchAdminAuthorityMock.mockReset();
    authStoreState = {
      accessToken: 'token-abc',
      setBranchAdminAuthority: setBranchAdminAuthorityMock,
    };
  });

  it('returns the leadership payload from api.me.leadership', async () => {
    const fixture = {
      branchSystemAdminBranchIds: ['b-1'],
      branchDataAdminBranchIds: ['b-2'],
      leadFellowships: [{ id: 'f-1', fellowshipName: 'Youth', branchId: 'b-1' }],
      coLeadFellowships: [],
      leadDepartments: [],
      deputyDepartments: [],
    };
    leadershipMock.mockResolvedValueOnce({ success: true, data: fixture });

    const { result } = renderHook(() => useMyLeadership(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(fixture);
    expect(leadershipMock).toHaveBeenCalledTimes(1);
  });

  it('pushes branch-admin authority into the auth store on success', async () => {
    const fixture = {
      branchSystemAdminBranchIds: ['b-1', 'b-2'],
      branchDataAdminBranchIds: ['b-3'],
      leadFellowships: [],
      coLeadFellowships: [],
      leadDepartments: [],
      deputyDepartments: [],
    };
    leadershipMock.mockResolvedValueOnce({ success: true, data: fixture });

    const { result } = renderHook(() => useMyLeadership(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setBranchAdminAuthorityMock).toHaveBeenCalledWith({
      branchSystemAdminBranchIds: ['b-1', 'b-2'],
      branchDataAdminBranchIds: ['b-3'],
    });
  });

  it('uses the documented query key ["me", "leadership"]', async () => {
    leadershipMock.mockResolvedValueOnce({
      success: true,
      data: {
        branchSystemAdminBranchIds: [],
        branchDataAdminBranchIds: [],
        leadFellowships: [],
        coLeadFellowships: [],
        leadDepartments: [],
        deputyDepartments: [],
      },
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useMyLeadership(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(qc.getQueryData(['me', 'leadership'])).toEqual(result.current.data);
  });

  it('is disabled when the user is not authenticated (no accessToken)', () => {
    authStoreState = {
      accessToken: null,
      setBranchAdminAuthority: setBranchAdminAuthorityMock,
    };

    const { result } = renderHook(() => useMyLeadership(), { wrapper: createWrapper() });
    // Should not have fetched
    expect(leadershipMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
