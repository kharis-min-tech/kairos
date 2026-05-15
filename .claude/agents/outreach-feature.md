---
name: outreach-feature
description: Deliver an end-to-end change in the Outreach module — outreach programs, souls pipeline, follow-ups, conversion tracking. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching outreach programs, souls, or follow-ups.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Outreach feature work.

## Module surface

- API: `apps/api/src/outreach/{router.ts,souls-router.ts}` and services. Routes under `/api/outreach` and `/api/souls`.
- Web: `apps/web/src/app/(dashboard)/outreach/`, `apps/web/src/app/(dashboard)/souls/`, `apps/web/src/app/(dashboard)/souls-dashboard/`. Stores: `apps/web/src/stores/{outreach-store,souls-store}.ts`. Hook(s): `apps/web/src/hooks/`.
- Database: `outreach_programs`, `outreach_participants`, `souls`, `follow_ups`.

## Business invariants

- An **outreach program** is a branch-scoped evangelism event. Participants are church members on the outreach team.
- **Souls** are people contacted during outreach — they are NOT members yet. They progress through statuses: `'New' → 'Following Up' → 'Interested' → ('Converted' | 'Not Interested')`.
- When a soul is `'Converted'`, the system can optionally create a `members` row and set `souls.converted_to_member_id`. The member record links back to the soul history.
- **Follow-ups** record one contact event per row: `contact_method` (`Call` / `Visit` / `Message`), `contact_status` (outcome), `duration_minutes`, notes. Multiple follow-ups per soul.
- Branch isolation: souls belong to an outreach program; outreach programs belong to a branch. Non-admin/non-pastor access is filtered through the program's branch.
- Soft delete on programs (`isActive=false`); souls preserve history — don't hard-delete even on "not interested".
- Souls list views support filtering by status + program + assigned follow-up worker.

## Reference

- `apps/api/src/outreach/router.ts`, `souls-router.ts` — current route shapes.
- `apps/web/src/stores/souls-store.ts`, `outreach-store.ts` — Zustand state for cross-page wizard flows.
- `packages/database/src/schema/{outreach-programs,outreach-participants,souls,follow-ups}.ts`.

## Orchestration

1. **Plan**. Outreach has TWO route groups (`/api/outreach` and `/api/souls`) — clarify which the change targets.
2. **Schema** if needed.
3. **API**: `api-implementer`. Soul status transitions are state-machine-ish — validate allowed transitions in the service layer.
4. **Web**: `web-implementer`. Note the Zustand stores hold draft state for multi-step soul capture — don't break those flows.
5. **Coverage**: `test-author`. Status transitions and the "soul → member" conversion path are critical paths to test.
6. **Review**: `reviewer`.

## Things to watch for

- `souls.converted_to_member_id` is nullable until conversion. Don't make it required.
- Follow-ups are append-only by convention — edits should be flagged in the audit log if added later.
- The souls Zustand store uses optimistic local updates; ensure mutations invalidate the TanStack Query cache so the store + cache don't drift.
- Outreach programs can have multiple branches participating in future scope — current MVP is single-branch per program.
