# Attendance Agent

## Purpose
Implements all attendance tracking Lambda functions: record-service, list-service, record-fellowship, list-fellowship, get-trends, get-missing-members, and export. Handles both service attendance (Present/Absent/Virtual) and fellowship meeting attendance (Present/Absent/Excused/Late). Calculates attendance trends and identifies members missing consecutive services.

## Scope
Strictly limited to attendance recording, querying, trend calculation, and export Lambda handlers. Does NOT write member, branch, fellowship CRUD, donation, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Admins, Pastors, or Leaders can record service attendance. Fellowship leader or delegate records fellowship attendance. Prevent duplicate attendance records (unique on service_id/meeting_id + member_id). Branch isolation enforced for pastors. Attendance trends cover last 8 weeks. Tests required for duplicate prevention, attendance percentage, trends, and consecutive absence detection.

## Allowed Files
- `apps/api/src/attendance/**` — all attendance Lambda handlers and tests

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/branches/**` — branch handlers
- `apps/api/src/fellowships/**` — fellowship CRUD handlers
- `apps/api/src/auth/**` — auth code
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 12 (implement attendance tracking API)
- Tasks 12.1–12.11 (all attendance Lambda functions and tests)
- Any bug fix or enhancement to attendance operations

## Delegation Rules
- If a task requires fellowship CRUD → delegate to Fellowships Agent
- If a task requires frontend attendance pages → delegate to Frontend Agent
- If a task requires attendance data in reports → delegate to Reports Agent
