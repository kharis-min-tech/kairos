'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Input } from '@kairos/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PasswordStrength } from '@/components/password-strength';
import { KharisCardHeader } from '../kharis-logo';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch('newPassword', '');

  async function onSubmit(data: ChangePasswordFormData) {
    setError(null);
    try {
      await api.auth.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setMustChangePassword(false);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    }
  }

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader
        heading="Change your password"
        subtitle={<>Hi {user?.firstName ?? 'there'} — your account has a temporary password. Set a new one to continue.</>}
      />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="rounded-lg bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Enter the temporary password you received, then choose a new secure password.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Temporary Password
            </label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                className="h-11 rounded-lg border-muted-foreground/15 bg-transparent pr-10 focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
                placeholder="Enter temporary password"
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showCurrentPassword ? (
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
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="h-11 rounded-lg border-muted-foreground/15 bg-transparent pr-10 focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
                placeholder="Choose a strong password"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showNewPassword ? (
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
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          {newPassword.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-3">
              <PasswordStrength password={newPassword} />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              className="h-11 rounded-lg border-muted-foreground/15 bg-transparent focus-visible:border-[#f8b537] focus-visible:ring-1 focus-visible:ring-[#f8b537]/20 focus-visible:ring-offset-0"
              placeholder="Re-enter new password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </>
  );
}
