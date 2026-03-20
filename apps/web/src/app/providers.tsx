'use client';

import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificationProvider } from '@/lib/ws';
import { configureClient } from '@kairos/api-client';

function ApiClientInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const configured = useRef(false);

  useEffect(() => {
    if (!configured.current) {
      configureClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
        getToken,
      });
      configured.current = true;
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
