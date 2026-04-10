# Outreach API Routing Bugs — Bugfix Design

## Overview

Five related bugs in the outreach module cause 404 errors and broken functionality. The root causes fall into two categories: (A) the `@kairos/types` entity interfaces use snake_case field names (`outreach_id`, `soul_id`, `is_completed`, etc.) while Drizzle ORM and the Lambda handlers return camelCase (`outreachId`, `soulId`, `isCompleted`), causing `undefined`/`NaN` values to be interpolated into API URLs on the frontend; and (B) missing or mismatched CDK API Gateway route definitions for three endpoints (`getProgram`, `completeProgram`, `register-worker` path mismatch) plus a completely missing Lambda handler and route for the follow-up tracker.

The fix strategy uses three parallel work streams: (1) align `@kairos/types` interfaces to camelCase matching Drizzle ORM output and update all frontend references, (2) add missing CDK routes and fix the path mismatch, (3) create the follow-up tracker Lambda handler and CDK route.

## Glossary

- **Bug_Condition (C)**: Any frontend action that reads a snake_case field from an API response object (which actually has camelCase keys), OR any API client call to an endpoint with no matching CDK route
- **Property (P)**: Correct field values are used in URL construction (no `undefined`/`NaN`), and all API endpoints return successful responses instead of 404
- **Preservation**: All existing working endpoints, Lambda handlers, frontend pages for other modules (members, branches, departments, etc.), and the create-program / list-programs / override-branch flows must remain unchanged
- **Drizzle ORM camelCase**: Drizzle's `db.query.*` and `db.select()` methods return JavaScript objects with camelCase keys matching the schema column definitions (e.g., `outreachId`, `programName`, `isCompleted`)
- **`@kairos/types` entities**: TypeScript interfaces in `packages/types/src/entities.ts` consumed by both the API client and frontend pages to type API responses
- **CDK route**: An `httpApi.addRoutes()` call in `infrastructure/src/stacks/api-stack.ts` that maps an HTTP method + path to a Lambda integration

## Bug Details

### Fault Condition

The bugs manifest in two distinct conditions:

**Condition A — Field Name Mismatch (Bugs 1–4):** The frontend reads snake_case properties from API response objects that actually contain camelCase keys. TypeScript does not catch this at runtime because the `@kairos/types` interfaces declare snake_case fields, so the code compiles but the runtime values are `undefined`.

**Condition B — Missing/Mismatched CDK Routes (Bugs 5–8):** The API client sends requests to paths that have no corresponding CDK API Gateway route definition, resulting in 404 responses regardless of whether a Lambda handler exists.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, entity: object, endpoint: string }
  OUTPUT: boolean

  // Condition A: field name mismatch
  fieldMismatch :=
    (input.action IN ['completeProgram', 'registerWorker', 'viewProgramDetail']
      AND input.entity.outreach_id === undefined
      AND input.entity.outreachId !== undefined)
    OR
    (input.action === 'updateSoulStatus'
      AND input.entity.soul_id === undefined
      AND input.entity.soulId !== undefined)

  // Condition B: missing CDK route
  missingRoute :=
    input.endpoint IN [
      'GET /v1/outreach/programs/{outreachId}',
      'PUT /v1/outreach/programs/{outreachId}/complete',
      'GET /v1/souls/follow-up-tracker'
    ]
    OR
    (input.endpoint === 'POST /v1/outreach/programs/{id}/register-worker'
      AND cdkRoute === 'POST /v1/outreach/programs/{outreachId}/workers')

  RETURN fieldMismatch OR missingRoute
