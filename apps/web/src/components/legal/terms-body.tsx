'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';


const TERMS_VERSION = '2026-07-v1';
const TERMS_EFFECTIVE_DATE = '23 July 2026';

export function TermsBody() {  const { t } = useTranslation(['legalTerms', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalTerms:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground">
          Effective {TERMS_EFFECTIVE_DATE} · Version {TERMS_VERSION}
        </p>
      </header>

      <section className="space-y-3">
        <p>
          These terms govern your use of Kairos, the internal church
          administration platform of Kharis Church (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;the church&rdquo;). By creating an account
          or using Kairos, you agree to be bound by them. If you do not
          accept them, please do not use Kairos.
        </p>
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
          <li>
            Copy, redistribute, or make commercial use of information you
            can only see because you are a Kharis Church member (for
            example, other members&rsquo; contact details)
          </li>
          <li>{t('legalTerms:impersonateAnyoneElseOrSubmitInformation')}</li>
        </ul>
      </Section>

      <Section title={t('legalTerms:leadersAndAdministrators')}>
        <p>{t('legalTerms:fellowshipLeadersDepartmentLeadersAndBranch')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalTerms:useMemberDataOnlyForThe')}</li>
          <li>
            Follow Kharis Church&rsquo;s safeguarding policy when recording,
            escalating or sharing safeguarding information
          </li>
          <li>{t('legalTerms:completeAnyTrainingTheChurchAsks')}</li>
        </ul>
        <p>{t('legalTerms:leadershipAccessCanBeRevokedAt')}</p>
      </Section>

      <Section title={t('legalTerms:yourDataAndPrivacy')}>
        <p>
          Our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalTerms:privacyNotice')}</Link>{' '}
          explains what personal data we collect, why we collect it, who
          it is shared with, how long we keep it, and how you can exercise
          your rights over it. By using Kairos you confirm you have read
          the Privacy Notice.
        </p>
      </Section>

      <Section title={t('legalTerms:contentYouSubmit')}>
        <p>
          Kairos lets you submit information about yourself and, in some
          cases, on behalf of a family member or a first-time visitor
          (with their permission). You confirm that any information you
          submit is accurate to the best of your knowledge and that you
          have any consent needed from other people whose information you
          include.
        </p>
        <p>
          Kharis Church may use information you submit for the pastoral,
          safeguarding and administrative purposes described in the
          Privacy Notice. Content you submit remains yours; you grant the
          church a licence to use it for those purposes.
        </p>
      </Section>

      <Section title={t('legalTerms:availability')}>
        <p>
          We work to keep Kairos available and reliable, but we do not
          guarantee that it will be uninterrupted or error-free. We may
          need to take Kairos offline for maintenance from time to time,
          and third-party outages (for example at our hosting or email
          providers) may affect availability. We are not liable for losses
          caused by short-term unavailability.
        </p>
      </Section>

      <Section title={t('legalTerms:suspensionAndTermination')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            You may close your account at any time by contacting a leader
            or emailing{' '}
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
        <p>
          The Kairos platform, its design and its source code are the
          property of Kharis Church or its licensors. Your account gives
          you a personal, non-transferable right to use Kairos while you
          are a member; it does not transfer any ownership.
        </p>
      </Section>

      <Section title={t('legalTerms:warrantiesAndLiability')}>
        <p>
          Kairos is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. To the fullest extent allowed by law, Kharis
          Church excludes all implied warranties. Nothing in these terms
          limits our liability for death or personal injury caused by
          negligence, for fraud, or for any liability that cannot be
          excluded under English law.
        </p>
        <p>
          Subject to that, our total liability arising out of your use of
          Kairos is limited to any amounts you have paid us in connection
          with Kairos in the twelve months before the claim arose (which
          for most members will be zero).
        </p>
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
