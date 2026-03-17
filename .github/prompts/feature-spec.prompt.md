---
description: "Generate a complete feature specification from requirements. Input: feature name and relevant requirements sections."
mode: agent
agent: spec-writer
---

# Feature Spec: ${{FEATURE_NAME}}

## Instructions

Read the following requirements documents to understand the full context:
- `requirements/mvp-scope.md`
- `requirements/software_spec.md`
- `requirements/data.md`
- `requirements/architecture.md`
- `requirements/design.md`

Then produce a complete feature spec using this structure:

### 1. Overview
One paragraph: what this feature does and why it matters for church administrators.

### 2. Data Model
- List all new/modified Drizzle tables (`packages/database/src/schema/`)
- List all new entity types (`packages/types/src/entities.ts`)
- List all new enums (`packages/types/src/enums.ts`)

### 3. API Endpoints
Table with: Method | Path | Handler File | Auth Required | Description

### 4. Frontend
- Pages (routes) with component breakdown
- TanStack Query hooks needed
- User interaction flows

### 5. Test Plan
- Unit test scenarios per handler
- Component test scenarios
- E2E test scenarios (user flow steps)

### 6. Implementation Order
Numbered dependency-ordered task list:
1. Schema + migration
2. Types
3. Handler tests → handlers
4. CDK routes
5. API client methods
6. Hook tests → hooks
7. Component tests → components
8. E2E tests

### 7. Acceptance Criteria
Checkable conditions for completion.
