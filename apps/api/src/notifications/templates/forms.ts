/**
 * Forms category templates. Phase 5 wires:
 *   - submission_received (any form submitted via /forms/[type])
 *
 * Default cadence: digest_daily.
 */

import { renderLayout, escapeHtml } from './_layout';

export interface FormsSubmissionReceivedPayload {
  memberName: string;
  formLabel: string;
  subjectName: string;
  submittedByName: string | null;
  portalUrl: string;
}

export function renderFormsSubmissionReceived(p: FormsSubmissionReceivedPayload) {
  const submitter = p.submittedByName
    ? ` submitted by ${escapeHtml(p.submittedByName)}`
    : '';
  return {
    subject: `New ${p.formLabel} submission: ${p.subjectName}`,
    html: renderLayout({
      heading: `New ${p.formLabel} submission`,
      greeting: p.memberName,
      bodyHtml: `
        <p>A new <strong>${escapeHtml(p.formLabel)}</strong> submission was
           received for <strong>${escapeHtml(p.subjectName)}</strong>${submitter}.</p>
        <p>Review the submission in the portal.</p>
      `,
      cta: { label: 'Open form submission', url: p.portalUrl },
    }),
  };
}

export function digestFormsSubmissionReceived(p: FormsSubmissionReceivedPayload): string {
  return `${p.formLabel}: ${p.subjectName}${p.submittedByName ? ` (by ${p.submittedByName})` : ''}`;
}
