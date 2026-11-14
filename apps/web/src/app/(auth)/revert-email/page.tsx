'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KharisCardHeader } from '../kharis-logo';
import { useUndoEmailChange } from '@/hooks/use-email-change';
import { Button } from '@kairos/ui';
import { useTranslation } from 'react-i18next';

function RevertEmailContent() {  const { t } = useTranslation(['auth', 'common']);

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
        heading={t('auth:revertEmailChange')}
        subtitle={t('auth:undoThePendingChangeAndLock')}
      />
      <div className="auth-halo mt-6 space-y-4 rounded-2xl bg-card p-8 text-center text-sm shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        {!token && (
          <p className="text-destructive">{t('auth:noUndoTokenInTheLink')}</p>
        )}
        {state === 'idle' && token && (
          <p className="text-muted-foreground">{t('auth:reverting')}</p>
        )}
        {state === 'success' && (
          <>
            <p className="text-emerald-700 dark:text-emerald-400">{t('auth:emailRevertedYourAccountHasBeen')}</p>
            <p className="text-xs text-muted-foreground">{t('auth:redirectingYouToThePasswordReset')}</p>
          </>
        )}
        {state === 'error' && (
          <>
            <p className="text-destructive">{error}</p>
            <Link href="/login">
              <Button variant="outline" className="rounded-lg">{t('auth:backToSignIn')}</Button>
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
