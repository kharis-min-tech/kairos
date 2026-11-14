'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@kairos/ui';
import { api } from '@/lib/api';
import { PasswordStrength } from '@/components/password-strength';
import { useTranslation } from 'react-i18next';

const makeSchema = (t: (key: string) => string) =>
  z
  .object({
    currentPassword: z.string().min(1, t('security:vCurrentPasswordIsRequired')),
    newPassword: z
      .string()
      .min(8, t('security:vPasswordMustBeAtLeastCharacters'))
      .regex(/[A-Z]/, t('security:vMustContainAnUppercaseLetter'))
      .regex(/[a-z]/, t('security:vMustContainALowercaseLetter'))
      .regex(/[0-9]/, t('security:vMustContainANumber'))
      .regex(/[^A-Za-z0-9]/, t('security:vMustContainASpecialCharacter')),
    confirmPassword: z.string().min(1, t('security:vPleaseConfirmYourPassword')),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: t('security:vPasswordsDoNotMatch'),
    path: ['confirmPassword'],
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function ChangePasswordSettingsPage() {  const { t } = useTranslation(['settings', 'common']);
  const schema = useMemo(() => makeSchema(t), [t]);

  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const newPassword = watch('newPassword', '');

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await api.auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess(true);
      setTimeout(() => router.push('/profile/settings'), 2000);
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Change failed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />{t('settings:settings')}</Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('settings:changePassword')}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('settings:enterYourCurrentPasswordThenChoose')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-[#5D3FD3]" aria-hidden />{t('settings:newPassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">{t('settings:passwordUpdated')}</p>
              <p className="text-muted-foreground">{t('settings:weVeEmailedConfirmationReturningSettings')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">{t('settings:currentPassword')}</Label>
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
                <Label htmlFor="newPassword">{t('settings:newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              {newPassword.length > 0 && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <PasswordStrength password={newPassword} />
                </div>
              )}
              <div>
                <Label htmlFor="confirmPassword">{t('settings:confirmNewPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.confirmPassword.message}
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
                disabled={submitting}
              >
                {submitting ? t('settings:updatingPassword') : t('settings:updatePassword')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5D3FD3]" aria-hidden />
          <p>{t('settings:youLlGetEmailConfirmingChange')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
