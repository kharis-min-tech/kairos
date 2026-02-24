# Requirements Document: Kairos Outreach Module

## Introduction

The Outreach Module extends the Kairos church management platform with comprehensive evangelism and soul-tracking capabilities. It enables church branches to create and manage outreach programs, capture souls reached during evangelism activities (both program-linked and ad-hoc), assign follow-up workers, track follow-up activities through a status pipeline, and surface overdue follow-up alerts. The module enforces branch-level data isolation and integrates with the existing member registration approval flow when a soul converts.

## Glossary

- **Outreach_Program**: A planned evangelism event or campaign organized by a branch, with a name, date, location, coordinator, and participating workers.
- **Soul**: An individual reached through evangelism who is not yet a church member. Tracked through a status pipeline from initial contact to conversion or disengagement.
- **Follow_Up**: A recorded contact attempt or interaction with a soul by an assigned worker, including method, outcome, duration, and notes.
- **Soul_Winner**: The church member who initially captured (recorded) a soul during evangelism.
- **Assigned_Worker**: The church member currently responsible for following up with a soul. Initially the soul winner; can be reassigned.
- **Team_Leader**: The church member designated as coordinator of an outreach program.
- **Follow_Up_Tracker**: The system component that displays follow-up tasks, statuses, and overdue alerts for assigned workers and branch leaders.
- **Status_Pipeline**: The ordered progression of soul statuses: New → Following Up → Interested → Converted / Not Interested.
- **Branch_Isolation**: The access control rule ensuring pastors and leaders see only data belonging to their own branch.
- **Overdue_Alert**: A notification surfaced when a soul in an active status has not received a follow-up within the configured threshold.
- **Conversion_Flow**: The process triggered when a soul's status changes to Converted, presenting a pre-filled member registration form for branch admin approval.

## Requirements

### Requirement 1: Create Outreach Program

**User Story:** As a branch pastor or admin, I want to create outreach programs with details such as name, type, schedule, location, team leader, and goals, so that I can plan and organize evangelism activities for my branch.

#### Acceptance Criteria

1. WHEN a pastor or admin submits a valid outreach program form, THE Outreach_Program service SHALL create a new program record with status set to active (is_completed = false).
2. THE Outreach_Program service SHALL require program name, program date, location, and branch ID for program creation.
3. THE Outreach_Program service SHALL accept optional fields: address, city, description, coordinator ID, and notes.
4. IF a program with the same branch ID, program name, program date, and location already exists, THEN THE Outreach_Program service SHALL reject the request with a conflict error.
5. WHEN a coordinator ID is provided, THE Outreach_Program service SHALL verify the coordinator is a valid member before saving.

### Requirement 2: List Outreach Programs

**User Story:** As a branch pastor or member, I want to view all outreach programs for my branch, so that I can see planned and completed evangelism activities.

#### Acceptance Criteria

1. WHEN a user requests the outreach programs list, THE Outreach_Program service SHALL return programs filtered by the user's branch.
2. WHEN an admin requests the outreach programs list, THE Outreach_Program service SHALL return programs across all branches.
3. THE Outreach_Program service SHALL support pagination with configurable page size and offset.
4. THE Outreach_Program service SHALL return program name, date, location, coordinator name, total souls reached, completion status, and participant count for each program.

### Requirement 3: View Outreach Program Detail

**User Story:** As a branch pastor or worker, I want to view the full details of an outreach program including participants, souls captured, and follow-up outcomes, so that I can monitor program effectiveness.

#### Acceptance Criteria

1. WHEN a user requests a specific outreach program, THE Outreach_Program service SHALL return program details including all registered participants and souls linked to the program.
2. THE Outreach_Program service SHALL include follow-up outcome summaries for each soul linked to the program.
3. WHEN a non-admin user requests a program from a different branch, THE Outreach_Program service SHALL reject the request with a forbidden error.

### Requirement 4: Register Worker for Outreach Program

**User Story:** As a church member, I want to register as a worker for an outreach program in my branch, so that I can participate in evangelism activities.

#### Acceptance Criteria

1. WHEN a member registers for an outreach program, THE Outreach_Program service SHALL create a participant record linking the member to the program.
2. IF the member is already registered for the program, THEN THE Outreach_Program service SHALL reject the request with a conflict error.
3. WHEN a member attempts to register for a program in a different branch, THE Outreach_Program service SHALL reject the request with a forbidden error.
4. IF the outreach program is marked as completed, THEN THE Outreach_Program service SHALL reject worker registration with a bad request error.

