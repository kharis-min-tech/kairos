'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button, Input, Label } from '@kairos/ui';
import { forgotPassword, confirmPassword } from '@/lib/auth/cognito';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

const confirmSchema = z.object({
  code: z.string().min(1, 'Please enter the 6-digit code'),
  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain one uppercase letter')
    .regex(/[a-z]/, 'Password must contain one lowercase letter')
    .regex(/[0-9]/, 'Password must contain one number'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type ConfirmFormData = z.infer<typeof confirmSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'confirm' | 'success'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const confirmForm = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
  });

  async function onEmailSubmit(data: EmailFormData) {
    setEmailError(null);
    try {
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setStep('confirm');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  async function onConfirmSubmit(data: ConfirmFormData) {
    setConfirmError(null);
    try {
      await confirmPassword(submittedEmail, data.code, data.password);
      setStep('success');
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (step === 'success') {
    return (
      <div className="rounded-2xl bg-white shadow-xl px-8 py-8 space-y-4">
        <h1 className="text-xl font-bold">Password Reset Successful</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="rounded-2xl bg-white shadow-xl" key="confirm-step">
        <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
          <h1 className="text-xl font-bold">Enter verification code</h1>
          <p className="mt-1 text-sm text-purple-200">
            We sent a code to
          </p>
          <p className="text-sm font-medium">{submittedEmail}</p>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-sm font-medium">Verification code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                className="h-11 rounded-xl"
                {...confirmForm.register('code')}
              />
              {confirmForm.formState.errors.code && (
                <p className="text-xs text-rose-600">{confirmForm.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="New password"
                className="h-11 rounded-xl"
                {...confirmForm.register('password')}
              />
              {confirmForm.formState.errors.password && (
                <p className="text-xs text-rose-600">{confirmForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Password must contain:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
              </ul>
            </div>

            {confirmError && (
              <p className="text-sm text-rose-600">{confirmError}</p>
            )}

            <Button type="submit" className="h-11 w-full rounded-xl font-semibold">
              Reset Password
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setStep('email')}
            className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  // step === 'email'
  return (
    <div className="rounded-2xl bg-white shadow-xl" key="email-step">
      <div className="rounded-t-2xl bg-gradient-to-br from-purple-900 to-purple-800 px-8 py-8 text-white">
        <h1 className="mt-4 text-xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-purple-200">
          Enter your email to receive a verification code
        </p>
      </div>

      <div className="px-8 py-6">
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@kharischurch.org"
              className="h-11 rounded-xl border-muted-foreground/20"
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-rose-600">{emailForm.formState.errors.email.message}</p>
            )}
          </div>

          {emailError && (
            <p className="text-sm text-rose-600">{emailError}</p>
          )}

          <Button type="submit" className="h-11 w-full rounded-xl font-semibold">
            Send Verification Code
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Back to Sign In
          </Link>
        </form>
      </div>
    </div>
  );
}
