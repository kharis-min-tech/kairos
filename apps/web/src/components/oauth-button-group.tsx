'use client';

import type { OAuthProviderId } from '@kairos/types';
import { api } from '@/lib/api';
import { OAuthProviderIcon, oauthButtonClassName } from './oauth-provider-icon';

interface OAuthButtonGroupProps {
  /** Where the API should send the browser after a successful link. */
  returnTo?: string;
  /** Label prefix — "Continue with …" for signup, "Sign in with …" for login. */
  actionLabel?: 'continue' | 'sign-in';
  /**
   * Disable every button in the group — used to prevent double-submits when
   * the sibling email/password form is mid-flight. Also useful when the
   * caller wants to gate SSO behind a T&C accept step.
   */
  disabled?: boolean;
  /**
   * 'full' → three stacked labeled buttons ("Sign in with Google").
   * 'icons' → three small circular icon-only buttons in a row. Use this
   * when password is the primary path and SSO is the secondary option.
   */
  variant?: 'full' | 'icons';
}

const PROVIDERS: { id: OAuthProviderId; label: string; variant: 'light' | 'dark' }[] = [
  { id: 'google', label: 'Google', variant: 'light' },
  { id: 'microsoft', label: 'Microsoft', variant: 'light' },
  { id: 'apple', label: 'Apple', variant: 'dark' },
];

/**
 * SSO button group. Each button fires a top-level navigation to the API's
 * OAuth start route — the api-client's `startUrl` is a synchronous URL
 * builder, no fetch. Server does the IdP handshake and lands the browser on
 * `/oauth-callback#accessToken=…` (or `/oauth-confirm-link?token=…` on the
 * unverified-email collision path).
 */
export function OAuthButtonGroup({
  returnTo,
  actionLabel = 'sign-in',
  disabled = false,
  variant = 'full',
}: OAuthButtonGroupProps) {
  const prefix = actionLabel === 'continue' ? 'Continue with' : 'Sign in with';

  if (variant === 'icons') {
    return (
      <div className="flex justify-center gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              window.location.assign(api.auth.oauth.startUrl(p.id, returnTo));
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-muted-foreground/15 bg-transparent transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${prefix} ${p.label}`}
          >
            <OAuthProviderIcon provider={p.id} className="h-5 w-5" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            window.location.assign(api.auth.oauth.startUrl(p.id, returnTo));
          }}
          className={`${oauthButtonClassName(p.variant)} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={`${prefix} ${p.label}`}
        >
          <OAuthProviderIcon provider={p.id} />
          <span>{prefix} {p.label}</span>
        </button>
      ))}
    </div>
  );
}
