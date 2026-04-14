'use client';

import { AuthProvider } from '@/lib/auth';
import { NotificationProvider } from '@/lib/ws';
import { configureClient } from '@kairos/api-client';
import { useAuthStore } from '@/lib/auth-store';

// Configure at module level so it survives HMR — getToken reads lazily from
// the Zustand store at call time, so no React lifecycle is needed.
configureClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  getToken: () => useAuthStore.getState().accessToken,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}
