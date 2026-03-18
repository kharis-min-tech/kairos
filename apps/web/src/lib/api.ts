import { createApiClient } from '@kairos/api-client';
import { useAuthStore } from './auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = createApiClient(API_BASE_URL, () => {
  return useAuthStore.getState().accessToken;
});
