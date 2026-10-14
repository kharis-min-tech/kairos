'use client';

import { useState } from 'react';
import { AppWindow, Unplug } from 'lucide-react';
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
import type { OAuthAppConnection } from '@kairos/types';
import { useMyAuthorizedApps, useRevokeAuthorizedApp } from '@/hooks/use-oauth-server';

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

/**
 * Other apps the member has let sign them in with Kairos. Distinct from
 * "Connected accounts", which is the reverse direction (Google, Microsoft and
 * Apple signing the member in to Kairos).
 */
export function AuthorizedAppsCard() {
  const { data: apps, isLoading, isError, error } = useMyAuthorizedApps();
  const revoke = useRevokeAuthorizedApp();
  const [confirming, setConfirming] = useState<OAuthAppConnection | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  async function confirmRevoke() {
    if (!confirming) return;
    setInlineError(null);
    try {
      await revoke.mutateAsync(confirming.grantId);
      setConfirming(null);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  // Most members will never authorise an app. Say nothing rather than show an
  // empty card for a feature they have no reason to know about.
  if (!isLoading && !isError && apps && apps.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AppWindow className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Apps with access
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Apps you&apos;ve let sign you in with your Kairos account. Remove one and it can no longer see your details.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading apps…</div>
        )}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn&apos;t load apps: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}
        {apps && apps.length > 0 && (
          <ul className="space-y-2">
            {apps.map((app) => (
              <li
                key={app.grantId}
                className="flex items-start gap-3 rounded-lg border border-muted-foreground/10 bg-card px-3 py-3"
              >
                {app.clientLogoUrl ? (
                  <img src={app.clientLogoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5D3FD3]/10 text-sm font-semibold text-[#5D3FD3]">
                    {app.clientName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{app.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    Can see: {app.scopes.map((s) => s.description.toLowerCase()).join(' · ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Allowed {formatRelative(app.connectedAt)} · Last used {formatRelative(app.lastUsedAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setInlineError(null);
                    setConfirming(app);
                  }}
                >
                  <Unplug className="h-3.5 w-3.5" /> Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!confirming} onOpenChange={(open) => (!open ? setConfirming(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirming?.clientName ?? 'this app'}?</DialogTitle>
            <DialogDescription>
              It will be signed out straight away and can&apos;t see your Kairos details any more. You can allow it
              again the next time it asks.
            </DialogDescription>
          </DialogHeader>
          {inlineError && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {inlineError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={revoke.isPending}>
              Cancel
            </Button>
            <Button
              onClick={confirmRevoke}
              disabled={revoke.isPending}
              className="bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-90"
            >
              {revoke.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
