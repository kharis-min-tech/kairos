'use client';

// Cloudflare Pages (next-on-pages) refuses any dynamic route that is not on the
// edge runtime, which fails the whole deploy rather than just this page.
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@kairos/ui';
import { AUDIT_ACTION_LABEL, type AuditAction } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';
import {
  useDeleteOAuthClient,
  useExpirePreviousOAuthSecret,
  useOAuthClient,
  useOAuthClientActivity,
  useOAuthClientGrants,
  useOAuthDiscovery,
  useRevokeAllOAuthGrants,
  useRotateOAuthClientSecret,
  useUpdateOAuthClient,
} from '@/hooks/use-oauth-server';
import { ClientForm, toRequest, valuesFromClient } from '../_components/client-form';
import { CopyField } from '../_components/copy-field';
import { SecretReveal } from '../_components/secret-reveal';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB') : 'never');

export default function OAuthClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data: client, isLoading, isError, error } = useOAuthClient(id);
  const grants = useOAuthClientGrants(id);
  const activity = useOAuthClientActivity(id);
  const discovery = useOAuthDiscovery();
  const update = useUpdateOAuthClient(id);
  const rotate = useRotateOAuthClientSecret(id);
  const expirePrevious = useExpirePreviousOAuthSecret(id);
  const revokeAll = useRevokeAllOAuthGrants(id);
  const remove = useDeleteOAuthClient();

  const [revealed, setRevealed] = useState<string | null>(null);
  const [tab, setTab] = useState('settings');

  // Second-level guard — platform admins only.
  useEffect(() => {
    if (activeRole && activeRole !== 'admin') router.replace('/');
  }, [activeRole, router]);

  if (isLoading) {
    return <div aria-busy="true" className="h-40 animate-pulse rounded-lg bg-muted/60"><span className="sr-only">Loading app</span></div>;
  }
  if (isError || !client) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error instanceof Error ? error.message : 'App not found.'}{' '}
        <Link href="/admin/oauth-clients" className="font-medium underline">Back to apps</Link>
      </div>
    );
  }

  async function handleRotate() {
    const ok = await confirm({
      title: 'Rotate the client secret?',
      description:
        'A new secret is generated and shown once. The current one keeps working for 24 hours so the app can be updated without downtime.',
      confirmLabel: 'Rotate secret',
    });
    if (!ok) return;
    try {
      const result = await rotate.mutateAsync();
      setRevealed(result.clientSecret);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rotate the secret.');
    }
  }

  async function handleExpirePrevious() {
    const ok = await confirm({
      title: 'End the overlap now?',
      description: 'The previous secret stops working immediately. Do this if you think it has been exposed.',
      confirmLabel: 'End overlap',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await expirePrevious.mutateAsync();
      toast.success('Previous secret revoked.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    }
  }

  async function handleToggleActive() {
    if (client!.isActive) {
      const ok = await confirm({
        title: `Disable ${client!.name}?`,
        description: 'Nobody can sign in through it, and it can no longer get tokens. Existing sessions end within 15 minutes. You can enable it again later.',
        confirmLabel: 'Disable',
        variant: 'destructive',
      });
      if (!ok) return;
    }
    try {
      await update.mutateAsync({ isActive: !client!.isActive });
      toast.success(client!.isActive ? 'App disabled.' : 'App enabled.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    }
  }

  async function handleRevokeAll() {
    const ok = await confirm({
      title: 'Sign everyone out of this app?',
      description: `${client!.grantCount ?? 0} member(s) will lose access and be asked to approve again next time. This cannot be undone.`,
      confirmLabel: 'Revoke all',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const { revoked } = await revokeAll.mutateAsync();
      toast.success(`${revoked} grant${revoked === 1 ? '' : 's'} revoked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${client!.name}?`,
      description: 'Its registration, every grant and every token are removed for good. The app will stop working until it is registered again with a new client ID.',
      confirmLabel: 'Delete app',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(client!.id);
      toast.success('App deleted.');
      router.push('/admin/oauth-clients');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}

      <Link href="/admin/oauth-clients">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Connected apps
        </Button>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant={client.isActive ? 'default' : 'secondary'}>{client.isActive ? 'Active' : 'Disabled'}</Badge>
            {client.isTrusted && <Badge variant="outline">Trusted</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {client.clientType === 'confidential' ? 'Server app' : 'Public app'} · registered {when(client.createdAt)} · last used {when(client.lastUsedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={update.isPending}>
          {client.isActive ? 'Disable' : 'Enable'}
        </Button>
      </div>

      {revealed && (
        <SecretReveal clientId={client.clientId} clientSecret={revealed} onDone={() => setRevealed(null)} />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="App sections">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="access">Access{client.grantCount ? ` (${client.grantCount})` : ''}</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection details</CardTitle>
              <CardDescription>What the app&apos;s team needs to set up &ldquo;Sign in with Kairos&rdquo;.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyField label="Client ID" value={client.clientId} />
              {discovery.data ? (
                <>
                  <CopyField label="Discovery document" value={`${discovery.data.issuer}/.well-known/openid-configuration`} />
                  <CopyField label="Authorization endpoint" value={discovery.data.authorization_endpoint} />
                  <CopyField label="Token endpoint" value={discovery.data.token_endpoint} />
                  <CopyField label="UserInfo endpoint" value={discovery.data.userinfo_endpoint} />
                  <CopyField label="JWKS (public signing keys)" value={discovery.data.jwks_uri} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {discovery.isError ? 'Could not load the endpoint list.' : 'Loading endpoints…'}
                </p>
              )}
            </CardContent>
          </Card>

          {client.clientType === 'confidential' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client secret</CardTitle>
                <CardDescription>
                  Stored as a one-way hash, so it can&apos;t be shown again. Rotate to get a new one.
                  {client.hasPreviousSecret && ' The previous secret is still valid during its 24-hour overlap.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleRotate} disabled={rotate.isPending}>
                  {rotate.isPending ? 'Rotating…' : 'Rotate secret'}
                </Button>
                {client.hasPreviousSecret && (
                  <Button size="sm" variant="outline" onClick={handleExpirePrevious} disabled={expirePrevious.isPending}>
                    End overlap now
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientForm
                key={client.id + client.createdAt + JSON.stringify(client.redirectUris) + client.allowedScopes.join()}
                mode="edit"
                initial={valuesFromClient(client)}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                isPending={update.isPending}
                error={update.error ? (update.error as Error).message : null}
                onSubmit={async (values) => {
                  const { clientType: _clientType, ...rest } = toRequest(values);
                  void _clientType;
                  try {
                    await update.mutateAsync(rest);
                    toast.success('Saved.');
                  } catch {
                    // surfaced through update.error
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleRevokeAll} disabled={revokeAll.isPending || !client.grantCount}>
                Revoke all access
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
                Delete app
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members signed in through this app</CardTitle>
            </CardHeader>
            <CardContent>
              {grants.isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              ) : (grants.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nobody has authorised this app yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {grants.data!.map((g) => (
                    <li key={g.grantId} className="py-3">
                      <p className="text-sm font-medium">{g.memberName}</p>
                      <p className="text-xs text-muted-foreground">{g.email}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {g.scopes.join(' · ')} · allowed {when(g.connectedAt)} · last used {when(g.lastUsedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>Authorisations, token requests, failures and admin changes for this app.</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              ) : (activity.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.data!.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {AUDIT_ACTION_LABEL[a.action as AuditAction] ?? a.action}
                          {a.outcome === 'failure' && (
                            <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                              Failed
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.actorName ?? 'The app'}
                          {a.metadata && Object.keys(a.metadata).length > 0 && ` · ${summarise(a.metadata)}`}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">{when(a.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A compact, human line for an audit row's metadata. Never prints arbitrary nested data. */
function summarise(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    // clientId is redundant on the app's own page.
    .filter(([k, v]) => k !== 'clientId' && typeof v === 'string' || typeof v === 'number' || (Array.isArray(v) && v.every((x) => typeof x === 'string')))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    .join(', ');
}
