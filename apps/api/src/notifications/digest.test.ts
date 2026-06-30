import { describe, it, expect, vi, beforeEach } from 'vitest';

function createChain(result: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin',
    'update', 'set',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain['then'] = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

let selectResults: unknown[];
let selectCallIndex: number;
let updateCalls: unknown[];

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
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

function setupUpdate() {
  updateCalls = [];
  (mockDb.update as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const chain = createChain([]);
    chain.set = vi.fn((arg: unknown) => {
      updateCalls.push(arg);
      return chain;
    });
    return chain;
  });
}

const sendMock = vi.fn();
vi.mock('@kairos/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@kairos/utils')>();
  return {
    ...actual,
    sendNotificationEmail: (...args: unknown[]) => sendMock(...args),
  };
});

import { runDailyDigest } from './digest';
import { NotificationEventType } from '@kairos/types';

const memberAId = 'aaaa0000-0000-0000-0000-000000000001';
const memberBId = 'bbbb0000-0000-0000-0000-000000000002';

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue(undefined);
  setupUpdate();
});

describe('runDailyDigest', () => {
  it('returns zero counts when no pending rows', async () => {
    setupSelectSequence([]);
    const result = await runDailyDigest(mockDb);
    expect(result).toEqual({ digests: 0, events: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('groups rows by (member, category) and sends one digest per group', async () => {
    setupSelectSequence(
      [
        // member A — 2 workflow + 1 lifecycle
        {
          id: 'evt-1',
          memberId: memberAId,
          category: 'workflow',
          eventType: NotificationEventType.WorkflowFellowshipJoinRequestReceived,
          payload: { requesterName: 'Alice', targetName: 'Central', targetKind: 'fellowship', portalUrl: 'x' },
        },
        {
          id: 'evt-2',
          memberId: memberAId,
          category: 'workflow',
          eventType: NotificationEventType.WorkflowSoulAssigned,
          payload: { soulName: 'Bob', assignedByName: null, portalUrl: 'x' },
        },
        {
          id: 'evt-3',
          memberId: memberAId,
          category: 'lifecycle',
          eventType: NotificationEventType.LifecycleVisitorPromoted,
          payload: { visitorName: 'Charlie', branchName: 'London', portalUrl: 'x' },
        },
        // member B — 1 workflow
        {
          id: 'evt-4',
          memberId: memberBId,
          category: 'workflow',
          eventType: NotificationEventType.WorkflowSoulStatusChanged,
          payload: { soulName: 'Dora', fromStatus: 'New', toStatus: 'Following Up', changedByName: null, portalUrl: 'x' },
        },
      ],
      // recipients lookup
      [
        { id: memberAId, email: 'a@x.com', firstName: 'Anya', isActive: true },
        { id: memberBId, email: 'b@x.com', firstName: 'Ben', isActive: true },
      ],
    );

    const result = await runDailyDigest(mockDb);

    // 3 digests sent: A-workflow, A-lifecycle, B-workflow
    expect(result.digests).toBe(3);
    expect(result.events).toBe(4);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });

  it('marks inactive recipient rows as send-error so they do not retry forever', async () => {
    setupSelectSequence(
      [
        {
          id: 'evt-1',
          memberId: memberAId,
          category: 'workflow',
          eventType: NotificationEventType.WorkflowSoulAssigned,
          payload: { soulName: 'Bob', assignedByName: null, portalUrl: 'x' },
        },
      ],
      [{ id: memberAId, email: 'a@x.com', firstName: 'Anya', isActive: false }],
    );

    const result = await runDailyDigest(mockDb);
    expect(result.digests).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
    // The expire-update path was invoked
    expect(updateCalls.length).toBe(1);
    expect((updateCalls[0] as { sendError: string }).sendError).toMatch(/inactive/);
  });

  it('leaves rows unsent when SES throws (so they roll into tomorrow)', async () => {
    sendMock.mockReset();
    sendMock.mockRejectedValue(new Error('SES boom'));
    setupSelectSequence(
      [
        {
          id: 'evt-1',
          memberId: memberAId,
          category: 'workflow',
          eventType: NotificationEventType.WorkflowSoulAssigned,
          payload: { soulName: 'Bob', assignedByName: null, portalUrl: 'x' },
        },
      ],
      [{ id: memberAId, email: 'a@x.com', firstName: 'Anya', isActive: true }],
    );

    const result = await runDailyDigest(mockDb);
    expect(result.digests).toBe(0);
    expect(result.events).toBe(0);
    // No update calls — rows stay unsent
    expect(updateCalls.length).toBe(0);
  });
});
