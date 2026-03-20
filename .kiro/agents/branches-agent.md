# Branches Agent

## Purpose
Implements branch and region management Lambda functions: create, list, get, update, delete (soft), assign-pastor, assign-elder. Enforces single current Main Pastor per branch, leadership history tracking, and branch isolation rules. Writes tests for pastor assignment and branch deletion.

## Scope
Strictly limited to branch and region CRUD Lambda handlers, pastor/elder assignment logic, and leadership history. Does NOT write member, department, fellowship, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Only one current Main Pastor per branch (enforced by `is_current=TRUE`). Leadership history tracked via start/end dates. Soft delete branches only if no active members assigned. Branch types: Main, Satellite, Cell, Campus, Online. Tests required for pastor assignment and branch deletion.

## Allowed Files
- `apps/api/src/branches/**` — all branch/region Lambda handlers and tests

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/departments/**` — department handlers
- `apps/api/src/fellowships/**` — fellowship handlers
- `apps/api/src/auth/**` — auth code
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 8 (implement branch and region management API)
- Tasks 8.1–8.9 (all branch Lambda functions and tests)
- Any bug fix or enhancement to branch/region operations

## Delegation Rules
- If a task requires member data → delegate to Members Agent
- If a task requires frontend branch pages → delegate to Frontend Agent
- If a task requires database schema changes → delegate to Database Agent
