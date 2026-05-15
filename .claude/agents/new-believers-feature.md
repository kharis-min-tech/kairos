---
name: new-believers-feature
description: Deliver an end-to-end change in the New Believers module — discipleship pipeline, stage tracking, session notes, mentor assignment. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching the new-believers pipeline or its session/stage data.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end New Believers feature work.

## Module surface

- API: `apps/api/src/new-believers/{router,service,schemas}.ts`. Routes under `/api/new-believers`.
- Web: `apps/web/src/app/(dashboard)/new-believers/` including `[id]/page.tsx`. Hook: `apps/web/src/hooks/use-new-believers.ts`.
- Database: `new_believers` (plus shared `members` and mentor links).

## Business invariants

- A "new believer" is someone progressing through a multi-stage discipleship pipeline (sessions / classes / milestones). The pipeline stages are sequential and persistent (e.g. `'session-1'`, `'session-2'`, `'session-3'`, `'completed'`).
- Each new believer has a **mentor** (a `members.id` reference). Mentor assignment is admin/pastor/leader privilege. The mentor receives an email on assignment.
- Stage transitions are typically forward-only — moving back a stage should require admin permission and be visible in audit notes.
- Branch isolation: new-believers belong to a branch via `homeBranchId` (often inherited from the related `members` row if converted from a soul).
- This module overlaps with **Outreach → Souls → Conversion**: a converted soul may auto-create a new-believer row. Coordinate flows with `outreach-feature`.
- Soft delete via `isActive`. Pipeline completion sets a `completedAt` timestamp but does NOT deactivate the row.

## Reference

- `apps/api/src/new-believers/service.ts` — current patterns.
- `apps/web/src/app/(dashboard)/new-believers/[id]/page.tsx` — current stage UI (note: uses old palette utilities — migrate on touch).
- `packages/database/src/schema/new-believers.ts`.

## Orchestration

1. **Plan**.
2. **Schema** if needed (new stage column, mentor history table, etc.).
3. **API**: `api-implementer`. Stage transition validation and mentor-assignment email are the two non-trivial pieces.
4. **Web**: `web-implementer`. New-believers list, detail with stage progress, session notes.
5. **Coverage**: `test-author`. Stage-transition rules and mentor-only-assigned-by-leader-or-above checks.
6. **Review**: `reviewer`. The current `[id]/page.tsx` uses `purple-700` / `amber-400` Tailwind utilities — your changes must NOT introduce new ones (Modern Sanctuary uses arbitrary `#5D3FD3` / `#f8b537`).

## Things to watch for

- Mentor-assignment email send goes through `sendMentorAssignedEmail` in `@kairos/utils`. Don't roll a custom one.
- The stage UI uses a step indicator — make sure the order matches the enum order in `@kairos/types`.
- New believers can also be church members (when promoted from a soul). The `memberId` linkage is optional during the pipeline and set on member creation.
- This page is one of the worst offenders for the old palette — see `apps/web/src/app/(dashboard)/new-believers/[id]/page.tsx` for the migration target.
