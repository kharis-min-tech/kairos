// @kairos/api - Email Sender Helper (Task 18.2)
// Wraps SES v2 SendEmail for all transactional emails.
// Uses code-based templates from email-templates.ts.
// Sender address from environment variable.
//
// **Requirements: 23.1-23.6**

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createLogger } from '@kairos/utils';
import {
  welcomeEmail,
  donationReceiptEmail,
  formConfirmationEmail,
  soulAssignmentEmail,
  followUpReminderEmail,
} from './email-templates';

const logger = createLogger('email-sender');

const ses = new SESv2Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const FROM_ADDRESS = process.env.SES_FROM_ADDRESS || 'noreply@kairos.church';

/** Low-level send via SES v2 */
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: text, Charset: 'UTF-8' },
            },
          },
        },
      })
    );
    logger.info('Email sent', { to, subject });
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error });
    // Don't throw — email failures should not break the main flow
  }
}

/** Send welcome email on member approval */
export async function sendWelcomeEmail(params: {
  email: string;
  firstName: string;
  branchName: string;
}): Promise<void> {
  const template = welcomeEmail({ firstName: params.firstName, branchName: params.branchName });
  await sendEmail(params.email, template.subject, template.html, template.text);
}

/** Send donation receipt on successful payment */
export async function sendDonationReceiptEmail(params: {
  email: string;
  firstName: string;
  amount: string;
  purpose: string;
  date: string;
  paymentMethod: string;
  referenceId: string;
}): Promise<void> {
  const template = donationReceiptEmail({
    firstName: params.firstName,
    amount: params.amount,
    purpose: params.purpose,
    date: params.date,
    paymentMethod: params.paymentMethod,
    referenceId: params.referenceId,
  });
  await sendEmail(params.email, template.subject, template.html, template.text);
}

/** Send form submission confirmation */
export async function sendFormConfirmationEmail(params: {
  email: string;
  firstName: string;
  formName: string;
  submittedAt: string;
}): Promise<void> {
  const template = formConfirmationEmail({
    firstName: params.firstName,
    formName: params.formName,
    submittedAt: params.submittedAt,
  });
  await sendEmail(params.email, template.subject, template.html, template.text);
}

/** Send soul assignment notification */
export async function sendSoulAssignmentEmail(params: {
  email: string;
  firstName: string;
  soulName: string;
  soulPhone: string;
  capturedDate: string;
}): Promise<void> {
  const template = soulAssignmentEmail({
    firstName: params.firstName,
    soulName: params.soulName,
    soulPhone: params.soulPhone,
    capturedDate: params.capturedDate,
  });
  await sendEmail(params.email, template.subject, template.html, template.text);
}

/** Send follow-up reminder */
export async function sendFollowUpReminderEmail(params: {
  email: string;
  firstName: string;
  soulName: string;
  daysSinceLastContact: number;
}): Promise<void> {
  const template = followUpReminderEmail({
    firstName: params.firstName,
    soulName: params.soulName,
    daysSinceLastContact: params.daysSinceLastContact,
  });
  await sendEmail(params.email, template.subject, template.html, template.text);
}
