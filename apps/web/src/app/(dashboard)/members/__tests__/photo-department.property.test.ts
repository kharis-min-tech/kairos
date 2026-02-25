// Feature: members-module, Property 8: Photo file size validation rejects files over 5 MB
// Feature: members-module, Property 12: Department and fellowship display shows name and join date
// **Validates: Requirements 4.4, 6.1, 6.2**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions under test ---

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes

function validatePhotoFileSize(fileSize: number): { valid: boolean; error: string | null } {
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'Photo must be less than 5 MB' };
  }
  return { valid: true, error: null };
}

interface DepartmentAssignment {
  departmentMemberId: number;
  departmentName: string;
  joinDate: string;
  isActive: boolean;
}

interface FellowshipAssignment {
  fellowshipMemberId: number;
  fellowshipName: string;
  joinDate: string;
  isActive: boolean;
}

function formatAssignmentDisplay(name: string, joinDate: string): { name: string; joinDateFormatted: string } {
  return {
    name,
    joinDateFormatted: `Joined ${new Date(joinDate).toLocaleDateString('en-GB')}`,
  };
}

// --- Generators ---

/** Generate a valid YYYY-MM-DD date string within 2020–2026 */
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2026 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const departmentNameArb = fc.stringMatching(/^[A-Za-z ]{1,50}$/);
const fellowshipNameArb = fc.stringMatching(/^[A-Za-z ]{1,50}$/);

const departmentAssignmentArb: fc.Arbitrary<DepartmentAssignment> = fc.record({
  departmentMemberId: fc.integer({ min: 1, max: 10000 }),
  departmentName: departmentNameArb,
  joinDate: dateStringArb,
  isActive: fc.constant(true),
});

const fellowshipAssignmentArb: fc.Arbitrary<FellowshipAssignment> = fc.record({
  fellowshipMemberId: fc.integer({ min: 1, max: 10000 }),
  fellowshipName: fellowshipNameArb,
  joinDate: dateStringArb,
  isActive: fc.constant(true),
});

// --- Property 8: Photo file size validation rejects files over 5 MB ---

describe('Property 8: Photo file size validation rejects files over 5 MB', () => {
  it('files larger than 5 MB are always rejected with correct error message', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 }),
        (fileSize) => {
          const result = validatePhotoFileSize(fileSize);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Photo must be less than 5 MB');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('files at or below 5 MB are always accepted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (fileSize) => {
          const result = validatePhotoFileSize(fileSize);
          expect(result.valid).toBe(true);
          expect(result.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: exactly 5,242,880 bytes is accepted, 5,242,881 bytes is rejected', () => {
    const atLimit = validatePhotoFileSize(5_242_880);
    expect(atLimit.valid).toBe(true);
    expect(atLimit.error).toBeNull();

    const overLimit = validatePhotoFileSize(5_242_881);
    expect(overLimit.valid).toBe(false);
    expect(overLimit.error).toBe('Photo must be less than 5 MB');
  });
});

// --- Property 12: Department and fellowship display shows name and join date ---

describe('Property 12: Department and fellowship display shows name and join date', () => {
  it('each department assignment produces a display with the department name', () => {
    fc.assert(
      fc.property(departmentAssignmentArb, (dept) => {
        const display = formatAssignmentDisplay(dept.departmentName, dept.joinDate);
        expect(display.name).toBe(dept.departmentName);
      }),
      { numRuns: 100 }
    );
  });

  it('each department assignment produces a formatted join date starting with "Joined"', () => {
    fc.assert(
      fc.property(departmentAssignmentArb, (dept) => {
        const display = formatAssignmentDisplay(dept.departmentName, dept.joinDate);
        expect(display.joinDateFormatted).toMatch(/^Joined /);
      }),
      { numRuns: 100 }
    );
  });

  it('each fellowship assignment produces a display with the fellowship name', () => {
    fc.assert(
      fc.property(fellowshipAssignmentArb, (fel) => {
        const display = formatAssignmentDisplay(fel.fellowshipName, fel.joinDate);
        expect(display.name).toBe(fel.fellowshipName);
      }),
      { numRuns: 100 }
    );
  });

  it('join date is formatted as DD/MM/YYYY (en-GB locale)', () => {
    fc.assert(
      fc.property(dateStringArb, (dateStr) => {
        const display = formatAssignmentDisplay('Test', dateStr);
        // Strip the "Joined " prefix and check DD/MM/YYYY format
        const dateOnly = display.joinDateFormatted.replace('Joined ', '');
        expect(dateOnly).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      }),
      { numRuns: 100 }
    );
  });
});
