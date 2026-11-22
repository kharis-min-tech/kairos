import { PILOT_REQUIREMENTS_VERSION } from '@kairos/types';
import { isMailerLive, sendNotificationEmail } from '@kairos/utils';
import { renderLayout } from '../notifications/templates/_layout';
import type { SubmitPilotInterestInput } from './schemas';

/** Corroborating detail about the submission, not about the branch. */
export interface SubmissionContext {
  sourceIp: string | null;
  userAgent: string | null;
}

/**
 * Pass a branch's offer to go first on to the people who decide.
 *
 * There is no table behind this. A handful of branches answer a one-off
 * announcement, somebody reads them and picks one, and that is the end of the
 * feature -- so a table, a migration, an admin queue and a status workflow
 * were all machinery for a decision that gets made in an inbox.
 *
 * The consequence, and it is why there is no catch around the send: the email
 * IS the record. Nothing is written first and announced second, so a
 * notification that failed quietly would be a submission that never happened.
 * If the mail does not go, the caller has to hear about it, so they can send
 * it again rather than walk away believing it arrived.
 */
export async function submitPilotInterest(
  input: SubmitPilotInterestInput,
  ctx: SubmissionContext,
): Promise<{ submittedAt: string }> {
  // With no AWS credentials bound, the mailer logs the send at info and
  // returns as though it worked. Everywhere else that is a tolerable
  // degradation because a row was already saved; here it would drop the
  // submission entirely, so it is raised before we start rather than after.
  if (!isMailerLive()) {
    throw new Error(
      'mailer is not configured (AWS credentials absent) -- pilot interest cannot be submitted',
    );
  }

  const submittedAt = new Date();
  await notifyPilotInterest(input, ctx, submittedAt);
  return { submittedAt: submittedAt.toISOString() };
}

/**
 * Where a new submission is announced.
 *
 * The rollout plan turns on hearing back quickly -- the announcement goes out
 * before the app is ready "because nothing else can be arranged until we know
 * which branch is first" -- and a row sitting unread in an admin queue nobody
 * has opened is the same as no row at all. Overridable by env for staging,
 * which should not mail the real inbox.
 */
function notifyAddress(): string {
  return process.env['PILOT_INTEREST_NOTIFY_TO']?.trim() || 'tech@kharis.org';
}

async function notifyPilotInterest(
  input: SubmitPilotInterestInput,
  ctx: SubmissionContext,
  submittedAt: Date,
): Promise<void> {
  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;

  const rows: Array<[string, string]> = [
    ['Name', fullName],
    ['Email', input.email.trim().toLowerCase()],
    ['Branch', input.branchName],
    [
      'Approx members',
      input.approxMembers === undefined ? 'Not given' : String(input.approxMembers),
    ],
    ['Submitted', submittedAt.toISOString()],
    ['Commitments version', PILOT_REQUIREMENTS_VERSION],
    ['Source IP', ctx.sourceIp ?? 'Unknown'],
  ];

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#111827;">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const html = renderLayout({
    heading: 'A branch has put itself forward',
    bodyHtml:
      `<p>${escapeHtml(input.branchName)} offered to run the pilot.</p>` +
      `<table style="border-collapse:collapse;font-size:14px;">${table}</table>`,
    footerLine: 'Sent by iKharis because a pilot interest form was submitted.',
  });

  // Branch then person: the branch is what the plan chooses between, and it
  // is what a second submission from the same branch has to line up with in
  // an inbox. The name is there so a reply does not start by asking who
  // wrote in.
  await sendNotificationEmail(
    notifyAddress(),
    `Pilot interest: ${input.branchName} - ${fullName}`,
    html,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
