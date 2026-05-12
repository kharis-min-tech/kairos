import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useMyDepartmentJoinRequests,
  useDepartmentJoinRequests,
  useCreateDepartmentJoinRequest,
  useScheduleDepartmentInterview,
  useRecordDepartmentInterview,
  useExtendDepartmentOffer,
  useRespondToDepartmentOffer,
  useWithdrawDepartmentJoinRequest,
  useRejectDepartmentJoinRequest,
  useEvaluateDepartmentProbation,
} from './use-departments';

vi.mock('@/lib/api', () => ({
  api: {
    departments: {
      joinRequests: {
        listMine: vi.fn(),
        list: vi.fn(),
        create: vi.fn(),
        scheduleInterview: vi.fn(),
        recordInterview: vi.fn(),
        extendOffer: vi.fn(),
        respondToOffer: vi.fn(),
        withdraw: vi.fn(),
        reject: vi.fn(),
        evaluateProbation: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

const branchDeptId = 'bd-1';
const requestId = 'req-1';
const mockRequest = { id: requestId, status: 'applied' };

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

// ── Member-facing queries ──────────────────────────────────

describe('useMyDepartmentJoinRequests', () => {
  it('calls api.departments.joinRequests.listMine and returns data', async () => {
    const data = [{ ...mockRequest, branchDepartmentId: branchDeptId }];
    vi.mocked(api.departments.joinRequests.listMine).mockResolvedValue({ data } as never);

    const { result } = renderHook(() => useMyDepartmentJoinRequests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.departments.joinRequests.listMine).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(data);
  });
});

describe('useDepartmentJoinRequests', () => {
  it('calls api.departments.joinRequests.list with branchDeptId', async () => {
    vi.mocked(api.departments.joinRequests.list).mockResolvedValue({
      data: [mockRequest],
    } as never);

    const { result } = renderHook(() => useDepartmentJoinRequests(branchDeptId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.departments.joinRequests.list).toHaveBeenCalledWith(branchDeptId);
  });

  it('does not fetch when branchDeptId is empty', () => {
    const { result } = renderHook(() => useDepartmentJoinRequests(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Member apply ───────────────────────────────────────────

describe('useCreateDepartmentJoinRequest', () => {
  it('posts notes and returns created request', async () => {
    vi.mocked(api.departments.joinRequests.create).mockResolvedValue({
      data: mockRequest,
    } as never);

    const { result } = renderHook(() => useCreateDepartmentJoinRequest(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, data: { notes: 'I want to join' } });
    });

    expect(api.departments.joinRequests.create).toHaveBeenCalledWith(branchDeptId, {
      notes: 'I want to join',
    });
  });
});

// ── Lead pipeline mutations ────────────────────────────────

describe('useScheduleDepartmentInterview', () => {
  it('forwards interviewer + datetime payload', async () => {
    vi.mocked(api.departments.joinRequests.scheduleInterview).mockResolvedValue({
      data: { ...mockRequest, status: 'interview_scheduled' },
    } as never);

    const { result } = renderHook(() => useScheduleDepartmentInterview(), {
      wrapper: createWrapper(),
    });

    const payload = {
      interviewerOneId: 'i1',
      interviewerTwoId: 'i2',
      interviewAt: '2026-06-01T10:00:00Z',
      interviewFormat: 'in_person' as const,
    };
    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId, data: payload });
    });

    expect(api.departments.joinRequests.scheduleInterview).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      payload,
    );
  });
});

describe('useRecordDepartmentInterview', () => {
  it('forwards outcome + notes payload', async () => {
    vi.mocked(api.departments.joinRequests.recordInterview).mockResolvedValue({
      data: { ...mockRequest, status: 'interviewed' },
    } as never);

    const { result } = renderHook(() => useRecordDepartmentInterview(), {
      wrapper: createWrapper(),
    });

    const data = { interviewOutcome: 'pass' as const, interviewNotes: 'great fit' };
    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId, data });
    });

    expect(api.departments.joinRequests.recordInterview).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      data,
    );
  });
});

describe('useExtendDepartmentOffer', () => {
  it('forwards offer payload', async () => {
    vi.mocked(api.departments.joinRequests.extendOffer).mockResolvedValue({
      data: { ...mockRequest, status: 'offered' },
    } as never);

    const { result } = renderHook(() => useExtendDepartmentOffer(), {
      wrapper: createWrapper(),
    });

    const data = { offerExpiresAt: '2026-06-30T00:00:00Z', probationDays: 30 };
    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId, data });
    });

    expect(api.departments.joinRequests.extendOffer).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      data,
    );
  });
});

