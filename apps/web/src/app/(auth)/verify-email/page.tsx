'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@kairos/ui';
import { useVerifyEmail } from '@/hooks/use-auth';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const verifyMutation = useVerifyEmail();
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  async function handleVerify() {
    if (!memberId) return;
    setError(null);
    try {
      await verifyMutation.mutateAsync(memberId);
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }

  if (verified) {
    return (
      <div className="rounded-2xl bg-white shadow-xl">
        <div className="rounded-t-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 px-8 py-8 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold">Email Verified!</h1>
          <p className="mt-1 text-sm text-emerald-100">Your email address has been confirmed</p>
        </div>
        <div className="px-8 py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account is now <span className="font-medium text-foreground">pending admin approval</span>. You&apos;ll receive a notification once your account is activated.
          </p>
          <Button
            className="h-11 w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 font-semibold text-white hover:from-rose-700 hover:to-rose-600"
            onClick={() => router.push('/pending-approval')}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl">
      <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold">Verify Your Email</h1>
        <p className="mt-1 text-sm text-purple-200">Confirm your email address to continue</p>
      </div>

      <div className="px-8 py-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {!memberId ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-800">Verification link missing</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Please check your email for the verification link and click it to activate your account.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click the button below to verify your email address and activate your Kairos account.
          </p>
        )}

        <Button
          className="h-11 w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 font-semibold text-white hover:from-rose-700 hover:to-rose-600"
          onClick={handleVerify}
          disabled={!memberId || verifyMutation.isPending}
        >
          {verifyMutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying...
            </span>
          ) : (
            'Verify Email Address'
          )}
        </Button>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
