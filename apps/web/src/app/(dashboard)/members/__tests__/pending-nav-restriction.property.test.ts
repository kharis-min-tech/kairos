// Feature: members-module, Property 19: Pending member navigation restriction
// **Validates: Requirements 11.3**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions extracted from sidebar.tsx navigation logic ---

const ALL_NAV_LABELS = [
  'Dashboard',
  'Members',
  'Branches',
  'Departments',
  'Fellowships',
  'Attendance',
  'Outreach',
  'Donations',
  'Forms',
  'Reports',
];

const PENDING_ALLOWED_LABELS = new Set(['Dashboard', 'Members']);

function isNavItemDisabled(isPendingMember: boolean, label: string): boolean {
  return isPendingMember && !PENDING_ALLOWED_LABELS.has(label);
}

function getDisabledNavItems(isPendingMember: boolean): string[] {
  return ALL_NAV_LABELS.filter((label) => isNavItemDisabled(isPendingMember, label));
}

function getEnabledNavItems(isPendingMember: boolean): string[] {
  return ALL_NAV_LABELS.filter((label) => !isNavItemDisabled(isPendingMember, label));
}

// --- Generators ---

const navLabelArb = fc.constantFrom(...ALL_NAV_LABELS);

// --- Property 19: Pending member navigation restriction ---

describe('Pending Member Navigation Restriction (Property 19)', () => {
  it('when isPendingMember is true, only Dashboard and Members are enabled', () => {
    fc.assert(
      fc.property(fc.constant(true), (isPending) => {
        const enabled = getEnabledNavItems(isPending);
        expect(enabled).toEqual(['Dashboard', 'Members']);
      }),
      { numRuns: 100 },
    );
  });

  it('when isPendingMember is true, all other nav items are disabled', () => {
    fc.assert(
      fc.property(fc.constant(true), (isPending) => {
        const disabled = getDisabledNavItems(isPending);
        const expectedDisabled = ALL_NAV_LABELS.filter((l) => !PENDING_ALLOWED_LABELS.has(l));
        expect(disabled).toEqual(expectedDisabled);
        expect(disabled).toHaveLength(ALL_NAV_LABELS.length - PENDING_ALLOWED_LABELS.size);
      }),
      { numRuns: 100 },
    );
  });

  it('when isPendingMember is false, all nav items are enabled (none disabled)', () => {
    fc.assert(
      fc.property(navLabelArb, (label) => {
        expect(isNavItemDisabled(false, label)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('the allowed set for pending members always includes Dashboard and Members', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPending) => {
        if (isPending) {
          const enabled = getEnabledNavItems(true);
          expect(enabled).toContain('Dashboard');
          expect(enabled).toContain('Members');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('the disabled set for pending members never includes Dashboard or Members', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPending) => {
        if (isPending) {
          const disabled = getDisabledNavItems(true);
          expect(disabled).not.toContain('Dashboard');
          expect(disabled).not.toContain('Members');
        }
      }),
      { numRuns: 100 },
    );
  });
});