### Requirement 5: Complete Outreach Program

**User Story:** As a branch pastor or admin, I want to mark an outreach program as completed, so that it is archived and no longer accepts new worker registrations or soul captures.

#### Acceptance Criteria

1. WHEN a pastor or admin marks a program as completed, THE Outreach_Program service SHALL set is_completed to true and record the updated timestamp.
2. IF the program is already completed, THEN THE Outreach_Program service SHALL reject the request with a bad request error indicating the program is already completed.
3. WHEN a program is completed, THE Outreach_Program service SHALL update the total_souls_reached count to reflect the actual number of souls linked to the program.

### Requirement 6: Capture Soul from Outreach Program

**User Story:** As a church member participating in an outreach event, I want to capture a new soul's information linked to the outreach program, so that the church can follow up with the individual.

#### Acceptance Criteria

1. WHEN a member submits a soul capture form with a valid outreach ID, THE Soul service SHALL create a new soul record linked to the specified outreach program.
2. THE Soul service SHALL require first name, last name, and outreach ID for program-linked soul capture.
3. THE Soul service SHALL accept optional fields: phone, email, address, city, gender, age range, and notes.
4. THE Soul service SHALL automatically assign the capturing member as the assigned worker for the new soul.
5. THE Soul service SHALL set the initial status of a newly captured soul to "New".
6. IF a soul with the same phone number already exists in the same outreach program, THEN THE Soul service SHALL create the record but include a duplicate warning in the response.
7. WHEN a member attempts to capture a soul for a program in a different branch, THE Soul service SHALL reject the request with a forbidden error.

### Requirement 7: Capture Soul Ad-Hoc (Outside Outreach Program)

**User Story:** As a church member, I want to capture a soul reached through personal evangelism outside of a formal outreach program, so that the church can track and follow up with the individual.

#### Acceptance Criteria

1. WHEN a member submits a soul capture form without an outreach ID, THE Soul service SHALL create a new soul record with a null outreach_id.
2. THE Soul service SHALL require first name and last name for ad-hoc soul capture.
3. THE Soul service SHALL automatically assign the capturing member as the assigned worker for the ad-hoc soul.
4. THE Soul service SHALL set the initial status of an ad-hoc soul to "New".
5. THE Soul service SHALL associate the ad-hoc soul with the capturing member's branch for branch isolation purposes.

### Requirement 8: List Souls

**User Story:** As a branch pastor or worker, I want to view all souls captured by my branch with filtering and search capabilities, so that I can monitor evangelism progress.

#### Acceptance Criteria

1. WHEN a user requests the souls list, THE Soul service SHALL return souls filtered by the user's branch.
2. WHEN an admin requests the souls list, THE Soul service SHALL return souls across all branches.
3. THE Soul service SHALL support filtering by status, assigned worker, and outreach program.
4. THE Soul service SHALL support searching by soul first name, last name, or phone number.
5. THE Soul service SHALL support pagination with configurable page size and offset.
6. THE Soul service SHALL return soul name, phone, status, assigned worker name, outreach program name, and last follow-up date for each soul in the list.

### Requirement 9: View Soul Detail

**User Story:** As an assigned worker or branch pastor, I want to view the full details of a soul including their follow-up history, so that I can understand the engagement context before making contact.

#### Acceptance Criteria

1. WHEN a user requests a specific soul, THE Soul service SHALL return the soul's personal information, status, assigned worker, outreach program details, and complete follow-up history ordered by most recent first.
2. THE Soul service SHALL include the follow-up worker's name, contact method, contact status, duration, and notes for each follow-up record.
3. WHEN a non-admin user requests a soul from a different branch, THE Soul service SHALL reject the request with a forbidden error.

### Requirement 10: Update Soul Status

**User Story:** As an assigned worker or branch pastor, I want to update a soul's status through the pipeline, so that I can track their spiritual journey from initial contact to conversion.

#### Acceptance Criteria

