import nodemailer from 'nodemailer';
import { logger } from './logger';

const mailerLogger = logger;

async function createTransport() {
  // Use Ethereal for local dev — logs preview URL to console
  const testAccount = await nodemailer.createTestAccount();
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

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  memberName: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: '"Kharis Church" <no-reply@kharis.church>',
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
