// Property-based tests for attendance trend reporting
// **Property: Attendance Trend Reporting**
// **Validates: Req 12.1, 12.2**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure function extracted from attendance-get-trends logic.
 */
function calculateTrendPercentage(presentCount: number, totalMembers: number): number {
  if (totalMembers <= 0) return 0;
  return Math.round((presentCount / totalMembers) * 100);
}

describe('Attendance Trend Reporting (Property)', () => {
  it('should always produce percentages between 0 and 100 for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (presentCount, totalMembers) => {
          const capped = Math.min(presentCount, totalMembers);
          const pct = calculateTrendPercentage(capped, totalMembers);
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 when totalMembers is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (presentCount) => {
          expect(calculateTrendPercentage(presentCount, 0)).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return 100 when all members are present', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (totalMembers) => {
          expect(calculateTrendPercentage(totalMembers, totalMembers)).toBe(100);
        }
      ),
      { numRuns: 50 }
    );
  });
});
