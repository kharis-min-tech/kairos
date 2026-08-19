'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@kairos/ui';
import { persistAuthSuccess, useLogin } from '@/hooks/use-auth';
import { useAuthStore } from '@/lib/auth-store';
import { OAuthButtonGroup } from '@/components/oauth-button-group';
import { KharisCardHeader } from '../kharis-logo';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const OAUTH_ERROR_COPY: Record<string, string> = {
  state_mismatch: 'Sign-in session expired. Please try again.',
  token_exchange_failed: "We couldn't complete sign-in with your provider. Please try again.",
  id_token_invalid: 'Sign-in verification failed. Please try again.',
  provider_error: 'Your provider returned an error. Please try again or use email + password.',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface OAuth error slugs the server appended to /login?oauth_error=… as
  // a friendly banner. Slugs come from apps/api/src/auth/oauth.
  useEffect(() => {
    const slug = searchParams.get('oauth_error');
    if (slug) {
      setError(OAUTH_ERROR_COPY[slug] ?? OAUTH_ERROR_COPY.provider_error!);
    }
  }, [searchParams]);

  // Already signed in? No reason to be on /login — go to dashboard.
  useEffect(() => {
    if (accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const result = await loginMutation.mutateAsync(data);

      // RBAC Phase 5a: login always returns tokens + member. Capabilities
      // travel on the access token via the `grants` array; no role picker.
      const member = result.member;
      const tokens = result.tokens;
      if (!member || !tokens) {
        throw new Error('Unexpected login response — missing tokens.');
      }
      persistAuthSuccess({ tokens, member, activeRole: member.systemRole });

      if (member.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push(result.isFirstLogin ? '/welcome' : '/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader heading="Welcome Back" subtitle="Sign in to continue to your dashboard" />

      {/* Card */}
      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-5">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Federated sign-in first — the fastest path for returning members. */}
          <OAuthButtonGroup returnTo="/dashboard" actionLabel="sign-in" disabled={isSubmitting} />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground/40">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your email"
                className="h-11 rounded-lg border-muted-foreground/15 bg-transparent focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-[#5D3FD3] hover:opacity-80">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground/70">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-[#5D3FD3] hover:opacity-80">
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
