import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit',
    'insert', 'values',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;
let insertCalls: unknown[];

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
} as unknown as import('@kairos/database').Database;

function setupSelectSequence(...results: unknown[]) {
  selectResults = results;
  selectCallIndex = 0;
  (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const r = selectResults[selectCallIndex] ?? selectResults[selectResults.length - 1];
    selectCallIndex++;
    return createChain(r);
  });
}

function setupInsert() {
  insertCalls = [];
  (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain([]);
    chain.values = vi.fn((arg: unknown) => {
      insertCalls.push(arg);
      return chain;
    });
    return chain;
  });
}

import {
  recordAuditEvent,
  listMyAuditLog,
  hasPriorSigninFromUserAgent,
} from './service';
import { AuditAction, AuditOutcome } from '@kairos/types';

const memberId = 'aaaa0000-0000-0000-0000-000000000001';

beforeEach(() => {
  setupInsert();
});

describe('recordAuditEvent', () => {
  it('inserts a row with the provided ctx', async () => {
    await recordAuditEvent(mockDb, {
      actorMemberId: memberId,
      action: AuditAction.SigninSuccess,
      outcome: AuditOutcome.Success,
      ctx: { ip: '1.2.3.4', userAgent: 'Mozilla/5.0', country: 'GB' },
    });
    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0] as { ip: string; userAgent: string; country: string };
    expect(row.ip).toBe('1.2.3.4');
    expect(row.userAgent).toBe('Mozilla/5.0');
    expect(row.country).toBe('GB');
  });

  it('truncates user agents longer than 500 chars', async () => {
    const longUa = 'A'.repeat(900);
    await recordAuditEvent(mockDb, {
      actorMemberId: memberId,
      action: AuditAction.SigninSuccess,
      outcome: AuditOutcome.Success,
      ctx: { userAgent: longUa },
    });
    const row = insertCalls[0] as { userAgent: string };
    expect(row.userAgent.length).toBe(500);
  });

  it('records sign-in failure with null actorMemberId + attemptedEmail', async () => {
    await recordAuditEvent(mockDb, {
      actorMemberId: null,
      action: AuditAction.SigninFailure,
      outcome: AuditOutcome.Failure,
      attemptedEmail: 'wrong@x.com',
    });
    const row = insertCalls[0] as { actorMemberId: string | null; attemptedEmail: string };
    expect(row.actorMemberId).toBeNull();
    expect(row.attemptedEmail).toBe('wrong@x.com');
  });

  it('swallows DB insert errors without throwing', async () => {
    (mockDb.insert as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB down');
    });
    await expect(
      recordAuditEvent(mockDb, {
        actorMemberId: memberId,
        action: AuditAction.SigninSuccess,
        outcome: AuditOutcome.Success,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('listMyAuditLog', () => {
  it('returns mapped audit rows newest first', async () => {
    const now = new Date('2026-06-30T12:00:00Z');
    setupSelectSequence([
      {
        id: 'row-1',
        action: 'signin_success',
        outcome: 'success',
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
        country: 'GB',
        metadata: { isFirstLogin: false },
        createdAt: now,
      },
    ]);

    const rows = await listMyAuditLog(mockDb, memberId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe('signin_success');
    expect(rows[0]!.createdAt).toBe(now.toISOString());
  });
});

describe('hasPriorSigninFromUserAgent', () => {
  it('returns true when a row matches', async () => {
    setupSelectSequence([{ id: 'row-1' }]);
    const result = await hasPriorSigninFromUserAgent(mockDb, memberId, 'Mozilla/5.0');
    expect(result).toBe(true);
  });

  it('returns false when no row matches', async () => {
    setupSelectSequence([]);
    const result = await hasPriorSigninFromUserAgent(mockDb, memberId, 'Mozilla/5.0');
    expect(result).toBe(false);
  });
});
