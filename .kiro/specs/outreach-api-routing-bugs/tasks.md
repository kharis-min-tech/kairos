# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Fault Condition** - Field Name Mismatch & Missing CDK Routes
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: Two scoped properties targeting the two bug conditions:
    - **Condition A (Field Mismatch)**: For any entity object returned by Drizzle ORM (camelCase keys), casting to the current `@kairos/types` interface and accessing the declared snake_case fields yields `undefined`. Specifically: `OutreachProgram.outreachId` should be a number but `OutreachProgram.outreach_id` is `undefined`; `Soul.soulId` should be a number but `Soul.soul_id` is `undefined`. Generate random valid entity objects with camelCase keys, cast to the type, and assert the camelCase field access returns the correct value (will FAIL on unfixed types because the interface declares snake_case).
    - **Condition B (Missing Routes)**: Synthesize the CDK stack and assert routes exist for `GET /v1/outreach/programs/{outreachId}`, `PUT /v1/outreach/programs/{outreachId}/complete`, `POST /v1/outreach/programs/{outreachId}/register-worker`, and `GET /v1/souls/follow-up-tracker` (will FAIL on unfixed CDK stack because routes are missing or mismatched).
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found (e.g., `program.outreachId` is not accessible via the type, CDK synth missing routes)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Endpoints and Non-Buggy Flows
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Observe: `POST /v1/outreach/programs` (create program) works with direct camelCase payload
    - Observe: `GET /v1/outreach/programs` (list programs) returns paginated data
    - Observe: `POST /v1/souls` (capture soul) works
    - Observe: `GET /v1/souls` (list souls) returns paginated data
    - Observe: `POST /v1/souls/{soulId}/followups` (log follow-up) works
    - Observe: All other module CDK routes (members, branches, departments, fellowships, attendance, donations, forms, notifications, reports) are present in CDK synth output
  - Write property-based tests:
    - For all non-outreach entity types that also extend `BaseEntity`, verify `createdAt`/`updatedAt` field access works (since `BaseEntity` is being changed from snake_case to camelCase, this must not break other modules)
    - For all existing CDK routes in `api-stack.ts`, verify they remain present after the fix
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix `@kairos/types` entity interfaces to camelCase (Work Stream 1)

  - [x] 3.1 Update `BaseEntity`, `OutreachProgram`, `Soul`, and `FollowUp` interfaces in `packages/types/src/entities.ts`
    - Change `BaseEntity`: `created_at` → `createdAt`, `updated_at` → `updatedAt`
    - Change `OutreachProgram`: `outreach_id` → `outreachId`, `branch_id` → `branchId`, `program_name` → `programName`, `program_date` → `programDate`, `coordinator_id` → `coordinatorId`, `total_souls_reached` → `totalSoulsReached`, `is_completed` → `isCompleted`
    - Change `Soul`: `soul_id` → `soulId`, `outreach_id` → `outreachId`, `first_name` → `firstName`, `last_name` → `lastName`, `assigned_member_id` → `assignedMemberId`, `converted_to_member_id` → `convertedToMemberId`, `capture_date` → `captureDate`, `capture_location` → `captureLocation`
    - Change `FollowUp`: `followup_id` → `followUpId`, `soul_id` → `soulId`, `member_id` → `memberId`, `contact_date` → `followUpDate`, `contact_method` → `contactMethod`, `contact_status` → `contactStatus`, `duration_minutes` → `durationMinutes`, `followed_up_by` → remove, add `nextFollowUpDate`
    - Update ALL other entity interfaces (`Region`, `Branch`, `Member`, `BranchLeadership`, `Department`, `BranchDepartment`, `Fellowship`, `Service`, `ServiceAttendance`, `Donation`, `Form`, `FormSubmission`, `Notification`, `NotificationRecipient`) from snake_case to camelCase
    - _Bug_Condition: isBugCondition(input) where entity fields use snake_case but Drizzle returns camelCase_
    - _Expected_Behavior: All entity interface fields match Drizzle ORM camelCase output_
    - _Preservation: All existing code that imports these types must be updated to use new camelCase names_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Update outreach programs page (`apps/web/src/app/(dashboard)/evangelism/outreach/page.tsx`)
    - Change `program.outreach_id` → `program.outreachId` (card key, detail nav, register-worker, complete-program)
    - Change `program.is_completed` → `program.isCompleted` (stat computation, badge)
    - Change `program.total_souls_reached` → `program.totalSoulsReached` (stat, display)
    - Change `program.program_name` → `program.programName` (card header)
    - Change `program.program_date` → `program.programDate` (date display)
    - Change snake_case keys in create form payload to camelCase (`programName`, `programDate`, `branchId`)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Update souls page (`apps/web/src/app/(dashboard)/evangelism/souls/page.tsx`)
    - Change `soul.soul_id` → `soul.soulId` (drag data, card key, status update, conversion)
    - Change `soul.first_name` → `soul.firstName`, `soul.last_name` → `soul.lastName` (card display)
    - Change `soul.created_at` → `soul.createdAt` (follow-up days calc)
    - Change `soul.last_follow_up_date` → `soul.lastFollowUpDate` (cast property)
    - _Requirements: 2.4_

  - [x] 3.4 Update soul detail modal (`apps/web/src/app/(dashboard)/evangelism/souls/soul-detail-modal.tsx`)
    - Change `soul.soul_id` → `soul.soulId` (get soul, add follow-up, update status calls)
    - Change `soul.first_name` → `soul.firstName`, `soul.last_name` → `soul.lastName` (modal title)
    - Change `soul.capture_date` → `soul.captureDate` (info display)
    - Change `fu.followup_id` → `fu.followUpId`, `fu.contact_method` → `fu.contactMethod`, `fu.contact_date` → `fu.followUpDate`, `fu.contact_status` → `fu.contactStatus` (follow-up history)
    - Change addFollowup payload keys to camelCase
    - _Requirements: 2.4_

  - [x] 3.5 Update follow-ups page (`apps/web/src/app/(dashboard)/evangelism/followups/page.tsx`)
    - Change `contact_method`, `contact_status`, `next_follow_up_date`, `duration_minutes` in addFollowup payload to camelCase
    - _Requirements: 2.5_

  - [x] 3.6 Update any other frontend files that reference snake_case entity fields
    - Search for remaining snake_case field references across `apps/web/src/` that import from `@kairos/types`
    - Update all references to camelCase
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Add missing CDK routes and fix register-worker path (Work Stream 2 — parallel with Work Stream 1)

  - [x] 4.1 Add missing CDK routes in `infrastructure/src/stacks/api-stack.ts`
    - Add `OutreachGetProgram` route: `GET /v1/outreach/programs/{outreachId}` → `outreach/outreach-get-program.ts`
    - Add `OutreachComplete` route: `PUT /v1/outreach/programs/{outreachId}/complete` → `outreach/outreach-complete-program.ts`
    - Add `SoulsFollowUpTracker` route: `GET /v1/souls/follow-up-tracker` → `outreach/souls-get-follow-up-tracker.ts`
    - _Bug_Condition: isBugCondition(input) where endpoint has no CDK route_
    - _Expected_Behavior: CDK stack defines routes for all four affected endpoints_
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 4.2 Fix register-worker path in API client (`packages/api-client/src/api.ts`)
    - Change `registerWorker` path from `/v1/outreach/programs/${programId}/register-worker` to `/v1/outreach/programs/${programId}/workers`
    - _Bug_Condition: API client path does not match CDK route path_
    - _Expected_Behavior: API client path matches CDK route `/v1/outreach/programs/{outreachId}/workers`_
    - _Requirements: 2.8_

