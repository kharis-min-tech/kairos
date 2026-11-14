'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberProfile } from '@kairos/types';
import { persistAuthSuccess } from '@/hooks/use-auth';
import { useMfaChallengeStore } from '@/stores/mfa-challenge-store';
import { KharisCardHeader } from '../kharis-logo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Constrain the post-sign-in redirect to a path on this origin.
 *
 * `returnTo` arrives in the URL fragment, so it is attacker-supplied: it was
 * handed straight to `router.replace`, which follows an absolute URL off-site.
 * That made this an open redirect at the worst possible moment — immediately
 * after a successful sign-in, where the user has just been told the app is
 * trustworthy, so a landing page styled as Kairos asking for a password is a
 * credible phish. CodeQL flags the surrounding check as
 * `js/user-controlled-bypass`.
 *
 * Accepted: a single-slash absolute path, optionally with query and hash.
 * Rejected, and sent to /dashboard instead:
 *   - anything with a scheme (`https://evil.test`, `javascript:...`)
 *   - protocol-relative URLs (`//evil.test`), which browsers treat as absolute
 *   - backslash variants (`/\evil.test`), which some browsers normalise to `//`
 *   - anything not starting with `/`
 *
 * An allowlist of shapes rather than a denylist of payloads: the rejected list
 * above is the explanation, not the implementation.
 */
function safeReturnTo(raw: string | null): string {
  const FALLBACK = '/dashboard';
  if (!raw) return FALLBACK;
  if (!raw.startsWith('/')) return FALLBACK;
  // `//host` and `/\host` both resolve to another origin.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return FALLBACK;
  return raw;
}

/**
 * The API redirects a successful OAuth handshake here with tokens in the URL
 * fragment (not the query — fragments never leave the browser). We parse them,
 * fetch the caller's profile, hand both to `persistAuthSuccess`, wipe the
 * fragment out of the address bar, then route the user on.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // React 18/19 strict mode double-invokes effects in dev. This effect
    // does a POST-once + navigate, so ignore the second invocation.
    if (ran.current) return;
    ran.current = true;

    async function run() {
      try {
        const fragment = window.location.hash.slice(1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const method = params.get('method');
        const returnTo = safeReturnTo(params.get('returnTo'));

        // A second factor is outstanding, so the fragment carries a pre-MFA
        // token instead of a session. Without this branch the check below
        // sees no access token and bounces a perfectly good sign-in to
        // /login with a provider error, which is both wrong and unfixable
        // by the member: every retry would land here again.
        const mfaToken = params.get('mfaToken');
        if (mfaToken) {
          // Out of the address bar before anything else. It is short-lived,
          // but it is still the credential that finishes a sign-in.
          window.history.replaceState({}, '', window.location.pathname);
          useMfaChallengeStore.getState().start({
            token: mfaToken,
            stage: params.get('mfaStage') === 'enrolment' ? 'enrolment' : 'challenge',
            returnTo,
          });
          router.replace('/mfa');
          return;
        }

        if (!accessToken || !refreshToken) {
          router.replace('/login?oauth_error=provider_error');
          return;
        }

        // Fetch the profile with the *new* access token, bypassing api-client
        // (which reads the store — the store is still empty at this point).
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load profile after sign-in');
        }
        const body = (await res.json()) as { data?: MemberProfile } | MemberProfile;
        const member = (body as { data?: MemberProfile }).data ?? (body as MemberProfile);
        if (!member || !member.id) {
          throw new Error('Malformed profile response after sign-in');
        }

        persistAuthSuccess({
          tokens: { accessToken, refreshToken },
          member,
          activeRole: member.systemRole,
        });

        // Wipe the fragment so the tokens don't linger in the address bar.
        window.history.replaceState({}, '', window.location.pathname);

        // Let the destination page show a confirmation toast.
        if (method) {
          try {
            sessionStorage.setItem('kairos.oauth_toast', method);
          } catch {
            // sessionStorage disabled — skip silently. The link still worked.
          }
        }

        router.replace(returnTo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
        // Fall back to /login after a beat so the user isn't stranded.
        window.setTimeout(() => router.replace('/login?oauth_error=provider_error'), 1500);
      }
    }

    run();
  }, [router]);

  return (
    <>
      <KharisCardHeader
        heading={error ? 'Sign-in issue' : 'Signing you in…'}
        subtitle={error ? error : 'Finalising your session with your provider'}
      />
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-4 auth-halo rounded-2xl bg-card p-10 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      >
        <svg
          className="h-8 w-8 animate-spin text-[#5D3FD3]"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-muted-foreground">
          {error ? 'Redirecting you back to sign-in…' : 'One moment please'}
        </p>
      </div>
    </>
  );
}
