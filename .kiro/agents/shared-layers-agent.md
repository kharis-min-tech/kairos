# Shared Layers Agent

## Purpose
Creates and maintains the shared Lambda layers and utility packages used across all Lambda functions: `@kairos/db-client`, `@kairos/validator`, `@kairos/error-handler`, `@kairos/logger`, `@kairos/types`, and `@kairos/utils`. Defines Zod validation schemas, error response formats, structured logging, and shared TypeScript types.

## Scope
Strictly limited to shared packages under `packages/` (excluding `ui` and `api-client`) and the Lambda layer definitions. Does NOT write individual Lambda handlers, frontend code, CDK infrastructure, or database schemas.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. Error format: `{ error: { code, message, details? } }`. HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 500. Structured JSON logging to CloudWatch. Zod for all input validation. Keep packages lightweight for Lambda cold starts.

## Allowed Files
- `packages/types/**` — shared TypeScript types and interfaces
- `packages/utils/**` — shared utility functions
- `packages/lambda-layer/**` — Lambda layer (db-client, validator, error-handler, logger)

## NEVER Touch
- `apps/**` — application code (Lambda handlers, Next.js)
- `packages/ui/**` — UI components (Frontend Agent's domain)
- `packages/api-client/**` — generated API client
- `packages/database/**` — Drizzle schemas (Database Agent's domain)
- `infrastructure/**` — CDK stacks
- `database/schema.sql` — schema file
- `requirements/**` — requirements documents
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 4 (create shared Lambda layers and utilities)
- Task 4.1 (database client layer)
- Task 4.2 (validation layer with Zod schemas)
- Task 4.3 (error handler layer)
- Task 4.5 (logger layer)
- When a new shared type, validator, or utility function is needed by multiple Lambda handlers
- When error handling or logging patterns need to change

## Delegation Rules
- If a task requires Drizzle schema definitions → delegate to Database Agent
- If a task requires individual Lambda handler code → delegate to the appropriate domain agent
- If a task requires CDK Lambda layer deployment → delegate to Infrastructure Agent
