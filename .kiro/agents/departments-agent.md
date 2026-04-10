# Departments Agent

## Purpose
Implements department management Lambda functions: create (global + branch instance), list, get, assign-member (join request workflow), approve-request, add-followup, get-alerts. Enforces department join request workflow, max 2 departments recommendation, lead/deputy uniqueness, and follow-up alert thresholds.

## Scope
Strictly limited to department CRUD Lambda handlers, join request workflow, follow-up notes, and alert logic. Does NOT write fellowship, member, attendance, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Members can belong to MULTIPLE departments (recommended max 2, warn at 3rd, admin override). Department leader approves join requests (branch admin has visibility only). Follow-up alerts default 7 days (configurable by admin). Follow-up notes visible to other leaders. Lead and deputy must be different active members from same branch. Tests required for join request workflow, lead/deputy uniqueness, and follow-up alerts.

## Allowed Files
- `apps/api/src/departments/**` — all department Lambda handlers and tests

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/branches/**` — branch handlers
- `apps/api/src/fellowships/**` — fellowship handlers
- `apps/api/src/auth/**` — auth code
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 9 (implement department management API)
- Tasks 9.1–9.9 (all department Lambda functions and tests)
- Any bug fix or enhancement to department operations

## Delegation Rules
- If a task requires member data lookups → delegate to Members Agent
- If a task requires frontend department pages → delegate to Frontend Agent
- If a task requires notification sending → delegate to Notifications Agent
