import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const rotaMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { me: { rota: (params?: unknown) => rotaMock(params) } },
}));

import { useMyRota } from './use-me';

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
