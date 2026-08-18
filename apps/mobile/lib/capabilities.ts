import { useMemo } from 'react';
import {
  type Capability,
  type Grant,
  type RoleScope,
  type SystemRole,
  RoleCapabilities,
} from '@kairos/types';
import { useAuthStore } from '@/store/auth';

interface JwtPayload {
  systemRole?: SystemRole;
  grants?: Grant[];
}

/**
 * Decode the access-token JWT payload. Signature isn't verified here — the
 * API is the enforcer; the token is only used to drive UI affordances.
 * Mirrors apps/web/src/hooks/use-capabilities.ts so the two clients gate on
 * the same rules.
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
 * Mobile capability hook. Same contract as the web version:
 *
 *   const caps = useCapabilities();
 *   if (caps.has('branch:write', { kind: 'branch', id: branchId })) { ... }
 *
 * System admins short-circuit true. Everyone else needs a matching grant.
 */
export function useCapabilities() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userSystemRole = useAuthStore((s) => s.user?.systemRole ?? null);

  return useMemo(() => {
    const payload = decodePayload(accessToken);
    const systemRole: SystemRole =
      payload?.systemRole ?? (userSystemRole as SystemRole | null) ?? 'member';
    const grants = payload?.grants ?? [];

    function has(
      cap: Capability,
      scope?: RoleScope & { branchId?: string },
    ): boolean {
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

    function grantsOf(role: Grant['role']): Grant[] {
      return grants.filter((g) => g.role === role);
    }

    return { has, grants, grantsOf, systemRole };
  }, [accessToken, userSystemRole]);
}
