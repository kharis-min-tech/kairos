'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@kairos/ui';
import { useRequestEmailChange } from '@/hooks/use-email-change';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newEmail: z.string().email('Invalid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function EmailChangePage() {
  const [success, setSuccess] = useState(false);
  const mutation = useRequestEmailChange();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync(values);
      setSuccess(true);
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Request failed' });
    }
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Change email</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Confirm your password, then we&apos;ll send a verification link to the
          new address.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> New email
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Confirmation sent
              </p>
              <p className="text-muted-foreground">
                Check the new email for a verification link. Your current email is
                still active until you click it. We&apos;ve also notified your old
                email — if you didn&apos;t request this, click <strong>This wasn&apos;t me</strong> in that message.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="newEmail">New email address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  autoComplete="email"
                  {...register('newEmail')}
                />
                {errors.newEmail && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.newEmail.message}
                  </p>
                )}
              </div>
              {errors.root && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {errors.root.message}
                </div>
              )}
              <Button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Sending…' : 'Send confirmation'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5D3FD3]" aria-hidden />
          <p>
            Your old email will get an alert with a &ldquo;This wasn&apos;t me&rdquo;
            link. Clicking that reverts the change immediately and locks your
            account until you reset your password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
