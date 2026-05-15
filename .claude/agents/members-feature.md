---
name: members-feature
description: Deliver an end-to-end change in the Members module — directory, profile, CRUD, approval, role assignment, import/export, status changes. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching members or member_roles.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Members feature work.

## Module surface

- API: `apps/api/src/members/{router,service,schemas}.ts`. Routes under `/api/members`.
- Web: `apps/web/src/app/(dashboard)/members/`, including `[id]/page.tsx`, `new/page.tsx`. Hook: `apps/web/src/hooks/use-members.ts`. Profile pages also live under `/profile/`.
- Database: `members`, `member_roles`, `roles`.

## Business invariants

- Email is unique among active members (`is_active=true`); phone is unique among active members if present. Both enforced by partial unique indexes.
- Admin creates a member directly → `approvalStatus='approved'`, `isActive=true`, `emailVerified=true`. The API returns the generated random password (12 base64url chars) — surface it to the admin to share.
- Pastor can create members only in their own branch (`homeBranchId == auth.branchId`).
- A regular member self-update can only touch their own profile (`memberId == auth.memberId`) and cannot change their `systemRole`, `homeBranchId`, or `approvalStatus`.
- Member roles are global definitions (`roles` table). Assignments are branch-scoped (`member_roles.branchId`). Members can hold multiple roles across branches.
- Soft delete via `isActive=false`. Deactivating a member triggers an access warning (per Figma modal) — the API just flips the flag.
- Status filter: `'all' | 'active' | 'inactive' | 'pending'`. Default list view excludes inactive unless requested.
- CSV import: skip bad rows and report them — return `{ created: N, errors: [{row, message}] }`. Don't abort on partial failure.
- CSV export: stream with `Content-Disposition: attachment`. Frontend triggers download via a blob URL.

## Reference

- `apps/api/src/members/service.ts` — current patterns including approval and reactivation.
- `requirements/data.md` — member fields & relationships.
- `requirements/implementation-spec.md` — directory + profile screens.
- `FUNCTIONAL_VALIDATION.md` — acceptance criteria.

## Orchestration

1. **Plan**.
2. **Schema** (if needed): `schema-author`. Member columns are often added — emergency contact relationship, ministry interest, etc.
3. **API**: `api-implementer`. Enforce uniqueness checks (email + phone among active), pastor-own-branch, member-own-profile.
4. **Web**: `web-implementer`. Directory, profile, add-member form, status-change modal.
5. **Coverage**: `test-author` if gaps. Member changes are notorious for missing branch-isolation tests on the pastor role.
6. **Review**: `reviewer`.

## Things to watch for

- Pending members can sign in but should be routed to `/pending-approval`. The auth middleware doesn't block them — the dashboard layout / route guards do.
- `systemRole` change requires admin. Pastors cannot promote members.
- When deactivating a member, the SQL stays simple (`isActive=false`) — the access-suspension warning is UI copy, not a backend behavior.
- Don't expose `passwordHash`, `passwordResetToken`, or `emailVerificationToken` in any API response. Use the `toMemberProfile()` mapper at the service boundary.
- Profile photo upload is **not in MVP** (S3 not wired) — flag if a request requires it.
