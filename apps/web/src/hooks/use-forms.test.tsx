import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useSubmitForm,
  useFormMemberSearch,
  useFormSubmissions,
  useFormSubmission,
  useUpdateFormSubmission,
  useExportFormSubmissions,
  useDormantProspects,
  useArchiveProspects,
} from './use-forms';

vi.mock('@/lib/api', () => ({
  api: {
    forms: {
      submit: vi.fn(),
      memberSearch: vi.fn(),
      submissions: {
        list: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        exportCsv: vi.fn(),
      },
      prospects: {
        dormant: vi.fn(),
        archive: vi.fn(),
      },
    },
  },
}));

import { api } from '@/lib/api';

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

describe('useSubmitForm', () => {
  it('submits with the form type + payload and invalidates the forms cache', async () => {
    vi.mocked(api.forms.submit).mockResolvedValue({ data: { id: 's-1' } } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useSubmitForm(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        formType: 'baptism',
        data: { payload: { firstName: 'Ada', lastName: 'Lovelace', phone: '0700' } },
      });
    });

    expect(api.forms.submit).toHaveBeenCalledWith('baptism', {
      payload: { firstName: 'Ada', lastName: 'Lovelace', phone: '0700' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['forms'] });
  });

  it('propagates submit errors', async () => {
    vi.mocked(api.forms.submit).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSubmitForm(), { wrapper: createWrapper() });
    await expect(
      result.current.mutateAsync({ formType: 'baptism', data: { payload: {} } }),
    ).rejects.toThrow('boom');
  });
});

describe('useFormMemberSearch', () => {
  it('uses a query key scoped to params and fetches when q is present', async () => {
    vi.mocked(api.forms.memberSearch).mockResolvedValue({ data: [{ id: 'm-1' }] } as never);
    const params = { q: 'ada', branchId: 'b-1' };
    const { result } = renderHook(() => useFormMemberSearch(params), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.forms.memberSearch).toHaveBeenCalledWith(params);
  });

  it('does not fetch when q is blank', () => {
    const { result } = renderHook(() => useFormMemberSearch({ q: '' }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.forms.memberSearch).not.toHaveBeenCalled();
  });
});

describe('useFormSubmissions', () => {
  it('returns the list and forwards filter params in the query key', async () => {
    vi.mocked(api.forms.submissions.list).mockResolvedValue({
      data: [{ id: 's-1' }],
    } as never);
    const params = { formType: 'testimony' as const, status: 'new' as const };
    const { result } = renderHook(() => useFormSubmissions(params), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.forms.submissions.list).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual([{ id: 's-1' }]);
  });

  it('refetches when filter params change', async () => {
    vi.mocked(api.forms.submissions.list).mockResolvedValue({ data: [] } as never);
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useFormSubmissions({ status: 'new' }), {
      wrapper,
    });
    const { result: r2 } = renderHook(
      () => useFormSubmissions({ status: 'reviewed' }),
      { wrapper },
    );
    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));
    expect(api.forms.submissions.list).toHaveBeenCalledTimes(2);
  });
});

describe('useFormSubmission', () => {
  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useFormSubmission(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useUpdateFormSubmission', () => {
  it('invalidates list and detail keys on success', async () => {
    vi.mocked(api.forms.submissions.update).mockResolvedValue({
      data: { id: 's-1' },
    } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUpdateFormSubmission(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 's-1', data: { status: 'reviewed' } });
    });

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(['forms', 'submissions']);
    expect(keys).toContainEqual(['forms', 'submissions', 's-1']);
  });
});

describe('useExportFormSubmissions', () => {
  it('forwards the export params and returns the blob', async () => {
    const blob = new Blob(['a,b,c'], { type: 'text/csv' });
    vi.mocked(api.forms.submissions.exportCsv).mockResolvedValue(blob as never);
    const { result } = renderHook(() => useExportFormSubmissions(), {
      wrapper: createWrapper(),
    });
    let returned: Blob | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({ formType: 'baptism' });
    });
    expect(api.forms.submissions.exportCsv).toHaveBeenCalledWith({ formType: 'baptism' });
    expect(returned).toBe(blob);
  });
});

describe('useDormantProspects', () => {
  it('returns dormant prospect shells', async () => {
    vi.mocked(api.forms.prospects.dormant).mockResolvedValue({
      data: [{ id: 'p-1' }],
    } as never);
    const { result } = renderHook(() => useDormantProspects(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'p-1' }]);
  });
});

describe('useArchiveProspects', () => {
  it('archives the selected ids and invalidates the prospects cache', async () => {
    vi.mocked(api.forms.prospects.archive).mockResolvedValue({
      data: { archived: 2 },
    } as never);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useArchiveProspects(), { wrapper });
    let returned: { archived: number } | undefined;
    await act(async () => {
      returned = await result.current.mutateAsync({ memberIds: ['a', 'b'] });
    });
    expect(api.forms.prospects.archive).toHaveBeenCalledWith({ memberIds: ['a', 'b'] });
    expect(returned).toEqual({ archived: 2 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['forms', 'prospects'] });
  });
});
