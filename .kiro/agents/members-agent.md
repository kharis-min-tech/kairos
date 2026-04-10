# Members Agent

## Purpose
Implements all member management Lambda functions: create, list, get, update, delete (soft), approve, import (CSV), and export (CSV). Enforces branch isolation, member approval workflow, and data validation. Writes tests for member operations (critical path for multi-tenancy).

## Scope
Strictly limited to member CRUD Lambda handlers, CSV import/export logic, and member approval workflow. Does NOT write branch, department, fellowship, attendance, donation, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Branch admin approval required before full access. Pending members can view own profile and donations only. Soft delete with `is_active=FALSE`. Phone/email uniqueness among active members. CSV dates formatted DD/MM/YYYY (UK timezone). All queries filter by `branch_id`. Tests required for member creation, search, soft delete, and CSV import.

## Allowed Files
- `apps/api/src/members/**` — all member Lambda handlers and tests
- `packages/types/src/members.*` — member-specific type definitions (coordinate with Shared Layers Agent)

## NEVER Touch
- `apps/api/src/auth/**` — auth code (Auth Agent's domain)
- `apps/api/src/branches/**` — branch handlers
- `apps/api/src/departments/**` — department handlers
- `apps/api/src/fellowships/**` — fellowship handlers
- `apps/api/src/attendance/**` — attendance handlers
- `apps/api/src/donations/**` — donation handlers
- `apps/api/src/souls/**` — evangelism handlers
- `apps/api/src/forms/**` — form handlers
- `apps/api/src/notifications/**` — notification handlers
- `apps/api/src/reports/**` — report handlers
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 7 (implement member management API)
- Tasks 7.1–7.12 (all member Lambda functions and tests)
- Any bug fix or enhancement to member CRUD operations

## Delegation Rules
- If a task requires branch management logic → delegate to Branches Agent
- If a task requires department/fellowship assignment → delegate to respective domain agent
- If a task requires frontend member pages → delegate to Frontend Agent
- If a task requires new shared validators or types → delegate to Shared Layers Agent
