'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import type { OAuthProviderId } from '@kairos/types';
import { Input } from '@kairos/ui';
import { api } from '@/lib/api';
import { persistAuthSuccess } from '@/hooks/use-auth';
import { OAUTH_PROVIDER_LABEL, OAuthProviderIcon } from '@/components/oauth-provider-icon';
import { KharisCardHeader } from '../kharis-logo';

const confirmSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type ConfirmFormData = z.infer<typeof confirmSchema>;

function providerLabel(provider: string | null): string {
  if (!provider) return 'your provider';
  return OAUTH_PROVIDER_LABEL[provider as OAuthProviderId] ?? 'your provider';
}

function ConfirmLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const provider = searchParams.get('provider');
  const providerName = providerLabel(provider);

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await api.auth.oauth.confirmLink({
        confirmationToken: token ?? '',
        password,
      });
      return res.data!;
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
  });

  async function onSubmit(data: ConfirmFormData) {
    setError(null);
    try {
      const result = await confirmMutation.mutateAsync(data.password);
      const { member, tokens } = result;
      if (!member || !tokens) {
        throw new Error('Unexpected response: missing tokens.');
      }
      persistAuthSuccess({ tokens, member, activeRole: member.systemRole });
      try {
        if (provider) sessionStorage.setItem('kairos.oauth_toast', provider);
      } catch {
        // sessionStorage disabled — skip silently.
      }
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/password/i.test(message) || /credential/i.test(message) || /401/.test(message)) {
        setError('Incorrect password.');
      } else {
        setError('Something went wrong. Try signing in again.');
      }
    }
  }

  if (!token) {
    return (
      <>
        <KharisCardHeader
          heading="Link expired"
          subtitle="This confirmation link is missing information"
        />
        <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <p className="mb-5 text-sm text-muted-foreground">
            Please try signing in again from the login page.
          </p>
          <Link href="/login">
            <button className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90">
              Back to sign in
            </button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <KharisCardHeader
        heading="Confirm to link account"
        subtitle={`Enter your Kharis password to link ${providerName}`}
      />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-muted-foreground/10 bg-muted/30 p-3">
          {provider && (
            <OAuthProviderIcon provider={provider as OAuthProviderId} className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <p className="text-sm text-foreground">
            We found a Kairos account for <span className="font-semibold">{email ?? 'your email'}</span>.
            Enter your password to link it with your {providerName} account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                className="h-11 rounded-lg border-muted-foreground/15 bg-transparent pr-10 focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Linking…' : `Link ${providerName} account`}
          </button>

          <p className="text-center text-sm text-muted-foreground/70">
            <Link href="/login" className="font-medium text-[#5D3FD3] hover:opacity-80">
              Sign in another way
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <>
      <KharisCardHeader heading="Confirm to link account" subtitle="Loading…" />
      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="h-16 rounded-lg bg-muted/40" />
          <div className="h-11 rounded-lg bg-muted/40" />
          <div className="h-11 rounded-lg bg-muted/30" />
        </div>
      </div>
    </>
  );
}

export default function OAuthConfirmLinkPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ConfirmLinkContent />
    </Suspense>
  );
}
