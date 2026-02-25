# Requirements Document

## Introduction

This document defines the requirements for completing the Members Module of the Kairos church administration platform. The backend (8 Lambda handlers, CDK routes, API client methods, database schema) is fully implemented. The frontend has partial pages: a members list page, pending approvals page, CSV import page, member detail/view page with edit modal, and a self-registration page. The remaining work focuses on completing the frontend experience — filling in placeholder tabs (Donations, Attendance), adding profile photo upload, creating the admin "Add Member" page, enhancing the approval workflow, and wiring up missing UI interactions.

## Glossary

- **Members_Module**: The frontend and backend system responsible for member registration, profile management, approval workflows, import/export, and profile photo upload within the Kairos platform.
- **Member**: A registered individual in the Kairos system, associated with a home branch, who may be in pending or active status.
- **Branch_Admin**: A user with the Admin role who manages members within a specific branch, including approving registrations.
- **Pastor**: A user with the Pastor role who has read/write access scoped to their assigned branch.
- **Leader**: A user with the Leader role who has access scoped to their department or fellowship.
- **Pending_Member**: A member whose registration has been submitted but not yet approved by a Branch_Admin. Pending members can view their own profile and donations only.
- **Registration_Form**: The public-facing self-signup form at `/register` where new members provide personal details and select a home branch.
- **Approval_Workflow**: The process by which a Branch_Admin reviews and approves or rejects a pending member registration.
- **Member_Detail_Page**: The page at `/members/view?id=X` displaying a member's profile, donations, and attendance across tabbed sections.
- **Member_Edit_Modal**: The modal dialog for editing a member's personal information, accessible from the Member_Detail_Page.
- **Add_Member_Page**: The admin-facing page at `/members/new` for creating a new member directly (bypassing self-registration).
- **CSV_Import_Page**: The page at `/members/import` for bulk importing members via CSV file upload.
- **Photo_Upload_Component**: The UI component that allows members or admins to upload a profile photo via S3 presigned URLs.
- **API_Client**: The `@kairos/api-client` package providing typed methods for calling backend Lambda endpoints.
- **DataTable**: The shared table component used for displaying paginated, sortable member lists.

## Requirements

### Requirement 1: Admin Add Member Page

**User Story:** As a Branch_Admin, I want to add a new member directly through an admin form, so that I can register members who cannot self-register online.

#### Acceptance Criteria

1. WHEN a Branch_Admin navigates to `/members/new`, THE Members_Module SHALL display a form with fields for first name, last name, email, phone, date of birth, gender, address, city, postal code, home branch, emergency contact name, and emergency contact phone.
2. THE Members_Module SHALL validate that first name, last name, and home branch are provided before submission.
3. WHEN the form is submitted with valid data, THE Members_Module SHALL call the `members.create` API_Client method and navigate to the member list page on success.
4. WHEN the form is submitted with invalid data, THE Members_Module SHALL display field-level validation errors without submitting to the API.
5. IF the API returns an error, THEN THE Members_Module SHALL display the error message in an alert and retain the form data.
6. WHILE a Pastor is logged in, THE Members_Module SHALL pre-select the Pastor's assigned branch and disable the branch selector.
7. THE Members_Module SHALL use the existing shared UI components (TextInput, SelectInput, DatePicker, Button, Alert) and follow the established form patterns.

### Requirement 2: Member Detail Page — Donations Tab

**User Story:** As a Member, I want to view my donation history on my profile page, so that I can track my giving over time.

#### Acceptance Criteria

1. WHEN a user selects the Donations tab on the Member_Detail_Page, THE Members_Module SHALL fetch and display the member's donation records from the `donations` API_Client.
2. THE Members_Module SHALL display each donation with the date (DD/MM/YYYY format), amount (£ prefix), donation purpose, and payment method.
3. THE Members_Module SHALL display a summary card showing total donations and a breakdown by purpose (Offering, Tithe, Building Fund, Other).
4. WHEN no donations exist for the member, THE Members_Module SHALL display an empty state message: "No donations recorded yet."
5. THE Members_Module SHALL support filtering donations by date range using start date and end date inputs.
6. WHILE a Pending_Member is viewing their own profile, THE Members_Module SHALL display only that member's own donations.

### Requirement 3: Member Detail Page — Attendance Tab

**User Story:** As a Branch_Admin or Pastor, I want to view a member's attendance history, so that I can monitor engagement.

#### Acceptance Criteria