- [x] 5. Create follow-up tracker Lambda handler (Work Stream 3 — parallel with Work Streams 1 & 2)

  - [x] 5.1 Create `apps/api/src/outreach/souls-get-follow-up-tracker.ts`
    - Follow existing Lambda handler pattern from steering doc
    - Accept query params: `tab` (all/pending/overdue), `search`, `status`, `contactMethod`
    - Query follow-up data with pending/completed counts
    - Return `{ pending: number, completed: number, items: FollowUpItem[] }`
    - Enforce branch isolation for non-admin users
    - _Bug_Condition: No Lambda handler exists for GET /v1/souls/follow-up-tracker_
    - _Expected_Behavior: Handler returns follow-up tracker data matching frontend expected shape_
    - _Requirements: 2.5_

- [x] 6. Add steering document rules (Work Stream 4 — parallel with all other work streams)

  - [x] 6.1 Add entity type naming rule to `.kiro/steering/kairos-project-guide.md`
    - Under "API & Contract Safety" section, add: Entity type interfaces in `@kairos/types` MUST use camelCase field names matching the Drizzle ORM schema column definitions
    - Add: Every Lambda handler file in `apps/api/src/` MUST have a corresponding CDK route in `api-stack.ts`, and the API client path MUST match the CDK route path exactly
    - _Requirements: 3.7_

- [x] 7. Verify bug condition exploration tests now pass

  - [x] 7.1 Re-run fault condition tests from task 1
    - **Property 1: Expected Behavior** - Field Name Alignment & CDK Routes Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 7.2 Re-run preservation tests from task 2
    - **Property 2: Preservation** - Existing Endpoints and Non-Buggy Flows
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all existing CDK routes, entity types, and frontend flows still work
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no TypeScript compilation errors across the monorepo
  - Confirm CDK synth succeeds with all new and existing routes
