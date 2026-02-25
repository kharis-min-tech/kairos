# Implementation Plan: Members Module Completion

## Overview

Complete the Members Module frontend and add one new backend endpoint (presigned photo upload URL). The backend is fully implemented with 8 Lambda handlers. The frontend has partial pages that need enhancement and one new page to build. Tasks are structured into parallel work streams: backend photo upload endpoint (task 1), frontend pages that don't depend on it (tasks 3–8), and frontend pages that do depend on it (task 9). All code is TypeScript — Next.js frontend, Lambda handlers, API client.

## Tasks

- [x] 1. Backend — Photo upload presigned URL endpoint (parallel with tasks 3–8)
  - [x] 1.1 Create `members-photo-upload-url.ts` Lambda handler
    - Create `apps/api/src/members/members-photo-upload-url.ts`
    - Follow existing Lambda pattern: `resolveAuthContext` → validate input → `enforceBranchAccess` → generate presigned URL → return response
    - Request body: `{ contentType: "image/jpeg" | "image/png" | "image/webp", extension: "jpg" | "png" | "webp" }`
    - Response: `{ uploadUrl: string, photoKey: string }`
    - S3 key pattern: `photos/{memberId}/{timestamp}.{extension}`
    - Presigned URL expiry: 300 seconds
    - Auth: member can upload own photo; Admin can upload for any member; Pastor can upload for members in their branch only
    - Return 400 for invalid content type, 403 for unauthorized access, 404 for invalid member ID
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 1.2 Add CDK route and API client method
    - In `infrastructure/src/stacks/api-stack.ts`, add route in the MEMBERS section:
      `route('MembersPhotoUploadUrl', 'members/members-photo-upload-url.ts', POST, '/v1/members/{memberId}/photo-upload-url', { env: { MEMBER_PHOTOS_BUCKET: memberPhotosBucket.bucketName }, grants: s3Write(memberPhotosBucket) });`
    - In `packages/api-client/src/api.ts`, add to `members` object:
      `getPhotoUploadUrl: (id: number, data: { contentType: string; extension: string }) => post<{ uploadUrl: string; photoKey: string }>(\`/v1/members/${id}/photo-upload-url\`, data),`
    - _Requirements: 5.1_

  - [x] 1.3 Write property tests for photo upload URL endpoint
    - **Property 9: Photo upload URL content type validation**
    - **Property 10: Photo upload URL authorization**
    - **Property 11: Photo upload URL S3 key format**
    - **Validates: Requirements 5.2, 5.4, 5.5, 5.6**

- [x] 2. Checkpoint — Ensure backend photo upload endpoint compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Frontend — Admin Add Member page (parallel with tasks 4–8)
  - [x] 3.1 Create Add Member page at `/members/new`
    - Create `apps/web/src/app/(dashboard)/members/new/page.tsx`
    - Full-page form using existing shared UI components (TextInput, SelectInput, DatePicker, Button, Alert)
    - Fields: firstName, lastName, email, phone, dateOfBirth, gender, address, city, postalCode, homeBranchId, emergencyContactName, emergencyContactPhone
    - Fetch branches via `branches.list({ limit: 100, isActive: true })` for the branch selector
    - Client-side validation: firstName, lastName, homeBranchId required; email format if provided; phone format if provided
    - Display field-level validation errors without submitting to API
    - On valid submit: call `members.create()`, navigate to `/members` on success
    - On API error: display Alert with error message, retain form data
    - Pastor role: pre-select `user.branchId` and disable branch selector (use `useAuth()`)
    - Follow the existing registration page pattern (`apps/web/src/app/(auth)/register/page.tsx`) for form structure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 3.2 Write property test for Add Member form validation
    - **Property 1: Add Member form validation rejects invalid input without API call**
    - **Validates: Requirements 1.2, 1.4**

- [x] 4. Frontend — Donations tab on Member Detail page (parallel with tasks 3, 5–8)
  - [x] 4.1 Implement Donations tab content
    - Replace the placeholder in `apps/web/src/app/(dashboard)/members/view/page.tsx` donations tab section
    - Extract donations tab into a separate component file `donations-tab.tsx` in the same directory
    - Fetch donations via `donations.list({ memberId })` with optional date range params
    - Display DataTable with columns: date (DD/MM/YYYY via `toLocaleDateString('en-GB')`), amount (£ prefix), purpose, paymentMethod
    - Summary card above table: total donations amount, breakdown by purpose (Offering, Tithe, Building Fund, Other)
    - Date range filtering: start date and end date DatePicker inputs
    - Empty state: "No donations recorded yet."
    - Pending members viewing own profile: show only their own donations (memberId already scoped)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 Write property tests for donation summary computation
    - **Property 3: Donation summary correctly computes totals by purpose**
    - **Property 4: Donation date range filtering**
    - **Validates: Requirements 2.3, 2.5**

