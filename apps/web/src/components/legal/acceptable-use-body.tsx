'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export const AUP_VERSION = '2026-07-v1';
export const AUP_EFFECTIVE_DATE = '28 July 2026';

/**
 * The Acceptable Use Policy body, rendered as an <article>. Consumed by both
 * the standalone /legal/acceptable-use page and the /accept-policies gate.
 * Kept as a body component (no page-level chrome) so it can be embedded in a
 * scrollable panel above an acceptance checkbox.
 */
export function AcceptableUseBody() {  const { t } = useTranslation(['legalAcceptableUse', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalAcceptableUse:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t('legalAcceptableUse:acceptableUsePolicy')}</h1>
        <p className="text-sm text-muted-foreground">
          Effective {AUP_EFFECTIVE_DATE} · Version {AUP_VERSION}
        </p>
      </header>

      <section className="space-y-3">
        <p>
          Kairos is the internal platform Kharis Church uses to keep in touch
          with its members, run fellowships and departments, and support
          pastoral care. Because Kairos holds real information about real
          people, everyone who signs in agrees to a shared set of rules for how
          they will behave inside the platform. This policy sets out those
          rules.
        </p>
        <p>
          If you are ever unsure whether something you are about to do is
          acceptable, please pause and ask a leader or contact us at{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyKharisOrg')}</a>
          .
        </p>
      </section>

      <Section title={t('legalAcceptableUse:whoThisPolicyAppliesTo')}>
        <p>
          This policy applies to every person who signs into Kairos:
          members of Kharis Church, fellowship and department leaders, branch
          administrators, and any volunteer or member of staff who has been
          granted access. By signing in you confirm you have read and will
          follow this policy.
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:yourAccountIsYoursAlone')}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:doNotShareYourKairosPassword')}</li>
          <li>
            Do not sign in with someone else&rsquo;s account, and do not ask
            anyone to sign in with yours.
          </li>
          <li>
            Choose a password you do not use anywhere else, and where offered,
            turn on multi-factor authentication (MFA).
          </li>
          <li>{t('legalAcceptableUse:lockOrSignOutOfKairos')}</li>
          <li>
            You are responsible for everything done under your account. If you
            believe someone has used your account without your permission, tell
            us at once at{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:privacyKharisOrg')}</a>
            .
          </li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:handlingOtherPeopleSData')}>
        <p>
          Kairos may show you personal information about other members,
          for example the phone number of someone in your fellowship, a
          new-believer&rsquo;s discipleship notes, or a child&rsquo;s emergency
          contact. That information is entrusted to you for one purpose only:
          to help you serve your role in the church.
        </p>
        <p>{t('legalAcceptableUse:youMustNot')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:useMemberDetailsYouSeeIn')}</li>
          <li>{t('legalAcceptableUse:downloadScreenshotPrintForwardOrCopy')}</li>
          <li>{t('legalAcceptableUse:shareMemberDataWithAnyoneOutside')}</li>
          <li>{t('legalAcceptableUse:discussPersonalDetailsOfIndividualMembers')}</li>
          <li>{t('legalAcceptableUse:tryToLookAtDataYou')}</li>
        </ul>
        <p>
          Special care applies to safeguarding notes, information about
          children, health information, and information about someone&rsquo;s
          personal or family circumstances. Treat these with the highest level
          of confidentiality.
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:behaviourInsideThePlatform')}>
        <p>
          Kairos exists to build up the church family. When you interact with
          other members through Kairos (for example messaging a
          fellowship, updating notes about a follow-up, or posting an
          announcement) you must not:
        </p>
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
          <li>
            Do not connect your Kairos account to third-party services (browser
            extensions, integrations, bots) unless we have listed that
            integration as supported.
          </li>
        </ul>
      </Section>

      <Section title={t('legalAcceptableUse:monitoring')}>
        <p>
          To keep Kairos safe and available, we monitor how it is used. We keep
          audit logs of sign-ins, permission changes, and administrator
          actions. If we have reason to suspect a breach of this policy or of
          the law, a Branch Administrator or an appointed leader may review
          those logs. Any monitoring is carried out in line with our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyNotice')}</Link>
          , the UK Data Protection Act 2018, and the UK GDPR.
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:reportingConcerns')}>
        <p>
          If you notice something that looks like misuse of Kairos (for
          example another user sharing member information inappropriately, a
          screen you can see that you don&rsquo;t think you should, or an
          apparent security weakness) please report it promptly to your
          fellowship or department leader, to a Branch Administrator, or
          directly to us at{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalAcceptableUse:privacyKharisOrg')}</a>
          . We treat reports in confidence and will not penalise anyone for
          raising a concern in good faith.
        </p>
      </Section>

      <Section title={t('legalAcceptableUse:consequencesOfBreakingThisPolicy')}>
        <p>{t('legalAcceptableUse:ifYouBreakThisPolicyWe')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalAcceptableUse:suspendOrWithdrawYourAccessTo')}</li>
          <li>{t('legalAcceptableUse:removeAnyLeadershipOrAdministrativeRole')}</li>
          <li>
            Follow up through the church&rsquo;s pastoral and disciplinary
            processes.
          </li>
          <li>
            Report serious misuse to the UK Information Commissioner&rsquo;s
            Office, the Police, or another regulator where the law requires it.
          </li>
        </ul>
        <p>{t('legalAcceptableUse:someBreachesParticularlyOnesThatInvolve')}</p>
      </Section>

      <Section title={t('legalAcceptableUse:relatedDocuments')}>
        <p>{t('legalAcceptableUse:pleaseReadThisPolicyAlongside')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            our{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalAcceptableUse:privacyNotice')}</Link>{' '}
            sets out how the church handles your personal data;
          </li>
          <li>
            our{' '}
            <Link
              href="/legal/terms"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Terms &amp; Conditions
            </Link>{' '}
            is the agreement that governs your use of Kairos; and
          </li>
          <li>
            if you hold or are granted an administrative or leadership role,
            our{' '}
            <Link
              href="/legal/confidentiality"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Confidentiality &amp; Data Handling Undertaking
            </Link>
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
        <p className="mt-1">
          This document is an initial draft, adapted from the existing Kharis
          Ministries Acceptable Use of Assets Policy so that it fits the way
          Kairos is used day to day. It has not yet been reviewed by Kharis
          Church leadership. Please treat it as a starting point rather than a
          settled policy.
        </p>
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
