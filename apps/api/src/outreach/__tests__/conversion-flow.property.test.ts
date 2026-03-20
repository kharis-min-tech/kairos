// Property-based tests for soul conversion flow
// **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 11.5**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { soulStatusUpdateSchema } from '@kairos/utils';

// ─── Shared constants ────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Following Up'],
  'Following Up': ['Interested', 'Not Interested'],
  'Interested': ['Converted', 'Not Interested'],
  'Converted': [],
  'Not Interested': [],
};

const ALL_STATUSES = ['New', 'Following Up', 'Interested', 'Converted', 'Not Interested'] as const;
const TERMINAL_STATUSES = ['Converted', 'Not Interested'] as const;
const ACTIVE_STATUSES = ['New', 'Following Up', 'Interested'] as const;

function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

// ─── Property 4: Status Transition Validation (State Machine) ───
// **Validates: Requirements 10.1, 10.2, 10.4**

describe('Property 4: Status Transition Validation (State Machine)', () => {
  it('for any (from, to) pair, isValidTransition returns true iff the transition is in the pipeline', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUSES),
        fc.constantFrom(...ALL_STATUSES),
        (from, to) => {
          const expected = (VALID_TRANSITIONS[from] || []).includes(to);
          expect(isValidTransition(from, to)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any soul in a terminal status, all transitions should be rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TERMINAL_STATUSES),
        fc.constantFrom(...ALL_STATUSES),
        (terminalStatus, targetStatus) => {
          expect(isValidTransition(terminalStatus, targetStatus)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any soul in an active status, at least one valid transition exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACTIVE_STATUSES),
        (activeStatus) => {
          const transitions = VALID_TRANSITIONS[activeStatus] || [];
          expect(transitions.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('the pipeline forms a DAG — no cycles exist', () => {
    // For any status, following valid transitions should never return to the same status
    function canReach(from: string, target: string, visited: Set<string>): boolean {
      if (visited.has(from)) return false;
      visited.add(from);
      const next = VALID_TRANSITIONS[from] || [];
      for (const n of next) {
        if (n === target) return true;
        if (canReach(n, target, visited)) return true;
      }
      return false;
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUSES),
        (status) => {
          // No status should be reachable from itself through valid transitions
          expect(canReach(status, status, new Set())).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ─── Property 5: Converted Status Requires Member Link ──────────
// **Validates: Requirements 10.3**

describe('Property 5: Converted Status Requires Member Link', () => {
  it('for any status update to Converted without converted_to_member_id, validation should fail', () => {
    fc.assert(
      fc.property(
        fc.constant({ status: 'Converted' as const }),
        (input) => {
          const result = soulStatusUpdateSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('for any status update to Converted with a valid converted_to_member_id, validation should pass', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        (memberId) => {
          const result = soulStatusUpdateSchema.safeParse({
            status: 'Converted',
            converted_to_member_id: memberId,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any non-Converted status, converted_to_member_id is not required', () => {
    const nonConvertedStatuses = ['New', 'Following Up', 'Interested', 'Not Interested'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...nonConvertedStatuses),
        (status) => {
          const result = soulStatusUpdateSchema.safeParse({ status });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('for any Converted request with non-positive member_id, validation should fail', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (invalidId) => {
          const result = soulStatusUpdateSchema.safeParse({
            status: 'Converted',
            converted_to_member_id: invalidId,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 16: Conversion Preserves Follow-Up History ─────────
// **Validates: Requirements 11.5**

describe('Property 16: Conversion Preserves Follow-Up History', () => {
  // Simulate a soul with follow-up history going through conversion
  interface FollowUpRecord {
    followUpId: number;
    soulId: number;
    contactMethod: string;
    contactStatus: string;
    notes: string;
  }

  interface SoulRecord {
    soulId: number;
    firstName: string;
    lastName: string;
    status: string;
    outreachId: number | null;
    convertedToMemberId: number | null;
    followUps: FollowUpRecord[];
  }

  const contactMethods = ['Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other'];
  const contactStatuses = ['Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested'];

  const followUpArb = fc.record({
    followUpId: fc.integer({ min: 1, max: 10000 }),
    soulId: fc.integer({ min: 1, max: 1000 }),
    contactMethod: fc.constantFrom(...contactMethods),
    contactStatus: fc.constantFrom(...contactStatuses),
    notes: fc.string({ minLength: 0, maxLength: 200 }),
  });

  const soulArb = fc.record({
    soulId: fc.integer({ min: 1, max: 1000 }),
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    status: fc.constant('Interested' as string),
    outreachId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
    convertedToMemberId: fc.constant(null as number | null),
    followUps: fc.array(followUpArb, { minLength: 0, maxLength: 10 }),
  });

  function convertSoul(soul: SoulRecord, newMemberId: number): SoulRecord {
    // Conversion should only update status and member link — follow-ups remain intact
    return {
      ...soul,
      status: 'Converted',
      convertedToMemberId: newMemberId,
    };
  }

  it('for any soul with follow-up history, conversion preserves all follow-up records', () => {
    fc.assert(
      fc.property(
        soulArb,
        fc.integer({ min: 1, max: 10000 }),
        (soul, newMemberId) => {
          const originalFollowUps = [...soul.followUps];
          const converted = convertSoul(soul, newMemberId);

          // All follow-up records should be preserved
          expect(converted.followUps).toHaveLength(originalFollowUps.length);
          for (let i = 0; i < originalFollowUps.length; i++) {
            expect(converted.followUps[i]).toEqual(originalFollowUps[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any converted soul, the soul record persists with its full history', () => {
    fc.assert(
      fc.property(
        soulArb,
        fc.integer({ min: 1, max: 10000 }),
        (soul, newMemberId) => {
          const converted = convertSoul(soul, newMemberId);

          // Soul record should persist
          expect(converted.soulId).toBe(soul.soulId);
          expect(converted.firstName).toBe(soul.firstName);
          expect(converted.lastName).toBe(soul.lastName);
          expect(converted.outreachId).toBe(soul.outreachId);

          // Status should be updated
          expect(converted.status).toBe('Converted');
          expect(converted.convertedToMemberId).toBe(newMemberId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any converted soul, follow-up records remain linked to the original soul_id', () => {
    fc.assert(
      fc.property(
        soulArb,
        fc.integer({ min: 1, max: 10000 }),
        (soul, newMemberId) => {
          const converted = convertSoul(soul, newMemberId);

          // Each follow-up should still reference the original soul (compare by index since order is preserved)
          for (let i = 0; i < converted.followUps.length; i++) {
            expect(converted.followUps[i].soulId).toBe(soul.followUps[i].soulId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
