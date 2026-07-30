'use client';

import { Checkbox } from '@kairos/ui';

/**
 * GDPR / safeguarding disclaimer rendered above every form's submit. The submit
 * button on each form should remain disabled until `acknowledged` is true.
 *
 * The policy text below is the verbatim disclaimer agreed for Kharis Church
 * (2026-06-v1). Bumping the version requires updating BOTH this string AND the
 * CONSENT_POLICY_VERSION constant exported below — old submissions stay tied to
 * the version they were signed under.
 */
export const CONSENT_POLICY_VERSION = '2026-06-v1';

interface DisclaimerConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function DisclaimerConsent({ checked, onChange }: DisclaimerConsentProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="font-semibold text-foreground">Privacy notice</h3>
      <div className="mt-2 space-y-3 text-muted-foreground">
        <p>
          Kharis Church is committed to respecting the privacy and security of your
          personal data. We use the information you provide to be able to contact
          you, conduct home visits where appropriate and to administer and keep you
          informed of church related activities, such as new believers classes. The
          information you provide will be shared with our internal teams for such
          purposes. We securely store this information until it is no longer
          required.
        </p>
        <p>
          Please tick the box below to provide your consent for us using your
          information in this way.
        </p>
        <p>
          To find out more about how we handle your personal data or to{' '}
          <span className="italic">opt out</span> of us using it, please read our
          Privacy Policy at{' '}
          <a
            href="https://kharis.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#5D3FD3] hover:underline"
          >
            kharis.org
          </a>
          .
        </p>
      </div>
      <label className="mt-4 flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={checked}
          onChange={(ev) => onChange(ev.target.checked)}
          aria-describedby="consent-helper"
          required
        />
        <span id="consent-helper" className="text-sm text-foreground">
          I have read the privacy notice above and confirm I have the subject&rsquo;s
          consent to record this information.
        </span>
      </label>
    </div>
  );
}
