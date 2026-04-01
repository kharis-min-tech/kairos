'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@kairos/ui';
import { useVerifyEmail } from '@/hooks/use-auth';

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
      <div className="rounded-2xl bg-card shadow-xl">
        <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
          <img src="/logo.png" alt="Kharis Church" className="h-14 w-14 object-contain" />
          <h1 className="mt-4 text-xl font-bold">Email Verified!</h1>
          <p className="mt-1 text-sm text-purple-200">Your email address has been confirmed</p>
        </div>
        <div className="px-8 py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account is now <span className="font-medium text-amber-500">pending admin approval</span>. You&apos;ll receive a notification once your account is activated.
          </p>
          <Button
            className="h-11 w-full rounded-xl font-semibold"
            onClick={() => router.push('/pending-approval')}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-xl">
      <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
        <img src="/logo.png" alt="Kharis Church" className="h-14 w-14 object-contain" />
        <h1 className="mt-4 text-xl font-bold">Verify Your Email</h1>
        <p className="mt-1 text-sm text-purple-200">Enter the verification code to continue</p>
      </div>

      <div className="px-8 py-6 space-y-5">
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
          <>
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-character code from your verification email
            </p>

            {/* OTP Boxes */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-12 w-12 rounded-xl border-2 border-gray-200 bg-white text-center text-lg font-bold text-purple-700 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  disabled={verifyMutation.isPending}
                />
              ))}
            </div>

            {verifyMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
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
                className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
              </button>
            </div>
          </>
        )}

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
