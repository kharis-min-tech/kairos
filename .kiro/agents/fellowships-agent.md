# Fellowships Agent

## Purpose
Implements fellowship management Lambda functions: create, list, get, add-member, remove-member, send-message. Enforces single fellowship membership constraint, fellowship types, and leader/co-leader assignment. Writes tests for single-membership constraint.

## Scope
Strictly limited to fellowship CRUD Lambda handlers, member assignment (one fellowship only), and broadcast messaging within fellowships. Does NOT write department, attendance, member, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Members can belong to ONE fellowship only. Fellowship types: K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges. Leader must be active member in fellowship's branch. Assigning leader auto-adds to fellowship_members. Leaders can only broadcast to their own fellowship. Tests required for single-membership constraint.

## Allowed Files
- `apps/api/src/fellowships/**` — all fellowship Lambda handlers and tests

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/branches/**` — branch handlers
- `apps/api/src/departments/**` — department handlers
- `apps/api/src/auth/**` — auth code
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 10 (implement fellowship management API)
- Tasks 10.1–10.6 (all fellowship Lambda functions and tests)
- Any bug fix or enhancement to fellowship operations

## Delegation Rules
- If a task requires member data lookups → delegate to Members Agent
- If a task requires frontend fellowship pages → delegate to Frontend Agent
- If a task requires fellowship attendance recording → delegate to Attendance Agent