- [x] 5. Frontend — Attendance tab on Member Detail page (parallel with tasks 3, 4, 6–8)
  - [x] 5.1 Implement Attendance tab content
    - Replace the placeholder in `apps/web/src/app/(dashboard)/members/view/page.tsx` attendance tab section
    - Extract attendance tab into a separate component file `attendance-tab.tsx` in the same directory
    - Fetch attendance via `attendance.listService({ memberId })` sorted by serviceDate desc
    - Display DataTable with columns: serviceDate (DD/MM/YYYY), serviceType, attendanceStatus (Present/Absent/Virtual)
    - Summary card above table: total services attended, attendance percentage, last attendance date
    - Empty state: "No attendance records yet."
    - Records sorted by service date descending (most recent first)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Write property tests for attendance summary computation
    - **Property 6: Attendance summary correctly computes statistics**
    - **Property 7: Attendance records sorted descending by service date**
    - **Validates: Requirements 3.3, 3.5**


- [x] 6. Frontend — Member list page enhancements and approval workflow (parallel with tasks 3–5, 7–8)
  - [x] 6.1 Enhance member list page
    - In `apps/web/src/app/(dashboard)/members/page.tsx`:
      - Add a "Home Branch" column to the DataTable that resolves `homeBranchId` to branch name using the already-loaded `branchList`
      - Add a "Pending Approvals" link with badge count in the page header area (fetch count via `members.list({ status: 'pending', limit: 1 })` to get `pagination.total`)
      - Show "Pending" badge variant for members where `isActive === false` (update the status column logic)
      - Ensure member name column already uses `<Link>` to navigate to detail page (it does — verify)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Enhance approval workflow page
    - In `apps/web/src/app/(dashboard)/members/approvals/page.tsx`:
      - Update success message on approve to: "Member approved. Welcome email sent."
      - Add confirmation dialog before rejection (replace direct `handleReject` call with a confirm dialog)
      - Resolve branch name in preview modal: fetch branches on mount, display `branchName` instead of `Branch ID: {homeBranchId}`
      - Pastor filtering: already handled by backend `branchId` filter — verify `useAuth()` passes `branchId` param
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 6.3 Add pending approvals badge to sidebar navigation
    - Locate the sidebar/navigation component and add a badge with pending count next to the "Pending Approvals" or "Members" nav link
    - Fetch pending count on mount via `members.list({ status: 'pending', limit: 1 })` to get `pagination.total`
    - _Requirements: 7.1_

  - [x] 6.4 Write property test for branch name resolution
    - **Property 13: Branch name resolution across all display contexts**
    - **Validates: Requirements 6.5, 7.4, 8.1**