1. WHEN a user selects the Attendance tab on the Member_Detail_Page, THE Members_Module SHALL fetch and display the member's service attendance records.
2. THE Members_Module SHALL display each attendance record with the service date (DD/MM/YYYY format), service type, and attendance status (Present, Absent, Virtual).
3. THE Members_Module SHALL display an attendance summary showing total services attended, attendance percentage, and the date of last attendance.
4. WHEN no attendance records exist for the member, THE Members_Module SHALL display an empty state message: "No attendance records yet."
5. THE Members_Module SHALL display attendance records sorted by service date in descending order (most recent first).

### Requirement 4: Profile Photo Upload

**User Story:** As a Member, I want to upload a profile photo, so that my profile is visually identifiable.

#### Acceptance Criteria

1. THE Members_Module SHALL display a photo placeholder (user icon) on the Member_Detail_Page header when no photo_url exists for the member.
2. WHEN a member or Branch_Admin clicks the photo area on the Member_Detail_Page, THE Members_Module SHALL open a file picker restricted to image files (JPEG, PNG, WebP).
3. WHEN an image file is selected, THE Members_Module SHALL request a presigned upload URL from the backend, upload the file to S3, and update the member's photo_url via the `members.update` API_Client method.
4. IF the selected file exceeds 5 MB, THEN THE Members_Module SHALL display an error message: "Photo must be less than 5 MB" and reject the upload.
5. IF the upload fails, THEN THE Members_Module SHALL display an error message and retain the existing photo or placeholder.
6. WHEN a photo_url exists for the member, THE Members_Module SHALL display the photo as a circular avatar in the Member_Detail_Page header.
7. THE Members_Module SHALL display a loading indicator during the photo upload process.

### Requirement 5: Profile Photo Upload — Backend Presigned URL

**User Story:** As a developer, I want a backend endpoint that generates presigned S3 upload URLs, so that the frontend can securely upload profile photos.

#### Acceptance Criteria

1. WHEN the Members_Module receives a POST request to `/v1/members/{id}/photo-upload-url`, THE Members_Module SHALL return a presigned S3 PUT URL for the `member-photos` bucket.
2. THE Members_Module SHALL generate the S3 key using the pattern `photos/{memberId}/{timestamp}.{extension}`.
3. THE Members_Module SHALL set the presigned URL expiry to 300 seconds.
4. THE Members_Module SHALL restrict the content type to `image/jpeg`, `image/png`, or `image/webp`.
5. WHEN the requesting user is not the member themselves and is not a Branch_Admin, THE Members_Module SHALL return a 403 Forbidden response.
6. THE Members_Module SHALL enforce branch isolation: a Pastor SHALL only generate upload URLs for members in their own branch.
7. THE Members_Module SHALL follow the existing Lambda handler pattern: resolveAuthContext, validate input, enforce branch access, perform operation, return response.

### Requirement 6: Member Detail Page — Department and Fellowship Display

**User Story:** As a Branch_Admin, I want to see which departments and fellowship a member belongs to on their profile, so that I can understand their involvement.

#### Acceptance Criteria

1. WHEN the Profile tab is displayed on the Member_Detail_Page, THE Members_Module SHALL fetch and display the member's active department assignments with department name and join date.
2. WHEN the Profile tab is displayed on the Member_Detail_Page, THE Members_Module SHALL fetch and display the member's active fellowship assignment with fellowship name and join date.
3. WHEN the member has no department assignments, THE Members_Module SHALL display "No departments assigned" in the departments section.
4. WHEN the member has no fellowship assignment, THE Members_Module SHALL display "No fellowship assigned" in the fellowship section.
5. THE Members_Module SHALL display the home branch name (resolved from branch data) instead of the raw branch ID.

### Requirement 7: Approval Workflow Enhancements

**User Story:** As a Branch_Admin, I want the approval workflow to show the count of pending members and provide clear feedback, so that I can efficiently process registrations.

#### Acceptance Criteria

1. THE Members_Module SHALL display a badge with the count of pending members on the "Pending Approvals" navigation link in the sidebar.
2. WHEN a Branch_Admin approves a member, THE Members_Module SHALL display a success notification: "Member approved. Welcome email sent."
3. WHEN a Branch_Admin rejects a member, THE Members_Module SHALL display a confirmation dialog before proceeding with the rejection.
4. THE Members_Module SHALL display the member's selected home branch name (not branch ID) in the approval preview modal.
5. WHILE a Pastor is logged in, THE Members_Module SHALL filter the pending approvals list to show only members from the Pastor's assigned branch.

### Requirement 8: Member List Page Enhancements

