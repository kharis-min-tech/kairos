import { AwsClient } from 'aws4fetch';
import { logger } from './logger';

/**
 * Mailer secrets are bound once per Worker cold start (via `bindMailerEnv`)
 * or fall back to `process.env` for the Node dev server. The `bindMailerEnv`
 * pattern mirrors `bindDbEnv` in `apps/api/src/db.ts` — module-load must not
 * read env on Workers, because secrets only arrive per-request.
 */
export interface MailerSecrets {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  emailFrom: string;
  frontendUrl: string;
  // Optional SES configuration set. When set, every send tags against this
  // config set so bounce/complaint metrics + suppression are per-environment.
  // Prod uses `kairos-transactional`; staging uses `kairos-staging`.
  // When unset, SES falls back to the identity's default configuration set.
  configurationSetName?: string;
}

let _secrets: MailerSecrets | null = null;
let _awsClient: AwsClient | null = null;

export function bindMailerEnv(secrets: Partial<MailerSecrets>): void {
  _secrets = {
    awsAccessKeyId: secrets.awsAccessKeyId ?? '',
    awsSecretAccessKey: secrets.awsSecretAccessKey ?? '',
    awsRegion: secrets.awsRegion ?? 'eu-west-2',
    emailFrom: secrets.emailFrom ?? '"Kharis Church" <noreply@kharis.org>',
    frontendUrl: secrets.frontendUrl ?? 'http://localhost:3002',
    configurationSetName: secrets.configurationSetName,
  };
  _awsClient = null;
}

function getSecrets(): MailerSecrets {
  if (_secrets) return _secrets;
  if (typeof process !== 'undefined' && process.env) {
    _secrets = {
      awsAccessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? '',
      awsSecretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? '',
      awsRegion: process.env['AWS_REGION'] ?? 'eu-west-2',
      emailFrom: process.env['EMAIL_FROM'] ?? '"Kharis Church" <noreply@kharis.org>',
      frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3002',
      configurationSetName: process.env['SES_CONFIGURATION_SET'] || undefined,
    };
    return _secrets;
  }
  throw new Error('Mailer not configured — call bindMailerEnv() or set AWS_* env vars');
}

function getAwsClient(): AwsClient | null {
  const s = getSecrets();
  if (!s.awsAccessKeyId || !s.awsSecretAccessKey) return null;
  if (_awsClient) return _awsClient;
  _awsClient = new AwsClient({
    accessKeyId: s.awsAccessKeyId,
    secretAccessKey: s.awsSecretAccessKey,
    region: s.awsRegion,
    service: 'ses',
  });
  return _awsClient;
}

