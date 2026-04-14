'use client';

import { useMemo } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificationProvider } from '@/lib/ws';
import { configureClient } from '@kairos/api-client';

function ApiClientInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useMemo(() => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      configureClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
        getToken: getToken as unknown as () => string | null,
      });
    }
  }, [getToken]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ApiClientInitializer>
        <NotificationProvider>{children}</NotificationProvider>
      </ApiClientInitializer>
    </AuthProvider>
  );
}
