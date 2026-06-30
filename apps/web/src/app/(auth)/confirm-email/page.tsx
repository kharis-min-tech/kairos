'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KharisCardHeader } from '../kharis-logo';
import { useConfirmEmailChange } from '@/hooks/use-email-change';
import { Button } from '@kairos/ui';

function ConfirmEmailContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const mutation = useConfirmEmailChange();
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    mutation
      .mutateAsync(token)
      .then(() => setState('success'))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Confirmation failed');
        setState('error');
      });
  }, [token, mutation]);

  return (
    <div className="w-full">
      <KharisCardHeader
        heading="Confirm new email"
        subtitle="Click below to finish moving your account to the new address."
      />
      <div className="mt-6 space-y-4 text-center text-sm">
        {!token && (
          <p className="text-destructive">No confirmation token in the link.</p>
        )}
        {state === 'idle' && token && (
          <p className="text-muted-foreground">Confirming…</p>
        )}
        {state === 'success' && (
          <>
            <p className="text-emerald-700 dark:text-emerald-400">
              Your email has been updated. Sign in with your new address.
            </p>
            <Link href="/login">
              <Button className="rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white">
                Sign in
              </Button>
            </Link>
          </>
        )}
        {state === 'error' && (
          <p className="text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
