import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Kharis Church',
  description: 'Terms of use for Kairos, the Kharis Church administration platform.',
};

const TERMS_VERSION = '2026-07-v1';
const TERMS_EFFECTIVE_DATE = '23 July 2026';

export default function TermsPage() {
  return (
    <article className="space-y-8 text-[15px] leading-relaxed text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5D3FD3]">
          Legal
        </p>
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
        <p>
          These terms are governed by the law of England and Wales. Any
          dispute arising from them will be subject to the exclusive
          jurisdiction of the courts of England and Wales.
        </p>
      </section>

      <Section title="1. Your account">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Kairos accounts are for individual members of Kharis Church. You
            must give accurate information when you sign up and keep it up
            to date on your profile.
          </li>
          <li>
            You are responsible for keeping your password confidential. Do
            not share your account with anyone else. If you think someone
            else has accessed your account, tell us immediately.
          </li>
          <li>
            You must be at least 16 to create your own Kairos account. If
            you are younger, a parent or guardian must complete Kairos
            forms on your behalf.
          </li>
        </ul>
      </Section>

      <Section title="2. Acceptable use">
        <p>
          You agree to use Kairos only for legitimate church-related purposes.
          In particular, you must not:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Use Kairos to send spam, harass any member, or share content
            that is unlawful, abusive, harmful or discriminatory
          </li>
          <li>
            Try to access accounts, records, or areas of Kairos that you
            have not been granted access to
          </li>
          <li>
            Interfere with the operation of Kairos, attempt to circumvent
            its security, or use automated scraping tools against it
          </li>
          <li>
            Copy, redistribute, or make commercial use of information you
            can only see because you are a Kharis Church member (for
            example, other members&rsquo; contact details)
          </li>
          <li>
            Impersonate anyone else or submit information about someone
            else without their permission
          </li>
        </ul>
      </Section>

      <Section title="3. Leaders and administrators">
        <p>
          Fellowship leaders, department leaders and branch administrators
          have additional responsibilities inside Kairos. If you hold one of
          these roles you agree to:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Use member data only for the pastoral, safeguarding and
            administrative purposes of the church
          </li>
          <li>
            Follow Kharis Church&rsquo;s safeguarding policy when recording,
            escalating or sharing safeguarding information
          </li>
          <li>
            Complete any training the church asks of role-holders before
            exercising elevated permissions
          </li>
        </ul>
        <p>
          Leadership access can be revoked at any time by the branch
          administrator or by Kharis Church leadership.
        </p>
      </Section>

      <Section title="4. Your data and privacy">
        <p>
          Our{' '}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            Privacy Notice
          </Link>{' '}
          explains what personal data we collect, why we collect it, who
          it is shared with, how long we keep it, and how you can exercise
          your rights over it. By using Kairos you confirm you have read
          the Privacy Notice.
        </p>
      </Section>

      <Section title="5. Content you submit">
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

      <Section title="6. Availability">
        <p>
          We work to keep Kairos available and reliable, but we do not
          guarantee that it will be uninterrupted or error-free. We may
          need to take Kairos offline for maintenance from time to time,
          and third-party outages (for example at our hosting or email
          providers) may affect availability. We are not liable for losses
          caused by short-term unavailability.
        </p>
      </Section>

      <Section title="7. Suspension and termination">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            You may close your account at any time by contacting a leader
            or emailing{' '}
            <a
              href="mailto:privacy@kharis.org"
              className="font-medium text-[#5D3FD3] hover:underline"
            >
              privacy@kharis.org
            </a>
            .
          </li>
          <li>
            We may suspend or close your account if you materially breach
            these terms, if you leave the church, or if your continued
            access would pose a safeguarding risk. Where possible we will
            explain the reason.
          </li>
          <li>
            When your account is closed we retain and delete data as
            described in the Privacy Notice.
          </li>
        </ul>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          The Kairos platform, its design and its source code are the
          property of Kharis Church or its licensors. Your account gives
          you a personal, non-transferable right to use Kairos while you
          are a member; it does not transfer any ownership.
        </p>
      </Section>

      <Section title="9. Warranties and liability">
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

      <Section title="10. Changes to these terms">
        <p>
          When we make a material change to these terms we will bump their
          version and ask you to review and accept them the next time you
          sign in. Minor typo-level changes may be made without prompting.
          If you do not accept a material change, you can close your
          account.
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
          This document is an initial draft. It has not yet been reviewed by
          Kharis Church leadership or a legal professional. Please treat it
          as a starting point rather than a settled policy.
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