**User Story:** As a Branch_Admin, I want the member list to show branch names and provide quick navigation, so that I can manage members efficiently.

#### Acceptance Criteria

1. THE Members_Module SHALL display the home branch name (resolved from branch data) in the member list table instead of the raw branch ID.
2. WHEN a user clicks a member row in the DataTable, THE Members_Module SHALL navigate to the Member_Detail_Page using a Next.js Link component with the query parameter `?id={memberId}`.
3. THE Members_Module SHALL display a "Pending Approvals" link with a badge count in the page header area, navigating to `/members/approvals`.
4. THE Members_Module SHALL display the member's status as "Pending" (with a pending badge variant) when the member's `isActive` is false and the member was recently created.

### Requirement 9: Member Edit — Branch Admin Controls

**User Story:** As a Branch_Admin, I want to edit additional member fields that regular members cannot change, so that I can manage member records fully.

#### Acceptance Criteria

1. WHILE a Branch_Admin is editing a member via the Member_Edit_Modal, THE Members_Module SHALL allow editing the home branch assignment via a branch selector dropdown.
2. WHILE a Branch_Admin is editing a member, THE Members_Module SHALL allow toggling the member's active/inactive status.
3. WHILE a regular Member is editing their own profile, THE Members_Module SHALL hide the home branch and status fields from the edit form.
4. THE Members_Module SHALL validate that the selected home branch is an active branch before submitting the update.

### Requirement 10: CSV Import — File Content Upload

**User Story:** As a Branch_Admin, I want the CSV import to send the actual file content to the backend, so that the import processes real data.

#### Acceptance Criteria

1. WHEN a Branch_Admin submits a CSV import, THE Members_Module SHALL read the file content, apply the column mapping, and send the mapped rows as a JSON array to the `members.import` API_Client method.
2. THE Members_Module SHALL display a preview of the first 5 rows of mapped data before submitting the import.
3. WHEN the import completes with errors, THE Members_Module SHALL display each error with the row number, field name, and error message in a scrollable table.
4. WHEN the import completes successfully, THE Members_Module SHALL display the count of created members and provide a link to navigate to the member list.
5. IF the CSV file contains more than 500 rows, THEN THE Members_Module SHALL display a warning: "Large files may take longer to process."

### Requirement 11: Member Self-Registration — Post-Registration Experience

**User Story:** As a newly registered Pending_Member, I want to understand what happens after registration, so that I know what to expect.

#### Acceptance Criteria

1. WHEN a member completes self-registration, THE Registration_Form SHALL display a success message explaining that the registration is pending branch admin approval.
2. THE Registration_Form SHALL provide a link to sign in after registration.
3. WHILE a Pending_Member is logged in, THE Members_Module SHALL restrict navigation to only the member's own profile page and donations tab.
4. WHILE a Pending_Member is logged in, THE Members_Module SHALL display a banner on the dashboard: "Your registration is pending approval. You will be notified once approved."

### Requirement 12: Member Soft Delete and Data Retention

**User Story:** As a Branch_Admin, I want to deactivate members using soft delete, so that historical data is preserved for reporting.

#### Acceptance Criteria

1. WHEN a Branch_Admin clicks "Deactivate" on the Member_Detail_Page, THE Members_Module SHALL display a confirmation dialog: "Are you sure you want to deactivate this member? Their data will be retained for reporting purposes."
2. WHEN confirmed, THE Members_Module SHALL call the `members.delete` API_Client method which sets `is_active` to false (soft delete).
3. THE Members_Module SHALL update the member's status badge to "Inactive" immediately after deactivation without requiring a page refresh.
4. THE Members_Module SHALL disable the "Deactivate" button for members who are already inactive.
5. IF the deactivation API call fails, THEN THE Members_Module SHALL display an error message and retain the member's current status.

### Requirement 13: Responsive Design for Members Pages

**User Story:** As a Member, I want to access the members module from a mobile browser, so that I can view and manage my profile on any device.

#### Acceptance Criteria

1. THE Members_Module SHALL render the member list page with a single-column layout on viewports narrower than 640px, hiding non-essential columns (email, phone) and showing only name and status.
2. THE Members_Module SHALL render the Member_Detail_Page profile cards in a single-column stack on viewports narrower than 640px.
3. THE Members_Module SHALL render the Member_Edit_Modal at full width on viewports narrower than 640px.
4. THE Members_Module SHALL ensure all interactive elements (buttons, links, form inputs) have a minimum touch target of 44x44 pixels.
5. THE Members_Module SHALL render the CSV import drag-and-drop zone as a tap-to-upload button on mobile viewports.
