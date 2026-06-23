'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { useVerifyEmail } from '@/hooks/use-auth';
import { KharisCardHeader } from '../kharis-logo';

const OTP_LENGTH = 6;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const verifyMutation = useVerifyEmail();
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Guard against the infinite loop: verifyMutation is a new object every render,
  // so any useCallback/useEffect that depends on it re-fires on every re-render.
  const mutateRef = useRef(verifyMutation.mutateAsync);
  mutateRef.current = verifyMutation.mutateAsync;
  const submittedRef = useRef(false);

  // Auto-fill from URL token
  useEffect(() => {
    if (memberId) {
      const chars = memberId.replace(/[^a-zA-Z0-9]/g, '').slice(0, OTP_LENGTH).split('');
      const filled = Array(OTP_LENGTH).fill('').map((_, i) => chars[i]?.toUpperCase() ?? '');
      setDigits(filled);
    }
  }, [memberId]);

  const handleVerify = useCallback(async (token: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    try {
      await mutateRef.current(token);
      setVerified(true);
    } catch (err) {
      submittedRef.current = false; // allow retry on error
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  }, []); // stable — reads mutation via ref, no unstable deps

  // Auto-submit when all boxes filled — OTP boxes are cosmetic display only;
  // the actual token sent to the API is the full memberId UUID from the URL.
  useEffect(() => {
    if (memberId && digits.every((d) => d.length === 1)) {
      handleVerify(memberId);
    }
  }, [digits, handleVerify, memberId]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleChange(index: number, value: string) {
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value.toUpperCase();
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('').map((_, i) => text[i]?.toUpperCase() ?? '');
    setDigits(next);
  }

  function handleResend() {
    if (!memberId || countdown > 0) return;
    submittedRef.current = false; // allow re-submission after resend
    setCountdown(60);
    handleVerify(memberId);
  }

  if (verified) {
    return (
      <>
        {/* Heading — outside card */}
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

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader heading="Verify your email" subtitle="Enter the verification code to continue" />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {!memberId ? (
            <div className="rounded-lg bg-[#f8b537]/10 p-4">
              <p className="text-sm font-medium text-[#9a6b04] dark:text-[#f8b537]">Verification link missing</p>
              <p className="mt-0.5 text-xs text-[#9a6b04]/80 dark:text-[#f8b537]/80">
                Please check your email for the verification link and click it to activate your account.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Enter the 6-character code from your verification email
              </p>

              {/* OTP Boxes */}
              <div
                role="group"
                aria-label="6-character verification code"
                className="flex justify-center gap-2"
                onPaste={handlePaste}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="text"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    aria-label={`Verification code digit ${i + 1}`}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="h-12 w-12 rounded-lg border border-muted-foreground/15 bg-background text-center text-lg font-bold text-foreground outline-none transition-colors focus:border-[#5D3FD3] focus:ring-1 focus:ring-[#5D3FD3]/20"
                    disabled={verifyMutation.isPending}
                  />
                ))}
              </div>

              {verifyMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-sm text-[#5D3FD3]">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </div>
              )}

              {/* Resend */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || verifyMutation.isPending}
                  className="text-sm font-medium text-[#5D3FD3] hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted-foreground/50"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
                </button>
              </div>
            </>
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
      <KharisCardHeader heading="Verify your email" subtitle="Loading…" />
      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="flex justify-center gap-2 animate-pulse" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 w-12 rounded-lg bg-muted/40" />
          ))}
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
