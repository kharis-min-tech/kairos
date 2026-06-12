import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useBranches,
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useRegions,
  useCreateRegion,
  useBranchLeadership,
  useAssignLeadership,
  useRemoveLeadership,
  useBranchRoles,
  useAssignBranchRole,
  useRevokeBranchRole,
} from './use-branches';

vi.mock('@/lib/api', () => ({
  api: {
    branches: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    regions: {
      list: vi.fn(),
      create: vi.fn(),
    },
    leadership: {
      list: vi.fn(),
      assign: vi.fn(),
      remove: vi.fn(),
    },
    branchRoles: {
      list: vi.fn(),
      assign: vi.fn(),
      revoke: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

const mockBranch = { id: 'b1', branchName: 'Main Branch', regionId: 'r1', isActive: true };
const mockRegion = { id: 'r1', regionName: 'East' };
const mockLeader = { id: 'l1', memberId: 'm1', branchId: 'b1', role: 'Main Pastor', isCurrent: true };
const mockBranchRole = {
  id: 'br1',
  memberId: 'm1',
  member: { id: 'm1', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@kairos.local' },
  roleName: 'Branch System Admin',
  assignedDate: '2026-01-01',
  isActive: true,
};

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useBranches ────────────────────────────────────────────

describe('useBranches', () => {
  it('calls api.branches.list and returns data', async () => {
    vi.mocked(api.branches.list).mockResolvedValue({ data: [mockBranch] } as never);

    const { result } = renderHook(() => useBranches(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branches.list).toHaveBeenCalled();
    expect(result.current.data).toEqual([mockBranch]);
  });
});

// ── useBranch ──────────────────────────────────────────────

describe('useBranch', () => {
  it('calls api.branches.get with id', async () => {
    vi.mocked(api.branches.get).mockResolvedValue({ data: mockBranch } as never);

    const { result } = renderHook(() => useBranch('b1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branches.get).toHaveBeenCalledWith('b1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useBranch(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateBranch ────────────────────────────────────────

describe('useCreateBranch', () => {
  it('calls api.branches.create with data', async () => {
    vi.mocked(api.branches.create).mockResolvedValue({ data: mockBranch } as never);

    const { result } = renderHook(() => useCreateBranch(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchName: 'New Branch', regionId: 'r1' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branches.create).toHaveBeenCalledWith({ branchName: 'New Branch', regionId: 'r1' });
  });
});

// ── useUpdateBranch ────────────────────────────────────────

describe('useUpdateBranch', () => {
  it('calls api.branches.update with id and data', async () => {
    vi.mocked(api.branches.update).mockResolvedValue({ data: mockBranch } as never);

    const { result } = renderHook(() => useUpdateBranch(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'b1', data: { branchName: 'Updated' } as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branches.update).toHaveBeenCalledWith('b1', { branchName: 'Updated' });
  });
});

// ── useDeleteBranch ────────────────────────────────────────

describe('useDeleteBranch', () => {
  it('calls api.branches.delete with id', async () => {
    vi.mocked(api.branches.delete).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteBranch(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('b1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branches.delete).toHaveBeenCalledWith('b1');
  });
});

// ── useRegions ─────────────────────────────────────────────

describe('useRegions', () => {
  it('calls api.regions.list and returns data', async () => {
    vi.mocked(api.regions.list).mockResolvedValue({ data: [mockRegion] } as never);

    const { result } = renderHook(() => useRegions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.regions.list).toHaveBeenCalled();
    expect(result.current.data).toEqual([mockRegion]);
  });
});

// ── useCreateRegion ────────────────────────────────────────

describe('useCreateRegion', () => {
  it('calls api.regions.create with data', async () => {
    vi.mocked(api.regions.create).mockResolvedValue({ data: mockRegion } as never);

    const { result } = renderHook(() => useCreateRegion(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ regionName: 'West' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.regions.create).toHaveBeenCalledWith({ regionName: 'West' });
  });
});

// ── useBranchLeadership ────────────────────────────────────

describe('useBranchLeadership', () => {
  it('calls api.leadership.list with branchId', async () => {
    vi.mocked(api.leadership.list).mockResolvedValue({ data: [mockLeader] } as never);

    const { result } = renderHook(() => useBranchLeadership('b1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.leadership.list).toHaveBeenCalledWith('b1', undefined);
    expect(result.current.data).toEqual([mockLeader]);
  });

  it('does not fetch when branchId is empty', () => {
    const { result } = renderHook(() => useBranchLeadership(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('passes params to api.leadership.list', async () => {
    vi.mocked(api.leadership.list).mockResolvedValue({ data: [mockLeader] } as never);

    const { result } = renderHook(() => useBranchLeadership('b1', { includeHistory: true }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.leadership.list).toHaveBeenCalledWith('b1', { includeHistory: true });
  });
});

// ── useAssignLeadership ────────────────────────────────────

describe('useAssignLeadership', () => {
  it('calls api.leadership.assign with branchId and data', async () => {
    vi.mocked(api.leadership.assign).mockResolvedValue({ data: mockLeader } as never);

    const { result } = renderHook(() => useAssignLeadership(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', data: { memberId: 'm1', role: 'Main Pastor' } as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.leadership.assign).toHaveBeenCalledWith('b1', { memberId: 'm1', role: 'Main Pastor' });
  });
});

// ── useRemoveLeadership ────────────────────────────────────

describe('useRemoveLeadership', () => {
  it('calls api.leadership.remove with branchId and leadershipId', async () => {
    vi.mocked(api.leadership.remove).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useRemoveLeadership(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', leadershipId: 'l1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.leadership.remove).toHaveBeenCalledWith('b1', 'l1');
  });
});

// ── useBranchRoles ─────────────────────────────────────────

describe('useBranchRoles', () => {
  it('calls api.branchRoles.list with branchId and uses keyed query', async () => {
    vi.mocked(api.branchRoles.list).mockResolvedValue({ data: [mockBranchRole] } as never);

    const { result } = renderHook(() => useBranchRoles('b1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branchRoles.list).toHaveBeenCalledWith('b1');
    expect(result.current.data).toEqual([mockBranchRole]);
  });

  it('does not fetch when branchId is empty', () => {
    const { result } = renderHook(() => useBranchRoles(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAssignBranchRole ────────────────────────────────────

describe('useAssignBranchRole', () => {
  it('calls api.branchRoles.assign with branchId and memberId', async () => {
    vi.mocked(api.branchRoles.assign).mockResolvedValue({ data: mockBranchRole } as never);

    const { result } = renderHook(() => useAssignBranchRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', data: { memberId: 'm1' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branchRoles.assign).toHaveBeenCalledWith('b1', { memberId: 'm1' });
  });

  it('propagates API errors', async () => {
    vi.mocked(api.branchRoles.assign).mockRejectedValue(new Error('Already assigned'));

    const { result } = renderHook(() => useAssignBranchRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', data: { memberId: 'm1' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Already assigned');
  });

  it('invalidates branch-roles and me-leadership on success', async () => {
    vi.mocked(api.branchRoles.assign).mockResolvedValue({ data: mockBranchRole } as never);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useAssignBranchRole(), { wrapper });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', data: { memberId: 'm1' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(['branches', 'b1', 'roles']);
    expect(keys).toContainEqual(['me', 'leadership']);
  });
});

// ── useRevokeBranchRole ────────────────────────────────────

describe('useRevokeBranchRole', () => {
  it('calls api.branchRoles.revoke with branchId and assignmentId', async () => {
    vi.mocked(api.branchRoles.revoke).mockResolvedValue({ data: mockBranchRole } as never);

    const { result } = renderHook(() => useRevokeBranchRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', assignmentId: 'br1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.branchRoles.revoke).toHaveBeenCalledWith('b1', 'br1');
  });

  it('propagates API errors (e.g. last-BSA guard)', async () => {
    vi.mocked(api.branchRoles.revoke).mockRejectedValue(
      new Error('Cannot revoke the last active Branch System Admin'),
    );

    const { result } = renderHook(() => useRevokeBranchRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', assignmentId: 'br1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/last active/i);
  });

  it('invalidates branch-roles and me-leadership on success', async () => {
    vi.mocked(api.branchRoles.revoke).mockResolvedValue({ data: mockBranchRole } as never);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useRevokeBranchRole(), { wrapper });

    await act(async () => {
      result.current.mutate({ branchId: 'b1', assignmentId: 'br1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(['branches', 'b1', 'roles']);
    expect(keys).toContainEqual(['me', 'leadership']);
  });
});
