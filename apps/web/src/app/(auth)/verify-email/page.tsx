'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { useVerifyEmail } from '@/hooks/use-auth';
import { KharisCardHeader } from '../kharis-logo';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verifyMutation = useVerifyEmail();
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const mutateRef = useRef(verifyMutation.mutateAsync);
  mutateRef.current = verifyMutation.mutateAsync;
  const submittedRef = useRef(false);

  const handleVerify = useCallback(async (t: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    try {
      await mutateRef.current(t);
      setVerified(true);
    } catch (err) {
      submittedRef.current = false;
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }, []);

  useEffect(() => {
    if (token) handleVerify(token);
  }, [token, handleVerify]);

  if (verified) {
    return (
      <>
        <KharisCardHeader heading="Email verified!" subtitle="Your email address has been confirmed" />

        <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Your account is now <span className="font-medium text-[#9a6b04] dark:text-[#f8b537]">pending admin approval</span>. You&apos;ll receive a notification once your account is activated.
            </p>
            <button
              className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90"
              onClick={() => router.push('/pending-approval')}
            >
              Continue
            </button>
          </div>
        </div>
      </>
    );
  }

  // No token in URL: user landed here from signup and should check their inbox.
  if (!token) {
    return (
      <>
        <KharisCardHeader heading="Check your email" subtitle="We sent you a verification link" />

        <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a verification link to your email address. Click the link to confirm your email and complete registration.
            </p>
            <div className="rounded-lg bg-[#f8b537]/10 p-4 text-sm text-[#9a6b04] dark:text-[#f8b537]">
              Can&apos;t find it? Check your spam folder. The link expires in 24 hours.
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Token in URL: auto-verify. Show pending/error state.
  return (
    <>
      <KharisCardHeader heading="Verifying your email" subtitle="This should only take a moment" />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-5">
          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">{error}</p>
                <p className="mt-1 text-xs opacity-80">
                  The link may have expired, or you&apos;ve already verified this email.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-[#5D3FD3]">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying…
            </div>
          )}

          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </div>
    </>
  );
}

function VerifyEmailSkeleton() {
  return (
    <>
      <KharisCardHeader heading="Verifying your email" subtitle="Loading…" />
      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" aria-busy="true" aria-live="polite">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
