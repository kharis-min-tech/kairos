'use client';

import { useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificationProvider } from '@/lib/ws';
import { configureClient } from '@kairos/api-client';
import { getQueryClient } from '@/lib/query-client';

function ApiClientInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const configured = useRef(false);

  // Configure synchronously during render (not in useEffect) so that
  // TanStack Query hooks on auth pages can fire immediately.
  // configureClient is idempotent — it just sets a module-level variable.
  if (!configured.current) {
    configureClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
      getToken,
    });
    configured.current = true;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientInitializer>
          <NotificationProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </NotificationProvider>
        </ApiClientInitializer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
