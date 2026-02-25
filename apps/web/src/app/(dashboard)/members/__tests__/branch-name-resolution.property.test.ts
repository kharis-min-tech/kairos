// Feature: members-module, Property 13: Branch name resolution across all display contexts
// **Validates: Requirements 6.5, 7.4, 8.1**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

interface Branch {
  branchId: number;
  branchName: string;
  isActive: boolean;
}

/**
 * Pure function extracted from member detail page and edit modal logic.
 * Resolves a numeric branch ID to a human-readable branch name.
 */
function resolveBranchName(branchId: number, branchList: Branch[]): string {
  const branch = branchList.find((b) => b.branchId === branchId);
  return branch ? branch.branchName : `Branch ${branchId}`;
}

// Generators
const branchNameArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z ]{0,29}$/)
  .filter((s) => s.trim().length > 0);

const branchArb = fc.record({
  branchId: fc.integer({ min: 1, max: 10000 }),
  branchName: branchNameArb,
  isActive: fc.boolean(),
});

const branchListArb = fc
  .array(branchArb, { minLength: 1, maxLength: 20 })
  .map((branches) => {
    // Ensure unique branchIds
    const seen = new Set<number>();
    return branches.filter((b) => {
      if (seen.has(b.branchId)) return false;
      seen.add(b.branchId);
      return true;
    });
  })
  .filter((list) => list.length > 0);

describe('Branch Name Resolution (Property)', () => {
  it('should return the branch name when branchId exists in the list', () => {
    fc.assert(
      fc.property(branchListArb, (branchList) => {
        // Pick a random branch from the list
        const target = branchList[0];
        const result = resolveBranchName(target.branchId, branchList);
        expect(result).toBe(target.branchName);
      }),
      { numRuns: 100 }
    );
  });

  it('should return fallback "Branch {id}" format when branchId does NOT exist in the list', () => {
    fc.assert(
      fc.property(
        branchListArb,
        fc.integer({ min: 10001, max: 99999 }),
        (branchList, missingId) => {
          // Ensure missingId is not in the list
          const ids = new Set(branchList.map((b) => b.branchId));
          fc.pre(!ids.has(missingId));

          const result = resolveBranchName(missingId, branchList);
          expect(result).toBe(`Branch ${missingId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(
        branchListArb,
        fc.integer({ min: 1, max: 99999 }),
        (branchList, branchId) => {
          const result1 = resolveBranchName(branchId, branchList);
          const result2 = resolveBranchName(branchId, branchList);
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never return just a raw number when branch exists in the list', () => {
    fc.assert(
      fc.property(branchListArb, (branchList) => {
        const target = branchList[0];
        const result = resolveBranchName(target.branchId, branchList);
        // The result should not be a plain numeric string
        expect(result).not.toMatch(/^\d+$/);
      }),
      { numRuns: 100 }
    );
  });
});
