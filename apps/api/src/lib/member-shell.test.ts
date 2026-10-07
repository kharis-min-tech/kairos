import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkGuardians } from './member-shell';

/**
 * The guardian link rules, which exist because the forms hand this helper the
 * same person more than once: a baby form passes the subject link AND the
 * father reference, and they are frequently the same member.
 */
const inserted: unknown[][] = [];
const mockDb = {
  insert: vi.fn(() => ({
    values: (rows: unknown[]) => {
      inserted.push(rows);
      return { onConflictDoNothing: async () => undefined };
    },
  })),
} as never;

beforeEach(() => {
  inserted.length = 0;
  vi.clearAllMocks();
});

describe('linkGuardians', () => {
  it('writes nothing when there are no guardians', async () => {
    await linkGuardians(mockDb, 'child-1', []);
    expect(inserted).toHaveLength(0);
  });

  it('collapses the same person named twice and keeps the relationship', async () => {
    // The baby form passes the subject link (no relationship) and the father
    // reference (relationship 'Father') — often the same member.
    await linkGuardians(mockDb, 'baby-1', [
      { memberId: 'dad-1', isPrimary: true },
      { memberId: 'dad-1', relationship: 'Father' },
    ]);
    expect(inserted[0]).toHaveLength(1);
    expect(inserted[0]![0]).toMatchObject({
      memberId: 'baby-1',
      guardianMemberId: 'dad-1',
      relationship: 'Father',
      isPrimary: true,
    });
  });

  it('records both parents, each labelled, with exactly one primary', async () => {
    await linkGuardians(mockDb, 'baby-1', [
      { memberId: 'dad-1', relationship: 'Father' },
      { memberId: 'mum-1', relationship: 'Mother' },
    ]);
    const rows = inserted[0] as Array<{ guardianMemberId: string; relationship: string; isPrimary: boolean }>;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.relationship)).toEqual(['Father', 'Mother']);
    expect(rows.filter((r) => r.isPrimary)).toHaveLength(1);
  });

  it('honours an explicitly marked primary rather than taking the first', async () => {
    await linkGuardians(mockDb, 'baby-1', [
      { memberId: 'dad-1', relationship: 'Father' },
      { memberId: 'mum-1', relationship: 'Mother', isPrimary: true },
    ]);
    const rows = inserted[0] as Array<{ guardianMemberId: string; isPrimary: boolean }>;
    expect(rows.find((r) => r.isPrimary)?.guardianMemberId).toBe('mum-1');
  });

  it('drops a self-link instead of letting the CHECK reject the submission', async () => {
    // A form that somehow names the child as its own guardian should lose that
    // one link, not the whole record.
    await linkGuardians(mockDb, 'child-1', [
      { memberId: 'child-1', relationship: 'Other' },
      { memberId: 'carer-1', relationship: 'Carer' },
    ]);
    const rows = inserted[0] as Array<{ guardianMemberId: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.guardianMemberId).toBe('carer-1');
  });

  it('writes nothing when every link was a self-link', async () => {
    await linkGuardians(mockDb, 'child-1', [{ memberId: 'child-1' }]);
    expect(inserted).toHaveLength(0);
  });
});
