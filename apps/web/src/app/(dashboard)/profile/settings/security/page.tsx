'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  UserPlus,
  UserMinus,
  Mail,
  MailWarning,
  Link2Off,
  Plus,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kairos/ui';
import {
  AUDIT_ACTION_LABEL,
  AuditAction,
  type AuditLogRow,
  type OAuthConnection,
  type OAuthProviderId,
} from '@kairos/types';
import { useMyAuditLog } from '@/hooks/use-audit-log';
import {
  useDisconnectOAuthProvider,
  useMyOAuthConnections,
} from '@/hooks/use-oauth-connections';
import { api } from '@/lib/api';
import {
  OAUTH_PROVIDER_LABEL,
  OAuthProviderIcon,
} from '@/components/oauth-provider-icon';

const ALL_PROVIDERS: OAuthProviderId[] = ['google', 'microsoft', 'apple'];

function actionIcon(action: AuditAction) {
  switch (action) {
    case AuditAction.SigninSuccess:
      return <ShieldCheck className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.SigninFailure:
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case AuditAction.PasswordChange:
      return <KeyRound className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.RoleGranted:
      return <UserPlus className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.RoleRevoked:
      return <UserMinus className="h-4 w-4 text-destructive" />;
    case AuditAction.EmailChangeRequested:
    case AuditAction.EmailChangeConfirmed:
      return <Mail className="h-4 w-4 text-[#5D3FD3]" />;
    case AuditAction.EmailChangeReverted:
      return <MailWarning className="h-4 w-4 text-destructive" />;
    default:
      return <ShieldCheck className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatLocation(entry: AuditLogRow): string {
  return [entry.country, entry.ip].filter(Boolean).join(' · ') || '—';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB');
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

// ── Connected accounts ────────────────────────────────────────

function ConnectedAccountsCard() {
  const { data: connections, isLoading, isError, error } = useMyOAuthConnections();
  const disconnect = useDisconnectOAuthProvider();

  const [confirming, setConfirming] = useState<OAuthProviderId | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const connectedIds = new Set((connections ?? []).map((c) => c.provider));
  const unconnected = ALL_PROVIDERS.filter((p) => !connectedIds.has(p));

  async function confirmDisconnect() {
    if (!confirming) return;
    setInlineError(null);
    try {
      await disconnect.mutateAsync(confirming);
      setConfirming(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setInlineError(msg);
    }
  }

  function startConnect(provider: OAuthProviderId) {
    window.location.assign(
      api.auth.oauth.startUrl(provider, '/profile/settings/security'),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Connected accounts
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sign in faster by linking a Google, Microsoft, or Apple account.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading connected accounts…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn&apos;t load connections: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {!isLoading && !isError && connections && connections.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No connected accounts. Add Google, Microsoft, or Apple to sign in faster.
            </p>
          </div>
        )}

        {connections && connections.length > 0 && (
          <ul className="space-y-2">
            {connections.map((c: OAuthConnection) => (
              <li
                key={c.provider}
                className="flex items-center gap-3 rounded-lg border border-muted-foreground/10 bg-card px-3 py-3"
              >
                <OAuthProviderIcon provider={c.provider} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{OAUTH_PROVIDER_LABEL[c.provider]}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.providerEmail ?? 'Hidden email'}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Connected {formatRelative(c.connectedAt)} · Last used {formatRelative(c.lastUsedAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setInlineError(null);
                    setConfirming(c.provider);
                  }}
                >
                  <Link2Off className="h-3.5 w-3.5" /> Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && unconnected.length > 0 && (
          <div className="space-y-2 border-t border-muted-foreground/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Add another
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {unconnected.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => startConnect(provider)}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-muted-foreground/15 bg-white text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <OAuthProviderIcon provider={provider} />
                  <span>{OAUTH_PROVIDER_LABEL[provider]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!confirming} onOpenChange={(open) => (!open ? setConfirming(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Disconnect {confirming ? OAUTH_PROVIDER_LABEL[confirming] : 'account'}?
            </DialogTitle>
            <DialogDescription>
              You&apos;ll no longer be able to sign in with{' '}
              {confirming ? OAUTH_PROVIDER_LABEL[confirming] : 'this provider'}. Your
              Kairos account and other sign-in methods stay unchanged.
            </DialogDescription>
          </DialogHeader>
          {inlineError && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {inlineError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirming(null)}
              disabled={disconnect.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDisconnect}
              disabled={disconnect.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90"
            >
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  const { data, isLoading, isError, error } = useMyAuditLog();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage the ways you sign in and review recent security activity.
        </p>
      </div>

      <ConnectedAccountsCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Recent security activity
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Your last 50 sign-ins, password changes, and role updates.
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading activity…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load activity: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
          {data && data.entries.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          )}
          {data?.entries.map((entry, idx) => (
            <div
              key={entry.id}
              className={`flex items-start gap-3 py-3 ${idx > 0 ? 'border-t' : ''}`}
            >
              <div className="mt-0.5 shrink-0">{actionIcon(entry.action)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{AUDIT_ACTION_LABEL[entry.action]}</p>
                  {entry.outcome === 'failure' && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatTime(entry.createdAt)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatLocation(entry)}</p>
                {entry.userAgent && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                    {entry.userAgent}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
