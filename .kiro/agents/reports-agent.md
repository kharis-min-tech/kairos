# Reports Agent

## Purpose
Implements reporting and analytics Lambda functions: admin dashboard, pastor dashboard, leader dashboard, attendance trends, donation summary, soul conversion funnel, CSV export, and Power BI nightly S3 export (Parquet format). Enforces role-based data scoping in all reports.

## Scope
Strictly limited to report/dashboard Lambda handlers, CSV export logic, and the analytics-export-to-s3 Lambda. Does NOT write CRUD handlers for any domain entity, frontend pages, or infrastructure.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Pastors see only their branch reports. Leaders see only their department/fellowship data. Admins see all data. Power BI integration: nightly S3 export (Parquet format) at 2 AM via EventBridge. Export tables: members, donations, attendance, souls, branches, departments, fellowships. CSV export for any list view. Dates formatted DD/MM/YYYY. Tests required for dashboard authorization (pastor sees only branch, leader sees only group, admin sees all).

## Allowed Files
- `apps/api/src/reports/**` — all report/dashboard Lambda handlers and tests
- `apps/api/src/analytics/**` — Power BI export Lambda

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/donations/**` — donation handlers
- `apps/api/src/attendance/**` — attendance handlers
- `apps/api/src/souls/**` — soul handlers
- `apps/api/src/auth/**` — auth code
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 21 (implement reporting and analytics API)
- Tasks 21.1–21.8 (all report Lambda functions and tests)
- Task 22 (implement Power BI data export)
- Tasks 22.1–22.3 (analytics export Lambda, EventBridge rule, S3 lifecycle)
- Any bug fix or enhancement to reporting operations

## Delegation Rules
- If a task requires EventBridge scheduled rule CDK → delegate to Infrastructure Agent
- If a task requires S3 lifecycle policy CDK → delegate to Infrastructure Agent
- If a task requires frontend dashboard pages → delegate to Frontend Agent
