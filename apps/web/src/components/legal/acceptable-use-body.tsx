import Link from 'next/link';

export const AUP_VERSION = '2026-07-v1';
export const AUP_EFFECTIVE_DATE = '28 July 2026';

/**
 * The Acceptable Use Policy body, rendered as an <article>. Consumed by both
 * the standalone /legal/acceptable-use page and the /accept-policies gate.
 * Kept as a body component (no page-level chrome) so it can be embedded in a
 * scrollable panel above an acceptance checkbox.
 */
export function AcceptableUseBody() {
  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Acceptable Use Policy</h1>
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
          >
            privacy@kharis.org
          </a>
          .
        </p>
      </section>

      <Section title="1. Who this policy applies to">
        <p>
          This policy applies to every person who signs into Kairos &mdash;
          members of Kharis Church, fellowship and department leaders, branch
          administrators, and any volunteer or member of staff who has been
          granted access. By signing in you confirm you have read and will
          follow this policy.
        </p>
      </Section>

      <Section title="2. Your account is yours alone">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Do not share your Kairos password with anyone, including your
            spouse, children, or a leader. If a leader needs information, they
            have their own account.
          </li>
          <li>
            Do not sign in with someone else&rsquo;s account, and do not ask
            anyone to sign in with yours.
          </li>
          <li>
            Choose a password you do not use anywhere else, and where offered,
            turn on multi-factor authentication (MFA).
          </li>
          <li>
            Lock or sign out of Kairos when you leave a shared device
            unattended.
          </li>
          <li>
            You are responsible for everything done under your account. If you
            believe someone has used your account without your permission, tell
            us at once at{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              privacy@kharis.org
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="3. Handling other people's data">
        <p>
          Kairos may show you personal information about other members &mdash;
          for example the phone number of someone in your fellowship, a
          new-believer&rsquo;s discipleship notes, or a child&rsquo;s emergency
          contact. That information is entrusted to you for one purpose only:
          to help you serve your role in the church.
        </p>
        <p>You must not:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Use member details you see in Kairos for personal reasons, business
            activity, political campaigning, or evangelism outside the flow of
            your ministry role.
          </li>
          <li>
            Download, screenshot, print, forward, or copy member data to any
            personal device, personal email account, or personal spreadsheet,
            unless a leader has specifically asked you to as part of your role
            and you delete the copy when you are done.
          </li>
          <li>
            Share member data with anyone outside Kharis Church &mdash;
            including family, friends, other churches, or external services
            &mdash; without written approval from a Branch Administrator or the
            Data Protection contact.
          </li>
          <li>
            Discuss personal details of individual members outside meetings
            where that discussion is genuinely necessary for their pastoral
            care.
          </li>
          <li>
            Try to look at data you have no legitimate reason to access, even
            if the system technically allows it. If something you can see feels
            like more than you need, report it and we will fix the permissions.
          </li>
        </ul>
        <p>
          Special care applies to safeguarding notes, information about
          children, health information, and information about someone&rsquo;s
          personal or family circumstances. Treat these with the highest level
          of confidentiality.
        </p>
      </Section>

      <Section title="4. Behaviour inside the platform">
        <p>
          Kairos exists to build up the church family. When you interact with
          other members through Kairos &mdash; for example messaging a
          fellowship, updating notes about a follow-up, or posting an
          announcement &mdash; you must not:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Harass, bully, insult or discriminate against anyone.</li>
          <li>
            Use profanity, obscene language, or content that would embarrass or
            harm anyone if it were shared.
          </li>
          <li>
            Upload sexually explicit, violent, hateful or illegal material of
            any kind.
          </li>
          <li>
            Impersonate another person or misrepresent your role in the church.
          </li>
          <li>
            Use Kairos for personal business, gambling, political campaigning
            or paid promotion.
          </li>
          <li>
            Make commitments in the name of Kharis Church unless you have been
            authorised to do so.
          </li>
        </ul>
      </Section>

      <Section title="5. Keeping the platform secure">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Do not attempt to bypass, disable or interfere with any security
            control in Kairos, including permission checks, rate limits, or
            audit logging.
          </li>
          <li>
            Do not attempt to reverse-engineer, scrape, or automate Kairos in
            ways that were not intended, or run software against it that we
            have not published.
          </li>
          <li>
            Do not upload anything you know or suspect contains malware, or any
            file whose purpose is to damage, disrupt or gain unauthorised
            access to Kairos or any device connecting to it.
          </li>
          <li>
            Do not connect your Kairos account to third-party services (browser
            extensions, integrations, bots) unless we have listed that
            integration as supported.
          </li>
        </ul>
      </Section>

      <Section title="6. Monitoring">
        <p>
          To keep Kairos safe and available, we monitor how it is used. We keep
          audit logs of sign-ins, permission changes, and administrator
          actions. If we have reason to suspect a breach of this policy or of
          the law, a Branch Administrator or an appointed leader may review
          those logs. Any monitoring is carried out in line with our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            Privacy Notice
          </Link>
          , the UK Data Protection Act 2018, and the UK GDPR.
        </p>
      </Section>

      <Section title="7. Reporting concerns">
        <p>
          If you notice something that looks like misuse of Kairos &mdash; for
          example another user sharing member information inappropriately, a
          screen you can see that you don&rsquo;t think you should, or an
          apparent security weakness &mdash; please report it promptly to your
          fellowship or department leader, to a Branch Administrator, or
          directly to us at{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            privacy@kharis.org
          </a>
          . We treat reports in confidence and will not penalise anyone for
          raising a concern in good faith.
        </p>
      </Section>

      <Section title="8. Consequences of breaking this policy">
        <p>If you break this policy, we may:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Suspend or withdraw your access to Kairos, or to specific parts of
            it.
          </li>
          <li>
            Remove any leadership or administrative role you hold within the
            platform.
          </li>
          <li>
            Follow up through the church&rsquo;s pastoral and disciplinary
            processes.
          </li>
          <li>
            Report serious misuse to the UK Information Commissioner&rsquo;s
            Office, the Police, or another regulator where the law requires it.
          </li>
        </ul>
        <p>
          Some breaches &mdash; particularly ones that involve the personal
          data of others &mdash; may also amount to offences under the UK Data
          Protection Act 2018 or the Computer Misuse Act 1990, for which you
          could be personally liable.
        </p>
      </Section>

      <Section title="9. Related documents">
        <p>Please read this policy alongside:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            our{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Privacy Notice
            </Link>{' '}
            &mdash; how the church handles your personal data;
          </li>
          <li>
            our{' '}
            <Link
              href="/legal/terms"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              Terms &amp; Conditions
            </Link>{' '}
            &mdash; the agreement that governs your use of Kairos; and
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

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy from time to time. When we make a material
          change we will bump its version and ask you to review and re-accept
          it the next time you sign in.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Kharis Church &mdash;{' '}
          <a
            href="mailto:privacy@kharis.org"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            privacy@kharis.org
          </a>
        </p>
      </Section>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-[#f8b537]">
        <p className="font-semibold">Draft for review</p>
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
