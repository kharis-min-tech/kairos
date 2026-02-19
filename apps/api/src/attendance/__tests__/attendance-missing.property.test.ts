// Property-based tests for consecutive absence detection
// **Property: Consecutive Absence Detection**
// **Validates: Req 12.5**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure function that determines if a member should be flagged as missing.
 * A member is flagged if they were NOT present/virtual in any of the last N services.
 *
 * @param attendanceRecords - Array of booleans, true = attended, false = absent
 * @param threshold - Number of consecutive services to check (default 4)
 * @returns true if member should be flagged as missing
 */
function isMemberMissing(attendanceRecords: boolean[], threshold: number): boolean {
  if (attendanceRecords.length < threshold) return false;
  // Check the last `threshold` records
  const recentRecords = attendanceRecords.slice(-threshold);
  return recentRecords.every(attended => !attended);
}

describe('Consecutive Absence Detection (Property)', () => {
  it('should flag members who missed all of the last N services', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.boolean(), { minLength: 0, maxLength: 20 }),
        (threshold, priorRecords) => {
          // Append `threshold` consecutive absences
          const records = [...priorRecords, ...Array(threshold).fill(false)];
          expect(isMemberMissing(records, threshold)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT flag members who attended at least once in the last N services', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (threshold, attendedIndex) => {
          // Create records where at least one of the last N is true
          const recentRecords = Array(threshold).fill(false);
          const idx = attendedIndex % threshold;
          recentRecords[idx] = true;
          expect(isMemberMissing(recentRecords, threshold)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT flag when fewer than threshold services exist', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (threshold) => {
          // Fewer records than threshold
          const records = Array(threshold - 1).fill(false);
          expect(isMemberMissing(records, threshold)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only consider the last N services, not earlier ones', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (threshold, earlyRecords) => {
          // Early records have attendance, but last N are all absent
          const records = [...earlyRecords, ...Array(threshold).fill(false)];
          expect(isMemberMissing(records, threshold)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
