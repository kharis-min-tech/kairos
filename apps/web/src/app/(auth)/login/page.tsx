'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@kairos/ui';
import { persistAuthSuccess, useLogin } from '@/hooks/use-auth';
import { useAuthStore } from '@/lib/auth-store';
import { useRoleSelectionStore } from '@/lib/role-selection-store';
import { KharisCardHeader } from '../kharis-logo';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const setRoleSelection = useRoleSelectionStore((s) => s.setRoleSelection);
  const clearRoleSelection = useRoleSelectionStore((s) => s.clearRoleSelection);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? No reason to be on /login — go to dashboard.
  useEffect(() => {
    if (accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, router]);

  // Any stale picker stash (back-button, lingering session) is gone the
  // moment the user lands here. Phase 2 contract: `/login` mount = reset.
  useEffect(() => {
    clearRoleSelection();
  }, [clearRoleSelection]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const result = await loginMutation.mutateAsync(data);

      if (result.roleSelectionRequired) {
        // Multi-role path: park the envelope in the in-memory stash and
        // hand off to the picker. No tokens yet — finalize-role mints them.
        setRoleSelection({
          sessionToken: result.sessionToken ?? '',
          availableRoles: result.availableRoles ?? [],
        });
        router.push('/select-role');
        return;
      }

      // Single-role path: tokens + member are populated; persist + route.
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
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@kharischurch.org"
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

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground/40">or connect via</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              aria-label="Sign in with Google — coming soon"
              title="Coming soon"
              className="flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-muted-foreground/10 bg-muted/30 text-xs font-medium text-muted-foreground/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">soon</span>
            </button>
            <button
              type="button"
              disabled
              aria-label="Sign in with Apple ID — coming soon"
              title="Coming soon"
              className="flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-muted-foreground/10 bg-muted/30 text-xs font-medium text-muted-foreground/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              Apple ID
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">soon</span>
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground/70">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#5D3FD3] hover:opacity-80">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}
