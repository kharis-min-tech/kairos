'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  CustomSelect,
  Input,
  Label,
  Textarea,
} from '@kairos/ui';
import {
  OAUTH_SERVER_SCOPES,
  type CreateOAuthClientRequest,
  type OAuthClientSummary,
  type OAuthClientType,
} from '@kairos/types';

export interface ClientFormValues {
  name: string;
  description: string;
  logoUrl: string;
  homepageUrl: string;
  privacyUrl: string;
  termsUrl: string;
  clientType: OAuthClientType;
  redirectUris: string;
  allowedScopes: string[];
  isTrusted: boolean;
}

export function valuesFromClient(client: OAuthClientSummary): ClientFormValues {
  return {
    name: client.name,
    description: client.description ?? '',
    logoUrl: client.logoUrl ?? '',
    homepageUrl: client.homepageUrl ?? '',
    privacyUrl: client.privacyUrl ?? '',
    termsUrl: client.termsUrl ?? '',
    clientType: client.clientType,
    redirectUris: client.redirectUris.join('\n'),
    allowedScopes: client.allowedScopes,
    isTrusted: client.isTrusted,
  };
}

const EMPTY: ClientFormValues = {
  name: '',
  description: '',
  logoUrl: '',
  homepageUrl: '',
  privacyUrl: '',
  termsUrl: '',
  clientType: 'confidential',
  redirectUris: '',
  allowedScopes: ['openid', 'profile', 'email'],
  isTrusted: false,
};

/** One URL per line; blanks dropped. */
export function parseRedirectUris(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function toRequest(v: ClientFormValues): CreateOAuthClientRequest {
  return {
    name: v.name.trim(),
    description: v.description.trim() || undefined,
    logoUrl: v.logoUrl.trim() || undefined,
    homepageUrl: v.homepageUrl.trim() || undefined,
    privacyUrl: v.privacyUrl.trim() || undefined,
    termsUrl: v.termsUrl.trim() || undefined,
    clientType: v.clientType,
    redirectUris: parseRedirectUris(v.redirectUris),
    allowedScopes: v.allowedScopes,
    isTrusted: v.isTrusted,
  };
}

/**
 * One form for registering and editing an app. The client type is chosen once,
 * at creation: it decides whether a secret exists at all, so changing it later
 * would silently strand an app that already holds one.
 */
export function ClientForm({
  mode,
  initial,
  submitLabel,
  pendingLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial?: ClientFormValues;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (values: ClientFormValues) => void;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<ClientFormValues>(initial ?? EMPTY);
  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const toggleScope = (scope: string) => {
    if (scope === 'openid') return; // always required
    set('allowedScopes', v.allowedScopes.includes(scope) ? v.allowedScopes.filter((s) => s !== scope) : [...v.allowedScopes, scope]);
  };

  const valid = v.name.trim().length > 0 && parseRedirectUris(v.redirectUris).length > 0 && v.allowedScopes.includes('openid');

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(v);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="oc-name">Name *</Label>
          <Input id="oc-name" value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="Kharis Analytics" maxLength={120} />
          <p className="text-xs text-muted-foreground">Shown to members on the consent screen.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oc-type">Type *</Label>
          <CustomSelect
            id="oc-type"
            value={v.clientType}
            onValueChange={(t) => set('clientType', t as OAuthClientType)}
            disabled={mode === 'edit'}
            options={[
              { value: 'confidential', label: 'Confidential, a server app that can keep a secret' },
              { value: 'public', label: 'Public, a mobile or browser app (PKCE only)' },
            ]}
          />
          {mode === 'edit' && <p className="text-xs text-muted-foreground">Fixed once registered.</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oc-desc">Description</Label>
        <Input id="oc-desc" value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="Dashboards and reports for church leadership" maxLength={1000} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="oc-redirects">Redirect URIs *</Label>
        <Textarea
          id="oc-redirects"
          value={v.redirectUris}
          onChange={(e) => set('redirectUris', e.target.value)}
          rows={3}
          className="font-mono text-xs"
          placeholder="https://analytics.kharis.org/oauth-authorized/kairos"
        />
        <p className="text-xs text-muted-foreground">
          One per line. Matched exactly, with no wildcards. https only, except localhost for development.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Scopes this app may request *</legend>
        {OAUTH_SERVER_SCOPES.map((s) => (
          <label key={s.scope} className="flex items-start gap-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={v.allowedScopes.includes(s.scope)}
              disabled={s.scope === 'openid'}
              onChange={() => toggleScope(s.scope)}
            />
            <span>
              <code className="font-mono text-xs">{s.scope}</code>
              <span className="ml-2 text-muted-foreground">{s.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex items-start gap-3 rounded-lg border border-muted-foreground/15 p-3 text-sm">
        <Checkbox className="mt-0.5" checked={v.isTrusted} onChange={() => set('isTrusted', !v.isTrusted)} />
        <span>
          <span className="font-medium">Trusted first-party app</span>
          <span className="block text-xs text-muted-foreground">
            Skips the consent screen, so members are signed straight in. Only for apps Kharis itself runs.
          </span>
        </span>
      </label>

      <details className="rounded-lg border border-muted-foreground/15 p-3">
        <summary className="cursor-pointer text-sm font-medium">Branding and links (optional)</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {([
            ['logoUrl', 'Logo URL'],
            ['homepageUrl', 'Homepage'],
            ['privacyUrl', 'Privacy policy'],
            ['termsUrl', 'Terms'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`oc-${key}`}>{label}</Label>
              <Input id={`oc-${key}`} type="url" value={v[key]} onChange={(e) => set(key, e.target.value)} placeholder="https://" />
            </div>
          ))}
        </div>
      </details>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
