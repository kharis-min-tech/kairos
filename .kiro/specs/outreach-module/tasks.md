# Implementation Plan: Kairos Outreach Module

## Overview

Implement the Outreach Module enhancements: schema migration for ad-hoc soul capture, new/modified Lambda functions, API client extensions, and frontend pages. Tasks are structured into parallel work streams where possible — backend schema/validation changes first, then Lambda functions (parallelisable), then API client + CDK wiring, then frontend pages (parallelisable).

## Tasks

- [x] 1. Schema migration and validation updates (foundation — must complete first)
  - [x] 1.1 Make outreach_id nullable on souls table in Drizzle schema
    - In `packages/database/src/schema/outreach.ts`, remove `.notNull()` from the `outreachId` column on the `souls` table
    - Add a partial index `idx_souls_assigned_adhoc` on `assigned_member_id` WHERE `outreach_id IS NULL` for efficient ad-hoc soul queries
    - Update the `idx_souls_phone_outreach` and `idx_souls_email_outreach` unique indexes to handle NULL outreach_id correctly
    - Generate and apply the Drizzle migration (`npx drizzle-kit generate` then `npx drizzle-kit migrate`)
    - _Requirements: 7.1, 7.5, 16.5_

  - [x] 1.2 Update soulCaptureSchema validation
    - In `packages/utils/src/validator/schemas.ts`, verify `outreach_id` is already optional in `soulCaptureSchema` (it is — confirm no changes needed)
    - Add `outreachCompleteSchema` for the complete-program endpoint (empty body, outreachId from path)
    - _Requirements: 6.2, 7.2, 5.1_

  - [x] 1.3 Write property test for schema validation
    - **Property 15: Duplicate Phone Warning Without Rejection**
    - **Validates: Requirements 6.6**

- [x] 2. Checkpoint — Ensure schema migration and validation changes compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. New and modified Lambda functions — Outreach Programs (parallel with task 4)
  - [x] 3.1 Create outreach-get-program Lambda
    - Create `apps/api/src/outreach/outreach-get-program.ts`
    - Follow existing Lambda pattern: resolveAuthContext → parse pathParameters → enforceBranchAccess → query with joins
    - Return program details with participants (joined to members for names) and souls linked to the program
    - Include follow-up outcome summaries per soul
    - Enforce branch isolation: non-admin users can only view programs from their branch
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Create outreach-complete-program Lambda
    - Create `apps/api/src/outreach/outreach-complete-program.ts`
    - Follow existing Lambda pattern: resolveAuthContext → parse outreachId from path → enforceBranchAccess
    - Set `is_completed = true` and `updated_at = now()`
    - Reject if already completed (400 Bad Request)
    - Count actual souls linked to program and update `total_souls_reached`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.3 Write property tests for outreach program Lambdas
    - **Property 6: Duplicate Program Detection**
    - **Property 7: Worker Registration Idempotence Guard**
    - **Property 11: Program Completion Updates Soul Count**
    - **Validates: Requirements 1.4, 4.2, 4.4, 5.3**

- [x] 4. New and modified Lambda functions — Souls and Follow-Ups (parallel with task 3)
  - [x] 4.1 Modify souls-capture Lambda for ad-hoc support
    - In `apps/api/src/outreach/souls-capture.ts`, add branching logic:
      - If `outreach_id` provided: verify program exists, enforceBranchAccess on program's branchId, check duplicate phone (warn but allow)
      - If `outreach_id` NOT provided (ad-hoc): use `ctx.branchId` for branch isolation
    - Auto-assign capturing member as `assigned_member_id`
    - Set initial status to "New"
    - Return duplicate phone warning in response when applicable
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Modify souls-get-alerts Lambda with hybrid overdue logic
    - In `apps/api/src/outreach/souls-get-alerts.ts`, implement hybrid overdue detection:
      - Get latest follow-up per soul with `next_follow_up_date`
      - Soul is overdue if: (a) `next_follow_up_date` is set and in the past, OR (b) `next_follow_up_date` is NULL and days since last follow-up exceeds threshold, OR (c) no follow-ups exist and days since soul creation exceeds threshold
    - Change default threshold from 3 to 2 days
    - Accept `?thresholdDays` query param for per-request override
    - Only include souls in active statuses (New, Following Up, Interested)
    - Return soul name, phone, status, assigned worker name/email, days since last activity, outreach program name
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 4.3 Write property tests for souls Lambdas
    - **Property 2: Soul Auto-Assignment to Capturing Member**
    - **Property 3: Soul Initial Status is New**
    - **Property 8: Follow-Up Overdue Alert Correctness**
    - **Property 12: Ad-Hoc Soul Branch Derivation**
    - **Validates: Requirements 6.4, 6.5, 7.3, 7.4, 7.5, 14.1–14.5, 16.5**

- [x] 5. Checkpoint — Ensure all Lambda functions compile and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. API wiring — CDK routes and API client extensions
  - [x] 6.1 Add new routes to CDK API stack
    - In `infrastructure/src/stacks/api-stack.ts`, add routes for:
      - `GET /v1/outreach/programs/{outreachId}` → `outreach-get-program.ts`
      - `PUT /v1/outreach/programs/{outreachId}/complete` → `outreach-complete-program.ts`
    - Follow existing `route()` pattern in the OUTREACH & SOULS section
    - _Requirements: 3.1, 5.1_

  - [x] 6.2 Extend API client with new methods
    - In `packages/api-client/src/api.ts`, add to `outreach` object:
      - `getProgram(id)` — GET program detail with participants and souls
      - `completeProgram(id)` — PUT to mark program completed
    - Add to `souls` object:
      - `getFollowUpTracker(params)` — GET follow-up tracker data (if needed for frontend)
    - _Requirements: 3.1, 5.1, 19.1_

  - [x] 6.3 Write property tests for branch isolation across all endpoints
    - **Property 1: Branch Isolation for Outreach Data**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

