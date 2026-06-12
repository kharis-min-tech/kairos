import type { AuthContext, RoleScope } from '@kairos/types';
import { ForbiddenError } from '@kairos/utils';

/**
 * Per-request narrowing of authority based on `auth.scope`.
 *
 * Background (Phase 4 of the role-selector feature):
 *   When a user with multiple leaderships logs in via /select-role and picks a
 *   single entry — e.g. "Fellowship Leader — K-Groups Central" — the access
 *   token carries `scope = { kind: 'fellowship', id: <kgroupsId> }`. That scope
 *   acts as a one-entity blinder: even if the user technically also leads
 *   other fellowships (or departments, or branches), this token must NOT grant
 *   them write access to those other entities until they switch role.
 *
 * Contract:
 *   - `auth.scope` undefined → no-op. Legacy tokens and "all my leaderships at
 *     once" sessions hit this path; the caller's full authority still applies.
 *   - `auth.scope.kind !== kind` → no-op. A fellowship-scoped login calling a
 *     department write isn't narrowed by THIS check (it'll be refused by the
 *     department's own `enforceLeaderOrAbove` because the user isn't acting as
 *     a department lead). We intentionally don't cross-block — leaving the
 *     existing membership check to do its job avoids false positives where a
 *     fellowship-scoped leader is doing something legitimately member-level.
 *   - `auth.scope.kind === kind && auth.scope.id !== id` → throw Forbidden.
 *     This is the load-bearing case: the scoped entity doesn't match the
 *     target, so the request is refused.
 *
 * Callers:
 *   - `fellowships/service.ts` — inside `enforceLeaderOrAbove(fellowship)`,
 *     passes `('fellowship', fellowship.id)`.
 *   - `departments/service.ts` — inside `enforceLeaderOrAbove(bd)`,
 *     passes `('department', bd.id)`.
 *   - `branches/service.ts` — inside `enforceBranchAccess`, passes
 *     `('branch', branchId)`.
 *
 * Not applied to read endpoints that the user is otherwise entitled to see
 * (e.g. listing fellowships in their branch). Scope narrows WRITE intent, not
 * read visibility — narrowing reads happens upstream in `getMyLeadership`.
 */
export function enforceScopeAllows(
  auth: AuthContext,
  kind: RoleScope['kind'],
  id: string,
): void {
  const scope = auth.scope;
  if (!scope) return;
  if (scope.kind !== kind) return;
  if (scope.id !== id) {
    throw new ForbiddenError(
      `This action is outside your current ${kind} scope. Switch role to act elsewhere.`,
    );
  }
}