1. WHEN a worker updates a soul's status, THE Soul service SHALL validate the transition against the allowed pipeline: New → Following Up, Following Up → Interested or Not Interested, Interested → Converted or Not Interested.
2. IF the requested status transition is not in the allowed pipeline, THEN THE Soul service SHALL reject the request with a bad request error listing the allowed transitions.
3. WHEN a soul's status is updated to "Converted", THE Soul service SHALL require a converted_to_member_id linking to the approved member record.
4. IF a soul is in a terminal status (Converted or Not Interested), THEN THE Soul service SHALL reject further status updates with a bad request error indicating the status is terminal.
5. WHEN a soul's status changes, THE Soul service SHALL record the updated timestamp.

### Requirement 11: Conversion Flow — Pre-filled Member Registration

**User Story:** As a branch pastor, I want the system to present a pre-filled member registration form when a soul is marked as Converted, so that the soul can be onboarded as a church member through the standard approval process.

#### Acceptance Criteria

1. WHEN a soul's status is changed to "Converted", THE System SHALL present a member registration form pre-filled with the soul's first name, last name, phone, email, address, and city.
2. THE System SHALL allow the branch pastor or admin to review and edit the pre-filled registration form before submission.
3. WHEN the pre-filled registration form is submitted, THE System SHALL create a pending member record following the existing member registration approval flow.
4. WHEN the pending member is approved by a branch admin, THE Soul service SHALL update the soul record's converted_to_member_id with the newly created member ID.
5. THE System SHALL preserve the soul's follow-up history and outreach program linkage after conversion.

### Requirement 12: Reassign Soul to Different Worker

**User Story:** As a branch pastor, I want to reassign a soul to a different church member, so that follow-up responsibility can be transferred when needed.

#### Acceptance Criteria

1. WHEN a pastor or admin reassigns a soul, THE Soul service SHALL update the assigned_member_id to the new worker's member ID.
2. THE Soul service SHALL verify the new assigned worker is a valid member within the same branch.
3. IF the new assigned worker is from a different branch, THEN THE Soul service SHALL reject the reassignment with a forbidden error.
4. WHEN a soul is reassigned, THE Soul service SHALL record the updated timestamp.

### Requirement 13: Log Follow-Up Activity

**User Story:** As an assigned worker, I want to log a follow-up interaction with a soul including the contact method, outcome, and notes, so that the church has a record of all engagement attempts.

#### Acceptance Criteria

1. WHEN a worker submits a follow-up form, THE Follow_Up service SHALL create a follow-up record linked to the soul and the worker.
2. THE Follow_Up service SHALL require soul ID, contact method, and contact status for follow-up creation.
3. THE Follow_Up service SHALL accept the following contact methods: Phone Call, Text Message, Email, WhatsApp, In-Person Visit, Other.
4. THE Follow_Up service SHALL accept the following contact statuses: Successful, No Answer, Wrong Number, Call Back Later, Not Interested, Interested.
5. THE Follow_Up service SHALL accept optional fields: duration in minutes, notes, and next follow-up date.
6. WHEN a follow-up is logged with a next_follow_up_date, THE Follow_Up service SHALL store the date for use in overdue alert calculations.
7. WHEN a follow-up is logged, THE Soul service SHALL update the soul's updated_at timestamp to reflect the latest activity.

### Requirement 14: Follow-Up Overdue Alerts

**User Story:** As a branch pastor or assigned worker, I want to see which souls are overdue for follow-up, so that I can prioritize outreach to individuals who have not been contacted recently.

#### Acceptance Criteria

1. WHEN a user requests follow-up alerts, THE Follow_Up_Tracker SHALL return souls in active statuses (New, Following Up, Interested) that have not been followed up within the configured threshold.
2. THE Follow_Up_Tracker SHALL use the worker-set next_follow_up_date when available to determine if a soul is overdue.
3. WHEN no next_follow_up_date is set, THE Follow_Up_Tracker SHALL fall back to calculating days since the last follow-up or soul creation date.
4. THE Follow_Up_Tracker SHALL use a default threshold of 2 days for overdue calculation.
5. THE Follow_Up_Tracker SHALL support a configurable threshold parameter per request, allowing branch admins to adjust the sensitivity.
6. THE Follow_Up_Tracker SHALL return the soul name, phone, status, assigned worker name and email, days since last activity, and outreach program name for each overdue soul.
7. THE Follow_Up_Tracker SHALL filter alerts by the user's branch, enforcing branch isolation.

### Requirement 15: Soul Conversion Funnel Report