// ── Member responds to offer (accept / decline) ────────────

describe('useRespondToDepartmentOffer', () => {
  it('sends accepted response', async () => {
    vi.mocked(api.departments.joinRequests.respondToOffer).mockResolvedValue({
      data: { ...mockRequest, status: 'probation' },
    } as never);

    const { result } = renderHook(() => useRespondToDepartmentOffer(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        branchDeptId,
        requestId,
        data: { offerResponse: 'accepted' },
      });
    });

    expect(api.departments.joinRequests.respondToOffer).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      { offerResponse: 'accepted' },
    );
  });

  it('sends declined response', async () => {
    vi.mocked(api.departments.joinRequests.respondToOffer).mockResolvedValue({
      data: { ...mockRequest, status: 'rejected' },
    } as never);

    const { result } = renderHook(() => useRespondToDepartmentOffer(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        branchDeptId,
        requestId,
        data: { offerResponse: 'declined' },
      });
    });

    expect(api.departments.joinRequests.respondToOffer).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      { offerResponse: 'declined' },
    );
  });

  it('surfaces api errors via mutation state', async () => {
    vi.mocked(api.departments.joinRequests.respondToOffer).mockRejectedValue(
      new Error('You can only join departments in your own branch.'),
    );

    const { result } = renderHook(() => useRespondToDepartmentOffer(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({
          branchDeptId,
          requestId,
          data: { offerResponse: 'accepted' },
        })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/own branch/);
  });
});

// ── Withdraw / reject / probation ──────────────────────────

describe('useWithdrawDepartmentJoinRequest', () => {
  it('calls api.departments.joinRequests.withdraw', async () => {
    vi.mocked(api.departments.joinRequests.withdraw).mockResolvedValue({
      data: { ...mockRequest, status: 'withdrawn' },
    } as never);

    const { result } = renderHook(() => useWithdrawDepartmentJoinRequest(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId });
    });

    expect(api.departments.joinRequests.withdraw).toHaveBeenCalledWith(branchDeptId, requestId);
  });
});

describe('useRejectDepartmentJoinRequest', () => {
  it('calls api.departments.joinRequests.reject with notes', async () => {
    vi.mocked(api.departments.joinRequests.reject).mockResolvedValue({
      data: { ...mockRequest, status: 'rejected' },
    } as never);

    const { result } = renderHook(() => useRejectDepartmentJoinRequest(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        branchDeptId,
        requestId,
        data: { reviewNotes: 'not a fit' },
      });
    });

    expect(api.departments.joinRequests.reject).toHaveBeenCalledWith(branchDeptId, requestId, {
      reviewNotes: 'not a fit',
    });
  });

  it('defaults to empty payload when no notes provided', async () => {
    vi.mocked(api.departments.joinRequests.reject).mockResolvedValue({
      data: mockRequest,
    } as never);

    const { result } = renderHook(() => useRejectDepartmentJoinRequest(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId });
    });

    expect(api.departments.joinRequests.reject).toHaveBeenCalledWith(branchDeptId, requestId, {});
  });
});

describe('useEvaluateDepartmentProbation', () => {
  it('forwards passed outcome', async () => {
    vi.mocked(api.departments.joinRequests.evaluateProbation).mockResolvedValue({
      data: { ...mockRequest, status: 'active' },
    } as never);

    const { result } = renderHook(() => useEvaluateDepartmentProbation(), {
      wrapper: createWrapper(),
    });

    const data = { probationOutcome: 'passed' as const };
    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId, data });
    });

    expect(api.departments.joinRequests.evaluateProbation).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      data,
    );
  });

  it('forwards failed outcome with notes', async () => {
    vi.mocked(api.departments.joinRequests.evaluateProbation).mockResolvedValue({
      data: { ...mockRequest, status: 'probation_failed' },
    } as never);

    const { result } = renderHook(() => useEvaluateDepartmentProbation(), {
      wrapper: createWrapper(),
    });

    const data = { probationOutcome: 'failed' as const, probationNotes: 'attendance' };
    await act(async () => {
      await result.current.mutateAsync({ branchDeptId, requestId, data });
    });

    expect(api.departments.joinRequests.evaluateProbation).toHaveBeenCalledWith(
      branchDeptId,
      requestId,
      data,
    );
  });
});
