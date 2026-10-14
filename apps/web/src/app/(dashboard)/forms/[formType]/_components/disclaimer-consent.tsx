'use client';

import { Checkbox } from '@kairos/ui';
import { useTranslation } from 'react-i18next';

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

export function DisclaimerConsent({ checked, onChange }: DisclaimerConsentProps) {  const { t } = useTranslation(['forms', 'common']);

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="font-semibold text-foreground">{t('forms:privacyNotice')}</h3>
      <div className="mt-2 space-y-3 text-muted-foreground">
        <p>{t('forms:kharisChurchCommittedRespectingPrivacySecurity')}</p>
        <p>{t('forms:pleaseTickTheBoxBelowTo')}</p>
        <p>
          {t('forms:toFindOutMoreOrTo')}{' '}
          <span className="italic">{t('forms:optOut')}</span>{' '}
          {t('forms:ofUsUsingItReadPolicyAt')}{' '}
          <a
            href="https://kharis.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#5D3FD3] hover:underline"
          >{t('forms:kharisOrg')}</a>
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
