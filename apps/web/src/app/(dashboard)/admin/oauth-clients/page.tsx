'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppWindow } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kairos/ui';
import type { OAuthClientWithSecret } from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';
import { useCreateOAuthClient, useOAuthClients } from '@/hooks/use-oauth-server';
import { ClientForm, toRequest } from './_components/client-form';
import { SecretReveal } from './_components/secret-reveal';

function formatRelative(iso: string | null): string {
  if (!iso) return 'never used';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `used ${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `used ${Math.round(diff / hour)} h ago`;
  if (diff < 30 * day) return `used ${Math.round(diff / day)} d ago`;
  return `used ${new Date(iso).toLocaleDateString('en-GB')}`;
}

export default function OAuthClientsPage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: clients, isLoading, isError, error } = useOAuthClients();
  const create = useCreateOAuthClient();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<OAuthClientWithSecret | null>(null);

  // Second-level guard — platform admins only.
  useEffect(() => {
    if (activeRole && activeRole !== 'admin') router.replace('/');
  }, [activeRole, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected apps</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Apps that let members sign in with their Kairos account{clients ? `, ${clients.length} registered` : ''}.
          </p>
        </div>
        {!creating && !created && (
          <Button size="sm" className="shrink-0" onClick={() => { create.reset(); setCreating(true); }}>
            + Register app
          </Button>
        )}
      </div>

      {created && (
        <SecretReveal
          clientId={created.client.clientId}
          clientSecret={created.clientSecret}
          onDone={() => {
            const id = created.client.id;
            setCreated(null);
            router.push(`/admin/oauth-clients/${id}`);
          }}
        />
      )}

      {creating && !created && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Register an app</CardTitle>
            <CardDescription>You&apos;ll get a client ID and, for server apps, a secret to give the app&apos;s team.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm
              mode="create"
              submitLabel="Register app"
              pendingLabel="Registering…"
              isPending={create.isPending}
              error={create.error ? (create.error as Error).message : null}
              onCancel={() => setCreating(false)}
              onSubmit={async (values) => {
                try {
                  const result = await create.mutateAsync(toRequest(values));
                  setCreating(false);
                  setCreated(result);
                } catch {
                  // surfaced through create.error
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div aria-busy="true" aria-live="polite" className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted/60" />
          ))}
          <span className="sr-only">Loading apps</span>
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn&apos;t load apps: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !clients || clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AppWindow className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-muted-foreground">No apps registered yet.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Register one when another Kharis app needs to sign members in with Kairos, such as analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/admin/oauth-clients/${c.id}`} className="block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{c.name}</CardTitle>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {c.isTrusted && <Badge variant="outline">Trusted</Badge>}
                      <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Disabled'}</Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {c.clientType === 'confidential' ? 'Server app' : 'Public app'} · {c.redirectUris[0]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {c.grantCount ?? 0} member{c.grantCount === 1 ? '' : 's'} signed in · {formatRelative(c.lastUsedAt)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
