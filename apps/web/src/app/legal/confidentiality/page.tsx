import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confidentiality & Data Handling Undertaking — Kharis Church',
  description:
    'Written undertaking required from anyone granted a leadership or administrative role in Kairos.',
};

const CONFIDENTIALITY_VERSION = '2026-07-v1';
const CONFIDENTIALITY_EFFECTIVE_DATE = '28 July 2026';

export default function ConfidentialityPage() {
  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">
          Legal
        </p>
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
          <strong>Kharis Ministries / Kharis Church</strong> (&ldquo;the
          church&rdquo;) and any person who is granted a leadership or
          administrative role inside Kairos, the church&rsquo;s internal
          platform. It exists because those roles give you access to personal
          information about other members that ordinary members do not see, and
          the law requires the church to make clear, in writing, the
          responsibilities that come with that access.
        </p>
        <p>
          You are asked to accept this undertaking the first time you sign in
          after being granted a covered role, and again whenever this document
          is materially updated. Your role will not activate until you accept.
        </p>
      </section>

      <Section title="1. Roles this undertaking applies to">
        <p>You must accept this undertaking if you hold any of the following:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Branch Administrator</strong> (BranchAdmin) &mdash; full
            administrative view of a branch.
          </li>
          <li>
            <strong>Branch Data Administrator</strong> (BranchDataAdmin) &mdash;
            read/write access to member records for a branch.
          </li>
          <li>
            <strong>Fellowship Leader</strong> or Co-Leader &mdash; access to
            personal details of the members of your fellowship.
          </li>
          <li>
            <strong>Department Leader</strong> or Deputy &mdash; access to
            personal details of the members of your department, including
            uniform sizes and rota assignments.
          </li>
          <li>
            Any additional privileged role the church introduces in future that
            gives access to personal data of others.
          </li>
        </ul>
      </Section>

      <Section title="2. Legal framework">
        <p>
          The church is the <strong>data controller</strong> for personal data
          held in Kairos. This undertaking is the written authority required by
          Article 32(4) of the UK GDPR, which says that any person acting under
          the authority of a data controller who has access to personal data
          must not process it except on instructions from the controller.
        </p>
        <p>Related obligations sit under:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the UK General Data Protection Regulation (UK GDPR);</li>
          <li>the UK Data Protection Act 2018;</li>
          <li>the Computer Misuse Act 1990;</li>
          <li>the safeguarding duties that apply to work with children and vulnerable adults;</li>
          <li>the church&rsquo;s{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Acceptable Use Policy
            </Link>{' '}
            and{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Privacy Notice
            </Link>
            .
          </li>
        </ul>
      </Section>

      <Section title="3. What counts as confidential information">
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
          <li>
            operational information about the church that has not been
            publicly announced &mdash; for example internal decisions, plans,
            or ongoing safeguarding investigations.
          </li>
        </ul>
        <p>
          Information does <em>not</em> stop being confidential simply because
          it is spoken aloud in a meeting, printed on a rota, shown on a
          screen, or shared informally by another leader. Treat it as
          confidential unless the church has publicly released it.
        </p>
      </Section>

      <Section title="4. Your obligations">
        <p>By accepting this undertaking you agree that you will:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Only access confidential information you genuinely need to do the
            role the church has given you. You will not browse member records
            out of curiosity or for any personal reason.
          </li>
          <li>
            Only use confidential information for the pastoral, administrative,
            or safeguarding purposes that go with your role. You will not use
            it for personal, commercial, political, marketing, evangelism, or
            fundraising purposes outside those purposes.
          </li>
          <li>
            Not disclose confidential information to anyone &mdash; including
            your spouse, family, other church members, other churches, or
            external services &mdash; unless (a) the recipient also holds a
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
            >
              Acceptable Use Policy
            </Link>{' '}
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
            >
              privacy@kharis.org
            </a>
            . Early reporting is protective &mdash; delayed reporting is not.
          </li>
          <li>
            Comply promptly with any request from the church to correct,
            restrict, delete, or transfer personal data, and support the
            church in responding to any request from a data subject or a
            regulator.
          </li>
          <li>
            When your role ends &mdash; because you step down, are reassigned,
            or leave the church &mdash; return or securely delete any copies of
            confidential information in your possession and confirm you have
            done so.
          </li>
        </ul>
      </Section>

      <Section title="5. Special care for safeguarding and children">
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

      <Section title="6. Monitoring and audit">
        <p>
          The church logs administrator and leader actions in Kairos &mdash;
          sign-ins, permission changes, exports, and access to sensitive
          screens &mdash; and may review those logs where there is reasonable
          suspicion of a breach of this undertaking. Monitoring is carried out
          in line with our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            Privacy Notice
          </Link>{' '}
          and applicable law.
        </p>
      </Section>

      <Section title="7. Duration">
        <p>
          This undertaking is in force for as long as you hold any covered
          role. The obligation of confidentiality continues after your role
          ends and does not expire, because the underlying personal data
          remains sensitive regardless of whether you can still see it in
          Kairos.
        </p>
      </Section>

      <Section title="8. Consequences of breach">
        <p>
          Breaching this undertaking is serious. The church may:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Suspend or revoke your Kairos role with immediate effect.</li>
          <li>Suspend or terminate your Kairos account entirely.</li>
          <li>
            Follow up through the church&rsquo;s pastoral, disciplinary or
            employment processes as applicable.
          </li>
          <li>
            Report the breach to the UK Information Commissioner&rsquo;s
            Office, the Police, or another regulator where the law requires
            it.
          </li>
          <li>
            Pursue any civil claim available to it, including damages for
            losses caused by the breach.
          </li>
        </ul>
        <p>
          You may also incur personal liability under the UK Data Protection
          Act 2018 (which makes it an offence to knowingly or recklessly
          obtain, disclose or retain personal data without the
          controller&rsquo;s consent) and the Computer Misuse Act 1990.
        </p>
      </Section>

      <Section title="9. Confirmation">
        <p>By accepting this undertaking you confirm that:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            you have read and understood this document, the{' '}
            <Link
              href="/legal/acceptable-use"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Acceptable Use Policy
            </Link>
            , and the{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Privacy Notice
            </Link>
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

      <Section title="10. Contact">
        <p>
          Questions about this undertaking can be sent to{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            privacy@kharis.org
          </a>
          .
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">Draft for review</p>
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
