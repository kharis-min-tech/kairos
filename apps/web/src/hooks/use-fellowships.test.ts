import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useFellowships,
  useFellowship,
  useCreateFellowship,
  useUpdateFellowship,
  useDeleteFellowship,
  useFellowshipMembers,
  useAddFellowshipMember,
  useRemoveFellowshipMember,
  useFellowshipMeetings,
  useCreateMeeting,
  useMeetingAttendance,
  useRecordAttendance,
  useAttendanceSummary,
} from './use-fellowships';

vi.mock('@/lib/api', () => ({
  api: {
    fellowships: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      members: {
        list: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
      },
      meetings: {
        list: vi.fn(),
        create: vi.fn(),
      },
      attendance: {
        record: vi.fn(),
        get: vi.fn(),
        summary: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

const mockFellowship = {
  id: 'f1',
  fellowshipName: 'Grace K-Group',
  fellowshipType: 'K-Groups',
  branchId: 'branch-1',
  isActive: true,
};

const mockPaginated = { items: [mockFellowship], total: 1, page: 1, limit: 20, totalPages: 1 };

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useFellowships ─────────────────────────────────────────

describe('useFellowships', () => {
  it('calls api.fellowships.list and returns data', async () => {
    vi.mocked(api.fellowships.list).mockResolvedValue({ data: mockPaginated } as never);

    const { result } = renderHook(() => useFellowships(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.list).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual(mockPaginated);
  });

  it('passes params to api.fellowships.list', async () => {
    vi.mocked(api.fellowships.list).mockResolvedValue({ data: mockPaginated } as never);
    const params = { fellowshipType: 'K-Groups' as const, branchId: 'branch-1' };

    const { result } = renderHook(() => useFellowships(params), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.list).toHaveBeenCalledWith(params);
  });
});

// ── useFellowship ──────────────────────────────────────────

describe('useFellowship', () => {
  it('calls api.fellowships.get with id', async () => {
    vi.mocked(api.fellowships.get).mockResolvedValue({ data: mockFellowship } as never);

    const { result } = renderHook(() => useFellowship('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.get).toHaveBeenCalledWith('f1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useFellowship(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateFellowship ────────────────────────────────────

describe('useCreateFellowship', () => {
  it('calls api.fellowships.create with data', async () => {
    vi.mocked(api.fellowships.create).mockResolvedValue({ data: mockFellowship } as never);

    const { result } = renderHook(() => useCreateFellowship(), { wrapper: createWrapper() });
    const payload = { fellowshipName: 'Grace K-Group', fellowshipType: 'K-Groups', branchId: 'branch-1' };

    await act(async () => {
      result.current.mutate(payload as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.create).toHaveBeenCalledWith(payload);
  });
});

// ── useUpdateFellowship ────────────────────────────────────

describe('useUpdateFellowship', () => {
  it('calls api.fellowships.update with id and data', async () => {
    vi.mocked(api.fellowships.update).mockResolvedValue({ data: mockFellowship } as never);

    const { result } = renderHook(() => useUpdateFellowship(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'f1', data: { fellowshipName: 'Updated' } as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.update).toHaveBeenCalledWith('f1', { fellowshipName: 'Updated' });
  });
});

// ── useDeleteFellowship ────────────────────────────────────

describe('useDeleteFellowship', () => {
  it('calls api.fellowships.delete with id', async () => {
    vi.mocked(api.fellowships.delete).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteFellowship(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('f1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.delete).toHaveBeenCalledWith('f1');
  });
});

// ── useFellowshipMembers ───────────────────────────────────

describe('useFellowshipMembers', () => {
  it('calls api.fellowships.members.list with fellowshipId', async () => {
    const mockMembers = [{ id: 'fm1', memberId: 'm1', fellowshipId: 'f1' }];
    vi.mocked(api.fellowships.members.list).mockResolvedValue({ data: mockMembers } as never);

    const { result } = renderHook(() => useFellowshipMembers('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.members.list).toHaveBeenCalledWith('f1');
    expect(result.current.data).toEqual(mockMembers);
  });

  it('does not fetch when fellowshipId is empty', () => {
    const { result } = renderHook(() => useFellowshipMembers(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAddFellowshipMember ─────────────────────────────────

describe('useAddFellowshipMember', () => {
  it('calls api.fellowships.members.add with fellowshipId and data', async () => {
    vi.mocked(api.fellowships.members.add).mockResolvedValue({ data: { id: 'fm1' } } as never);

    const { result } = renderHook(() => useAddFellowshipMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ fellowshipId: 'f1', data: { memberId: 'm1' } as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.members.add).toHaveBeenCalledWith('f1', { memberId: 'm1' });
  });
});

// ── useRemoveFellowshipMember ──────────────────────────────

describe('useRemoveFellowshipMember', () => {
  it('calls api.fellowships.members.remove', async () => {
    vi.mocked(api.fellowships.members.remove).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useRemoveFellowshipMember(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ fellowshipId: 'f1', memberId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.members.remove).toHaveBeenCalledWith('f1', 'm1');
  });
});

// ── useFellowshipMeetings ──────────────────────────────────

describe('useFellowshipMeetings', () => {
  it('calls api.fellowships.meetings.list with fellowshipId', async () => {
    const mockMeetings = [{ id: 'mt1', fellowshipId: 'f1', meetingDate: '2024-06-01' }];
    vi.mocked(api.fellowships.meetings.list).mockResolvedValue({ data: mockMeetings } as never);

    const { result } = renderHook(() => useFellowshipMeetings('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.meetings.list).toHaveBeenCalledWith('f1');
  });

  it('does not fetch when fellowshipId is empty', () => {
    const { result } = renderHook(() => useFellowshipMeetings(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useCreateMeeting ───────────────────────────────────────

describe('useCreateMeeting', () => {
  it('calls api.fellowships.meetings.create with fellowshipId and data', async () => {
    const meeting = { meetingDate: '2024-06-01', topic: 'Prayer' };
    vi.mocked(api.fellowships.meetings.create).mockResolvedValue({ data: { id: 'mt1', ...meeting } } as never);

    const { result } = renderHook(() => useCreateMeeting(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ fellowshipId: 'f1', data: meeting as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.meetings.create).toHaveBeenCalledWith('f1', meeting);
  });
});

// ── useMeetingAttendance ───────────────────────────────────

describe('useMeetingAttendance', () => {
  it('calls api.fellowships.attendance.get', async () => {
    const mockAttendance = [{ memberId: 'm1', attendanceStatus: 'Present' }];
    vi.mocked(api.fellowships.attendance.get).mockResolvedValue({ data: mockAttendance } as never);

    const { result } = renderHook(() => useMeetingAttendance('f1', 'mt1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.attendance.get).toHaveBeenCalledWith('f1', 'mt1');
  });

  it('does not fetch when ids are empty', () => {
    const { result } = renderHook(() => useMeetingAttendance('', ''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useRecordAttendance ────────────────────────────────────

describe('useRecordAttendance', () => {
  it('calls api.fellowships.attendance.record', async () => {
    vi.mocked(api.fellowships.attendance.record).mockResolvedValue(undefined as never);
    const data = { records: [{ memberId: 'm1', status: 'Present' }] };

    const { result } = renderHook(() => useRecordAttendance(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ fellowshipId: 'f1', meetingId: 'mt1', data: data as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.attendance.record).toHaveBeenCalledWith('f1', 'mt1', data);
  });
});

// ── useAttendanceSummary ───────────────────────────────────

describe('useAttendanceSummary', () => {
  it('calls api.fellowships.attendance.summary', async () => {
    const mockSummary = [{ meetingId: 'mt1', present: 10, absent: 2 }];
    vi.mocked(api.fellowships.attendance.summary).mockResolvedValue({ data: mockSummary } as never);

    const { result } = renderHook(() => useAttendanceSummary('f1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fellowships.attendance.summary).toHaveBeenCalledWith('f1');
    expect(result.current.data).toEqual(mockSummary);
  });

  it('does not fetch when fellowshipId is empty', () => {
    const { result } = renderHook(() => useAttendanceSummary(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
