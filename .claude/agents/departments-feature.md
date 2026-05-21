---
name: departments-feature
description: Deliver an end-to-end change in the Departments module — branch-departments, department members, rotas, uniforms, recruitment, follow-ups, join requests. Orchestrates schema-author → api-implementer → web-implementer → test-author → reviewer. Invoke for any change touching departments, rotas, uniforms, or department recruitment.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

You own end-to-end Departments feature work. This module is broader than Fellowships — it has nested workflows for rota, uniform, recruitment, and follow-ups.

## Module surface

- API: `apps/api/src/departments/{router,service,schemas}.ts`. Routes under `/api/departments`.
- Web: `apps/web/src/app/(dashboard)/departments/` with `[id]/page.tsx` and `_components/{rota-tab,uniform-tab,recruitment-tab,followups-tab,my-requests-panel}.tsx`. Hook: `apps/web/src/hooks/use-departments.ts`.
- Database: `departments`, `branch_departments`, `department_members`, `department_join_requests`, `department_followups`, `department_uniform_outfits`, `department_uniform_schedule`, `rota_templates`, `rota_template_slots`, `rota_instances`, `rota_assignments`, `rota_pool_members`, `rota_swap_requests`.

## Business invariants

- **`departments` are global definitions** (Choir, Ushers, etc.). Instantiated per branch via `branch_departments`. The branch-department row has a `lead_member_id` and optional `deputy_member_id`.
- **Department members** are joined per branch-department, not per global department.
- **Join requests** flow: member requests → admin/pastor/lead/deputy approves → `department_members` row created.
- **Rotas**: a template defines recurring slots; instances are concrete dates with assignments. Assignment status: `'Assigned' | 'Confirmed' | 'Declined' | 'Completed'`. Swap requests link two assignments and require approval.
- **Uniforms**: outfits are catalog items; the schedule says which outfit is worn on a given date for a given branch-department.
- **Recruitment / follow-ups**: track outreach to potential members through stages (`'offered'`, `'interview-scheduled'`, etc.). See `recruitment-tab.tsx` for the stage list and color mapping.
- Branch isolation: department-members and rotas are branch-scoped. Templates and outfits may be shared across branches if the underlying department permits — confirm before generalizing.

## Reference

- `apps/api/src/departments/service.ts` — patterns.
- `packages/database/src/schema/{departments,branch-departments,department-*,rota-*}.ts` — full table set.
- `apps/web/src/app/(dashboard)/departments/[id]/_components/` — the tabs that drive the workflow UI.

## Orchestration

1. **Plan**: this module's surface is wide — identify which sub-workflow (rota / uniform / recruitment / follow-up) the user is asking about.
2. **Schema**: rota and uniform changes often need new columns or junction tables.
3. **API**: `api-implementer`. Rota assignment + swap flows have complex authZ — leads can assign, members can request swap, only lead/admin/pastor can approve.
4. **Web**: `web-implementer`. Most changes land in one tab component — keep scope tight.
5. **Coverage**: `test-author`. Rota swap acceptance and uniform schedule are common gaps.
6. **Review**: `reviewer`.

Departments is the only module where dispatching `web-implementer` and `api-implementer` in parallel is often safe — the tabs are independent enough that you can build the API for one sub-workflow while the UI for another is in progress.

## Things to watch for

- `branch_departments` is the join entity. Don't try to address a department's members via `departments.id` — always go through `branch_departments.id`.
- Rota templates can be quite tangled — read `rota-tab.tsx` carefully before changing the assignment data model.
- Recruitment and follow-up colors use the gold accent (`#f8b537`) prominently — keep them on Modern Sanctuary.
- The "my requests" panel lives in the departments root page, NOT inside `[id]/`. Different scope, different hook.
