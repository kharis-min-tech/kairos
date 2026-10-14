'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { TranslationNotice } from '@/components/legal/translation-notice';


const TERMS_VERSION = '2026-07-v1';
const TERMS_EFFECTIVE_DATE = '23 July 2026';

export function TermsBody() {  const { t } = useTranslation(['legalTerms', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <TranslationNotice />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalTerms:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t('legalTerms:title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('legalTerms:effectiveVersion', {
            date: TERMS_EFFECTIVE_DATE,
            version: TERMS_VERSION,
          })}
        </p>
      </header>

      <section className="space-y-3">
        <p>{t('legalTerms:intro')}</p>
        <p>{t('legalTerms:theseTermsAreGovernedByThe')}</p>
      </section>

      <Section title={t('legalTerms:yourAccount')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalTerms:kairosAccountsAreForIndividualMembers')}</li>
          <li>{t('legalTerms:youAreResponsibleForKeepingYour')}</li>
          <li>{t('legalTerms:youMustBeAtLeastTo')}</li>
        </ul>
      </Section>

      <Section title={t('legalTerms:acceptableUse')}>
        <p>{t('legalTerms:youAgreeToUseKairosOnly')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalTerms:useKairosToSendSpamHarass')}</li>
          <li>{t('legalTerms:tryToAccessAccountsRecordsOr')}</li>
          <li>{t('legalTerms:interfereWithTheOperationOfKairos')}</li>
          <li>{t('legalTerms:copyRedistributeOrMakeCommercialUse')}</li>
          <li>{t('legalTerms:impersonateAnyoneElseOrSubmitInformation')}</li>
        </ul>
      </Section>

      <Section title={t('legalTerms:leadersAndAdministrators')}>
        <p>{t('legalTerms:fellowshipLeadersDepartmentLeadersAndBranch')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalTerms:useMemberDataOnlyForThe')}</li>
          <li>{t('legalTerms:followTheSafeguardingPolicy')}</li>
          <li>{t('legalTerms:completeAnyTrainingTheChurchAsks')}</li>
        </ul>
        <p>{t('legalTerms:leadershipAccessCanBeRevokedAt')}</p>
      </Section>

      <Section title={t('legalTerms:yourDataAndPrivacy')}>
        <p>
          {t('legalTerms:ourPrivacyNoticePrefix')}{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalTerms:privacyNotice')}</Link>{' '}
          {t('legalTerms:privacyNoticeExplains')}
        </p>
      </Section>

      <Section title={t('legalTerms:contentYouSubmit')}>
        <p>{t('legalTerms:kairosLetsYouSubmitInformation')}</p>
        <p>{t('legalTerms:churchMayUseInformationYouSubmit')}</p>
      </Section>

      <Section title={t('legalTerms:availability')}>
        <p>{t('legalTerms:weWorkToKeepKairosAvailable')}</p>
      </Section>

      <Section title={t('legalTerms:suspensionAndTermination')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            {t('legalTerms:youMayCloseYourAccountPrefix')}{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalTerms:privacyKharisOrg')}</a>
            .
          </li>
          <li>{t('legalTerms:weMaySuspendOrCloseYour')}</li>
          <li>{t('legalTerms:whenYourAccountIsClosedWe')}</li>
        </ul>
      </Section>

      <Section title={t('legalTerms:intellectualProperty')}>
        <p>{t('legalTerms:theKairosPlatformIsTheProperty')}</p>
      </Section>

      <Section title={t('legalTerms:warrantiesAndLiability')}>
        <p>{t('legalTerms:kairosIsProvidedAsIs')}</p>
        <p>{t('legalTerms:subjectToThatOurTotalLiability')}</p>
      </Section>

      <Section title={t('legalTerms:changesToTheseTerms')}>
        <p>{t('legalTerms:whenWeMakeAMaterialChange')}</p>
      </Section>

      <Section title={t('legalTerms:contact')}>
        <p>
          Kharis Church:{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalTerms:privacyKharisOrg')}</a>
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">{t('legalTerms:draftForReview')}</p>
        <p className="mt-1">{t('legalTerms:thisDocumentIsAnInitialDraft')}</p>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
