'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { forgotPassword, confirmPassword } from '@/lib/auth/cognito';
import { TextInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'One number' },
];

function validatePassword(password: string): string | undefined {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label;
  }
  return undefined;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'confirm' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setEmailError('');
    setSubmitError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(trimmed);
      setStep('confirm');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPassword(e: FormEvent) {
    e.preventDefault();
    setCodeError('');
    setPasswordError('');
    setSubmitError('');

    const trimmedCode = code.trim();
    if (!trimmedCode || !/^\d{6}$/.test(trimmedCode)) {
      setCodeError('Please enter the 6-digit code');
      return;
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setPasswordError(`Password must contain: ${pwError}`);
      return;
    }

    setSubmitting(true);
    try {
      await confirmPassword(email.trim(), trimmedCode, newPassword);
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (step === 'done') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-4 text-2xl font-bold text-primary">Kairos</h1>
          <Alert variant="success" title="Password reset successful">
            Your password has been updated. You can now sign in with your new password.
          </Alert>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold text-primary">Kairos</h1>

        {step === 'email' && (
          <form
            onSubmit={handleRequestCode}
            noValidate
            aria-label="Request password reset"
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Reset password</h2>
            <p className="text-sm text-gray-600">
              Enter your email address and we&apos;ll send you a verification code.
            </p>

            {submitError && (
              <Alert variant="error" title="Error">
                {submitError}
              </Alert>
            )}

            <TextInput
              label="Email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              error={emailError}
              autoComplete="email"
            />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Sending code...' : 'Send verification code'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}

        {step === 'confirm' && (
          <form
            onSubmit={handleConfirmPassword}
            noValidate
            aria-label="Confirm password reset"
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">Enter verification code</h2>
            <p className="text-sm text-gray-600">
              We sent a code to <span className="font-medium">{email}</span>. Enter it below with your new password.
            </p>

            {submitError && (
              <Alert variant="error" title="Error">
                {submitError}
              </Alert>
            )}

            <TextInput
              label="Verification code"
              name="code"
              required
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
              error={codeError}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />

            <div>
              <TextInput
                label="New password"
                name="new_password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                error={passwordError}
                autoComplete="new-password"
              />
              <ul className="mt-2 space-y-1 text-xs text-gray-500" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule) => (
                  <li key={rule.label} className={rule.test(newPassword) ? 'text-green-600' : ''} aria-label={`${rule.label}: ${rule.test(newPassword) ? 'met' : 'not met'}`}>
                    {rule.test(newPassword) ? '✓' : '○'} {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Resetting password...' : 'Reset password'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              <button
                type="button"
                onClick={() => { setStep('email'); setSubmitError(''); }}
                className="font-medium text-primary hover:underline"
              >
                Use a different email
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
