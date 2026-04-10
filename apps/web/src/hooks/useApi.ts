'use client';

import { api } from '@/lib/api';

/**
 * Hook to access the Kairos API client
 * Returns the configured API client instance with all endpoints
 */
export function useApi() {
  return api;
}
