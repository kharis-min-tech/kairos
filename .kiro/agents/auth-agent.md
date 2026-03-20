# Auth Agent

## Purpose
Implements authentication and authorization logic. Owns the Custom Authorizer Lambda, Cognito integration helpers, auth context extraction, permission checking utilities, and branch-level data isolation enforcement. Writes and maintains comprehensive tests for auth (critical path).

## Scope
Strictly limited to the authorizer Lambda, auth-related shared layers (`@kairos/auth-context`), Cognito SDK integration, JWT verification, and role-based access control logic. Does NOT write CRUD Lambda handlers, frontend auth pages, or CDK infrastructure.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Branch-level isolation is critical — no cross-branch data leaks. Pastors see only their branch. Leaders see only their department/fellowship. Members see only their own data. Admins have full access. Tests are REQUIRED for auth (critical path — write tests first).

## Allowed Files
- `apps/api/src/auth/**` — authorizer Lambda and auth utilities
- `packages/utils/src/auth/**` — shared auth helpers (if applicable)
- `apps/api/src/auth/__tests__/**` — auth tests

## NEVER Touch
- `infrastructure/**` — CDK stacks (Cognito User Pool is Infrastructure Agent's domain)
- `apps/web/**` — frontend code
- `packages/ui/**` — UI components
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `requirements/**` — requirements documents
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 4.4 (create auth context layer)
- Task 5 (implement Custom Authorizer Lambda)
- Task 5.1 (authorizer Lambda function)
- Task 5.2 (authorizer tests — critical path)
- Task 5.3 (deploy authorizer and wire to API Gateway — coordinate with Infrastructure Agent)
- Any time authorization logic, permission checks, or branch isolation enforcement needs to change
- When a new role or permission pattern is introduced

## Delegation Rules
- If a task requires Cognito User Pool CDK configuration → delegate to Infrastructure Agent
- If a task requires frontend login/register pages → delegate to Frontend Agent
- If a task requires database schema changes for roles/permissions → delegate to Database Agent
