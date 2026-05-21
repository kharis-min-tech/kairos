import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useEnrollments,
  useEnrollment,
  useCreateEnrollment,
  useUpdateEnrollment,
  useBulkAdvanceEnrollments,
} from './use-new-believers';

vi.mock('@/lib/api', () => ({
  api: {
    newBelievers: {
      enrollments: {
        list: vi.fn(),
        get: vi.fn(),
        alerts: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        bulkAdvance: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

const enrollmentId = 'enr-1';
const mockEnrollment = { id: enrollmentId, memberId: 'm-1', stage: 'enrolled' };

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEnrollments', () => {
  it('returns the enrollments list', async () => {
    vi.mocked(api.newBelievers.enrollments.list).mockResolvedValue({
      data: { data: [mockEnrollment], total: 1, page: 1, limit: 20 },
    } as never);

    const { result } = renderHook(() => useEnrollments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.newBelievers.enrollments.list).toHaveBeenCalledTimes(1);
    expect(result.current.data?.data).toEqual([mockEnrollment]);
  });

  it('forwards sortBy and includes it in the query key', async () => {
    vi.mocked(api.newBelievers.enrollments.list).mockResolvedValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
    } as never);

    const params = { sortBy: 'name' as const, page: 1, limit: 20 };
    const { result } = renderHook(() => useEnrollments(params), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.newBelievers.enrollments.list).toHaveBeenCalledWith(params);
  });

  it('treats different sortBy values as distinct query keys', async () => {
    vi.mocked(api.newBelievers.enrollments.list).mockResolvedValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
    } as never);

    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useEnrollments({ sortBy: 'name' }), { wrapper });
    const { result: r2 } = renderHook(() => useEnrollments({ sortBy: 'last-activity' }), { wrapper });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));
    // Two separate fetches because the query keys differ
    expect(api.newBelievers.enrollments.list).toHaveBeenCalledTimes(2);
  });
});

describe('useEnrollment', () => {
  it('does not fetch when the id is empty', () => {
    const { result } = renderHook(() => useEnrollment(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches the enrollment by id', async () => {
    vi.mocked(api.newBelievers.enrollments.get).mockResolvedValue({
      data: mockEnrollment,
    } as never);
    const { result } = renderHook(() => useEnrollment(enrollmentId), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.newBelievers.enrollments.get).toHaveBeenCalledWith(enrollmentId);
  });
});

describe('useCreateEnrollment', () => {
  it('invalidates the new-believers cache on success', async () => {
    vi.mocked(api.newBelievers.enrollments.create).mockResolvedValue({
      data: mockEnrollment,
    } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useCreateEnrollment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ memberId: 'm-1', branchId: 'b-1' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['new-believers', 'enrollments'],
    });
  });
});

describe('useUpdateEnrollment', () => {
  it('invalidates list and detail keys on success', async () => {
    vi.mocked(api.newBelievers.enrollments.update).mockResolvedValue({
      data: mockEnrollment,
    } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateEnrollment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: enrollmentId, data: { stage: 'session-1' } });
    });

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(['new-believers', 'enrollments']);
    expect(keys).toContainEqual(['new-believers', 'enrollments', enrollmentId]);
  });
});

describe('useBulkAdvanceEnrollments', () => {
  it('forwards the request and reports advanced/failed counts', async () => {
    vi.mocked(api.newBelievers.enrollments.bulkAdvance).mockResolvedValue({
      data: { advanced: 2, failed: 1 },
    } as never);

    const { result } = renderHook(() => useBulkAdvanceEnrollments(), {
      wrapper: createWrapper(),
    });
    let returned: { advanced: number; failed: number } | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({
        enrollmentIds: ['a', 'b', 'c'],
        targetStage: 'session-1',
      });
    });
    expect(api.newBelievers.enrollments.bulkAdvance).toHaveBeenCalledWith({
      enrollmentIds: ['a', 'b', 'c'],
      targetStage: 'session-1',
    });
    expect(returned).toEqual({ advanced: 2, failed: 1 });
  });

  it('invalidates the new-believers enrollments cache on success', async () => {
    vi.mocked(api.newBelievers.enrollments.bulkAdvance).mockResolvedValue({
      data: { advanced: 1, failed: 0 },
    } as never);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useBulkAdvanceEnrollments(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ enrollmentIds: ['a'], targetStage: 'session-1' });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['new-believers', 'enrollments'],
    });
  });
});
