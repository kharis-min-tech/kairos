'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { I18nProvider } from '@/components/i18n-provider';

export function Providers({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  /** Read from the cookie by the root layout, on the server. */
  initialLanguage?: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLanguage={initialLanguage}>{children}</I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
