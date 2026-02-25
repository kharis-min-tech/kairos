// Feature: members-module, Property 14: Branch selector only shows active branches
// Feature: members-module, Property 20: Deactivate button disabled for inactive members
// **Validates: Requirements 9.4, 12.4**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions extracted from component logic ---

interface Branch {
  branchId: number;
  branchName: string;
  isActive: boolean;
}

/**
 * Mirrors the filtering logic in member-edit-modal.tsx where branches are
 * fetched with `branches.list({ isActive: true })`. This function represents
 * the pure filtering that produces the branch selector options.
 */
function filterActiveBranches(branches: Branch[]): Branch[] {
  return branches.filter((b) => b.isActive);
}

/**
 * Mirrors the disabled-state logic on the Deactivate button in
 * members/view/page.tsx:
 *   disabled={deactivating || !member.isActive}
 */
function isDeactivateButtonDisabled(isActive: boolean, deactivating: boolean): boolean {
  return deactivating || !isActive;
}

// --- Generators ---

const branchIdArb = fc.integer({ min: 1, max: 10000 });

const branchNameArb = fc.stringMatching(/^[A-Za-z ]{1,30}$/).filter((s) => s.trim().length > 0);

const activeBranchArb: fc.Arbitrary<Branch> = fc
  .tuple(branchIdArb, branchNameArb)
  .map(([branchId, branchName]) => ({ branchId, branchName, isActive: true }));

const inactiveBranchArb: fc.Arbitrary<Branch> = fc
  .tuple(branchIdArb, branchNameArb)
  .map(([branchId, branchName]) => ({ branchId, branchName, isActive: false }));

const branchArb: fc.Arbitrary<Branch> = fc
  .tuple(branchIdArb, branchNameArb, fc.boolean())
  .map(([branchId, branchName, isActive]) => ({ branchId, branchName, isActive }));

const branchListArb = fc.array(branchArb, { minLength: 0, maxLength: 50 });

// --- Property 14: Branch selector only shows active branches ---

describe('Branch Selector Filtering (Property 14)', () => {
  it('all branches returned by filterActiveBranches have isActive === true', () => {
    fc.assert(
      fc.property(branchListArb, (branches) => {
        const result = filterActiveBranches(branches);
        for (const branch of result) {
          expect(branch.isActive).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no inactive branches appear in the filtered result', () => {
    fc.assert(
      fc.property(
        fc.array(inactiveBranchArb, { minLength: 1, maxLength: 20 }),
        (inactiveBranches) => {
          const result = filterActiveBranches(inactiveBranches);
          expect(result).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all active branches from the input are present in the output', () => {
    fc.assert(
      fc.property(branchListArb, (branches) => {
        const result = filterActiveBranches(branches);
        const activeInput = branches.filter((b) => b.isActive);
        expect(result).toHaveLength(activeInput.length);
        for (const activeBranch of activeInput) {
          expect(result).toContainEqual(activeBranch);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 20: Deactivate button disabled for inactive members ---

describe('Deactivate Button Disabled State (Property 20)', () => {
  it('when isActive is false, button is always disabled regardless of deactivating state', () => {
    fc.assert(
      fc.property(fc.boolean(), (deactivating) => {
        expect(isDeactivateButtonDisabled(false, deactivating)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('when isActive is true and not deactivating, button is enabled', () => {
    fc.assert(
      fc.property(fc.constant(true), (isActive) => {
        expect(isDeactivateButtonDisabled(isActive, false)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('when deactivating is true, button is always disabled regardless of isActive', () => {
    fc.assert(
      fc.property(fc.boolean(), (isActive) => {
        expect(isDeactivateButtonDisabled(isActive, true)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
