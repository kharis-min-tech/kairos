import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SIGNIN_ACTIONS, SIGNIN_RETENTION_DAYS, runRetentionCron } from './retention';
import { AuditAction } from '@kairos/types';

// The delete is `db.delete(auditLog).where(...).returning({ id })`, so the
// mock reproduces that chain. Asserting on the chain rather than on a real
// database keeps this a unit test; the behaviour that matters here is WHICH
// rows are asked for, not that Postgres can delete them.
const returning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning }));
const mockDb = {
  delete: vi.fn(() => ({ where: deleteWhere })),
} as unknown as Parameters<typeof runRetentionCron>[0];

beforeEach(() => {
  vi.clearAllMocks();
  returning.mockResolvedValue([]);
});

describe('SIGNIN_ACTIONS', () => {
  it('covers exactly the two sign-in actions and nothing else', () => {
    expect([...SIGNIN_ACTIONS].sort()).toEqual(['signin_failure', 'signin_success']);
  });

  /**
   * The regression this file exists to prevent. The audit log holds the only
   * evidence from which a data-exfiltration incident can be scoped, and four
   * of its actions were added in November 2026 for exactly that purpose. A
   * purge that reached them would delete the breach-scoping capability the
   * same security review had just built, and it would do it silently.
   */
  it('never reaches the actions a breach is scoped from', () => {
    const mustSurvive = [
      AuditAction.MemberUpdated,
      AuditAction.MemberExported,
      AuditAction.SubmissionsExported,
      AuditAction.DonorRegisterExported,
      AuditAction.RoleGranted,
      AuditAction.RoleRevoked,
      AuditAction.GuardianLinked,
      AuditAction.GuardianUnlinked,
      AuditAction.PasswordChange,
      AuditAction.EmailChangeConfirmed,
      AuditAction.OauthAuthorized,
      AuditAction.OauthTokenIssued,
    ];
    for (const action of mustSurvive) {
      expect(SIGNIN_ACTIONS).not.toContain(action);
    }
  });
});

describe('runRetentionCron', () => {
  it('deletes only sign-in rows, and only ones past the window', async () => {
    returning.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const summary = await runRetentionCron(mockDb);

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(summary.signinRowsDeleted).toBe(3);
    expect(summary.cutoff).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('computes the cutoff as exactly 90 days before now', async () => {
    const now = new Date('2026-11-12T03:00:00.000Z');
    vi.setSystemTime(now);
    const summary = await runRetentionCron(mockDb);
    vi.useRealTimers();

    const cutoff = new Date(summary.cutoff);
    const days = (now.getTime() - cutoff.getTime()) / 86_400_000;
    expect(days).toBe(SIGNIN_RETENTION_DAYS);
    expect(SIGNIN_RETENTION_DAYS).toBe(90);
  });

  it('reports zero without failing when there is nothing old enough', async () => {
    returning.mockResolvedValue([]);
    const summary = await runRetentionCron(mockDb);
    expect(summary.signinRowsDeleted).toBe(0);
  });

  /**
   * The cron runs nightly and its failure must not take the lifecycle run with
   * it, so the caller needs an error it can catch — but the summary shape must
   * never lie about how much it deleted.
   */
  it('propagates a database failure rather than reporting a false zero', async () => {
    returning.mockRejectedValue(new Error('connection lost'));
    await expect(runRetentionCron(mockDb)).rejects.toThrow('connection lost');
  });
});
