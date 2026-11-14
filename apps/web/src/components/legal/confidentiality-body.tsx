'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatEffectiveDate } from '@/components/legal/effective-date';
import { TranslationNotice } from '@/components/legal/translation-notice';

export const CONFIDENTIALITY_VERSION = '2026-07-v1';
export const CONFIDENTIALITY_EFFECTIVE_DATE = '2026-07-28';

/**
 * The Confidentiality & Data Handling Undertaking body, rendered as an
 * <article>. Consumed by both the standalone /legal/confidentiality page and
 * the /accept-policies gate.
 */
export function ConfidentialityBody() {  const { t, i18n } = useTranslation(['legalConfidentiality', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <TranslationNotice />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalConfidentiality:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t('legalConfidentiality:title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('legalConfidentiality:effectiveVersion', {
            date: formatEffectiveDate(CONFIDENTIALITY_EFFECTIVE_DATE, i18n.language),
            version: CONFIDENTIALITY_VERSION,
          })}
        </p>
      </header>

      <section className="space-y-3">
        <p>
          {t('legalConfidentiality:thisUndertakingIsAgreementBetween')}{' '}
          <strong>{t('legalConfidentiality:kharisMinistriesKharisChurch')}</strong> {t('legalConfidentiality:andAnyPersonGrantedARole')}
        </p>
        <p>{t('legalConfidentiality:youAreAskedToAcceptThis')}</p>
      </section>

      <Section title={t('legalConfidentiality:rolesThisUndertakingAppliesTo')}>
        <p>{t('legalConfidentiality:youMustAcceptThisUndertakingIf')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>{t('legalConfidentiality:branchAdministrator')}</strong> {t('legalConfidentiality:branchAdminHasFullView')}
          </li>
          <li>
            <strong>{t('legalConfidentiality:branchDataAdministrator')}</strong> {t('legalConfidentiality:branchDataAdminHasReadWrite')}
          </li>
          <li>
            <strong>{t('legalConfidentiality:fellowshipLeader')}</strong>{t('legalConfidentiality:orCoLeaderHasAccessTo')}</li>
          <li>
            <strong>{t('legalConfidentiality:departmentLeader')}</strong>{t('legalConfidentiality:orDeputyHasAccessToPersonal')}</li>
          <li>{t('legalConfidentiality:anyAdditionalPrivilegedRoleTheChurch')}</li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:legalFramework')}>
        <p>{t('legalConfidentiality:theChurchIsThe')}<strong>{t('legalConfidentiality:dataController')}</strong> {t('legalConfidentiality:forPersonalDataHeldInKairos')}
        </p>
        <p>{t('legalConfidentiality:relatedObligationsSitUnder')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:theUkGdpr')}</li>
          <li>{t('legalConfidentiality:theUkDataProtectionAct')}</li>
          <li>{t('legalConfidentiality:theComputerMisuseAct')}</li>
          <li>{t('legalConfidentiality:theSafeguardingDuties')}</li>
          <li>
            {t('legalConfidentiality:theChurchsLower')}{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>{' '}
            {t('legalConfidentiality:andLower')}{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyNotice')}</Link>
            .
          </li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:whatCountsAsConfidentialInformation')}>
        <p>{t('legalConfidentiality:forThePurposesOfThisUndertaking')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:nameAddressEmailPhone')}</li>
          <li>{t('legalConfidentiality:emergencyContactsAndFamily')}</li>
          <li>{t('legalConfidentiality:fellowshipOrDepartmentMembership')}</li>
          <li>{t('legalConfidentiality:newBelieverProgressAndNotes')}</li>
          <li>{t('legalConfidentiality:safeguardingNotesAndHealth')}</li>
          <li>{t('legalConfidentiality:formSubmissionsList')}</li>
          <li>{t('legalConfidentiality:consentRecordsAndAuditTrail')}</li>
          <li>{t('legalConfidentiality:anyFinancialInformation')}</li>
          <li>{t('legalConfidentiality:operationalInformationAboutTheChurchThat')}</li>
        </ul>
        <p>{t('legalConfidentiality:informationDoes')}<em>{t('legalConfidentiality:not')}</em>{t('legalConfidentiality:stopBeingConfidentialSimplyBecauseIt')}</p>
      </Section>

      <Section title={t('legalConfidentiality:yourObligations')}>
        <p>{t('legalConfidentiality:byAcceptingThisUndertakingYouAgree')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:onlyAccessConfidentialInformationYouGenuinel')}</li>
          <li>{t('legalConfidentiality:onlyUseConfidentialInformationForThe')}</li>
          <li>{t('legalConfidentiality:notDiscloseConfidentialInformation')}</li>
          <li>{t('legalConfidentiality:notDownloadOrExport')}</li>
          <li>
            {t('legalConfidentiality:onlyUseChurchApprovedDevices')}{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>{' '}
            {t('legalConfidentiality:describesAndKeepDevicesPatched')}
          </li>
          <li>
            {t('legalConfidentiality:reportImmediatelyAnySuspectedLoss')}{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyKharisOrg')}</a>
            {t('legalConfidentiality:earlyReportingIsProtective')}
          </li>
          <li>{t('legalConfidentiality:complyPromptlyWithAnyRequestFrom')}</li>
          <li>{t('legalConfidentiality:whenYourRoleEnds')}</li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:specialCareForSafeguardingAndChildren')}>
        <p>{t('legalConfidentiality:informationRelatingToSafeguarding')}</p>
      </Section>

      <Section title={t('legalConfidentiality:monitoringAndAudit')}>
        <p>
          {t('legalConfidentiality:theChurchLogsAdministratorActions')}{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalConfidentiality:privacyNotice')}</Link>{' '}
          {t('legalConfidentiality:andApplicableLaw')}
        </p>
      </Section>

      <Section title={t('legalConfidentiality:duration')}>
        <p>{t('legalConfidentiality:thisUndertakingIsInForce')}</p>
      </Section>

      <Section title={t('legalConfidentiality:consequencesOfBreach')}>
        <p>{t('legalConfidentiality:breachingThisUndertakingIsSeriousThe')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:suspendOrRevokeYourKairosRole')}</li>
          <li>{t('legalConfidentiality:suspendOrTerminateYourKairosAccount')}</li>
          <li>{t('legalConfidentiality:followUpThroughChurchProcesses')}</li>
          <li>{t('legalConfidentiality:reportTheBreachToTheIco')}</li>
          <li>{t('legalConfidentiality:pursueAnyCivilClaimAvailableTo')}</li>
        </ul>
        <p>{t('legalConfidentiality:youMayAlsoIncurPersonalLiability')}</p>
      </Section>

      <Section title={t('legalConfidentiality:confirmation')}>
        <p>{t('legalConfidentiality:byAcceptingThisUndertakingYouConfirm')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            {t('legalConfidentiality:youHaveReadAndUnderstood')}{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>
            {t('legalConfidentiality:andTheLower')}{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyNotice')}</Link>
            ;
          </li>
          <li>{t('legalConfidentiality:youHaveHadTheOpportunityToAsk')}</li>
          <li>{t('legalConfidentiality:youAgreePersonallyToBeBound')}</li>
          <li>{t('legalConfidentiality:youUnderstandARecordIsKept')}</li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:contact')}>
        <p>
          {t('legalConfidentiality:questionsCanBeSentTo')}{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalConfidentiality:privacyKharisOrg')}</a>
          .
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">{t('legalConfidentiality:draftForReview')}</p>
        <p className="mt-1">{t('legalConfidentiality:thisDocumentIsAnInitialDraft')}</p>
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
