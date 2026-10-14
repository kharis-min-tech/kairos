'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export const CONFIDENTIALITY_VERSION = '2026-07-v1';
export const CONFIDENTIALITY_EFFECTIVE_DATE = '28 July 2026';

/**
 * The Confidentiality & Data Handling Undertaking body, rendered as an
 * <article>. Consumed by both the standalone /legal/confidentiality page and
 * the /accept-policies gate.
 */
export function ConfidentialityBody() {  const { t } = useTranslation(['legalConfidentiality', 'common']);

  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">{t('legalConfidentiality:legal')}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Confidentiality &amp; Data Handling Undertaking
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective {CONFIDENTIALITY_EFFECTIVE_DATE} · Version{' '}
          {CONFIDENTIALITY_VERSION}
        </p>
      </header>

      <section className="space-y-3">
        <p>
          This undertaking is a written agreement between{' '}
          <strong>{t('legalConfidentiality:kharisMinistriesKharisChurch')}</strong> (&ldquo;the
          church&rdquo;) and any person who is granted a leadership or
          administrative role inside Kairos, the church&rsquo;s internal
          platform. It exists because those roles give you access to personal
          information about other members that ordinary members do not see, and
          the law requires the church to make clear, in writing, the
          responsibilities that come with that access.
        </p>
        <p>{t('legalConfidentiality:youAreAskedToAcceptThis')}</p>
      </section>

      <Section title={t('legalConfidentiality:rolesThisUndertakingAppliesTo')}>
        <p>{t('legalConfidentiality:youMustAcceptThisUndertakingIf')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>{t('legalConfidentiality:branchAdministrator')}</strong> (BranchAdmin) has full
            administrative view of a branch.
          </li>
          <li>
            <strong>{t('legalConfidentiality:branchDataAdministrator')}</strong> (BranchDataAdmin) has
            read/write access to member records for a branch.
          </li>
          <li>
            <strong>{t('legalConfidentiality:fellowshipLeader')}</strong>{t('legalConfidentiality:orCoLeaderHasAccessTo')}</li>
          <li>
            <strong>{t('legalConfidentiality:departmentLeader')}</strong>{t('legalConfidentiality:orDeputyHasAccessToPersonal')}</li>
          <li>{t('legalConfidentiality:anyAdditionalPrivilegedRoleTheChurch')}</li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:legalFramework')}>
        <p>{t('legalConfidentiality:theChurchIsThe')}<strong>{t('legalConfidentiality:dataController')}</strong> for personal data
          held in Kairos. This undertaking is the written authority required by
          Article 32(4) of the UK GDPR, which says that any person acting under
          the authority of a data controller who has access to personal data
          must not process it except on instructions from the controller.
        </p>
        <p>{t('legalConfidentiality:relatedObligationsSitUnder')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the UK General Data Protection Regulation (UK GDPR);</li>
          <li>the UK Data Protection Act 2018;</li>
          <li>the Computer Misuse Act 1990;</li>
          <li>the safeguarding duties that apply to work with children and vulnerable adults;</li>
          <li>
            the church&rsquo;s{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>{' '}
            and{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyNotice')}</Link>
            .
          </li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:whatCountsAsConfidentialInformation')}>
        <p>
          For the purposes of this undertaking, &ldquo;confidential
          information&rdquo; means any information about an identified or
          identifiable person that you see, hear, are told, or otherwise
          receive because of your Kairos role, including but not limited to:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>name, address, email, phone, date of birth, gender;</li>
          <li>emergency contacts and family relationships;</li>
          <li>fellowship or department membership, attendance patterns, and rota assignments;</li>
          <li>new-believer discipleship progress, mentor session notes, and follow-up records;</li>
          <li>
            safeguarding notes, health information, information about a
            child&rsquo;s circumstances, and any pastoral note recorded in
            connection with a member;
          </li>
          <li>form submissions (baptism, testimony, altar-call responses, baby dedication and similar);</li>
          <li>consent records and audit trail;</li>
          <li>any financial information the church may in future hold about members;</li>
          <li>{t('legalConfidentiality:operationalInformationAboutTheChurchThat')}</li>
        </ul>
        <p>{t('legalConfidentiality:informationDoes')}<em>{t('legalConfidentiality:not')}</em>{t('legalConfidentiality:stopBeingConfidentialSimplyBecauseIt')}</p>
      </Section>

      <Section title={t('legalConfidentiality:yourObligations')}>
        <p>{t('legalConfidentiality:byAcceptingThisUndertakingYouAgree')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:onlyAccessConfidentialInformationYouGenuinel')}</li>
          <li>{t('legalConfidentiality:onlyUseConfidentialInformationForThe')}</li>
          <li>
            Not disclose confidential information to anyone (including
            your spouse, family, other church members, other churches, or
            external services) unless (a) the recipient also holds a
            church role that lawfully requires them to see it, or (b) a Branch
            Administrator or an appointed Data Protection contact has given
            written approval.
          </li>
          <li>
            Not download, screenshot, print, forward, copy or export
            confidential information to any personal device, personal email
            account, personal cloud storage, personal spreadsheet, personal
            messaging app, or personal notebook, unless a leader has
            specifically asked you to as part of your role and you delete the
            copy as soon as the task is complete.
          </li>
          <li>
            Only use church-approved devices and connections in the way the{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>{' '}
            describes, and keep those devices patched, password- or
            PIN-protected, and locked when unattended.
          </li>
          <li>
            Report immediately, and no later than 24 hours, any suspected loss
            of confidential information, unauthorised access to your account,
            or breach of this undertaking, to{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyKharisOrg')}</a>
            . Early reporting is protective; delayed reporting is not.
          </li>
          <li>{t('legalConfidentiality:complyPromptlyWithAnyRequestFrom')}</li>
          <li>
            When your role ends, because you step down, are reassigned,
            or leave the church, return or securely delete any copies of
            confidential information in your possession and confirm you have
            done so.
          </li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:specialCareForSafeguardingAndChildren')}>
        <p>
          Information relating to a safeguarding concern, or to a person under
          18, must be handled with the highest level of care. You must not
          discuss such information outside the confidential channels the
          church has established for it, and you must escalate any concern to
          the Designated Safeguarding Lead without delay. Where this
          undertaking and the church&rsquo;s safeguarding policy overlap, the
          safeguarding policy takes precedence.
        </p>
      </Section>

      <Section title={t('legalConfidentiality:monitoringAndAudit')}>
        <p>
          The church logs administrator and leader actions in Kairos (
          sign-ins, permission changes, exports, and access to sensitive
          screens) and may review those logs where there is reasonable
          suspicion of a breach of this undertaking. Monitoring is carried out
          in line with our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalConfidentiality:privacyNotice')}</Link>{' '}
          and applicable law.
        </p>
      </Section>

      <Section title={t('legalConfidentiality:duration')}>
        <p>
          This undertaking is in force for as long as you hold any covered
          role. The obligation of confidentiality continues after your role
          ends and does not expire, because the underlying personal data
          remains sensitive regardless of whether you can still see it in
          Kairos.
        </p>
      </Section>

      <Section title={t('legalConfidentiality:consequencesOfBreach')}>
        <p>{t('legalConfidentiality:breachingThisUndertakingIsSeriousThe')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t('legalConfidentiality:suspendOrRevokeYourKairosRole')}</li>
          <li>{t('legalConfidentiality:suspendOrTerminateYourKairosAccount')}</li>
          <li>
            Follow up through the church&rsquo;s pastoral, disciplinary or
            employment processes as applicable.
          </li>
          <li>
            Report the breach to the UK Information Commissioner&rsquo;s
            Office, the Police, or another regulator where the law requires
            it.
          </li>
          <li>{t('legalConfidentiality:pursueAnyCivilClaimAvailableTo')}</li>
        </ul>
        <p>
          You may also incur personal liability under the UK Data Protection
          Act 2018 (which makes it an offence to knowingly or recklessly
          obtain, disclose or retain personal data without the
          controller&rsquo;s consent) and the Computer Misuse Act 1990.
        </p>
      </Section>

      <Section title={t('legalConfidentiality:confirmation')}>
        <p>{t('legalConfidentiality:byAcceptingThisUndertakingYouConfirm')}</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            you have read and understood this document, the{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:acceptableUsePolicy')}</Link>
            , and the{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >{t('legalConfidentiality:privacyNotice')}</Link>
            ;
          </li>
          <li>you have had the opportunity to ask questions about it;</li>
          <li>you agree, personally, to be bound by the obligations above;</li>
          <li>
            you understand that Kharis Ministries / Kharis Church will keep a
            timestamped record of your acceptance as the evidence required by
            UK GDPR Article 32(4).
          </li>
        </ul>
      </Section>

      <Section title={t('legalConfidentiality:contact')}>
        <p>
          Questions about this undertaking can be sent to{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('legalConfidentiality:privacyKharisOrg')}</a>
          .
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">{t('legalConfidentiality:draftForReview')}</p>
        <p className="mt-1">
          This document is an initial draft written to satisfy UK GDPR Article
          32(4) and to give the church a documented, per-person basis for
          holding leaders to a duty of confidentiality. It has not yet been
          reviewed by Kharis Church leadership or a data-protection
          professional. Please treat it as a starting point rather than a
          settled undertaking.
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
