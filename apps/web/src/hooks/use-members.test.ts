import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useMembers,
  useMember,
  useMyProfile,
  useUpdateMember,
  useApproveMember,
  useDeactivateMember,
  useCreateMember,
  useMemberRoles,
  useAssignRole,
  useRemoveRole,
} from './use-members';

vi.mock('@/lib/api', () => ({
  api: {
    members: {
      list: vi.fn(),
      get: vi.fn(),
      me: vi.fn(),
      update: vi.fn(),
      approve: vi.fn(),
      deactivate: vi.fn(),
      create: vi.fn(),
      roles: {
        list: vi.fn(),
        assign: vi.fn(),
        remove: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

const mockMember = {
  id: 'member-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  homeBranchId: 'branch-1',
  isActive: true,
  approvalStatus: 'approved',
  systemRole: 'member',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPaginated = {
  items: [mockMember],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useMembers ─────────────────────────────────────────────

describe('useMembers', () => {
  it('calls api.members.list and returns data', async () => {
    vi.mocked(api.members.list).mockResolvedValue({ data: mockPaginated } as never);

    const { result } = renderHook(() => useMembers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.list).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual(mockPaginated);
  });

  it('passes params to api.members.list', async () => {
    vi.mocked(api.members.list).mockResolvedValue({ data: mockPaginated } as never);
    const params = { page: 2, limit: 10, search: 'John' };

    const { result } = renderHook(() => useMembers(params), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.list).toHaveBeenCalledWith(params);
  });
});

// ── useMember ──────────────────────────────────────────────

describe('useMember', () => {
  it('calls api.members.get with id', async () => {
    vi.mocked(api.members.get).mockResolvedValue({ data: mockMember } as never);

    const { result } = renderHook(() => useMember('member-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.get).toHaveBeenCalledWith('member-1');
    expect(result.current.data).toEqual(mockMember);
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useMember(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useMyProfile ───────────────────────────────────────────

describe('useMyProfile', () => {
  it('calls api.members.me', async () => {
    vi.mocked(api.members.me).mockResolvedValue({ data: mockMember } as never);

    const { result } = renderHook(() => useMyProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.me).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockMember);
  });
});

// ── useUpdateMember ────────────────────────────────────────

describe('useUpdateMember', () => {
  it('calls api.members.update with id and data', async () => {
    vi.mocked(api.members.update).mockResolvedValue({ data: mockMember } as never);

    const { result } = renderHook(() => useUpdateMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'member-1', data: { firstName: 'Jane' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.update).toHaveBeenCalledWith('member-1', { firstName: 'Jane' });
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.members.update).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useUpdateMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'bad-id', data: { firstName: 'X' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

// ── useApproveMember ───────────────────────────────────────

describe('useApproveMember', () => {
  it('calls api.members.approve with id and data', async () => {
    vi.mocked(api.members.approve).mockResolvedValue({ data: mockMember } as never);

    const { result } = renderHook(() => useApproveMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'member-1', data: { status: 'approved' } as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.approve).toHaveBeenCalledWith('member-1', { status: 'approved' });
  });
});

// ── useDeactivateMember ────────────────────────────────────

describe('useDeactivateMember', () => {
  it('calls api.members.deactivate with id', async () => {
    vi.mocked(api.members.deactivate).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeactivateMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('member-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.deactivate).toHaveBeenCalledWith('member-1');
  });
});

// ── useCreateMember ────────────────────────────────────────

describe('useCreateMember', () => {
  it('calls api.members.create with data', async () => {
    const newMember = { firstName: 'New', lastName: 'Member', email: 'new@test.com', branchId: 'branch-1' };
    vi.mocked(api.members.create).mockResolvedValue({ data: { ...mockMember, ...newMember } } as never);

    const { result } = renderHook(() => useCreateMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(newMember as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.create).toHaveBeenCalledWith(newMember);
  });

  it('surfaces error on rejection', async () => {
    vi.mocked(api.members.create).mockRejectedValue(new Error('Email already exists'));

    const { result } = renderHook(() => useCreateMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ firstName: 'X', lastName: 'Y', email: 'dup@test.com', branchId: 'b1' } as never);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Email already exists');
  });
});

// ── useMemberRoles ─────────────────────────────────────────

describe('useMemberRoles', () => {
  it('calls api.members.roles.list with memberId', async () => {
    const mockRoles = [{ id: 'r1', roleName: 'Usher', branchId: 'branch-1' }];
    vi.mocked(api.members.roles.list).mockResolvedValue({ data: mockRoles } as never);

    const { result } = renderHook(() => useMemberRoles('member-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.roles.list).toHaveBeenCalledWith('member-1');
    expect(result.current.data).toEqual(mockRoles);
  });

  it('does not fetch when memberId is empty', () => {
    const { result } = renderHook(() => useMemberRoles(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAssignRole ──────────────────────────────────────────

describe('useAssignRole', () => {
  it('calls api.members.roles.assign with memberId and data', async () => {
    const mockRole = { id: 'mr1', memberId: 'member-1', roleId: 'role-1', branchId: 'branch-1' };
    vi.mocked(api.members.roles.assign).mockResolvedValue({ data: mockRole } as never);

    const { result } = renderHook(() => useAssignRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ memberId: 'member-1', data: { roleId: 'role-1', branchId: 'branch-1' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.roles.assign).toHaveBeenCalledWith('member-1', { roleId: 'role-1', branchId: 'branch-1' });
  });
});

// ── useRemoveRole ──────────────────────────────────────────

describe('useRemoveRole', () => {
  it('calls api.members.roles.remove with memberId and roleAssignmentId', async () => {
    vi.mocked(api.members.roles.remove).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useRemoveRole(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ memberId: 'member-1', roleAssignmentId: 'mr1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.members.roles.remove).toHaveBeenCalledWith('member-1', 'mr1');
  });
});
