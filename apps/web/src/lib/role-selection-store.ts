import { create } from 'zustand';
import type { RoleOption } from '@kairos/types';

/**
 * In-memory stash for the two-step login flow (Phase 2 of roadmap item 9).
 *
 * When the API decides the caller has multiple roles, the login response
 * carries `{ sessionToken, availableRoles }` instead of tokens/member. The
 * `/login` page parks those here, then routes the user to `/select-role`.
 *
 * Intentionally NOT persisted to localStorage:
 *  - `sessionToken` has a 5-minute TTL on the server; outliving the tab is
 *    pointless and slightly leakier.
 *  - The picker is a one-shot. Cleared on successful finalize, on `/login`
 *    mount, or on logout. If the user reloads `/select-role` after the in-
 *    memory stash is gone, the page redirects them back to `/login`.
 */
interface RoleSelectionState {
  sessionToken: string | null;
  availableRoles: RoleOption[];
  setRoleSelection: (data: { sessionToken: string; availableRoles: RoleOption[] }) => void;
  clearRoleSelection: () => void;
}

export const useRoleSelectionStore = create<RoleSelectionState>((set) => ({
  sessionToken: null,
  availableRoles: [],
  setRoleSelection: ({ sessionToken, availableRoles }) =>
    set({ sessionToken, availableRoles }),
  clearRoleSelection: () => set({ sessionToken: null, availableRoles: [] }),
}));