**User Story:** As a branch pastor or admin, I want to view a conversion funnel showing how many souls are at each status stage, so that I can assess evangelism effectiveness.

#### Acceptance Criteria

1. WHEN a user requests the conversion funnel, THE System SHALL return counts of souls grouped by status (New, Following Up, Interested, Converted, Not Interested).
2. THE System SHALL filter the funnel by the user's branch unless the user is an admin.
3. THE System SHALL support an optional branch ID filter parameter for admin users.

### Requirement 16: Branch Isolation for Outreach Data

**User Story:** As a branch pastor, I want to see only outreach programs, souls, and follow-ups belonging to my branch, so that data privacy is maintained across branches.

#### Acceptance Criteria

1. WHEN a pastor accesses outreach data, THE System SHALL restrict results to programs, souls, and follow-ups associated with the pastor's branch.
2. WHEN a leader accesses outreach data, THE System SHALL restrict results to data associated with the leader's branch.
3. WHEN an admin accesses outreach data, THE System SHALL return data across all branches.
4. WHEN a user attempts to create, update, or delete outreach data for a different branch, THE System SHALL reject the request with a forbidden error.
5. THE System SHALL derive branch association for souls through the linked outreach program's branch ID, or through the capturing member's branch for ad-hoc souls.

### Requirement 17: Outreach Programs List UI

**User Story:** As a branch pastor or member, I want to view outreach programs in a card-based layout with stat cards and filtering, so that I can quickly find and manage programs.

#### Acceptance Criteria

1. THE Outreach_Programs_Page SHALL display stat cards showing Total Programs, Active Programs, and Total Souls Won.
2. THE Outreach_Programs_Page SHALL display program cards with program name, date, location, participant count, souls won count, and completion status badge.
3. THE Outreach_Programs_Page SHALL provide a "Create Program" button that opens a modal form with fields for program name, date, location, description, and coordinator selection.
4. THE Outreach_Programs_Page SHALL provide a "Register as Worker" action on each active program card.
5. WHEN a program card is clicked, THE Outreach_Programs_Page SHALL navigate to the program detail view.
6. THE Outreach_Programs_Page SHALL display a loading spinner while data is being fetched and an empty state message when no programs exist.

### Requirement 18: Soul Capture Form UI

**User Story:** As a church member, I want a form to capture soul information with source selection (outreach program or ad-hoc), so that I can record new souls during or outside of outreach events.

#### Acceptance Criteria

1. THE Soul_Capture_Page SHALL provide input fields for first name, last name, phone, email, address, gender, age group, and notes.
2. THE Soul_Capture_Page SHALL provide a source selector with options: "Outreach Program" and "Ad-hoc Evangelism".
3. WHEN "Outreach Program" is selected as the source, THE Soul_Capture_Page SHALL display a dropdown of active outreach programs for the user's branch.
4. THE Soul_Capture_Page SHALL validate required fields (first name, last name) before submission and display inline error messages.
5. WHEN the form is submitted successfully, THE Soul_Capture_Page SHALL display a success message and reset the form.
6. IF the API returns a duplicate phone warning, THEN THE Soul_Capture_Page SHALL display the warning to the user while confirming the soul was captured.

### Requirement 19: Follow-Up Tracker UI

**User Story:** As an assigned worker or branch pastor, I want a follow-up tracker view showing pending, overdue, and completed follow-ups with search and filter capabilities, so that I can manage my follow-up workload.

#### Acceptance Criteria

1. THE Follow_Up_Tracker_Page SHALL display stat cards showing Pending Follow-Ups Due This Week and Completed Follow-Ups This Month.
2. THE Follow_Up_Tracker_Page SHALL display follow-up cards with soul name, assigned worker, due date, follow-up type, and status.
3. THE Follow_Up_Tracker_Page SHALL provide tabs for All, Pending, and Overdue follow-ups.
4. THE Follow_Up_Tracker_Page SHALL provide search functionality to filter by soul name or worker name.
5. THE Follow_Up_Tracker_Page SHALL provide filter controls for follow-up status and contact method.
6. WHEN a follow-up card action is clicked, THE Follow_Up_Tracker_Page SHALL open a modal to log a new follow-up for the associated soul.
7. THE Follow_Up_Tracker_Page SHALL visually distinguish overdue follow-ups with a warning indicator.
