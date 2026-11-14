'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, Label } from '@kairos/ui';
import type { AuthTokens, MemberProfile } from '@kairos/types';
import { persistAuthSuccess } from '@/hooks/use-auth';
import { useVerifyMfaChallenge } from '@/hooks/use-mfa';
import { useMfaChallengeStore } from '@/stores/mfa-challenge-store';
import { MfaEnrolment } from '@/components/mfa/mfa-enrolment';
import { KharisCardHeader } from '../kharis-logo';

/**
 * The second half of a sign-in.
 *
 * Both doors land here: the password form and the OAuth callback. Neither
 * holds a session at this point, only the short-lived pre-MFA token in
 * `useMfaChallengeStore`, which is in memory and never written to disk.
 *
 * Two shapes, chosen by the stage the server set:
 *   - `challenge` — a factor exists; ask for a code from it.
 *   - `enrolment` — the cutover has passed and this member has no factor;
 *     they set one up here and the confirm call signs them in.
 *
 * Reaching this page with an empty store is the normal consequence of a
 * refresh, not an error, so it says so and points back at /login.
 */
export default function MfaPage() {
  const router = useRouter();
  const token = useMfaChallengeStore((s) => s.token);
  const stage = useMfaChallengeStore((s) => s.stage);
  const returnTo = useMfaChallengeStore((s) => s.returnTo);
  const clear = useMfaChallengeStore((s) => s.clear);

  const verify = useVerifyMfaChallenge();
  const [code, setCode] = useState('');
  const [usingBackupCode, setUsingBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Persist the session the server just handed back, then move on. */
  function finish(session: { tokens?: AuthTokens; member?: MemberProfile }) {
    const { tokens, member } = session;
    if (!tokens || !member) {
      // The server answered without a session. There is nothing useful to do
      // with half an answer, and silently staying put would look like a hang.
      setError('Your sign-in could not be completed. Please start again.');
      return;
    }
    persistAuthSuccess({ tokens, member, activeRole: member.systemRole });
    clear();
    router.replace(member.mustChangePassword ? '/change-password' : (returnTo ?? '/dashboard'));
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;

    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError(
        usingBackupCode
          ? 'Enter one of your backup codes.'
          : 'Enter the 6-digit code from your authenticator app.',
      );
      return;
    }

    try {
      finish(await verify.mutateAsync({ code: trimmed, token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    }
  }

  // Nothing to finish. Almost always a refresh: the token lives in memory by
  // design, so it is gone and the password step has to happen again.
  if (!token || !stage) {
    return (
      <>
        <KharisCardHeader
          heading="Let us start again"
          subtitle="This sign-in has timed out"
        />
        <div className="w-full rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <p className="text-sm leading-relaxed text-muted-foreground">
            For your security we do not keep a half-finished sign-in. Please enter your password
            again and we will ask for your code straight after.
          </p>
          <Link href="/login" className="mt-5 inline-block">
            <Button className="bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95">
              Back to sign in
            </Button>
          </Link>
        </div>
      </>
    );
  }

  if (stage === 'enrolment') {
    return (
      <>
        <KharisCardHeader
          heading="Set up two-step sign-in"
          subtitle="Your role needs it before you can continue"
        />
        <div className="w-full rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            You can see other people&apos;s personal details in Kairos, so we ask for a second
            step at sign-in. It takes about a minute and you only do it once.
          </p>
          <MfaEnrolment challengeToken={token} onComplete={finish} />
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <KharisCardHeader
        heading="One more step"
        subtitle="Enter the code from your authenticator app"
      />
      <div className="w-full rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <form onSubmit={submitCode} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="mfa-code">{usingBackupCode ? 'Backup code' : '6-digit code'}</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              // A backup code is letters and digits, so a numeric keypad on a
              // phone would leave the member unable to type it at all.
              inputMode={usingBackupCode ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              autoFocus
              placeholder={usingBackupCode ? 'ABCDE-FGHIJ' : '123456'}
              className="font-mono tracking-[0.3em]"
              disabled={verify.isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={verify.isPending}
            className="w-full gap-1.5 bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {verify.isPending ? 'Checking' : 'Continue'}
          </Button>

          <div className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setUsingBackupCode((v) => !v);
                setCode('');
                setError(null);
              }}
            >
              {usingBackupCode
                ? 'Use a code from my authenticator app'
                : 'I cannot reach my authenticator app'}
            </button>
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
              Sign in as someone else
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
