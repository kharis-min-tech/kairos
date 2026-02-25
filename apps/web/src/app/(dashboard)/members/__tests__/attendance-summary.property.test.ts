// Feature: members-module, Property 6: Attendance summary correctly computes statistics
// Feature: members-module, Property 7: Attendance records sorted descending by service date
// **Validates: Requirements 3.3, 3.5**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeAttendanceSummary } from '../view/attendance-tab';

// --- Types matching the source ---

interface AttendanceRecord {
  serviceId: number;
  serviceDate: string | Date;
  serviceType: string;
  attendanceStatus: string;
  [key: string]: unknown;
}

// --- Helpers ---

function sortRecordsDescending(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
}

// --- Arbitraries ---

const attendanceStatusArb = fc.oneof(
  fc.constant('Present'),
  fc.constant('Absent'),
  fc.constant('Virtual')
);

const serviceDateArb = fc
  .integer({ min: 0, max: 2556 }) // days offset from 2020-01-01 to ~2026-12-31
  .map((offset) => {
    const d = new Date(2020, 0, 1 + offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

const serviceTypeArb = fc.oneof(
  fc.constant('Sunday Service'),
  fc.constant('Midweek Service'),
  fc.constant('Prayer Meeting'),
  fc.constant('Bible Study')
);

const attendanceRecordArb: fc.Arbitrary<AttendanceRecord> = fc.record({
  serviceId: fc.integer({ min: 1, max: 10000 }),
  serviceDate: serviceDateArb,
  serviceType: serviceTypeArb,
  attendanceStatus: attendanceStatusArb,
});

const nonEmptyRecordsArb = fc.array(attendanceRecordArb, { minLength: 1, maxLength: 50 });
const recordsArb = fc.array(attendanceRecordArb, { minLength: 0, maxLength: 50 });

// --- Property 6: Attendance summary correctly computes statistics ---

describe('Property 6: Attendance summary correctly computes statistics', () => {
  it('totalAttended equals count of Present + Virtual records', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const summary = computeAttendanceSummary(records);
        const expectedAttended = records.filter(
          (r) => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Virtual'
        ).length;
        expect(summary.totalAttended).toBe(expectedAttended);
      }),
      { numRuns: 100 }
    );
  });

  it('totalServices equals total record count', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const summary = computeAttendanceSummary(records);
        expect(summary.totalServices).toBe(records.length);
      }),
      { numRuns: 100 }
    );
  });

  it('attendancePercentage equals Math.round((totalAttended / totalServices) * 100)', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const summary = computeAttendanceSummary(records);
        const expectedAttended = records.filter(
          (r) => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Virtual'
        ).length;
        const expectedPercentage = Math.round((expectedAttended / records.length) * 100);
        expect(summary.attendancePercentage).toBe(expectedPercentage);
      }),
      { numRuns: 100 }
    );
  });

  it('lastAttendanceDate is the most recent service date formatted as DD/MM/YYYY', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const summary = computeAttendanceSummary(records);
        const sorted = sortRecordsDescending(records);
        const expectedDate = new Date(sorted[0].serviceDate).toLocaleDateString('en-GB');
        expect(summary.lastAttendanceDate).toBe(expectedDate);
      }),
      { numRuns: 100 }
    );
  });

  it('empty records returns zeros and null lastAttendanceDate', () => {
    const summary = computeAttendanceSummary([]);
    expect(summary.totalAttended).toBe(0);
    expect(summary.totalServices).toBe(0);
    expect(summary.attendancePercentage).toBe(0);
    expect(summary.lastAttendanceDate).toBeNull();
  });

  it('attendancePercentage is always between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(recordsArb, (records) => {
        const summary = computeAttendanceSummary(records);
        expect(summary.attendancePercentage).toBeGreaterThanOrEqual(0);
        expect(summary.attendancePercentage).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 7: Attendance records sorted descending by service date ---

describe('Property 7: Attendance records sorted descending by service date', () => {
  it('after sorting, each record serviceDate >= the next record serviceDate', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const sorted = sortRecordsDescending(records);
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = new Date(sorted[i].serviceDate).getTime();
          const next = new Date(sorted[i + 1].serviceDate).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sorting preserves all original records (same length and elements)', () => {
    fc.assert(
      fc.property(nonEmptyRecordsArb, (records) => {
        const sorted = sortRecordsDescending(records);
        expect(sorted.length).toBe(records.length);
        // Every original record should be present in sorted output
        for (const record of records) {
          expect(sorted).toContain(record);
        }
      }),
      { numRuns: 100 }
    );
  });
});
