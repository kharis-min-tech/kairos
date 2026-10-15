'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

import { Button, Checkbox } from '@kairos/ui';
import {
  CONSENT_TYPE_LABEL,
  ConsentType,
  type ConsentStatus,
} from '@kairos/types';
import { useMyConsentStatuses, useRecordConsent } from '@/hooks/use-consent';
import { useAuthStore } from '@/lib/auth-store';
import { AcceptableUseBody } from '@/components/legal/acceptable-use-body';
import { ConfidentialityBody } from '@/components/legal/confidentiality-body';
import { useTranslation } from 'react-i18next';

/**
 * The hard consent gate. Reached via redirect from the dashboard layout when
 * the caller has one or more `required && needsAccept` consents outstanding.
 * Renders every pending policy inline in a scrollable panel above a per-doc
 * "I have read and accept" checkbox. Continue is disabled until every box is
 * ticked; the API middleware also blocks non-allowlisted endpoints while any
 * required consent is pending, so bypassing the client redirect achieves
 * nothing beyond a 403.
 */

const BODY_FOR: Partial<Record<ConsentType, React.ReactNode>> = {
  [ConsentType.AcceptableUse]: <AcceptableUseBody />,
  [ConsentType.AdminConfidentiality]: <ConfidentialityBody />,
};

const STANDALONE_HREF: Record<ConsentType, string> = {
  [ConsentType.Terms]: '/legal/terms',
  [ConsentType.Privacy]: '/legal/privacy',
  [ConsentType.Marketing]: '/profile/settings/legal',
  [ConsentType.AcceptableUse]: '/legal/acceptable-use',
  [ConsentType.AdminConfidentiality]: '/legal/confidentiality',
};

export default function AcceptPoliciesPage() {
  const { t } = useTranslation(['common', 'legal']);
  // The shared CONSENT_TYPE_LABEL in @kairos/types is English. This screen is
  // the consent gate for the very documents that were just translated, so the
  // document names have to follow the reader's language too.
  const consentLabel = (type: string) =>
    t(`legal:consentType.${type}`, { defaultValue: CONSENT_TYPE_LABEL[type as keyof typeof CONSENT_TYPE_LABEL] });

  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError } = useMyConsentStatuses();
  const recordConsent = useRecordConsent();
  const [accepted, setAccepted] = useState<Set<ConsentType>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pending: ConsentStatus[] = useMemo(
    () => (data?.statuses ?? []).filter((s) => s.required && s.needsAccept),
    [data],
  );

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (!isLoading && data && pending.length === 0) {
      router.replace('/dashboard');
    }
  }, [isLoading, data, pending, router]);

  function toggle(type: ConsentType) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleSignOut() {
    logout();
    queryClient.clear();
    router.replace('/login');
  }

  async function handleContinue() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      for (const status of pending) {
        // eslint-disable-next-line no-await-in-loop
        await recordConsent.mutateAsync({
          consentType: status.consentType,
          granted: true,
        });
      }
      router.replace('/dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common:couldNotRecordAcceptance'));
    } finally {
      setSubmitting(false);
    }
  }

  const allAccepted =
    pending.length > 0 && pending.every((p) => accepted.has(p.consentType));

  if (!accessToken) return null;
  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">{t('common:loadingPolicies')}</div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        We couldn&apos;t load the policies you need to accept. Please refresh or
        sign out and back in.
      </div>
    );
  }
  if (pending.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('common:actionRequired')}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('common:pleaseReviewAndAcceptBeforeContinuing')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('legal:acceptIntro')}{' '}
          {pending.map((s, i) => (
            <span key={s.consentType}>
              <Link
                href={STANDALONE_HREF[s.consentType]}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#5D3FD3] hover:underline"
              >
                {t('legal:openInNewTabNamed', { name: consentLabel(s.consentType) })}
              </Link>
              {i < pending.length - 2 ? ', ' : i === pending.length - 2 ? t('legal:listOr') : '.'}
            </span>
          ))}
        </p>
      </div>

      {submitError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="space-y-6">
        {pending.map((status) => {
          const body = BODY_FOR[status.consentType];
          return (
            <section
              key={status.consentType}
              className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm dark:border-white/5"
              aria-labelledby={`policy-${status.consentType}-title`}
            >
              <header className="flex items-center justify-between border-b border-black/5 bg-[#5D3FD3]/5 px-5 py-3 dark:border-white/5">
                <div>
                  <p id={`policy-${status.consentType}-title`} className="text-sm font-semibold">
                    {consentLabel(status.consentType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('legal:versionLabel', { version: status.currentVersion })}
                  </p>
                </div>
                <Link
                  href={STANDALONE_HREF[status.consentType]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#5D3FD3] hover:underline"
                >{t('common:openInNewTab')}</Link>
              </header>

              {body ? (
                <div className="max-h-[400px] overflow-y-auto px-5 py-4">
                  {body}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  {t('legal:pleaseReadThisPolicyAt')}{' '}
                  <Link
                    href={STANDALONE_HREF[status.consentType]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#5D3FD3] hover:underline"
                  >
                    {STANDALONE_HREF[status.consentType]}
                  </Link>{' '}
                  {t('legal:beforeAccepting')}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 border-t border-black/5 bg-muted/30 px-5 py-4 dark:border-white/5">
                <Checkbox
                  className="mt-0.5"
                  checked={accepted.has(status.consentType)}
                  onChange={() => toggle(status.consentType)}
                  disabled={submitting}
                />
                <span className="text-sm">
                  {t('legal:iHaveReadAndAccept')}{' '}
                  <span className="font-medium">{consentLabel(status.consentType)}</span>{' '}
                  {t('legal:versionParenthetical', { version: status.currentVersion })}
                </span>
              </label>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="rounded-lg"
          onClick={handleSignOut}
          disabled={submitting}
        >{t('common:signOut')}</Button>
        <Button
          type="button"
          className="rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white"
          onClick={handleContinue}
          disabled={!allAccepted || submitting}
        >
          {submitting ? t('legal:saving') : t('legal:acceptContinue')}
        </Button>
      </div>
    </div>
  );
}
