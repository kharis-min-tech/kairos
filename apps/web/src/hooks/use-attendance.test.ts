import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useServices,
  useService,
  useServiceRoster,
  useAttendanceTrends,
  useMissingMembers,
  useAttendanceByBranch,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useRecordAttendance,
} from './use-attendance';

vi.mock('@/lib/api', () => ({
  api: {
    attendance: {
      listServices: vi.fn(),
      getService: vi.fn(),
      roster: vi.fn(),
      listAttendance: vi.fn(),
      createService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
      recordAttendance: vi.fn(),
      trends: vi.fn(),
      missingMembers: vi.fn(),
      byBranch: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

const mockService = {
  id: 'svc-1',
  branchId: 'branch-1',
  branchName: 'Main',
  serviceDate: '2026-05-24T09:00:00.000Z',
  serviceType: 'Sunday',
  serviceTitle: null,
  topic: null,
  preacherId: null,
  expectedAttendance: null,
  createdBy: 'member-1',
  isActive: true,
  createdAt: '2026-05-24T00:00:00.000Z',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

const mockPaginated = { items: [mockService], total: 1, page: 1, limit: 20, totalPages: 1 };

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return { wrapper, spy };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useServices', () => {
  it('uses the ["attendance","services",params] key and returns data', async () => {
    vi.mocked(api.attendance.listServices).mockResolvedValue({ data: mockPaginated } as never);
    const { wrapper } = createWrapper();
    const params = { type: 'Sunday' as const };
    const { result } = renderHook(() => useServices(params), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.listServices).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockPaginated);
  });
});

describe('useService', () => {
  it('fetches one service and is disabled without an id', async () => {
    vi.mocked(api.attendance.getService).mockResolvedValue({ data: mockService } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useService('svc-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.getService).toHaveBeenCalledWith('svc-1');
  });

  it('is disabled when id is empty', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useService(''), { wrapper });
    expect(api.attendance.getService).not.toHaveBeenCalled();
  });
});

describe('useServiceRoster', () => {
  it('passes search params through to the api', async () => {
    const roster = { items: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    vi.mocked(api.attendance.roster).mockResolvedValue({ data: roster } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useServiceRoster('svc-1', { search: 'jo' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.roster).toHaveBeenCalledWith('svc-1', { search: 'jo' });
  });
});

describe('report queries', () => {
  it('useAttendanceTrends returns trend points', async () => {
    vi.mocked(api.attendance.trends).mockResolvedValue({ data: [{ weekStart: '2026-05-18', attendees: 120, serviceCount: 2 }] } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAttendanceTrends({ weeks: 8 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.trends).toHaveBeenCalledWith({ weeks: 8 });
    expect(result.current.data?.[0]?.attendees).toBe(120);
  });

  it('useMissingMembers returns members', async () => {
    vi.mocked(api.attendance.missingMembers).mockResolvedValue({ data: [] } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMissingMembers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.missingMembers).toHaveBeenCalled();
  });

  it('useAttendanceByBranch returns rates', async () => {
    vi.mocked(api.attendance.byBranch).mockResolvedValue({ data: [] } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAttendanceByBranch(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.attendance.byBranch).toHaveBeenCalled();
  });
});

describe('useCreateService', () => {
  it('invalidates ["attendance","services"] on success', async () => {
    vi.mocked(api.attendance.createService).mockResolvedValue({ data: mockService } as never);
    const { wrapper, spy } = createWrapper();
    const { result } = renderHook(() => useCreateService(), { wrapper });
    await result.current.mutateAsync({ serviceDate: '2026-05-24T09:00:00.000Z', serviceType: 'Sunday' });
    expect(api.attendance.createService).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'services'] });
  });

  it('propagates errors', async () => {
    vi.mocked(api.attendance.createService).mockRejectedValue(new Error('boom'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateService(), { wrapper });
    await expect(
      result.current.mutateAsync({ serviceDate: 'x', serviceType: 'Sunday' }),
    ).rejects.toThrow('boom');
  });
});

describe('useUpdateService', () => {
  it('invalidates services list and the single service', async () => {
    vi.mocked(api.attendance.updateService).mockResolvedValue({ data: mockService } as never);
    const { wrapper, spy } = createWrapper();
    const { result } = renderHook(() => useUpdateService('svc-1'), { wrapper });
    await result.current.mutateAsync({ topic: 'Grace' });
    expect(api.attendance.updateService).toHaveBeenCalledWith('svc-1', { topic: 'Grace' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'services'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'service', 'svc-1'] });
  });
});

describe('useDeleteService', () => {
  it('invalidates services on success', async () => {
    vi.mocked(api.attendance.deleteService).mockResolvedValue({ data: mockService } as never);
    const { wrapper, spy } = createWrapper();
    const { result } = renderHook(() => useDeleteService(), { wrapper });
    await result.current.mutateAsync('svc-1');
    expect(api.attendance.deleteService).toHaveBeenCalledWith('svc-1');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'services'] });
  });
});

describe('useRecordAttendance', () => {
  it('invalidates roster, service and records keys for the serviceId', async () => {
    vi.mocked(api.attendance.recordAttendance).mockResolvedValue({ data: { recorded: 3 } } as never);
    const { wrapper, spy } = createWrapper();
    const { result } = renderHook(() => useRecordAttendance('svc-1'), { wrapper });
    await result.current.mutateAsync({ entries: [{ memberId: 'm1', status: 'Present' }] });
    expect(api.attendance.recordAttendance).toHaveBeenCalledWith('svc-1', {
      entries: [{ memberId: 'm1', status: 'Present' }],
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'roster', 'svc-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'service', 'svc-1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['attendance', 'records', 'svc-1'] });
  });
});