END FUNCTION
```

### Examples

- **Bug 1 (Complete Program):** User clicks "Complete" → frontend reads `program.outreach_id` → gets `undefined` (actual key is `outreachId`) → sends `PUT /v1/outreach/programs/undefined/complete` → 404. Expected: sends `PUT /v1/outreach/programs/42/complete` → 200.
- **Bug 2 (Register Worker):** User clicks "Register as Worker" → frontend reads `program.outreach_id` → gets `undefined` → sends `POST /v1/outreach/programs/undefined/register-worker` → 404. Expected: sends `POST /v1/outreach/programs/42/register-worker` → 201.
- **Bug 3 (Program Detail):** User clicks program card → frontend reads `program.outreach_id` → gets `undefined` → navigates to `?id=undefined` → detail page calls `Number("undefined")` = `NaN` → sends `GET /v1/outreach/programs/NaN` → 404. Expected: navigates to `?id=42` → sends `GET /v1/outreach/programs/42` → 200.
- **Bug 4 (Soul Status Update):** User drags soul card → frontend reads `soul.soul_id` → gets `undefined` → `Number(undefined)` = `NaN` → sends `PUT /v1/souls/NaN/status` → 404. Expected: sends `PUT /v1/souls/7/status` → 200.
- **Bug 5 (Follow-Up Tracker):** Page loads → sends `GET /v1/souls/follow-up-tracker?tab=all` → 404 (no CDK route, no Lambda handler). Expected: returns `{ pending, completed, items }`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `POST /v1/outreach/programs` (create program) must continue to work — the create modal sends camelCase fields directly, not via entity type properties
- `GET /v1/outreach/programs` (list programs) must continue to return paginated program data
- `POST /v1/outreach/override-branch` must continue to work
- `POST /v1/souls` (capture soul) must continue to work
- `GET /v1/souls` (list souls) must continue to return paginated soul data
- `GET /v1/souls/{soulId}` (get soul with follow-ups) must continue to work
- `POST /v1/souls/{soulId}/followups` (log follow-up) must continue to work
- `PUT /v1/souls/{soulId}/reassign` must continue to work
- `GET /v1/souls/alerts` and `GET /v1/souls/conversion-funnel` must continue to work
- All CDK routes for other modules (members, branches, departments, fellowships, attendance, donations, forms, notifications, reports) must remain unchanged
- Mouse clicks, navigation, and all non-outreach frontend pages must remain unaffected

**Scope:**
All inputs that do NOT involve: (a) reading `outreach_id`, `soul_id`, `is_completed`, `total_souls_reached`, `program_name`, or `program_date` from API response objects, or (b) calling the four affected endpoints, should be completely unaffected by this fix.

## Hypothesized Root Cause

Based on code analysis, the root causes are confirmed (not hypothesized):

1. **`@kairos/types` entity interfaces use snake_case while Drizzle returns camelCase**: The `OutreachProgram` interface in `packages/types/src/entities.ts` declares `outreach_id`, `program_name`, `program_date`, `is_completed`, `total_souls_reached`, `coordinator_id`. The `Soul` interface declares `soul_id`, `first_name`, `last_name`, `assigned_member_id`, `capture_date`, `capture_location`. The `FollowUp` interface declares `followup_id`, `soul_id`, `contact_date`, `contact_method`, `contact_status`, `duration_minutes`. But Drizzle ORM schema in `packages/database/src/schema/outreach.ts` defines columns with camelCase JS names (`outreachId`, `programName`, `soulId`, etc.), and all Lambda handlers return these camelCase objects directly. The frontend imports these types and accesses the snake_case properties, getting `undefined`.

2. **Missing CDK route for `GET /v1/outreach/programs/{outreachId}`**: The Lambda handler `outreach-get-program.ts` exists and works, but `api-stack.ts` has no `route()` call for `GET /v1/outreach/programs/{outreachId}`.

3. **Missing CDK route for `PUT /v1/outreach/programs/{outreachId}/complete`**: The Lambda handler `outreach-complete-program.ts` exists and works, but `api-stack.ts` has no `route()` call for this path.

4. **Path mismatch for register-worker**: The API client sends `POST /v1/outreach/programs/{id}/register-worker` but the CDK route is defined as `POST /v1/outreach/programs/{outreachId}/workers`. The path segments don't match.

5. **No Lambda handler or CDK route for `GET /v1/souls/follow-up-tracker`**: The API client defines `souls.getFollowUpTracker()` calling this endpoint, and the frontend follow-ups page uses it, but neither a Lambda handler nor a CDK route exists.

## Correctness Properties

Property 1: Fault Condition A — Field Name Alignment Fixes URL Construction

_For any_ frontend action that reads entity fields from an outreach/soul API response to construct an API URL or navigate to a detail page, the fixed `@kairos/types` interfaces SHALL use camelCase field names matching the Drizzle ORM output, so that `program.outreachId`, `program.isCompleted`, `program.totalSoulsReached`, `program.programName`, `program.programDate`, `soul.soulId`, `soul.firstName`, `soul.lastName`, `followUp.followUpId`, `followUp.soulId`, `followUp.contactDate`, `followUp.contactMethod`, and `followUp.contactStatus` all resolve to their correct values (not `undefined`), and URL interpolation produces valid numeric IDs.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Fault Condition B — Missing CDK Routes Return Success

_For any_ API request to `GET /v1/outreach/programs/{outreachId}`, `PUT /v1/outreach/programs/{outreachId}/complete`, `POST /v1/outreach/programs/{outreachId}/register-worker`, or `GET /v1/souls/follow-up-tracker`, the fixed CDK stack and Lambda handlers SHALL route the request to the correct handler and return a successful response (not 404).

**Validates: Requirements 2.5, 2.6, 2.7, 2.8**

Property 3: Preservation — Existing Endpoints and Frontend Behavior

_For any_ input that does NOT involve the five buggy flows (complete program, register worker, view program detail, update soul status, follow-up tracker), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing API routes, Lambda handler behavior, frontend page functionality, and navigation flows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

**Work Stream 1: Fix `@kairos/types` interfaces to camelCase**

**File**: `packages/types/src/entities.ts`

**Specific Changes**:
1. **`BaseEntity` interface**: Change `created_at` → `createdAt`, `updated_at` → `updatedAt`
2. **`OutreachProgram` interface**: Change `outreach_id` → `outreachId`, `branch_id` → `branchId`, `program_name` → `programName`, `program_date` → `programDate`, `coordinator_id` → `coordinatorId`, `total_souls_reached` → `totalSoulsReached`, `is_completed` → `isCompleted`
3. **`Soul` interface**: Change `soul_id` → `soulId`, `outreach_id` → `outreachId`, `first_name` → `firstName`, `last_name` → `lastName`, `assigned_member_id` → `assignedMemberId`, `converted_to_member_id` → `convertedToMemberId`, `capture_date` → `captureDate`, `capture_location` → `captureLocation`
4. **`FollowUp` interface**: Change `followup_id` → `followUpId`, `soul_id` → `soulId`, `member_id` → `memberId`, `contact_date` → `followUpDate`, `contact_method` → `contactMethod`, `contact_status` → `contactStatus`, `duration_minutes` → `durationMinutes`, `followed_up_by` → remove (not in schema), add `nextFollowUpDate`
5. **All other entity interfaces** (`Region`, `Branch`, `Member`, `BranchLeadership`, `Department`, `BranchDepartment`, `Fellowship`, `Service`, `ServiceAttendance`, `Donation`, `Form`, `FormSubmission`, `Notification`, `NotificationRecipient`): Change all snake_case fields to camelCase to match their respective Drizzle schemas. This is a systemic issue — all types have the same mismatch.

**File**: `apps/web/src/app/(dashboard)/evangelism/outreach/page.tsx`

**Specific Changes**:
1. Change `program.outreach_id` → `program.outreachId` (used in card key, detail navigation URL, register-worker call, complete-program call)
2. Change `program.is_completed` → `program.isCompleted` (used in stat computation and badge display)
3. Change `program.total_souls_reached` → `program.totalSoulsReached` (used in stat computation and display)
4. Change `program.program_name` → `program.programName` (used in card header)
5. Change `program.program_date` → `program.programDate` (used in date display)
6. Change `program_name`, `program_date` in create form payload to `programName`, `programDate` (already camelCase in form state, but the `createProgram` call sends snake_case keys)
7. Change `branch_id` in create form payload to `branchId`

**File**: `apps/web/src/app/(dashboard)/evangelism/souls/page.tsx`

**Specific Changes**:
1. Change `soul.soul_id` → `soul.soulId` (used in drag data, card key, status update call, conversion call)
2. Change `soul.first_name` → `soul.firstName`, `soul.last_name` → `soul.lastName` (used in card display)
3. Change `soul.created_at` → `soul.createdAt` (used in follow-up days calculation)
4. Change `soul.last_follow_up_date` → `soul.lastFollowUpDate` (cast property)

**File**: `apps/web/src/app/(dashboard)/evangelism/souls/soul-detail-modal.tsx`

**Specific Changes**:
1. Change `soul.soul_id` → `soul.soulId` (used in get soul call, add follow-up call, update status call)
2. Change `soul.first_name` → `soul.firstName`, `soul.last_name` → `soul.lastName` (used in modal title)
3. Change `soul.capture_date` → `soul.captureDate` (used in info display)
4. Change `fu.followup_id` → `fu.followUpId`, `fu.contact_method` → `fu.contactMethod`, `fu.contact_date` → `fu.followUpDate`, `fu.contact_status` → `fu.contactStatus` (used in follow-up history list)
5. Change `contact_date`, `contact_method`, `contact_status` in addFollowup payload to camelCase

**File**: `apps/web/src/app/(dashboard)/evangelism/followups/page.tsx`

**Specific Changes**:
1. Change `contact_method`, `contact_status`, `next_follow_up_date`, `duration_minutes` in addFollowup payload to camelCase (`contactMethod`, `contactStatus`, `nextFollowUpDate`, `durationMinutes`)

---

**Work Stream 2: Add missing CDK routes and fix path mismatch**

**File**: `infrastructure/src/stacks/api-stack.ts`

**Specific Changes**:
1. **Add `OutreachGetProgram` route**: `route('OutreachGetProgram', 'outreach/outreach-get-program.ts', GET, '/v1/outreach/programs/{outreachId}')` — insert after the `OutreachList` route
2. **Add `OutreachComplete` route**: `route('OutreachComplete', 'outreach/outreach-complete-program.ts', PUT, '/v1/outreach/programs/{outreachId}/complete')` — insert after the new get-program route
3. **Fix register-worker path**: Change the API client path from `/register-worker` to `/workers` to match the existing CDK route, OR change the CDK route to match the API client. Decision: change the API client to use `/workers` since the CDK route and Lambda handler already work with that path.
4. **Add `SoulsFollowUpTracker` route**: `route('SoulsFollowUpTracker', 'outreach/souls-get-follow-up-tracker.ts', GET, '/v1/souls/follow-up-tracker')` — insert after the `SoulsConvFunnel` route

**File**: `packages/api-client/src/api.ts`

**Specific Changes**:
1. Change `registerWorker` path from `` `/v1/outreach/programs/${programId}/register-worker` `` to `` `/v1/outreach/programs/${programId}/workers` `` to match the CDK route

---

**Work Stream 3: Create follow-up tracker Lambda handler**

**File**: `apps/api/src/outreach/souls-get-follow-up-tracker.ts` (new file)

**Specific Changes**:
1. Create a new Lambda handler that queries follow-up data with pending/completed counts
2. Accept query params: `tab` (all/pending/overdue), `search`, `status`, `contactMethod`
3. Return `{ pending: number, completed: number, items: FollowUpItem[] }` matching the frontend's expected shape
4. Enforce branch isolation for non-admin users

---

**Work Stream 4: Add steering document rules**

**File**: `.kiro/steering/kairos-project-guide.md`

**Specific Changes**:
1. Add rule under "API & Contract Safety": Entity type interfaces in `@kairos/types` MUST use camelCase field names matching the Drizzle ORM schema column definitions
2. Add rule under "API & Contract Safety": Every Lambda handler file in `apps/api/src/` MUST have a corresponding CDK route in `api-stack.ts`, and the API client path MUST match the CDK route path exactly

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior. Given that these bugs span types, frontend, CDK infrastructure, and Lambda handlers, testing focuses on type-level correctness and API integration.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm the root cause analysis by showing that snake_case field access returns `undefined` and that missing CDK routes return 404.

**Test Plan**: Write tests that import the `@kairos/types` entity interfaces and verify field name alignment with Drizzle schema output. Write tests that simulate API client calls to the affected endpoints. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Type Field Mismatch Test**: Create a mock API response with camelCase keys (as Drizzle returns), cast it to `OutreachProgram`, and assert that `program.outreach_id` is `undefined` while `(program as any).outreachId` has the correct value (will fail on unfixed code — demonstrates the mismatch)
2. **Soul Type Field Mismatch Test**: Create a mock API response with camelCase keys, cast to `Soul`, and assert that `soul.soul_id` is `undefined` (will fail on unfixed code)
3. **URL Construction Test**: Simulate the outreach page's URL construction using `program.outreach_id` and assert the URL contains `undefined` or `NaN` (will fail on unfixed code)
4. **CDK Route Existence Test**: Verify that the CDK stack synthesizes routes for all four affected endpoints (will fail on unfixed code — routes are missing)

**Expected Counterexamples**:
- `program.outreach_id` evaluates to `undefined` because the runtime object has `outreachId`
- `Number(undefined)` evaluates to `NaN`, producing invalid API URLs
- CDK synth output does not contain routes for `GET /v1/outreach/programs/{outreachId}` or `PUT .../complete`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF fieldMismatch(input) THEN
    // After fix: types use camelCase, so field access works
    result := accessField(input.entity, camelCaseFieldName)
    ASSERT result !== undefined
    ASSERT typeof result === 'number' (for ID fields)
    url := constructUrl(result)
    ASSERT NOT url.includes('undefined')
    ASSERT NOT url.includes('NaN')
  END IF

  IF missingRoute(input) THEN
    // After fix: CDK route exists, Lambda handler responds
    response := apiClient.call(input.endpoint)
    ASSERT response.statusCode IN [200, 201]
    ASSERT response.statusCode !== 404
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can generate many combinations of entity field accesses to verify no regressions
- It catches edge cases where other entity types might be affected by the BaseEntity change
- It provides strong guarantees that the type changes don't break non-outreach modules

**Test Plan**: Observe behavior on UNFIXED code first for all non-buggy flows (create program, list programs, capture soul, list souls, etc.), then write tests to verify these continue working after the fix.

**Test Cases**:
1. **Create Program Preservation**: Verify that `outreach.createProgram()` continues to work with the updated type interfaces
2. **List Programs Preservation**: Verify that `outreach.listPrograms()` response can be correctly typed and all fields are accessible
3. **Soul Capture Preservation**: Verify that `souls.create()` continues to work
4. **Soul List Preservation**: Verify that `souls.list()` response fields are all accessible with camelCase names
5. **Other Module Preservation**: Verify that member, branch, department, fellowship types still align with their Drizzle schemas after the BaseEntity change

### Unit Tests

- Test that all `@kairos/types` entity interfaces have field names matching their Drizzle schema counterparts
- Test that the outreach page correctly reads `outreachId` (not `outreach_id`) from program objects
- Test that the souls page correctly reads `soulId` (not `soul_id`) from soul objects
- Test that URL construction produces valid numeric IDs (no `undefined`, no `NaN`)
- Test that the follow-up tracker Lambda handler returns the expected response shape

### Property-Based Tests

- Generate random outreach program objects with valid camelCase fields and verify all field accesses resolve correctly
- Generate random soul objects and verify `soulId` is always a valid number after type alignment
- Generate random API response payloads and verify the type interfaces correctly describe the shape

### Integration Tests

- Test the full flow: list programs → click program → view detail page (verifies field names + CDK route)
- Test the full flow: list programs → click "Complete" → program marked completed (verifies field names + CDK route)
- Test the full flow: list programs → click "Register as Worker" → worker registered (verifies field names + API client path)
- Test the full flow: list souls → drag to new status → status updated (verifies field names)
- Test the full flow: load follow-up tracker page → data displayed (verifies CDK route + Lambda handler)