- [x] 7. Checkpoint — Ensure CDK synth succeeds and API client compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend — Outreach Programs enhancements (parallel with tasks 9, 10, 11)
  - [x] 8.1 Enhance Outreach Programs list page with stat cards
    - In `apps/web/src/app/(dashboard)/evangelism/outreach/page.tsx`:
      - Add stat cards row: Total Programs, Active Programs, Total Souls Won
      - Add program card click navigation to detail page (`/evangelism/outreach/[id]`)
      - Add "Complete Program" action button for pastors/admins
      - Add loading spinner and empty state
    - Follow existing dashboard page patterns for stat cards and card layouts
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 8.2 Write unit tests for Outreach Programs page
    - Test stat card rendering, filtering, pagination, and completion action
    - _Requirements: 17.1–17.6_

- [x] 9. Frontend — Outreach Program Detail page (parallel with tasks 8, 10, 11)
  - [x] 9.1 Create Program Detail page
    - Create `apps/web/src/app/(dashboard)/evangelism/outreach/[id]/page.tsx`
    - Program header with status badge and stats (Attendees, Souls Won, Follow-ups)
    - Participants list with member names and roles
    - Souls captured table with status, assigned worker, last follow-up
    - Follow-up outcomes summary
    - Follow existing detail page patterns in the codebase
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.2 Write unit tests for Program Detail page
    - Test data loading, participant display, soul list rendering
    - _Requirements: 3.1–3.3_

- [x] 10. Frontend — Soul Capture form enhancements (parallel with tasks 8, 9, 11)
  - [x] 10.1 Enhance Soul Capture page
    - In `apps/web/src/app/(dashboard)/evangelism/souls/capture/page.tsx`:
      - Verify source selector (Outreach Program / Ad-hoc) works correctly with optional outreach_id
      - Add duplicate phone warning display from API response
      - Ensure required field validation (first name, last name) with inline errors
      - Ensure success message and form reset on submission
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 10.2 Write unit tests for Soul Capture page
    - Test source selection toggle, validation, duplicate warning display
    - _Requirements: 18.1–18.6_

- [x] 11. Frontend — Follow-Up Tracker page (parallel with tasks 8, 9, 10)
  - [x] 11.1 Create Follow-Up Tracker page
    - Create `apps/web/src/app/(dashboard)/evangelism/followups/page.tsx`
    - Stat cards: Pending Follow-Ups Due This Week, Completed Follow-Ups This Month
    - Tabs: All | Pending | Overdue
    - Search bar for soul name or worker name
    - Filter dropdowns for follow-up status and contact method
    - Follow-up cards with soul name, assigned worker, due date, type, status
    - Overdue cards highlighted with warning indicator
    - "Log Follow-Up" modal on card action click
    - Follow existing page patterns for tabs, search, filters, and modals
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [x] 11.2 Write unit tests for Follow-Up Tracker page
    - Test tab switching, search, filter, overdue highlighting, modal
    - _Requirements: 19.1–19.7_

- [x] 12. Frontend — Conversion-to-member pre-fill flow
  - [x] 12.1 Implement conversion pre-fill in soul status update
    - When a soul's status is updated to "Converted", present a pre-filled member registration form using the soul's personal data (first name, last name, phone, email, address, city, gender)
    - Use the existing member registration form/modal, pre-populated with soul data
    - On form submission, create a pending member record via the existing member registration approval flow
    - On approval, update the soul's `converted_to_member_id` with the new member ID
    - Preserve soul's follow-up history and outreach program linkage
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 12.2 Write property tests for conversion flow
    - **Property 4: Status Transition Validation (State Machine)**
    - **Property 5: Converted Status Requires Member Link**
    - **Property 16: Conversion Preserves Follow-Up History**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 11.5**

- [x] 13. Remaining property tests and edge cases
  - [x] 13.1 Write property test for follow-up validation
    - **Property 14: Follow-Up Contact Method and Status Validation**
    - **Validates: Requirements 13.3, 13.4**

  - [x] 13.2 Write property test for soul activity timestamp
    - **Property 10: Follow-Up Refreshes Soul Activity Timestamp**
    - **Validates: Requirements 13.7**

  - [x] 13.3 Write property test for conversion funnel consistency
    - **Property 9: Conversion Funnel Count Consistency**
    - **Validates: Requirements 15.1, 15.2**

  - [x] 13.4 Write property test for cross-branch reassignment
    - **Property 13: Cross-Branch Reassignment Prevention**
    - **Validates: Requirements 12.2, 12.3**

- [x] 14. Final checkpoint — Ensure all tests pass and full integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 3 and 4 can be executed in parallel (outreach program Lambdas vs souls Lambdas)
- Tasks 8, 9, 10, and 11 can be executed in parallel (all frontend pages are independent)
- Task 12 depends on the souls-update-status Lambda already existing (it does)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All Lambda functions follow the established pattern in `apps/api/src/outreach/`
- All frontend pages follow existing patterns in `apps/web/src/app/(dashboard)/`