/**
 * Send an HTML email via SES v2 (REST). Falls back to log-only when AWS creds
 * are absent so local dev (no SES) still flows through this function.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const s = getSecrets();
  const aws = getAwsClient();

  if (!aws) {
    logger.info('Email (dev mode — AWS creds absent, not sent)', { to, subject });
    return;
  }

  const url = `https://email.${s.awsRegion}.amazonaws.com/v2/email/outbound-emails`;
  const payload: Record<string, unknown> = {
    FromEmailAddress: s.emailFrom,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    },
  };
  if (s.configurationSetName) {
    payload['ConfigurationSetName'] = s.configurationSetName;
  }

  const res = await aws.fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('SES send failed', { status: res.status, body, to, subject });
    throw new Error(`SES send failed (${res.status}): ${body}`);
  }

  logger.info('Email sent', { to, subject, status: res.status });
}

function getFrontendUrl(): string {
  return getSecrets().frontendUrl;
}

/**
 * Send a pre-rendered notification email. The notification system in
 * `apps/api/src/notifications/` resolves recipients + applies preferences
 * upstream — this is the dumb send pipe.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  await sendEmail(to, subject, html);
}

// ── Email change flow ──────────────────────────────────────────

export async function sendEmailChangeConfirmEmail(
  to: string,
  memberName: string,
  confirmLink: string,
): Promise<void> {
  await sendEmail(
    to,
    'Confirm your new email — Kharis Church',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Confirm your new email</h2>
        <p>Hi ${memberName},</p>
        <p>You asked to change the email on your Kharis Church account to this address.
           Click the button below to confirm the change. This link expires in
           <strong>24 hours</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${confirmLink}"
             style="background:#5D3FD3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Confirm new email
          </a>
        </p>
        <p style="word-break:break-all;color:#5D3FD3;font-size:12px;">
          ${confirmLink}
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          If you didn't request this change, ignore this email.
        </p>
      </div>
    `,
  );
}

export async function sendEmailChangedAlertEmail(
  to: string,
  memberName: string,
  newEmail: string,
  undoLink: string,
): Promise<void> {
  await sendEmail(
    to,
    'Your Kharis Church email is being changed',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Email change requested</h2>
        <p>Hi ${memberName},</p>
        <p>Someone (hopefully you) requested to change the email on your Kharis
           Church account to <strong>${newEmail}</strong>.</p>
        <p>If this was you, no action is needed once the new address is
           confirmed.</p>
        <p>If this <strong>wasn't</strong> you, click below to revert the change
           and lock the account. You'll be sent a password reset link.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${undoLink}"
             style="background:#b91c1c;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            This wasn&apos;t me
          </a>
        </p>
        <p style="word-break:break-all;color:#b91c1c;font-size:12px;">
          ${undoLink}
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          Kharis Church Administration System
        </p>
      </div>
    `,
  );
}

// ── Account / Auth emails ──────────────────────────────────────

export async function sendAccountVerificationEmail(
  to: string,
  memberName: string,
  verifyLink: string,
): Promise<void> {
  await sendEmail(
    to,
    'Verify your email — Kharis Church',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Confirm your email address</h2>
        <p>Hi ${memberName},</p>
        <p>Welcome to Kharis Church. Click the button below to confirm your email
           address and complete your registration. This link expires in
           <strong>24 hours</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyLink}"
             style="background:#5D3FD3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Verify email
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;color:#5D3FD3;font-size:12px;">${verifyLink}</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          After you verify, an administrator will review your registration.
          You'll get a second email once your account is approved.
        </p>
      </div>
    `,
  );
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  memberName: string,
): Promise<void> {
  await sendEmail(
    to,
    'Reset Your Password — Kharis Church',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Reset Your Password</h2>
        <p>Hi ${memberName},</p>
        <p>We received a request to reset your Kharis Church account password.
           Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}"
             style="background:#5D3FD3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;color:#5D3FD3;">${resetLink}</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not change.
        </p>
      </div>
    `,
  );
}

export async function sendAccountApprovedEmail(
  to: string,
  memberName: string,
): Promise<void> {
  await sendEmail(
    to,
    'Your Kharis Church account has been approved',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">Account Approved!</h2>
        <p>Hi ${memberName},</p>
        <p>Great news — your Kharis Church account has been reviewed and approved by an administrator.</p>
        <p>You can now log in to access your full member portal, view fellowships, meetings, and more.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${getFrontendUrl()}/login"
             style="background:#5D3FD3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Log In Now
          </a>
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendAccountRejectedEmail(
  to: string,
  memberName: string,
): Promise<void> {
  await sendEmail(
    to,
    'Update on your Kharis Church account request',
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Account Request Update</h2>
        <p>Hi ${memberName},</p>
        <p>Thank you for registering with the Kharis Church Administration System.</p>
        <p>After review, we were unable to approve your account at this time.
           If you believe this is an error, please contact your branch leadership directly.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

// ── Fellowship join request emails ─────────────────────────────

export async function sendJoinRequestReceivedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  await sendEmail(
    to,
    `Join Request Received — ${fellowshipName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Request Received</h2>
        <p>Hi ${memberName},</p>
        <p>We've received your request to join <strong>${fellowshipName}</strong>.</p>
        <p>Our team reviews requests as soon as possible — while we aim to respond within 14 days,
           this is an estimate and not a guarantee; responses may take longer during busy periods.</p>
        <p>We'll be in touch once your request has been reviewed.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendJoinRequestApprovedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  await sendEmail(
    to,
    `You've been added to ${fellowshipName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to ${fellowshipName}!</h2>
        <p>Hi ${memberName},</p>
        <p>Great news — your request to join <strong>${fellowshipName}</strong> has been approved.
           You are now an active member of the fellowship.</p>
        <p>Log in to the Kharis Church portal to view fellowship details, meetings, and more.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendJoinRequestRejectedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  await sendEmail(
    to,
    `Update on your request to join ${fellowshipName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Request Update</h2>
        <p>Hi ${memberName},</p>
        <p>Thank you for your interest in joining <strong>${fellowshipName}</strong>.
           After review, we're unable to approve your request at this time.</p>
        <p>If you have any questions, please reach out to your branch leadership directly.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

// ── New believers / mentoring ──────────────────────────────────

export async function sendMentorAssignedEmail(
  to: string,
  mentorName: string,
  studentName: string,
): Promise<void> {
  await sendEmail(
    to,
    `You've been assigned as a mentor — Kharis Church`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Mentor Assignment</h2>
        <p>Hi ${mentorName},</p>
        <p>You have been assigned as a mentor for <strong>${studentName}</strong> in the New Believers programme.</p>
        <p>Please reach out to them and support them through their journey of faith.</p>
        <p>Log in to the Kharis Church portal to view their enrolment details.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

// ── Department recruitment pipeline emails ─────────────────────

export async function sendInterviewScheduledEmail(
  to: string,
  memberName: string,
  departmentName: string,
  details: { scheduledAt: Date; format: 'in_person' | 'virtual'; location?: string | null },
): Promise<void> {
  const when = details.scheduledAt.toLocaleString('en-GB');
  const formatLabel = details.format === 'virtual' ? 'Virtual' : 'In Person';

  await sendEmail(
    to,
    `Interview scheduled — ${departmentName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #5D3FD3;">Interview Scheduled</h2>
        <p>Hi ${memberName},</p>
        <p>Your interview to join <strong>${departmentName}</strong> has been scheduled.</p>
        <ul style="line-height: 1.8;">
          <li><strong>When:</strong> ${when}</li>
          <li><strong>Format:</strong> ${formatLabel}</li>
          ${details.location ? `<li><strong>Location:</strong> ${details.location}</li>` : ''}
        </ul>
        <p>Please reach out to your branch leadership if you need to reschedule.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendOfferExtendedEmail(
  to: string,
  memberName: string,
  departmentName: string,
  details: { expiresAt: Date | null; probationDays: number; message?: string | null },
): Promise<void> {
  const expiresLabel = details.expiresAt
    ? `This offer expires on <strong>${details.expiresAt.toLocaleDateString('en-GB')}</strong>.`
    : '';

  await sendEmail(
    to,
    `You have an offer to join ${departmentName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">You've been offered a place</h2>
        <p>Hi ${memberName},</p>
        <p>Following your interview, we'd love to have you join <strong>${departmentName}</strong>.</p>
        ${details.message ? `<blockquote style="border-left:4px solid #5D3FD3;padding-left:12px;color:#374151;">${details.message}</blockquote>` : ''}
        <p>If you accept, you will start a <strong>${details.probationDays}-day probation</strong> with the team.</p>
        ${expiresLabel ? `<p>${expiresLabel}</p>` : ''}
        <p>Log in to the Kharis portal to accept or decline the offer.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendProbationStartedEmail(
  to: string,
  memberName: string,
  departmentName: string,
  details: { probationDays: number },
): Promise<void> {
  await sendEmail(
    to,
    `Welcome to ${departmentName} — probation started`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome — probation started</h2>
        <p>Hi ${memberName},</p>
        <p>You're now part of <strong>${departmentName}</strong> on a
           <strong>${details.probationDays}-day probation</strong>.</p>
        <p>Your team lead will check in with you at the end of the probation to confirm your full membership.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}

export async function sendProbationPassedEmail(
  to: string,
  memberName: string,
  departmentName: string,
): Promise<void> {
  await sendEmail(
    to,
    `You're now a full member of ${departmentName}`,
    `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">Probation passed</h2>
        <p>Hi ${memberName},</p>
        <p>Congratulations — you've completed probation and are now a full member of
           <strong>${departmentName}</strong>.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  );
}
