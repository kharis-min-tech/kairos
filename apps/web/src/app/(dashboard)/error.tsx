'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again or return to the
        dashboard.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
