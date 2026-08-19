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
}

const PROVIDERS: { id: OAuthProviderId; label: string; variant: 'light' | 'dark' }[] = [
  { id: 'google', label: 'Google', variant: 'light' },
  { id: 'microsoft', label: 'Microsoft', variant: 'light' },
  { id: 'apple', label: 'Apple', variant: 'dark' },
];

/**
 * Three side-by-side SSO buttons. Each fires a top-level navigation to the
 * API's OAuth start route — the api-client's `startUrl` is a synchronous URL
 * builder, no fetch. Server does the IdP handshake and lands the browser on
 * `/oauth-callback#accessToken=…` (or `/oauth-confirm-link?token=…` on the
 * unverified-email collision path).
 */
export function OAuthButtonGroup({
  returnTo,
  actionLabel = 'sign-in',
  disabled = false,
}: OAuthButtonGroupProps) {
  const prefix = actionLabel === 'continue' ? 'Continue with' : 'Sign in with';
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
