import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendNotificationEmail = vi.fn(
  async (_to: string, _subject: string, _html: string): Promise<void> => {},
);
// vitest never binds AWS credentials, so the real isMailerLive() is always
// false here. The notification path is only reached when it is true.
const mailer = { live: true };

vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kairos/utils')>();
  return { ...actual, sendNotificationEmail, isMailerLive: () => mailer.live };
});

const { submitPilotInterest } = await import('./service');
import type { SubmitPilotInterestInput } from './schemas';

const input: SubmitPilotInterestInput = {
  firstName: 'Grace',
  lastName: 'Mensah',
  email: 'Grace@Example.org',
  branchName: 'London',
};

const ctx = { sourceIp: null, userAgent: null };

const OVERRIDE = 'staging@example.org';

beforeEach(() => {
  vi.clearAllMocks();
  mailer.live = true;
  delete process.env['PILOT_INTEREST_NOTIFY_TO'];
});

describe('submitPilotInterest', () => {
  it('emails the team on every submission', async () => {
    await submitPilotInterest(input, ctx);

    expect(sendNotificationEmail).toHaveBeenCalledOnce();
    const [to, subject, html] = sendNotificationEmail.mock.calls[0]!;
    // The built-in default, not the staging override and not nothing.
    expect(to).toContain('@');
    expect(to).not.toBe(OVERRIDE);
    expect(subject).toBe('Pilot interest: London - Grace Mensah');
    // The detail has to travel with the mail. Nothing is stored any more, so
    // an alert saying only "a form was submitted" would be the entire record
    // of a submission whose content is gone.
    expect(html).toContain('Grace Mensah');
    expect(html).toContain('grace@example.org');
    expect(html).toContain('London');
  });

  it('carries the optional member count when it is given', async () => {
    await submitPilotInterest({ ...input, approxMembers: 420 }, ctx);
    expect(sendNotificationEmail.mock.calls[0]![2]).toContain('420');
  });

  it('says so plainly when the member count was left blank', async () => {
    await submitPilotInterest(input, ctx);
    expect(sendNotificationEmail.mock.calls[0]![2]).toContain('Not given');
  });

  it('escapes what the submitter typed', async () => {
    await submitPilotInterest(
      { ...input, firstName: '<script>alert(1)</script>', lastName: 'Fry & Co' },
      ctx,
    );
    const html = sendNotificationEmail.mock.calls[0]![2];
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    // An ampersand in a typed name must survive as text, not turn into an
    // entity that renders as something else.
    expect(html).toContain('Fry &amp; Co');
  });

  it('sends to the override address when one is configured', async () => {
    process.env['PILOT_INTEREST_NOTIFY_TO'] = OVERRIDE;
    await submitPilotInterest(input, ctx);
    expect(sendNotificationEmail.mock.calls[0]![0]).toBe(OVERRIDE);
  });

  // Nothing is persisted, so the email is the record. An environment with no
  // mail credentials would otherwise accept submissions and drop every one of
  // them: the mailer logs the send and returns as though it worked.
  it('refuses a submission it cannot send', async () => {
    mailer.live = false;
    await expect(submitPilotInterest(input, ctx)).rejects.toThrow(/mailer is not configured/);
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  // The same reasoning one step later: a send that throws has to reach the
  // caller, so the branch leader is told to try again rather than shown a
  // thank-you for a submission that reached nobody.
  it('surfaces a failed send rather than swallowing it', async () => {
    sendNotificationEmail.mockRejectedValueOnce(new Error('SES is down'));
    await expect(submitPilotInterest(input, ctx)).rejects.toThrow('SES is down');
  });
});
