'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Input } from '@kairos/ui';
import { useForgotPassword } from '@/hooks/use-auth';
import { KharisCardHeader } from '../kharis-logo';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const forgotMutation = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    const result = await forgotMutation.mutateAsync(data.email);
    if (result?.resetToken) setDevToken(result.resetToken);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        {/* Heading — outside card */}
        <KharisCardHeader heading="Check your email" subtitle="Reset instructions have been sent" />

        <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] space-y-4">
          <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            If an account exists for that email address, we&apos;ve sent a password reset link. Check your inbox and spam folder.
          </div>
          <p className="text-sm text-muted-foreground">
            The link will expire in <span className="font-medium text-foreground">1 hour</span>.
          </p>
          {devToken && (
            <div className="rounded-lg bg-[#f8b537]/10 p-4 space-y-2">
              <p className="text-xs font-semibold text-[#9a6b04] dark:text-[#f8b537]">Dev mode — reset token:</p>
              <p className="break-all font-mono text-xs text-[#7a5403] dark:text-[#fbc966]">{devToken}</p>
              <a
                href={`/reset-password?token=${devToken}`}
                className="inline-block text-xs font-medium text-[#5D3FD3] underline hover:opacity-80"
              >
                Click here to reset your password →
              </a>
            </div>
          )}
          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader heading="Forgot password?" subtitle="No worries, we'll send you reset instructions" />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@kharischurch.org"
              className="h-11 rounded-lg border-muted-foreground/15 bg-transparent focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Sign In
          </Link>
        </form>

        <div className="mt-6 rounded-lg bg-[#f8b537]/10 p-4">
          <p className="text-xs font-medium text-[#9a6b04] dark:text-[#f8b537]">Need help?</p>
          <p className="mt-0.5 text-xs text-[#9a6b04]/80 dark:text-[#f8b537]/80">
            Contact your branch administrator if you continue to have issues accessing your account.
          </p>
        </div>
      </div>
    </>
  );
}
