import nodemailer from 'nodemailer';
import { logger } from './logger';

const mailerLogger = logger;

async function createTransport() {
  // Use real SMTP if env vars are present; otherwise fall back to Ethereal for local dev
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  mailerLogger.info('Using Ethereal test mailer — set SMTP_HOST/SMTP_USER/SMTP_PASS to use real SMTP');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? '"Kharis Church" <no-reply@kharis.church>';

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  memberName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: 'Reset Your Password — Kharis Church',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6D28D9;">Reset Your Password</h2>
        <p>Hi ${memberName},</p>
        <p>We received a request to reset your Kharis Church account password.
           Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}"
             style="background:#6D28D9;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;color:#6D28D9;">${resetLink}</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not change.
        </p>
      </div>
    `,
  });

  // Log Ethereal preview URL for local dev
  mailerLogger.info('Password reset email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

export async function sendJoinRequestReceivedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `Join Request Received — ${fellowshipName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6D28D9;">Request Received</h2>
        <p>Hi ${memberName},</p>
        <p>We've received your request to join <strong>${fellowshipName}</strong>.</p>
        <p>Our team reviews requests as soon as possible — while we aim to respond within 14 days,
           this is an estimate and not a guarantee; responses may take longer during busy periods.</p>
        <p>We'll be in touch once your request has been reviewed.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  });

  mailerLogger.info('Join request received email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

export async function sendJoinRequestApprovedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `You've been added to ${fellowshipName}`,
    html: `
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
  });

  mailerLogger.info('Join request approved email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

export async function sendJoinRequestRejectedEmail(
  to: string,
  memberName: string,
  fellowshipName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: `Update on your request to join ${fellowshipName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6D28D9;">Request Update</h2>
        <p>Hi ${memberName},</p>
        <p>Thank you for your interest in joining <strong>${fellowshipName}</strong>.
           After review, we're unable to approve your request at this time.</p>
        <p>If you have any questions, please reach out to your branch leadership directly.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  });

  mailerLogger.info('Join request rejected email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

export async function sendAccountApprovedEmail(
  to: string,
  memberName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: 'Your Kharis Church account has been approved',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #059669;">Account Approved!</h2>
        <p>Hi ${memberName},</p>
        <p>Great news — your Kharis Church account has been reviewed and approved by an administrator.</p>
        <p>You can now log in to access your full member portal, view fellowships, meetings, and more.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login"
             style="background:#6D28D9;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">
            Log In Now
          </a>
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  });

  mailerLogger.info('Account approved email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}

export async function sendAccountRejectedEmail(
  to: string,
  memberName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: 'Update on your Kharis Church account request',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #6D28D9;">Account Request Update</h2>
        <p>Hi ${memberName},</p>
        <p>Thank you for registering with the Kharis Church Administration System.</p>
        <p>After review, we were unable to approve your account at this time.
           If you believe this is an error, please contact your branch leadership directly.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#6b7280;">Kharis Church Administration System</p>
      </div>
    `,
  });

  mailerLogger.info('Account rejected email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  });
}
