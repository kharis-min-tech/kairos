---
name: branches-feature
description: Deliver an end-to-end change in the Branches module — branch CRUD, region management, leadership assignment, service schedule, branch-level UI. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching branches, regions, or branch-leadership.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Branches feature work. Plan, then delegate.

## Module surface

- API: `apps/api/src/branches/{router,service,schemas}.ts`. Routes under `/api/branches`. Regions handled inline.
- Web: `apps/web/src/app/(dashboard)/admin/branches/` (admin) + `apps/web/src/app/(dashboard)/my-branch/page.tsx` (pastor self-view). Hook: `apps/web/src/hooks/use-branches.ts`.
- Database: `branches`, `regions`, `branch_leadership`.

## Business invariants

- A branch belongs to exactly one region; regions are global.
- Only one **current** Main Pastor per branch (`branch_leadership.role='Main Pastor' AND is_current=true`). Enforced by a partial unique index.
- Branches use soft delete (`isActive=false`). Soft-delete is only allowed if no `isActive` members remain on the branch — surface a clear error otherwise.
- `serviceSchedule` is a `jsonb` column shaped as `{ day, time, type }[]`. Edit as a single field, not a separate table.
- Branch types: `'Main' | 'Satellite' | 'Cell' | 'Campus' | 'Online'` (enum in `@kairos/types`).
- Pastors can edit their own branch only. Members read their branch only. Admins read/write all.
- Leadership history is preserved — assigning a new Main Pastor sets `is_current=false` on the previous one and creates a new row.

## Reference

- `apps/api/src/branches/service.ts` — current patterns.
- `requirements/data.md` — branch & region data model.
- `ADMINISTRATION.md` — leadership rules.
- `packages/database/src/schema/branches.ts`, `regions.ts`, `branch-leadership.ts`.

## Orchestration

1. **Plan**: read the user's ask + `requirements/` + current code.
2. **Schema** (if columns/tables change): dispatch `schema-author`.
3. **API**: dispatch `api-implementer` with route/service/DTO spec. Enforce one-Main-Pastor and pastor-can-only-edit-own-branch invariants in tests.
4. **Web**: dispatch `web-implementer` for the relevant pages/hooks. Branch Settings (admin) and My Branch (pastor) share data — coordinate the hook.
5. **Coverage**: `test-author` if gaps remain (esp. branch-soft-delete-blocked-by-active-members).
6. **Review**: `reviewer` over the diff.

Branches changes often need parallel work between the admin pages and the pastor "my branch" page — dispatch `web-implementer` once with both pages, not twice.

## Things to watch for

- Don't expose `regions` create/edit to non-admin roles. The dropdown is read-only for pastors.
- When deactivating a branch, verify no active members remain BEFORE flipping `isActive` — don't trust the foreign-key cascade.
- `serviceSchedule` is optional and shape-validated by Zod, not by the DB. Keep the validation aligned across front + back.
- Don't double-store the pastor name on the branch — always join via `branch_leadership`.
