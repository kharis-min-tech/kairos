// Property-based tests for attendance percentage calculation
// **Property: Attendance Percentage Calculation**
// **Validates: Req 11.7**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure function extracted from attendance-list-fellowship logic
 * for property-based testing.
 */
function calculateAttendancePercentage(presentCount: number, totalMeetings: number): number {
  if (totalMeetings <= 0) return 0;
  return Math.round((presentCount / totalMeetings) * 100);
}

describe('Attendance Percentage Calculation (Property)', () => {
  it('should always return 0 when totalMeetings is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (presentCount) => {
          expect(calculateAttendancePercentage(presentCount, 0)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always return a value between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (presentCount, totalMeetings) => {
          // presentCount should not exceed totalMeetings in real data
          const capped = Math.min(presentCount, totalMeetings);
          const pct = calculateAttendancePercentage(capped, totalMeetings);
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 100 when presentCount equals totalMeetings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (totalMeetings) => {
          expect(calculateAttendancePercentage(totalMeetings, totalMeetings)).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 when presentCount is 0 and totalMeetings > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (totalMeetings) => {
          expect(calculateAttendancePercentage(0, totalMeetings)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be monotonically non-decreasing as presentCount increases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 1, max: 1000 }),
        (presentCount, totalMeetings) => {
          const capped = Math.min(presentCount, totalMeetings - 1);
          const pctLower = calculateAttendancePercentage(capped, totalMeetings);
          const pctHigher = calculateAttendancePercentage(capped + 1, totalMeetings);
          expect(pctHigher).toBeGreaterThanOrEqual(pctLower);
        }
      ),
      { numRuns: 100 }
    );
  });
});
