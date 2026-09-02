'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KharisCardHeader } from '../kharis-logo';
import { useUndoEmailChange } from '@/hooks/use-email-change';
import { Button } from '@kairos/ui';

function RevertEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const mutation = useUndoEmailChange();
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    mutation
      .mutateAsync(token)
      .then(({ resetToken }) => {
        setState('success');
        if (resetToken) {
          // Give the user a moment to read, then bounce to /reset-password.
          setTimeout(() => router.push(`/reset-password?token=${resetToken}`), 2000);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Revert failed');
        setState('error');
      });
  }, [token, mutation, router]);

  return (
    <div className="w-full">
      <KharisCardHeader
        heading="Revert email change"
        subtitle="Undo the pending change and lock your account."
      />
      <div className="mt-6 space-y-4 text-center text-sm">
        {!token && (
          <p className="text-destructive">No undo token in the link.</p>
        )}
        {state === 'idle' && token && (
          <p className="text-muted-foreground">Reverting…</p>
        )}
        {state === 'success' && (
          <>
            <p className="text-emerald-700 dark:text-emerald-400">
              Email reverted. Your account has been locked for safety. Set a new
              password to continue.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting you to the password reset page…
            </p>
          </>
        )}
        {state === 'error' && (
          <>
            <p className="text-destructive">{error}</p>
            <Link href="/login">
              <Button variant="outline" className="rounded-lg">
                Back to sign in
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function RevertEmailPage() {
  return (
    <Suspense fallback={null}>
      <RevertEmailContent />
    </Suspense>
  );
}