- [x] 7. Frontend — Member edit modal admin controls and soft delete UX (parallel with tasks 3–6, 8)
  - [x] 7.1 Add admin controls to member edit modal
    - In `apps/web/src/app/(dashboard)/members/view/member-edit-modal.tsx`:
      - Accept `userRole` prop (or use `useAuth()` inside the modal)
      - When user is Admin or Pastor: show a branch selector dropdown (fetch active branches) and an active/inactive toggle switch
      - When user is a regular Member: hide branch and status fields (keep existing read-only display)
      - Include `homeBranchId` and `isActive` in the update payload when admin edits
      - Validate selected branch is active before submitting
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Enhance soft delete UX on member detail page
    - In `apps/web/src/app/(dashboard)/members/view/page.tsx`:
      - Replace the basic `confirm()` dialog with a proper Modal confirmation: "Are you sure you want to deactivate this member? Their data will be retained for reporting purposes."
      - On confirmed deactivation: call `members.delete()`, update local `member` state to set `isActive = false` and update badge to "Inactive" without page refresh (don't redirect to list)
      - Disable the "Deactivate" button when `member.isActive === false` (already partially done — verify)
      - Display error Alert if deactivation API call fails, retain current status
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 7.3 Write property tests for admin controls and soft delete
    - **Property 14: Branch selector only shows active branches**
    - **Property 20: Deactivate button disabled for inactive members**
    - **Validates: Requirements 9.4, 12.4**

- [x] 8. Frontend — CSV import file content upload and post-registration experience (parallel with tasks 3–7)
  - [x] 8.1 Enhance CSV import to send actual file content
    - In `apps/web/src/app/(dashboard)/members/import/page.tsx`:
      - Read full CSV file content with FileReader, parse all rows using the column mapping
      - Add a preview step showing the first 5 mapped rows in a table before submission
      - Update `handleSubmit` to send mapped rows as JSON array: `members.import({ rows: mappedRows, branchId })` (update API client import method signature to accept `{ rows: MappedRow[]; branchId: number }`)
      - Display warning "Large files may take longer to process." when CSV has > 500 data rows
      - On success: show created count and a Link to `/members`
      - Error display already exists in scrollable table — verify it shows row, field, message
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 8.2 Enhance post-registration experience
    - In `apps/web/src/app/(auth)/register/page.tsx`: verify success message already explains pending approval and provides sign-in link (it does — confirm no changes needed)
    - Add pending member dashboard banner: in the dashboard layout or main dashboard page, check if `user.isActive === false` and display a banner: "Your registration is pending approval. You will be notified once approved."
    - Add navigation restriction for pending members: in the sidebar/layout, restrict navigation to only own profile page and donations tab when `user.isActive === false`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 8.3 Write property tests for CSV import
    - **Property 15: CSV column mapping produces correct JSON rows**
    - **Property 16: CSV preview shows first 5 rows**
    - **Property 18: CSV large file warning threshold**
    - **Validates: Requirements 10.1, 10.2, 10.5**

- [x] 9. Checkpoint — Ensure all frontend pages compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend — Profile photo upload and department/fellowship display (depends on task 1)
  - [x] 10.1 Create PhotoUpload component
    - Create `apps/web/src/app/(dashboard)/members/view/photo-upload.tsx`
    - Clickable circular area: shows existing photo (from `member.photoUrl`) or a User icon placeholder
    - Hidden file input restricted to `accept="image/jpeg,image/png,image/webp"`
    - Client-side validation: reject files > 5 MB with error "Photo must be less than 5 MB"
    - Upload flow: call `members.getPhotoUploadUrl(memberId, { contentType, extension })` → PUT file to `uploadUrl` → call `members.update(memberId, { photoUrl: photoKey })` → refresh member data
    - Show Spinner during upload, error Alert on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 10.2 Add photo upload and department/fellowship display to member detail page
    - In `apps/web/src/app/(dashboard)/members/view/page.tsx`:
      - Add PhotoUpload component in the header area (next to member name)
      - Add department assignments section to Profile tab: fetch via `departments.list({ memberId })`, display name + join date, or "No departments assigned"
      - Add fellowship assignment section to Profile tab: fetch via `fellowships.list({ memberId })`, display name + join date, or "No fellowship assigned"
      - Resolve home branch name from branches list instead of showing `Branch {member.homeBranchId}`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 10.3 Write property tests for photo upload and department display
    - **Property 8: Photo file size validation rejects files over 5 MB**
    - **Property 12: Department and fellowship display shows name and join date**
    - **Validates: Requirements 4.4, 6.1, 6.2**

- [x] 11. Frontend — Responsive design enhancements
  - [x] 11.1 Apply responsive design across members pages
    - Member list page (`page.tsx`): hide email and phone columns below 640px using Tailwind `hidden sm:table-cell`, show only name and status in single-column layout
    - Member detail page (`view/page.tsx`): ensure profile cards use `grid-cols-1` on mobile (already uses `md:grid-cols-2` — verify)
    - Member edit modal: add `sm:max-w-lg w-full` to ensure full-width on mobile viewports
    - CSV import page: convert drag-and-drop zone to a simple tap-to-upload button on mobile using `sm:hidden` / `hidden sm:block` classes
    - Ensure all interactive elements have minimum 44x44px touch targets (add `min-h-[44px] min-w-[44px]` where needed)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 11.2 Write property test for pending member navigation restriction
    - **Property 19: Pending member navigation restriction**
    - **Validates: Requirements 11.3**

- [x] 12. Final checkpoint — Ensure all tests pass and full integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Task 1 (backend photo upload) can be executed in parallel with tasks 3–8 (frontend pages that don't depend on it)
- Tasks 3, 4, 5, 6, 7, and 8 can all be executed in parallel (independent frontend work)
- Task 10 (photo upload component + department display) depends on task 1 completing first
- Task 11 (responsive design) can be done last as a polish pass across all pages
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All Lambda functions follow the established pattern in `apps/api/src/members/`
- All frontend pages follow existing patterns in `apps/web/src/app/(dashboard)/members/`
