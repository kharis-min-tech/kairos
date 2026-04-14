// @kairos/api - Email Sender Unit Tests (Task 18.2)
// Tests all transactional email functions: welcome, donation receipt,
// form confirmation, soul assignment, follow-up reminder.
// Verifies SES v2 SendEmailCommand is called with correct parameters.
// Verifies graceful degradation on SES failure (no throw).
//
// **Validates: Requirements 23.1-23.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
}));

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: class {
    send = mockSend;
  },
  SendEmailCommand: class {
    constructor(public params: unknown) {}
  },
}));

vi.mock('@kairos/utils', async () => {
  const actual = await vi.importActual<typeof import('@kairos/utils')>('@kairos/utils');
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

import {
  sendWelcomeEmail,
  sendDonationReceiptEmail,
  sendFormConfirmationEmail,
  sendSoulAssignmentEmail,
  sendFollowUpReminderEmail,
} from '../email-sender';

// ============================================================================
// Helpers
// ============================================================================

const FROM_ADDRESS = 'noreply@kairos.church';

/** Extract the params passed to the SendEmailCommand constructor */
function getSentEmailParams(): Record<string, unknown> {
  const call = mockSend.mock.calls[0]![0];
  return call.params as Record<string, unknown>;
}

// ============================================================================
// Tests
// ============================================================================

describe('email-sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. sendWelcomeEmail
  // --------------------------------------------------------------------------
  describe('sendWelcomeEmail', () => {
    it('should send correct email with member name and branch', async () => {
      await sendWelcomeEmail({
        email: 'john@example.com',
        firstName: 'John',
        branchName: 'London Central',
      });

      expect(mockSend).toHaveBeenCalledOnce();

      const params = getSentEmailParams();
      expect(params).toMatchObject({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: ['john@example.com'] },
      });

      // Verify subject and body contain relevant data
      const content = params.Content as Record<string, unknown>;
      const simple = content.Simple as Record<string, unknown>;
      const subject = simple.Subject as Record<string, unknown>;
      const body = simple.Body as Record<string, unknown>;
      const html = body.Html as Record<string, unknown>;
      const text = body.Text as Record<string, unknown>;

      expect(subject.Data).toContain('Welcome');
      expect(html.Data).toContain('John');
      expect(html.Data).toContain('London Central');
      expect(text.Data).toContain('John');
      expect(text.Data).toContain('London Central');
    });
  });

  // --------------------------------------------------------------------------
  // 2. sendDonationReceiptEmail
  // --------------------------------------------------------------------------
  describe('sendDonationReceiptEmail', () => {
    it('should send receipt with amount, purpose, and date', async () => {
      await sendDonationReceiptEmail({
        email: 'sarah@example.com',
        firstName: 'Sarah',
        amount: '50.00',
        purpose: 'Tithe',
        date: '2025-06-15',
        paymentMethod: 'Card',
        referenceId: 'REF-12345',
      });

      expect(mockSend).toHaveBeenCalledOnce();

      const params = getSentEmailParams();
      expect(params).toMatchObject({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: ['sarah@example.com'] },
      });

      const content = params.Content as Record<string, unknown>;
      const simple = content.Simple as Record<string, unknown>;
      const subject = simple.Subject as Record<string, unknown>;
      const body = simple.Body as Record<string, unknown>;
      const html = body.Html as Record<string, unknown>;
      const text = body.Text as Record<string, unknown>;

      expect(subject.Data).toContain('50.00');
      expect(html.Data).toContain('Sarah');
      expect(html.Data).toContain('50.00');
      expect(html.Data).toContain('Tithe');
      expect(html.Data).toContain('2025-06-15');
      expect(html.Data).toContain('Card');
      expect(html.Data).toContain('REF-12345');
      expect(text.Data).toContain('50.00');
      expect(text.Data).toContain('Tithe');
    });
  });

  // --------------------------------------------------------------------------
  // 3. sendFormConfirmationEmail
  // --------------------------------------------------------------------------
  describe('sendFormConfirmationEmail', () => {
    it('should send confirmation with form name', async () => {
      await sendFormConfirmationEmail({
        email: 'member@example.com',
        firstName: 'Grace',
        formName: 'Baby Dedication',
        submittedAt: '2025-06-15T10:30:00Z',
      });

      expect(mockSend).toHaveBeenCalledOnce();

      const params = getSentEmailParams();
      expect(params).toMatchObject({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: ['member@example.com'] },
      });

      const content = params.Content as Record<string, unknown>;
      const simple = content.Simple as Record<string, unknown>;
      const subject = simple.Subject as Record<string, unknown>;
      const body = simple.Body as Record<string, unknown>;
      const html = body.Html as Record<string, unknown>;

      expect(subject.Data).toContain('Baby Dedication');
      expect(html.Data).toContain('Grace');
      expect(html.Data).toContain('Baby Dedication');
      expect(html.Data).toContain('2025-06-15T10:30:00Z');
    });
  });

  // --------------------------------------------------------------------------
  // 4. sendSoulAssignmentEmail
  // --------------------------------------------------------------------------
  describe('sendSoulAssignmentEmail', () => {
    it('should send assignment with soul details', async () => {
      await sendSoulAssignmentEmail({
        email: 'worker@example.com',
        firstName: 'David',
        soulName: 'James Brown',
        soulPhone: '+447700900001',
        capturedDate: '2025-06-10',
      });

      expect(mockSend).toHaveBeenCalledOnce();

      const params = getSentEmailParams();
      expect(params).toMatchObject({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: ['worker@example.com'] },
      });

      const content = params.Content as Record<string, unknown>;
      const simple = content.Simple as Record<string, unknown>;
      const subject = simple.Subject as Record<string, unknown>;
      const body = simple.Body as Record<string, unknown>;
      const html = body.Html as Record<string, unknown>;
      const text = body.Text as Record<string, unknown>;

      expect(subject.Data).toContain('James Brown');
      expect(html.Data).toContain('David');
      expect(html.Data).toContain('James Brown');
      expect(html.Data).toContain('+447700900001');
      expect(html.Data).toContain('2025-06-10');
      expect(text.Data).toContain('James Brown');
    });
  });

  // --------------------------------------------------------------------------
  // 5. sendFollowUpReminderEmail
  // --------------------------------------------------------------------------
  describe('sendFollowUpReminderEmail', () => {
    it('should send reminder with days count', async () => {
      await sendFollowUpReminderEmail({
        email: 'worker@example.com',
        firstName: 'David',
        soulName: 'James Brown',
        daysSinceLastContact: 5,
      });

      expect(mockSend).toHaveBeenCalledOnce();

      const params = getSentEmailParams();
      expect(params).toMatchObject({
        FromEmailAddress: FROM_ADDRESS,
        Destination: { ToAddresses: ['worker@example.com'] },
      });

      const content = params.Content as Record<string, unknown>;
      const simple = content.Simple as Record<string, unknown>;
      const subject = simple.Subject as Record<string, unknown>;
      const body = simple.Body as Record<string, unknown>;
      const html = body.Html as Record<string, unknown>;
      const text = body.Text as Record<string, unknown>;

      expect(subject.Data).toContain('James Brown');
      expect(html.Data).toContain('David');
      expect(html.Data).toContain('James Brown');
      expect(html.Data).toContain('5 days');
      expect(text.Data).toContain('5 days');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Email failure does not throw (graceful degradation)
  // --------------------------------------------------------------------------
  describe('graceful degradation', () => {
    it('should not throw when SES fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('SES service unavailable'));

      // Should not throw
      await expect(
        sendWelcomeEmail({
          email: 'john@example.com',
          firstName: 'John',
          branchName: 'London Central',
        })
      ).resolves.toBeUndefined();
    });

    it('should not throw when SES fails for donation receipt', async () => {
      mockSend.mockRejectedValueOnce(new Error('SES throttled'));

      await expect(
        sendDonationReceiptEmail({
          email: 'sarah@example.com',
          firstName: 'Sarah',
          amount: '100.00',
          purpose: 'Offering',
          date: '2025-06-15',
          paymentMethod: 'Online',
          referenceId: 'REF-999',
        })
      ).resolves.toBeUndefined();
    });

    it('should not throw when SES fails for follow-up reminder', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        sendFollowUpReminderEmail({
          email: 'worker@example.com',
          firstName: 'David',
          soulName: 'James Brown',
          daysSinceLastContact: 3,
        })
      ).resolves.toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // 7. All emails use correct FROM address
  // --------------------------------------------------------------------------
  describe('FROM address', () => {
    it('should use correct FROM address for all email types', async () => {
      // Send all email types
      await sendWelcomeEmail({ email: 'a@test.com', firstName: 'A', branchName: 'B' });
      await sendDonationReceiptEmail({
        email: 'b@test.com', firstName: 'B', amount: '10', purpose: 'Tithe',
        date: '2025-01-01', paymentMethod: 'Cash', referenceId: 'R1',
      });
      await sendFormConfirmationEmail({
        email: 'c@test.com', firstName: 'C', formName: 'Form', submittedAt: '2025-01-01',
      });
      await sendSoulAssignmentEmail({
        email: 'd@test.com', firstName: 'D', soulName: 'Soul', soulPhone: '123', capturedDate: '2025-01-01',
      });
      await sendFollowUpReminderEmail({
        email: 'e@test.com', firstName: 'E', soulName: 'Soul', daysSinceLastContact: 1,
      });

      expect(mockSend).toHaveBeenCalledTimes(5);

      // Verify each call used the correct FROM address
      for (let i = 0; i < 5; i++) {
        const call = mockSend.mock.calls[i]![0];
        const params = call.params as Record<string, unknown>;
        expect(params.FromEmailAddress).toBe(FROM_ADDRESS);
      }
    });
  });
});
