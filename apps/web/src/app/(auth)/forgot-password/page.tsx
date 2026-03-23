'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button, Input, Label } from '@kairos/ui';
import { useForgotPassword } from '@/hooks/use-auth';

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
      <div className="rounded-2xl bg-white shadow-xl">
        <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold">Check Your Email</h1>
          <p className="mt-1 text-sm text-purple-200">Reset instructions have been sent</p>
        </div>
        <div className="px-8 py-6 space-y-4">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
            If an account exists for that email address, we&apos;ve sent a password reset link. Check your inbox and spam folder.
          </div>
          <p className="text-sm text-muted-foreground">
            The link will expire in <span className="font-medium text-foreground">1 hour</span>.
          </p>
          {devToken && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-800">Dev mode — reset token:</p>
              <p className="break-all font-mono text-xs text-amber-900">{devToken}</p>
              <a
                href={`/reset-password?token=${devToken}`}
                className="inline-block text-xs font-medium text-purple-700 underline hover:text-purple-900"
              >
                Click here to reset your password →
              </a>
            </div>
          )}
          <Link href="/login">
            <Button variant="outline" className="h-11 w-full rounded-xl">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl">
      <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold">Forgot Password?</h1>
        <p className="mt-1 text-sm text-purple-200">No worries, we&apos;ll send you reset instructions</p>
      </div>

      <div className="px-8 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@kharischurch.org"
              className="h-11 rounded-xl border-muted-foreground/20"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Sign In
          </Link>
        </form>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">Need help?</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Contact your branch administrator if you continue to have issues accessing your account.
          </p>
        </div>
      </div>
    </div>
  );
}
