import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendNotificationEmail = vi.fn(async () => {});
const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kairos/utils')>();
  return { ...actual, sendNotificationEmail, logger };
});

const { submitPilotInterest } = await import('./service');
import type { SubmitPilotInterestInput } from './schemas';
import type { Database } from '@kairos/database';

/**
 * Just enough Drizzle to satisfy one insert. The submission under test never
 * sends a branch id, so the branch lookup never runs.
 */
function fakeDb(id = 'row-1') {
  return {
    insert: () => ({
      values: () => ({
        returning: async () => [{ id, submittedAt: new Date('2026-11-21T09:00:00Z') }],
      }),
    }),
  } as unknown as Database;
}

const input: SubmitPilotInterestInput = {
  fullName: 'Grace Mensah',
  roleAtBranch: 'branch_pastor',
  email: 'Grace@Example.org',
  branchName: 'Kharis London Central',
  fellowshipCount: 6,
  departmentCount: 4,
  safeguardingLeadInPost: true,
  safeguardingLeadName: 'Tobi Balogun',
  whyThisBranch: 'We are ready & willing',
} as SubmitPilotInterestInput;

const ctx = { sourceIp: null, userAgent: null };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['PILOT_INTEREST_NOTIFY_TO'];
});

describe('submitPilotInterest', () => {
  it('emails the team on every submission', async () => {
    await submitPilotInterest(fakeDb(), input, ctx);

    expect(sendNotificationEmail).toHaveBeenCalledOnce();
    const [to, subject, html] = sendNotificationEmail.mock.calls[0] as unknown as [
      string,
      string,
      string,
    ];
    expect(to).toBe('tech@kharis.org');
    expect(subject).toBe('Pilot interest: Kharis London Central - Grace Mensah');
    // The detail has to travel with the mail: an alert that says only "a form
    // was submitted" sends the reader looking for the admin queue, which is
    // the delay the notification exists to remove.
    expect(html).toContain('Grace Mensah');
    expect(html).toContain('grace@example.org');
    expect(html).toContain('Tobi Balogun');
  });

  it('escapes what the submitter typed', async () => {
    await submitPilotInterest(
      fakeDb(),
      { ...input, fullName: '<script>alert(1)</script>' },
      ctx,
    );
    const html = (sendNotificationEmail.mock.calls[0] as unknown as string[])[2]!;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    // An ampersand in free text must survive as text, not become an entity
    // that renders as something else.
    expect(html).toContain('ready &amp; willing');
  });

  it('sends to the override address when one is configured', async () => {
    process.env['PILOT_INTEREST_NOTIFY_TO'] = 'staging@example.org';
    await submitPilotInterest(fakeDb(), input, ctx);
    expect(sendNotificationEmail.mock.calls[0]![0]).toBe('staging@example.org');
  });

  // The branch offered to go first. Losing that because the mail server was
  // down would be the worst possible trade.
  it('still records the submission when the email fails', async () => {
    sendNotificationEmail.mockRejectedValueOnce(new Error('SES is down') as never);
    const result = await submitPilotInterest(fakeDb('kept'), input, ctx);
    expect(result.id).toBe('kept');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
