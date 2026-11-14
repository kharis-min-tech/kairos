import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditAction, AuditOutcome, NotificationEventType } from '@kairos/types';
import type { AuthContext } from '@kairos/types';

const disableMfa = vi.fn();
const hasConfirmedFactor = vi.fn();
const recordAuditEvent = vi.fn();
const dispatchNotification = vi.fn();

vi.mock('../auth/mfa', () => ({
  disableMfa: (...args: unknown[]) => disableMfa(...args),
  hasConfirmedFactor: (...args: unknown[]) => hasConfirmedFactor(...args),
}));
vi.mock('../audit/service', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEvent(...args),
}));
vi.mock('../notifications/service', () => ({
  dispatchNotification: (...args: unknown[]) => dispatchNotification(...args),
}));

import { resetMemberMfa } from './service';

function createChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'update', 'set']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[] = [];
let selectCallIndex = 0;

// `update` is here because resetMemberMfa now revokes the member's sessions
// as well as removing the factor.
const mockDb = {
  select: vi.fn(),
  update: vi.fn(() => createChain(undefined)),
} as unknown as import('@kairos/database').Database;

function selectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

const admin = { memberId: 'admin-1', systemRole: 'admin' } as unknown as AuthContext;

const target = [
  { id: 'm-1', firstName: 'Ada', lastName: 'Lovelace', isActive: true },
];
const actor = [{ firstName: 'Grace', lastName: 'Hopper' }];

beforeEach(() => {
  disableMfa.mockReset().mockResolvedValue(undefined);
  hasConfirmedFactor.mockReset().mockResolvedValue(true);
  recordAuditEvent.mockReset().mockResolvedValue(undefined);
  dispatchNotification.mockReset().mockResolvedValue(undefined);
});

describe('resetMemberMfa', () => {
  it('removes the factor and says that it did', async () => {
    selectSequence(target, actor);

    const result = await resetMemberMfa(mockDb, admin, 'm-1');

    expect(disableMfa).toHaveBeenCalledWith(mockDb, 'm-1');
    expect(result).toEqual({ hadFactor: true });
  });

  it('refuses a member who does not exist', async () => {
    selectSequence([]);
    await expect(resetMemberMfa(mockDb, admin, 'nope')).rejects.toThrow('Member not found');
    expect(disableMfa).not.toHaveBeenCalled();
  });

  it('refuses a deactivated member', async () => {
    selectSequence([{ ...target[0], isActive: false }]);
    await expect(resetMemberMfa(mockDb, admin, 'm-1')).rejects.toThrow('Member not found');
    expect(disableMfa).not.toHaveBeenCalled();
  });

  /**
   * The member cannot consent at the time - being locked out is the premise -
   * so this mail is the only thing that reaches them if the reset was not
   * legitimate. Stripping a second factor is exactly what an attacker who had
   * taken over an admin account would do before taking over a leader's.
   */
  it('tells the member, naming who did it', async () => {
    selectSequence(target, actor);

    await resetMemberMfa(mockDb, admin, 'm-1');

    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    const [, call] = dispatchNotification.mock.calls[0]!;
    expect(call.eventType).toBe(NotificationEventType.SecurityMfaReset);
    expect(call.recipientMemberIds).toEqual(['m-1']);
    expect(call.payload.resetByName).toBe('Grace Hopper');
  });

  it('still names the actor as somebody when their row cannot be read', async () => {
    selectSequence(target, []);

    await resetMemberMfa(mockDb, admin, 'm-1');

    const [, call] = dispatchNotification.mock.calls[0]!;
    expect(call.payload.resetByName).toBeNull();
  });

  /**
   * The audit row is the record that survives for an investigation, so it
   * must not be lost to a mail outage - and the member must not stay locked
   * out because the mailer is down.
   */
  it('completes the reset even when the notification throws', async () => {
    selectSequence(target, actor);
    dispatchNotification.mockRejectedValue(new Error('SES is down'));

    await expect(resetMemberMfa(mockDb, admin, 'm-1')).resolves.toEqual({ hadFactor: true });
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('audits the reset against the admin who did it', async () => {
    selectSequence(target, actor);

    await resetMemberMfa(mockDb, admin, 'm-1');

    const [, entry] = recordAuditEvent.mock.calls[0]!;
    expect(entry).toMatchObject({
      actorMemberId: 'admin-1',
      action: AuditAction.MfaReset,
      outcome: AuditOutcome.Success,
      targetType: 'member',
      targetId: 'm-1',
      metadata: { outcome: 'removed' },
    });
  });

  /**
   * An admin resetting an account that never had a factor is either confused
   * or fishing. A log that kept only the successful removals could not tell
   * either case apart from nothing having happened.
   */
  it('audits an attempt that found nothing to remove', async () => {
    selectSequence(target, actor);
    hasConfirmedFactor.mockResolvedValue(false);

    const result = await resetMemberMfa(mockDb, admin, 'm-1');

    expect(result).toEqual({ hadFactor: false });
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    const [, entry] = recordAuditEvent.mock.calls[0]!;
    expect(entry.metadata).toEqual({ outcome: 'nothing-to-remove' });
  });

  it('does not email anyone when there was no factor to remove', async () => {
    selectSequence(target, actor);
    hasConfirmedFactor.mockResolvedValue(false);

    await resetMemberMfa(mockDb, admin, 'm-1');

    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  /** Never any part of the secret: that would hand a reader the factor. */
  it('keeps the audit metadata free of anything but the outcome', async () => {
    selectSequence(target, actor);

    await resetMemberMfa(mockDb, admin, 'm-1');

    const [, entry] = recordAuditEvent.mock.calls[0]!;
    expect(Object.keys(entry.metadata)).toEqual(['outcome']);
  });

  it('threads the request context through so the audit row carries the IP', async () => {
    selectSequence(target, actor);
    const ctx = { ip: '203.0.113.9', userAgent: 'Firefox', country: 'GB' };

    await resetMemberMfa(mockDb, admin, 'm-1', ctx);

    const [, entry] = recordAuditEvent.mock.calls[0]!;
    expect(entry.ctx).toEqual(ctx);
  });
});
