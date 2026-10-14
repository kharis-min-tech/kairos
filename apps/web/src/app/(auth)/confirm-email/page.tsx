'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KharisCardHeader } from '../kharis-logo';
import { useConfirmEmailChange } from '@/hooks/use-email-change';
import { Button } from '@kairos/ui';
import { useTranslation } from 'react-i18next';

function ConfirmEmailContent() {  const { t } = useTranslation(['auth', 'common']);

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
        heading={t('auth:confirmNewEmail')}
        subtitle={t('auth:clickBelowToFinishMovingYour')}
      />
      <div className="auth-halo mt-6 space-y-4 rounded-2xl bg-card p-8 text-center text-sm shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        {!token && (
          <p className="text-destructive">{t('auth:noConfirmationTokenInTheLink')}</p>
        )}
        {state === 'idle' && token && (
          <p className="text-muted-foreground">{t('auth:confirming')}</p>
        )}
        {state === 'success' && (
          <>
            <p className="text-emerald-700 dark:text-emerald-400">{t('auth:yourEmailHasBeenUpdatedSign')}</p>
            <Link href="/login">
              <Button className="rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white">{t('auth:signIn')}</Button>
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
