import { describe, it, expect } from 'vitest';
import {
  computeServiceDates,
  planAssignments,
  type FairnessPoolMember,
  type FairnessSlot,
} from './rota-fairness';

describe('computeServiceDates', () => {
  it('returns N consecutive weekly dates starting on the first matching weekday', () => {
    // 2026-05-04 is a Monday. Sunday weekday=0
    const dates = computeServiceDates('2026-05-04', 0, 4);
    expect(dates).toEqual(['2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31']);
  });

  it('returns startDate itself when it already matches the weekday', () => {
    // 2026-05-10 is a Sunday
    const dates = computeServiceDates('2026-05-10', 0, 2);
    expect(dates).toEqual(['2026-05-10', '2026-05-17']);
  });

  it('returns empty for weeks=0', () => {
    expect(computeServiceDates('2026-05-04', 0, 0)).toEqual([]);
  });
});

describe('planAssignments fairness', () => {
  const slots: FairnessSlot[] = [
    { slotId: 's1', roleName: 'Soprano', positionsRequired: 1, sortOrder: 0 },
    { slotId: 's2', roleName: 'Alto', positionsRequired: 1, sortOrder: 1 },
  ];

  it('picks members with null lastScheduledAt before others', () => {
    const pool: FairnessPoolMember[] = [
      { memberId: 'm1', lastScheduledAt: '2026-04-01' },
      { memberId: 'm2', lastScheduledAt: null },
      { memberId: 'm3', lastScheduledAt: '2026-04-15' },
    ];
    const result = planAssignments(pool, slots, ['2026-05-10']);
    // m2 (null) wins s1, then m1 (oldest) wins s2
    expect(result).toEqual([
      { serviceDate: '2026-05-10', slotId: 's1', memberId: 'm2' },
      { serviceDate: '2026-05-10', slotId: 's2', memberId: 'm1' },
    ]);
  });

  it('uses memberId as deterministic tiebreaker when dates are equal', () => {
    const pool: FairnessPoolMember[] = [
      { memberId: 'm2', lastScheduledAt: null },
      { memberId: 'm1', lastScheduledAt: null },
    ];
    const oneSlot: FairnessSlot[] = [{ slotId: 's1', roleName: 'X', positionsRequired: 1, sortOrder: 0 }];
    const result = planAssignments(pool, oneSlot, ['2026-05-10']);
    expect(result[0]!.memberId).toBe('m1');
  });

  it('does not double-book a member across slots on the same date', () => {
    const pool: FairnessPoolMember[] = [{ memberId: 'm1', lastScheduledAt: null }];
    const result = planAssignments(pool, slots, ['2026-05-10']);
    expect(result[0]!.memberId).toBe('m1');
    expect(result[1]!.memberId).toBe(null); // pool exhausted for second slot
  });

  it('updates lastScheduledAt so later weeks rotate fairly across 4 weeks (8 members, 2 slots)', () => {
    const pool: FairnessPoolMember[] = Array.from({ length: 8 }, (_, i) => ({
      memberId: `m${i + 1}`,
      lastScheduledAt: null,
    }));
    const dates = ['2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31'];
    const result = planAssignments(pool, slots, dates);
    // Count assignments per member
    const counts = new Map<string, number>();
    for (const a of result) if (a.memberId) counts.set(a.memberId, (counts.get(a.memberId) ?? 0) + 1);
    // 4 weeks * 2 slots = 8 assignments / 8 members → each exactly once
    for (const m of pool) {
      expect(counts.get(m.memberId)).toBe(1);
    }
  });

  it('respects preferred role name for slot selection', () => {
    const pool: FairnessPoolMember[] = [
      { memberId: 'm1', lastScheduledAt: null, preferredRoleName: 'Alto' },
      { memberId: 'm2', lastScheduledAt: null, preferredRoleName: 'Soprano' },
    ];
    const result = planAssignments(pool, slots, ['2026-05-10']);
    const sopranoPick = result.find((r) => r.slotId === 's1');
    const altoPick = result.find((r) => r.slotId === 's2');
    expect(sopranoPick!.memberId).toBe('m2');
    expect(altoPick!.memberId).toBe('m1');
  });

  it('leaves slot open (null) when pool empty', () => {
    const result = planAssignments([], slots, ['2026-05-10']);
    expect(result.every((r) => r.memberId === null)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('honors positionsRequired > 1', () => {
    const pool: FairnessPoolMember[] = [
      { memberId: 'm1', lastScheduledAt: null },
      { memberId: 'm2', lastScheduledAt: null },
      { memberId: 'm3', lastScheduledAt: null },
    ];
    const ushers: FairnessSlot[] = [{ slotId: 'u', roleName: 'Usher', positionsRequired: 3, sortOrder: 0 }];
    const result = planAssignments(pool, ushers, ['2026-05-10']);
    expect(result.map((r) => r.memberId).sort()).toEqual(['m1', 'm2', 'm3']);
  });
});
