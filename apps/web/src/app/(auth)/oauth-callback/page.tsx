'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberProfile } from '@kairos/types';
import { persistAuthSuccess } from '@/hooks/use-auth';
import { KharisCardHeader } from '../kharis-logo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
        const returnTo = params.get('returnTo') || '/dashboard';

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
        className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card p-10 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
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
