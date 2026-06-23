'use client';

import { useMemo } from 'react';
import {
  type Capability,
  type Grant,
  type RoleScope,
  type SystemRole,
  RoleCapabilities,
} from '@kairos/types';
import { useAuthStore } from '@/lib/auth-store';

interface JwtPayload {
  systemRole?: SystemRole;
  grants?: Grant[];
}

/**
 * Decode the access-token JWT payload. We don't verify the signature here
 * (server has the key); we only read what's in the token to drive UI
 * affordances. Anything sensitive must still be enforced by the API.
 */
function decodePayload(accessToken: string | null): JwtPayload | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * RBAC Phase 5: capability-driven UI gating. Returns a stable function set
 * derived from the access token's `grants` array. Use for UI affordances —
 * the API still enforces the real gates with the same data.
 *
 *   const caps = useCapabilities();
 *   caps.has('fellowship:write', { kind: 'fellowship', id: f.id });
 */
export function useCapabilities() {
  const accessToken = useAuthStore((s) => s.accessToken);
  // The auth-store also exposes systemRole via `activeRole`. Tests set this
  // directly without minting a real JWT, so we read both sources to stay
  // robust to either path.
  const storeRole = useAuthStore((s) => s.activeRole);

  return useMemo(() => {
    const payload = decodePayload(accessToken);
    const systemRole: SystemRole =
      payload?.systemRole ?? (storeRole as SystemRole | null) ?? 'member';
    const grants = payload?.grants ?? [];

    function has(
      cap: Capability,
      scope?: RoleScope & { branchId?: string },
    ): boolean {
      // Admin shim — matches the server's hasCapability.
      if (systemRole === 'admin') return true;

      const targetBranchId =
        scope?.kind === 'branch' ? scope.id : scope?.branchId;

      for (const grant of grants) {
        if (!RoleCapabilities[grant.role].includes(cap)) continue;
        if (!scope) return true;
        if (grant.scope.kind === scope.kind && grant.scope.id === scope.id) {
          return true;
        }
        if (
          grant.scope.kind === 'branch' &&
          targetBranchId &&
          grant.scope.id === targetBranchId
        ) {
          return true;
        }
      }
      return false;
    }

    /** Returns grants of a specific role (for picker UIs). */
    function grantsOf(role: Grant['role']): Grant[] {
      return grants.filter((g) => g.role === role);
    }

    return { has, grants, grantsOf, systemRole };
  }, [accessToken, storeRole]);
}
