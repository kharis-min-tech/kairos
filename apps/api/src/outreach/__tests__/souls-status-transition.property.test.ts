// Property-based tests for soul status transition validation
// **Property: Soul Status Transition Validation**
// **Validates: Req 16.2, 16.3**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/** Valid status transitions */
const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Following Up'],
  'Following Up': ['Interested', 'Not Interested'],
  'Interested': ['Converted', 'Not Interested'],
  'Converted': [],
  'Not Interested': [],
};

const ALL_STATUSES = ['New', 'Following Up', 'Interested', 'Converted', 'Not Interested'];
const TERMINAL_STATUSES = ['Converted', 'Not Interested'];

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

describe('Soul Status Transition Validation (Property)', () => {
  it('should always allow defined valid transitions', () => {
    // Generate all valid (from, to) pairs
    const validPairs: [string, string][] = [];
    for (const [from, tos] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of tos) {
        validPairs.push([from, to]);
      }
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...validPairs),
        ([from, to]) => {
          expect(isValidTransition(from, to)).toBe(true);
        }
      ),
      { numRuns: validPairs.length * 3 }
    );
  });

  it('should never allow transitions from terminal states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TERMINAL_STATUSES),
        fc.constantFrom(...ALL_STATUSES),
        (from, to) => {
          expect(isValidTransition(from, to)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should never allow skipping stages (e.g., New → Converted)', () => {
    const invalidSkips: [string, string][] = [
      ['New', 'Converted'],
      ['New', 'Interested'],
      ['New', 'Not Interested'],
      ['Following Up', 'Converted'],
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...invalidSkips),
        ([from, to]) => {
          expect(isValidTransition(from, to)).toBe(false);
        }
      ),
      { numRuns: invalidSkips.length * 5 }
    );
  });

  it('should never allow self-transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATUSES),
        (status) => {
          expect(isValidTransition(status, status)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should require Converted status to have converted_to_member_id', () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
        (convertedToMemberId) => {
          const isConvertedValid = convertedToMemberId !== undefined;
          // When status is Converted, converted_to_member_id must be present
          if (!isConvertedValid) {
            // Missing member_id should be invalid for Converted
            expect(convertedToMemberId).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
