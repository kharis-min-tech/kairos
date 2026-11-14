'use client';

import { useQuery } from '@tanstack/react-query';
import type { FollowupQueueRow, DueFollowupRow } from '@kairos/types';
import { api } from '@/lib/api';

export interface FollowupQueueParams {
  branchId?: string;
  limit?: number;
}

/**
 * First-timers nobody has contacted yet — a welcome motion on a short clock.
 * Deliberately separate from the drift queue below: same record type, very
 * different urgency.
 */
export function useFirstTimerQueue(params?: FollowupQueueParams) {
  return useQuery<FollowupQueueRow[]>({
    queryKey: ['followups', 'queue', 'first-timers', params],
    queryFn: async () => (await api.followups.firstTimerQueue(params)).data ?? [],
  });
}

/** Members in no fellowship and no department — a retention motion. */
export function useNoGroupQueue(params?: FollowupQueueParams) {
  return useQuery<FollowupQueueRow[]>({
    queryKey: ['followups', 'queue', 'no-group', params],
    queryFn: async () => (await api.followups.noGroupQueue(params)).data ?? [],
  });
}

/** Follow-ups whose next contact date has come due, across every context. */
export function useDueFollowups(params?: FollowupQueueParams) {
  return useQuery<DueFollowupRow[]>({
    queryKey: ['followups', 'due', params],
    queryFn: async () => (await api.followups.due(params)).data ?? [],
  });
}
