// @kairos/api - Email Templates (Task 18.1)
// Code-based email templates stored in version control.
// Templates: welcome, donation receipt, form confirmation, soul assignment, follow-up reminder.
// All templates use simple HTML with inline styles for email client compatibility.
//
// **Requirements: 23.7**

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(params: {
  firstName: string;
  branchName: string;
}): EmailTemplate {
  const { firstName, branchName } = params;
  return {
    subject: 'Welcome to Kairos — Your membership has been approved',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#7C3AED;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Welcome to Kairos</h1>
        </div>
        <div style="padding:24px;border:1px solid #D1D5DB;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#111827;font-size:16px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:16px;">Your membership at <strong>${branchName}</strong> has been approved. You now have full access to the Kairos platform.</p>
          <p style="color:#374151;font-size:16px;">You can now:</p>
          <ul style="color:#374151;font-size:16px;">
            <li>View and update your profile</li>
            <li>Track your attendance and donations</li>
            <li>Join departments and fellowships</li>
            <li>Submit forms and requests</li>
          </ul>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">— The Kairos Team</p>
        </div>
      </div>
    `,
    text: `Welcome to Kairos\n\nHi ${firstName},\n\nYour membership at ${branchName} has been approved. You now have full access to the Kairos platform.\n\n— The Kairos Team`,
  };
}

export function donationReceiptEmail(params: {
  firstName: string;
  amount: string;
  purpose: string;
  date: string;
  paymentMethod: string;
  referenceId: string;
}): EmailTemplate {
  const { firstName, amount, purpose, date, paymentMethod, referenceId } = params;
  return {
    subject: `Kairos — Donation Receipt (£${amount})`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#7C3AED;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Donation Receipt</h1>
        </div>
        <div style="padding:24px;border:1px solid #D1D5DB;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#111827;font-size:16px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:16px;">Thank you for your generous donation. Here are the details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#6B7280;">Amount</td><td style="padding:8px;color:#111827;font-weight:600;">£${amount}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Purpose</td><td style="padding:8px;color:#111827;">${purpose}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Date</td><td style="padding:8px;color:#111827;">${date}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Payment Method</td><td style="padding:8px;color:#111827;">${paymentMethod}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Reference</td><td style="padding:8px;color:#111827;">${referenceId}</td></tr>
          </table>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">— The Kairos Team</p>
        </div>
      </div>
    `,
    text: `Donation Receipt\n\nHi ${firstName},\n\nThank you for your donation.\n\nAmount: £${amount}\nPurpose: ${purpose}\nDate: ${date}\nPayment Method: ${paymentMethod}\nReference: ${referenceId}\n\n— The Kairos Team`,
  };
}

export function formConfirmationEmail(params: {
  firstName: string;
  formName: string;
  submittedAt: string;
}): EmailTemplate {
  const { firstName, formName, submittedAt } = params;
  return {
    subject: `Kairos — Form Submission Confirmed: ${formName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#7C3AED;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Form Submission Confirmed</h1>
        </div>
        <div style="padding:24px;border:1px solid #D1D5DB;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#111827;font-size:16px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:16px;">Your submission for <strong>${formName}</strong> has been received on ${submittedAt}.</p>
          <p style="color:#374151;font-size:16px;">If you have any questions, please contact your branch administrator.</p>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">— The Kairos Team</p>
        </div>
      </div>
    `,
    text: `Form Submission Confirmed\n\nHi ${firstName},\n\nYour submission for ${formName} has been received on ${submittedAt}.\n\n— The Kairos Team`,
  };
}

export function soulAssignmentEmail(params: {
  firstName: string;
  soulName: string;
  soulPhone: string;
  capturedDate: string;
}): EmailTemplate {
  const { firstName, soulName, soulPhone, capturedDate } = params;
  return {
    subject: `Kairos — New Soul Assigned: ${soulName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#7C3AED;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">New Soul Assigned</h1>
        </div>
        <div style="padding:24px;border:1px solid #D1D5DB;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#111827;font-size:16px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:16px;">A new soul has been assigned to you for follow-up:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#6B7280;">Name</td><td style="padding:8px;color:#111827;font-weight:600;">${soulName}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Phone</td><td style="padding:8px;color:#111827;">${soulPhone}</td></tr>
            <tr><td style="padding:8px;color:#6B7280;">Captured</td><td style="padding:8px;color:#111827;">${capturedDate}</td></tr>
          </table>
          <p style="color:#374151;font-size:16px;">Please reach out within 2-3 days to begin the follow-up process.</p>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">— The Kairos Team</p>
        </div>
      </div>
    `,
    text: `New Soul Assigned\n\nHi ${firstName},\n\nA new soul has been assigned to you:\n\nName: ${soulName}\nPhone: ${soulPhone}\nCaptured: ${capturedDate}\n\nPlease reach out within 2-3 days.\n\n— The Kairos Team`,
  };
}

export function followUpReminderEmail(params: {
  firstName: string;
  soulName: string;
  daysSinceLastContact: number;
}): EmailTemplate {
  const { firstName, soulName, daysSinceLastContact } = params;
  return {
    subject: `Kairos — Follow-up Reminder: ${soulName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#D97706;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Follow-up Reminder</h1>
        </div>
        <div style="padding:24px;border:1px solid #D1D5DB;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#111827;font-size:16px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:16px;"><strong>${soulName}</strong> has not been contacted in <strong>${daysSinceLastContact} days</strong>.</p>
          <p style="color:#374151;font-size:16px;">Please log in to Kairos and record your next follow-up.</p>
          <p style="color:#6B7280;font-size:14px;margin-top:24px;">— The Kairos Team</p>
        </div>
      </div>
    `,
    text: `Follow-up Reminder\n\nHi ${firstName},\n\n${soulName} has not been contacted in ${daysSinceLastContact} days.\n\nPlease log in to Kairos and record your next follow-up.\n\n— The Kairos Team`,
  };
}
