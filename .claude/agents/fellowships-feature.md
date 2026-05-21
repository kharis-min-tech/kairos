---
name: fellowships-feature
description: Deliver an end-to-end change in the Fellowships module — fellowship CRUD, members, meetings, attendance, join requests, five subtypes. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching fellowships, fellowship members, meetings, attendance, or join requests.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Fellowships feature work.

## Module surface

- API: `apps/api/src/fellowships/{router,service,schemas}.ts`. Routes under `/api/fellowships`.
- Web: `apps/web/src/app/(dashboard)/fellowships/` (list + `[id]/page.tsx` with Meetings / Attendance / Members tabs). Hook: `apps/web/src/hooks/use-fellowships.ts`.
- Database: `fellowships`, `fellowship_members`, `fellowship_meetings`, `fellowship_meeting_attendance`, `fellowship_join_requests`.

## Business invariants

- **Five subtypes** (`fellowshipType` enum): `'K-Groups' | 'Kharis Express' | 'New Breeds' | 'Kharis on Campus' | 'Kharis on Campus Colleges'`. The page header always says "Fellowships"; subtypes are filter pills.
- **One fellowship per member per branch.** Enforced at the service level in `addFellowshipMember` — query `fellowshipMembers` for any active record with `memberId=X` in the same branch, throw `ConflictError` if found.
- **Leader-or-above writes**: `enforceLeaderOrAbove(auth, fellowship)` passes if admin, pastor, leader-of-this-fellowship, or co-leader-of-this-fellowship. Applied to all write operations in `fellowships/service.ts`.
- **Join requests**: members self-request via `POST /api/fellowships/:id/join-requests`. Admin / pastor / leader review via GET + PATCH. Approval creates the `fellowshipMembers` row; rejection just updates request status. Unique (fellowship_id, member_id) prevents duplicates.
- Attendance status: `'Present' | 'Absent' | 'Excused' | 'Late'`. Each meeting has one attendance row per fellowship member.
- Soft delete: `fellowships.isActive=false` removes from default lists. Meetings tied to deactivated fellowships are NOT cascaded — they preserve history.
- Branch isolation: non-admin/non-pastor see fellowships in their own branch only.

## Reference

- `apps/api/src/fellowships/service.ts` — full pattern reference for both `enforceBranchScope` and `enforceLeaderOrAbove`.
- `requirements/mvp-scope.md` — fellowship scope per persona.
- `packages/database/src/schema/fellowships.ts` and `fellowship-*.ts`.

## Orchestration

1. **Plan**.
2. **Schema** if needed (e.g. new fellowship metadata column, new attendance status).
3. **API**: `api-implementer`. Pay close attention to join-request approval atomicity — the `INSERT INTO fellowship_members` and the `UPDATE fellowship_join_requests SET status='approved'` should be in one Drizzle transaction.
4. **Web**: `web-implementer`. List → Detail (3 tabs) → Attendance UI. Forms for create/edit and attendance recording.
5. **Coverage**: `test-author`. Branch-isolation + leader-permission tests are essential.
6. **Review**: `reviewer`.

## Things to watch for

- Leaders can manage their own fellowship but cannot create new ones (admin/pastor only).
- Past meetings should be read-only once attendance is recorded — confirm with the user before allowing edits to historical attendance.
- `meetingDate` is a string (ISO date) — don't introduce JS `Date` objects across the boundary.
- The 5 subtypes are a fixed enum — adding a 6th requires a DB CHECK constraint update and an `@kairos/types` enum bump.
- Notifications-to-fellowship and member-self-remove-from-fellowship are **deferred** (per the gap-fix plan) — flag if requested.
