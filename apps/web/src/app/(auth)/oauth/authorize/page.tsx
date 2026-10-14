'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { OAuthAuthorizeParams } from '@kairos/types';
import { decodeEmailFromAccessToken, useAuthStore } from '@/lib/auth-store';
import { useAuthorizeContext, useAuthorizeDecision } from '@/hooks/use-oauth-server';
import { KharisCardHeader } from '../../kharis-logo';

const CARD =
  'auth-halo rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]';

const PRIMARY_BUTTON =
  'flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50';

const PARAM_KEYS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'nonce',
] as const;

/** Friendly copy for the failures a person can actually act on. */
const ERROR_COPY: Record<string, string> = {
  invalid_client: 'This application is not registered with Kairos, or has been switched off.',
  invalid_request: 'The sign-in request from this application is incomplete or invalid.',
  invalid_scope: 'This application asked for access it is not allowed to request.',
};

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Working({ heading, subtitle }: { heading: string; subtitle: string }) {
  return (
    <>
      <KharisCardHeader heading={heading} subtitle={subtitle} />
      <div role="status" aria-live="polite" className={`${CARD} flex justify-center`}>
        <Spinner />
      </div>
    </>
  );
}

function AuthorizeContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  // `user` is only filled by the dashboard layout, so after a direct load of
  // this page it is empty; the token carries the email.
  const email = user?.email ?? decodeEmailFromAccessToken(accessToken);
  const logout = useAuthStore((s) => s.logout);

  const params = useMemo<OAuthAuthorizeParams | null>(() => {
    const clientId = searchParams.get('client_id');
    if (!clientId) return null;
    const out: Record<string, string> = {};
    for (const key of PARAM_KEYS) {
      const v = searchParams.get(key);
      if (v !== null) out[key] = v;
    }
    return out as unknown as OAuthAuthorizeParams;
  }, [searchParams]);

  const here = `/oauth/authorize?${searchParams.toString()}`;
  const context = useAuthorizeContext(params);
  const decision = useAuthorizeDecision();
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const autoApproved = useRef(false);

  // Not signed in: sign in first, then come straight back to this request.
  useEffect(() => {
    if (!accessToken) router.replace(`/login?returnTo=${encodeURIComponent(here)}`);
  }, [accessToken, here, router]);

  const ctx = context.data;

  // The server can already tell no screen is needed (a first-party app, or one
  // the member approved before for these scopes). Go straight through, once.
  useEffect(() => {
    if (!params || ctx?.status !== 'ok' || !ctx.skipConsent || autoApproved.current) return;
    autoApproved.current = true;
    decide(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, params]);

  // A request that fails AFTER its client and redirect_uri were verified is
  // reported back to the app, per the spec. An unverified one never redirects.
  useEffect(() => {
    if (ctx?.status === 'error' && ctx.redirectTo) window.location.replace(ctx.redirectTo);
  }, [ctx]);

  function decide(approve: boolean) {
    if (!params) return;
    setDecisionError(null);
    decision.mutate(
      { params, approve },
      {
        onSuccess: (res) => {
          if (res.status === 'ok' || res.redirectTo) {
            window.location.replace(res.status === 'ok' ? res.redirectTo : res.redirectTo!);
          } else {
            setDecisionError(res.description);
          }
        },
        onError: (err) => {
          autoApproved.current = false;
          setDecisionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        },
      },
    );
  }

  function switchAccount() {
    logout();
    queryClient.clear();
    router.replace(`/login?returnTo=${encodeURIComponent(here)}`);
  }

  if (!accessToken) return null;

  if (!params) {
    return (
      <>
        <KharisCardHeader heading="Nothing to approve" subtitle="This page is opened by another app asking to sign you in." />
        <div className={CARD}>
          <Link href="/dashboard" className={PRIMARY_BUTTON}>Go to your dashboard</Link>
        </div>
      </>
    );
  }

  if (context.isLoading) return <Working heading="One moment" subtitle="Checking this sign-in request" />;

  if (context.isError || !ctx) {
    const message = context.error instanceof Error ? context.error.message : '';
    return (
      <>
        <KharisCardHeader heading="We couldn't check this request" subtitle="Please go back to the app and try again." />
        <div role="alert" className={CARD}>
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {message || 'Something went wrong on our side.'}
          </p>
        </div>
      </>
    );
  }

  if (ctx.status === 'error') {
    if (ctx.redirectTo) return <Working heading="Returning you to the app" subtitle="This request could not be completed" />;
    return (
      <>
        <KharisCardHeader heading="We can't complete this sign-in" subtitle="The app that sent you here has a problem." />
        <div role="alert" className={`${CARD} space-y-5`}>
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {ERROR_COPY[ctx.error] ?? ctx.description}
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing has been shared. If you trust this app, ask whoever runs it to check their Kairos sign-in settings.
          </p>
          <Link href="/dashboard" className={PRIMARY_BUTTON}>Go to your dashboard</Link>
        </div>
      </>
    );
  }

  if (ctx.skipConsent) {
    return (
      <Working
        heading={`Signing you in to ${ctx.client.name}`}
        subtitle={decisionError ?? `Sending you back to ${ctx.redirectHost}`}
      />
    );
  }

  const busy = decision.isPending;
  return (
    <>
      <KharisCardHeader
        heading={`${ctx.client.name} wants to sign you in`}
        subtitle="Review what it will be able to see before you continue"
      />

      <div className={CARD}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
            {ctx.client.logoUrl ? (
              <img src={ctx.client.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-base font-semibold text-[#5D3FD3]">
                {ctx.client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{ctx.client.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ctx.client.description ?? ctx.redirectHost}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              This will let {ctx.client.name} see
            </p>
            <ul className="space-y-2.5">
              {ctx.scopes.map((s) => (
                <li key={s.scope} className="flex items-start gap-2.5 text-sm">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#5D3FD3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{s.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            You&apos;ll be sent to <span className="font-medium text-foreground">{ctx.redirectHost}</span>. You can
            remove this access at any time from Profile → Security.
            {(ctx.client.privacyUrl || ctx.client.termsUrl) && (
              <>
                {' '}
                {ctx.client.privacyUrl && (
                  <a href={ctx.client.privacyUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#5D3FD3] hover:underline">
                    Privacy policy
                  </a>
                )}
                {ctx.client.privacyUrl && ctx.client.termsUrl && ' · '}
                {ctx.client.termsUrl && (
                  <a href={ctx.client.termsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#5D3FD3] hover:underline">
                    Terms
                  </a>
                )}
              </>
            )}
          </p>

          {decisionError && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{decisionError}</div>
          )}

          <div className="space-y-3">
            <button type="button" onClick={() => decide(true)} disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? 'Continuing…' : `Continue to ${ctx.client.name}`}
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={busy}
              className="h-11 w-full rounded-lg border border-[#5D3FD3]/30 bg-transparent text-sm font-semibold text-[#5D3FD3] transition-colors hover:bg-[#5D3FD3]/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email ?? 'your account'}</span>.{' '}
            <button type="button" onClick={switchAccount} className="font-semibold text-[#5D3FD3] hover:opacity-80">
              Not you?
            </button>
          </p>
        </div>
      </div>
    </>
  );
}

export default function OAuthAuthorizePage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <AuthorizeContent />
    </Suspense>
  );
}
