'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { forgotPassword, confirmPassword } from '@/lib/auth/cognito';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'One number' },
];

const confirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
  newPassword: z.string().min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
});

type EmailValues = z.infer<typeof emailSchema>;
type ConfirmValues = z.infer<typeof confirmSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* ── Step 1: Email entry ── */

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema as never),
    defaultValues: { email: '' },
  });

  async function handleRequestCode(data: EmailValues) {
    setSubmitError('');
    setSubmitting(true);
    try {
      await forgotPassword(data.email.trim());
      setEmail(data.email.trim());
      setStep('confirm');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step 2: Code + new password ── */

  const confirmForm = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema as never),
    defaultValues: { code: '', newPassword: '' },
  });

  const [showPassword, setShowPassword] = useState(false);
  const watchedPassword = confirmForm.watch('newPassword');

  async function handleConfirmPassword(data: ConfirmValues) {
    setSubmitError('');
    setSubmitting(true);
    try {
      await confirmPassword(email, data.code.trim(), data.newPassword);
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success ── */

  if (step === 'done') {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <ShieldCheck size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Password Reset</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been updated successfully. You can now sign in with your new password.
        </p>
        <Link href="/login">
          <Button className="min-h-[44px]">Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'email' && (
        <>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send a verification code.
            </p>
          </div>

          {submitError && (
            <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <form onSubmit={emailForm.handleSubmit(handleRequestCode)} className="space-y-4" aria-label="Request password reset">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={cn('pl-10 min-h-[44px]', emailForm.formState.errors.email && 'border-destructive')}
                  autoComplete="email"
                  {...emailForm.register('email')}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full min-h-[44px]">
              {submitting ? 'Sending code...' : 'Send Verification Code'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </p>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Enter Code</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a code to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {submitError && (
            <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <form onSubmit={confirmForm.handleSubmit(handleConfirmPassword)} className="space-y-4" aria-label="Confirm password reset">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                className={cn('min-h-[44px] text-center text-lg tracking-widest', confirmForm.formState.errors.code && 'border-destructive')}
                autoComplete="one-time-code"
                {...confirmForm.register('code')}
              />
              {confirmForm.formState.errors.code && (
                <p className="text-xs text-destructive">{confirmForm.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className={cn('pl-10 pr-10 min-h-[44px]', confirmForm.formState.errors.newPassword && 'border-destructive')}
                  autoComplete="new-password"
                  {...confirmForm.register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{confirmForm.formState.errors.newPassword.message}</p>
              )}

              <ul className="space-y-1 text-xs" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(watchedPassword);
                  return (
                    <li key={rule.label} className={met ? 'text-green-600' : 'text-muted-foreground'}>
                      {met ? <Check size={12} className="inline mr-1" /> : <span className="inline-block w-3 mr-1 text-center">○</span>}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <Button type="submit" disabled={submitting} className="w-full min-h-[44px]">
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => { setStep('email'); setSubmitError(''); }}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ArrowLeft size={14} /> Use a different email
            </button>
          </p>
        </>
      )}
    </div>
  );
}
