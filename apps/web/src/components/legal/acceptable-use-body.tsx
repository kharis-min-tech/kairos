'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatEffectiveDate } from '@/components/legal/effective-date';
import { TranslationNotice } from '@/components/legal/translation-notice';

export const AUP_VERSION = '2026-07-v1';
export const AUP_EFFECTIVE_DATE = '2026-07-28';

/**
 * The Acceptable Use Policy body, rendered as an <article>. Consumed by both
 * the standalone /legal/acceptable-use page and the /accept-policies gate.
 * Kept as a body component (no page-level chrome) so it can be embedded in a
 * scrollable panel above an acceptance checkbox.
 */
export function AcceptableUseBody() {  const { t, i18n } = useTranslation(['legalAcceptableUse', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <TranslationNotice />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalAcceptableUse:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t('legalAcceptableUse:acceptableUsePolicy')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('legalAcceptableUse:effectiveVersion', { date: formatEffectiveDate(AUP_EFFECTIVE_DATE, i18n.language), version: AUP_VERSION })}
        </p>
      </header>

      <section className="space-y-3">
        <p>{t('legalAcceptableUse:intro')}</p>
        <p>
          {t('legalAcceptableUse:ifYouAreEverUnsure')}{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyKharisOrg')}</a>
          .
        </p>
      </section>

      <Section title={t('legalAcceptableUse:whoThisPolicyAppliesTo')}>
        <p>{t('legalAcceptableUse:appliesToEveryPerson')}</p>
      </Section>

      <Section title={t('legalAcceptableUse:yourAccountIsYoursAlone')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:doNotShareYourKairosPassword')}</li>
          <li>{t('legalAcceptableUse:doNotSignInWithSomeoneElses')}</li>
          <li>{t('legalAcceptableUse:chooseAPasswordYouDoNotUse')}</li>
          <li>{t('legalAcceptableUse:lockOrSignOutOfKairos')}</li>
          <li>
            {t('legalAcceptableUse:youAreResponsibleForEverything')}{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:privacyKharisOrg')}</a>
            .
          </li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:handlingOtherPeopleSData')}>
        <p>{t('legalAcceptableUse:kairosMayShowYouPersonalInformation')}</p>
        <p>{t('legalAcceptableUse:youMustNot')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:useMemberDetailsYouSeeIn')}</li>
          <li>{t('legalAcceptableUse:downloadScreenshotPrintForwardOrCopy')}</li>
          <li>{t('legalAcceptableUse:shareMemberDataWithAnyoneOutside')}</li>
          <li>{t('legalAcceptableUse:discussPersonalDetailsOfIndividualMembers')}</li>
          <li>{t('legalAcceptableUse:tryToLookAtDataYou')}</li>
        </ul>
        <p>{t('legalAcceptableUse:specialCareAppliesToSafeguardingNotes')}</p>
      </Section>

      <Section title={t('legalAcceptableUse:behaviourInsideThePlatform')}>
        <p>{t('legalAcceptableUse:kairosExistsToBuildUpTheChurch')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:harassBullyInsultOrDiscriminateAgainst')}</li>
          <li>{t('legalAcceptableUse:useProfanityObsceneLanguageOrContent')}</li>
          <li>{t('legalAcceptableUse:uploadSexuallyExplicitViolentHatefulOr')}</li>
          <li>{t('legalAcceptableUse:impersonateAnotherPersonOrMisrepresentYour')}</li>
          <li>{t('legalAcceptableUse:useKairosForPersonalBusinessGambling')}</li>
          <li>{t('legalAcceptableUse:makeCommitmentsInTheNameOf')}</li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:keepingThePlatformSecure')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:doNotAttemptToBypassDisable')}</li>
          <li>{t('legalAcceptableUse:doNotAttemptToReverseEngineer')}</li>
          <li>{t('legalAcceptableUse:doNotUploadAnythingYouKnow')}</li>
          <li>{t('legalAcceptableUse:doNotConnectYourAccountToThirdParty')}</li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:monitoring')}>
        <p>
          {t('legalAcceptableUse:toKeepKairosSafeWeMonitor')}{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyNotice')}</Link>
          {t('legalAcceptableUse:theUkDataProtectionActSuffix')}
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:reportingConcerns')}>
        <p>
          {t('legalAcceptableUse:ifYouNoticeMisuse')}{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyKharisOrg')}</a>
          {t('legalAcceptableUse:weTreatReportsInConfidence')}
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:consequencesOfBreakingThisPolicy')}>
        <p>{t('legalAcceptableUse:ifYouBreakThisPolicyWe')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:suspendOrWithdrawYourAccessTo')}</li>
          <li>{t('legalAcceptableUse:removeAnyLeadershipOrAdministrativeRole')}</li>
          <li>{t('legalAcceptableUse:followUpThroughPastoralProcesses')}</li>
          <li>{t('legalAcceptableUse:reportSeriousMisuseToTheIco')}</li>
        </ul>
        <p>{t('legalAcceptableUse:someBreachesParticularlyOnesThatInvolve')}</p>
      </Section>

      <Section title={t('legalAcceptableUse:relatedDocuments')}>
        <p>{t('legalAcceptableUse:pleaseReadThisPolicyAlongside')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            {t('legalAcceptableUse:ourLower')}{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:privacyNotice')}</Link>{' '}
            {t('legalAcceptableUse:setsOutHowTheChurchHandlesData')}
          </li>
          <li>
            {t('legalAcceptableUse:ourLower')}{' '}
            <Link
              href="/legal/terms"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:termsAndConditions')}</Link>{' '}
            {t('legalAcceptableUse:isTheAgreementThatGoverns')}
          </li>
          <li>
            {t('legalAcceptableUse:ifYouHoldAnAdministrativeRole')}{' '}
            <Link
              href="/legal/confidentiality"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:confidentialityUndertaking')}</Link>
            .
          </li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:changesToThisPolicy')}>
        <p>{t('legalAcceptableUse:weMayUpdateThisPolicyFrom')}</p>
      </Section>

      <Section title={t('legalAcceptableUse:contact')}>
        <p>
          Kharis Church:{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyKharisOrg')}</a>
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">{t('legalAcceptableUse:draftForReview')}</p>
        <p className="mt-1">{t('legalAcceptableUse:thisDocumentIsAnInitialDraft')}</p>
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
