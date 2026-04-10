// @kairos/api - Email Sender Property-Based Tests (Task 18.2)
// Property-based tests for email notification delivery.
// Uses fast-check to verify that for any valid email parameters,
// the email sender calls SES exactly once with correct subject/body,
// and never throws even if SES fails.
//
// **Validates: Requirements 23.1-23.6**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

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
// Arbitraries
// ============================================================================

/** Generate a valid email address */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,8}$/),
    fc.constantFrom('com', 'org', 'church', 'co.uk')
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

/** Generate a non-empty first name */
const firstNameArb = fc.stringMatching(/^[A-Z][a-z]{1,15}$/);

/** Generate a non-empty string for general text fields */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generate a positive amount string */
const amountArb = fc
  .double({ min: 0.01, max: 999999.99, noNaN: true })
  .map((n) => n.toFixed(2));

/** Generate a date string */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

/** Generate a phone number */
const phoneArb = fc
  .stringMatching(/^\+44\d{10}$/)
  .filter((s) => s.length > 0);

/** Generate days since last contact */
const daysArb = fc.integer({ min: 1, max: 365 });

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('email-sender property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Property: For any valid parameters, SES is called exactly once with
  // correct subject/body containing the provided data
  // --------------------------------------------------------------------------

  it('property: sendWelcomeEmail always calls SES once with firstName and branchName in content', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        firstNameArb,
        nonEmptyStringArb,
        async (email, firstName, branchName) => {
          mockSend.mockResolvedValue({});

          await sendWelcomeEmail({ email, firstName, branchName });

          expect(mockSend).toHaveBeenCalledOnce();

          const params = mockSend.mock.calls[0][0].params as Record<string, unknown>;
          expect(params.Destination).toEqual({ ToAddresses: [email] });

          const content = params.Content as Record<string, unknown>;
          const simple = content.Simple as Record<string, unknown>;
          const body = simple.Body as Record<string, unknown>;
          const html = (body.Html as Record<string, unknown>).Data as string;
          const text = (body.Text as Record<string, unknown>).Data as string;

          expect(html).toContain(firstName);
          expect(html).toContain(branchName);
          expect(text).toContain(firstName);

          mockSend.mockClear();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('property: sendDonationReceiptEmail always calls SES once with amount and purpose in content', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        firstNameArb,
        amountArb,
        fc.constantFrom('Offering', 'Tithe', 'Building Fund', 'Other'),
        dateArb,
        fc.constantFrom('Cash', 'Card', 'Online', 'Bank Transfer'),
        nonEmptyStringArb,
        async (email, firstName, amount, purpose, date, paymentMethod, referenceId) => {
          mockSend.mockResolvedValue({});

          await sendDonationReceiptEmail({
            email, firstName, amount, purpose, date, paymentMethod, referenceId,
          });

          expect(mockSend).toHaveBeenCalledOnce();

          const params = mockSend.mock.calls[0][0].params as Record<string, unknown>;
          const content = params.Content as Record<string, unknown>;
          const simple = content.Simple as Record<string, unknown>;
          const body = simple.Body as Record<string, unknown>;
          const html = (body.Html as Record<string, unknown>).Data as string;

          expect(html).toContain(firstName);
          expect(html).toContain(amount);
          expect(html).toContain(purpose);

          mockSend.mockClear();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('property: sendSoulAssignmentEmail always calls SES once with soul details in content', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        firstNameArb,
        nonEmptyStringArb,
        phoneArb,
        dateArb,
        async (email, firstName, soulName, soulPhone, capturedDate) => {
          mockSend.mockResolvedValue({});

          await sendSoulAssignmentEmail({
            email, firstName, soulName, soulPhone, capturedDate,
          });

          expect(mockSend).toHaveBeenCalledOnce();

          const params = mockSend.mock.calls[0][0].params as Record<string, unknown>;
          const content = params.Content as Record<string, unknown>;
          const simple = content.Simple as Record<string, unknown>;
          const body = simple.Body as Record<string, unknown>;
          const html = (body.Html as Record<string, unknown>).Data as string;

          expect(html).toContain(firstName);
          expect(html).toContain(soulName);
          expect(html).toContain(soulPhone);

          mockSend.mockClear();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('property: sendFollowUpReminderEmail always calls SES once with days count in content', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        firstNameArb,
        nonEmptyStringArb,
        daysArb,
        async (email, firstName, soulName, daysSinceLastContact) => {
          mockSend.mockResolvedValue({});

          await sendFollowUpReminderEmail({
            email, firstName, soulName, daysSinceLastContact,
          });

          expect(mockSend).toHaveBeenCalledOnce();

          const params = mockSend.mock.calls[0][0].params as Record<string, unknown>;
          const content = params.Content as Record<string, unknown>;
          const simple = content.Simple as Record<string, unknown>;
          const body = simple.Body as Record<string, unknown>;
          const html = (body.Html as Record<string, unknown>).Data as string;

          expect(html).toContain(firstName);
          expect(html).toContain(soulName);
          expect(html).toContain(String(daysSinceLastContact));

          mockSend.mockClear();
        }
      ),
      { numRuns: 20 }
    );
  });

  // --------------------------------------------------------------------------
  // Property: Email sender never throws even when SES fails
  // --------------------------------------------------------------------------

  it('property: email sender never throws regardless of SES failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        firstNameArb,
        nonEmptyStringArb,
        fc.constantFrom('welcome', 'donation', 'form', 'soul', 'followup') as fc.Arbitrary<string>,
        async (email, firstName, extraData, emailType) => {
          // Force SES to fail
          mockSend.mockRejectedValue(new Error('SES failure'));

          // None of these should throw
          switch (emailType) {
            case 'welcome':
              await expect(
                sendWelcomeEmail({ email, firstName, branchName: extraData })
              ).resolves.toBeUndefined();
              break;
            case 'donation':
              await expect(
                sendDonationReceiptEmail({
                  email, firstName, amount: '10.00', purpose: 'Tithe',
                  date: '2025-01-01', paymentMethod: 'Cash', referenceId: extraData,
                })
              ).resolves.toBeUndefined();
              break;
            case 'form':
              await expect(
                sendFormConfirmationEmail({
                  email, firstName, formName: extraData, submittedAt: '2025-01-01',
                })
              ).resolves.toBeUndefined();
              break;
            case 'soul':
              await expect(
                sendSoulAssignmentEmail({
                  email, firstName, soulName: extraData,
                  soulPhone: '+447700900001', capturedDate: '2025-01-01',
                })
              ).resolves.toBeUndefined();
              break;
            case 'followup':
              await expect(
                sendFollowUpReminderEmail({
                  email, firstName, soulName: extraData, daysSinceLastContact: 5,
                })
              ).resolves.toBeUndefined();
              break;
          }

          mockSend.mockClear();
        }
      ),
      { numRuns: 30 }
    );
  });
});
