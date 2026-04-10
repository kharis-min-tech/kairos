# Requirements Document: Outreach Module

## Introduction

The Outreach Module enables church branches to manage evangelism activities through structured outreach programs and ad-hoc soul capture. The module tracks souls from initial contact through conversion, manages follow-up workflows with automated alerts, provides role-based access control, and generates conversion analytics. The system integrates with existing member, branch, and authentication modules while maintaining strict branch isolation for non-admin users.

## Glossary

- **Outreach_System**: The complete outreach module including programs, soul capture, follow-ups, and reporting
- **Soul**: An individual contacted through evangelism who is not yet a church member
- **Outreach_Program**: A planned evangelism event organized by a branch
- **Follow_Up**: A contact attempt or interaction with a soul to nurture their spiritual journey
- **Coordinator**: A member assigned to lead an outreach program
- **Worker**: A member participating in an outreach program
- **Assigned_Worker**: The member responsible for following up with a specific soul
- **Soul_Status**: The current stage in the conversion pipeline (New, Following Up, Interested, Not Interested, Converted, Lost Contact)
- **Contact_Method**: The communication channel used for follow-up (Phone Call, Text Message, Email, WhatsApp, In-Person Visit, Other)
- **Contact_Status**: The outcome of a follow-up attempt (Successful, No Answer, Wrong Number, Call Back Later, Not Interested, Interested)
- **Kanban_Board**: A visual interface displaying souls organized by status with drag-and-drop functionality
- **Conversion**: The process of a soul becoming a church member
- **Follow_Up_Alert**: A notification triggered when a soul has not been contacted within the configured timeframe
- **Admin**: A user with full system access across all branches
- **Pastor**: A user with access to their assigned branch data only
- **Member**: A regular church member with limited access to assigned souls only
- **Branch_Isolation**: Security constraint ensuring non-admin users access only their branch data
- **Soft_Delete**: Marking records as inactive rather than removing them from the database


## Requirements

### Requirement 1: Outreach Program Management

**User Story:** As a Pastor or Admin, I want to create and manage outreach programs, so that I can organize evangelism activities for my branch.

#### Acceptance Criteria

1. WHEN an Admin or Pastor creates an outreach program, THE Outreach_System SHALL store the program with branch_id, program_name, program_date, location, address, city, description, coordinator_id, and is_completed status
2. THE Outreach_System SHALL enforce case-insensitive duplicate detection for program_name within the same branch_id and program_date
3. WHEN a Pastor creates an outreach program, THE Outreach_System SHALL automatically set branch_id to the Pastor's assigned branch
4. WHEN an Admin creates an outreach program, THE Outreach_System SHALL require explicit branch_id selection
5. WHEN retrieving outreach programs, THE Outreach_System SHALL filter results by the user's branch_id unless the user is an Admin
6. THE Outreach_System SHALL allow updating program details including coordinator_id, location, description, and is_completed status
7. THE Outreach_System SHALL use soft delete via is_completed flag rather than removing program records
8. WHEN listing outreach programs, THE Outreach_System SHALL display program_name, program_date, location, coordinator name, total_souls_reached, and is_completed status

### Requirement 2: Outreach Program Participation

**User Story:** As a Member, I want to register as a worker for outreach programs, so that I can participate in evangelism activities.

#### Acceptance Criteria

1. WHEN a Member registers for an outreach program, THE Outreach_System SHALL create a record in outreach_participants with outreach_id, member_id, role, and notes
2. THE Outreach_System SHALL prevent duplicate registrations for the same outreach_id and member_id combination
3. WHEN listing program participants, THE Outreach_System SHALL display member name, role, and notes
4. THE Outreach_System SHALL allow Coordinators and Admins to add participants directly to programs
5. WHEN displaying an outreach program, THE Outreach_System SHALL show the count of registered workers


### Requirement 3: Soul Capture Form

**User Story:** As a Worker, I want to capture soul information during evangelism, so that the church can follow up with new contacts.

#### Acceptance Criteria

1. WHEN a Worker submits the soul capture form, THE Outreach_System SHALL validate that first_name, last_name, and phone are provided
2. WHEN a Worker captures a soul from an outreach program, THE Outreach_System SHALL link the soul to the specified outreach_id
3. WHEN a Worker captures a soul through ad-hoc evangelism, THE Outreach_System SHALL create the soul record without an outreach_id link
4. THE Outreach_System SHALL automatically set assigned_member_id to the Worker's member_id
5. THE Outreach_System SHALL initialize soul status to 'New'
6. THE Outreach_System SHALL store optional fields including email, address, city, gender, age_range, and notes
7. WHEN a soul is captured, THE Outreach_System SHALL store the capture date in created_at
8. THE Outreach_System SHALL validate phone format before storing
9. THE Outreach_System SHALL validate email format when email is provided

### Requirement 4: Soul Status Pipeline

**User Story:** As a Worker, I want to track soul progression through the conversion pipeline, so that I can monitor evangelism effectiveness.

#### Acceptance Criteria

1. THE Outreach_System SHALL support exactly six status values: 'New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'
2. WHEN a Worker updates soul status, THE Outreach_System SHALL validate the new status against the allowed values
3. WHEN a soul status is changed to 'Converted', THE Outreach_System SHALL require converted_to_member_id to be set
4. WHEN a soul status is changed to 'Converted', THE Outreach_System SHALL validate that converted_to_member_id references an active member
5. THE Outreach_System SHALL allow bidirectional status transitions between all status values
6. WHEN a soul status is updated, THE Outreach_System SHALL record the change timestamp in updated_at
7. THE Outreach_System SHALL normalize status values to handle case variations and whitespace


### Requirement 5: Follow-Up Logging

**User Story:** As a Worker, I want to log follow-up interactions with souls, so that I can track contact history and outcomes.

#### Acceptance Criteria

1. WHEN a Worker logs a follow-up, THE Outreach_System SHALL validate that soul_id, member_id, follow_up_date, and contact_status are provided
2. THE Outreach_System SHALL support contact methods: 'Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other'
3. THE Outreach_System SHALL support contact statuses: 'Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested'
4. THE Outreach_System SHALL store optional fields including contact_method, duration_minutes, notes, and next_follow_up_date
5. WHEN retrieving follow-ups for a soul, THE Outreach_System SHALL use LEFT JOIN to include souls from both outreach programs and ad-hoc evangelism
6. THE Outreach_System SHALL order follow-up history by follow_up_date in descending order
7. WHEN a follow-up is logged, THE Outreach_System SHALL automatically set follow_up_date to current timestamp if not provided
8. THE Outreach_System SHALL validate that duration_minutes is greater than zero when provided

### Requirement 6: Follow-Up Alerts

**User Story:** As a Pastor or Admin, I want to receive alerts for overdue follow-ups, so that no souls are neglected.

#### Acceptance Criteria

1. THE Outreach_System SHALL generate a Follow_Up_Alert when a soul with status 'New' or 'Following Up' has no follow-up logged within 2 days
2. THE Outreach_System SHALL generate a Follow_Up_Alert when a soul with status 'Interested' has no follow-up logged within 3 days
3. THE Outreach_System SHALL send Follow_Up_Alert notifications to the Assigned_Worker
4. THE Outreach_System SHALL allow Admins to configure the alert threshold in days per status
5. WHEN calculating alert eligibility, THE Outreach_System SHALL compare current date against the most recent follow_up_date for each soul
6. THE Outreach_System SHALL exclude souls with status 'Converted', 'Not Interested', or 'Lost Contact' from alert generation


### Requirement 7: Soul Kanban Board

**User Story:** As a Worker, I want to view my assigned souls in a Kanban board, so that I can visualize the conversion pipeline and prioritize follow-ups.

#### Acceptance Criteria

1. THE Outreach_System SHALL display souls in four columns: 'New', 'Following Up', 'Interested', 'Converted'
2. THE Outreach_System SHALL exclude souls with status 'Not Interested' and 'Lost Contact' from the Kanban_Board
3. WHEN a Worker drags a soul card to a different column, THE Outreach_System SHALL update the soul status to match the target column
4. THE Outreach_System SHALL allow bidirectional drag-and-drop transitions between all four displayed columns
5. WHEN displaying a soul card, THE Outreach_System SHALL show first_name, last_name, phone, and days since last follow-up
6. WHEN a soul has no follow-up logged within 2 days, THE Outreach_System SHALL display a warning indicator on the soul card
7. WHEN a Worker views the Kanban_Board, THE Outreach_System SHALL filter souls to show only those assigned to the Worker unless the Worker is an Admin or Pastor
8. WHEN an Admin or Pastor views the Kanban_Board, THE Outreach_System SHALL display all souls within their authorized branch scope

### Requirement 8: Soul Detail View

**User Story:** As a Worker, I want to view detailed soul information and history, so that I can understand the relationship context before follow-up.

#### Acceptance Criteria

1. WHEN a Worker opens a soul detail view, THE Outreach_System SHALL display first_name, last_name, phone, email, address, city, gender, age_range, status, and notes
2. THE Outreach_System SHALL display the complete follow-up history ordered by follow_up_date descending
3. WHEN displaying follow-up history, THE Outreach_System SHALL show follow_up_date, member name, contact_method, contact_status, duration_minutes, and notes for each entry
4. THE Outreach_System SHALL provide a form to log new follow-ups within the detail view
5. THE Outreach_System SHALL provide controls to update soul status within the detail view
6. THE Outreach_System SHALL provide controls to reassign the soul to a different Worker
7. WHEN a soul status is 'Converted', THE Outreach_System SHALL display the linked member information via converted_to_member_id
8. THE Outreach_System SHALL display the outreach program name when the soul is linked to an outreach_id


### Requirement 9: Soul Reassignment

**User Story:** As a Pastor or Admin, I want to reassign souls to different workers, so that I can balance workload and ensure effective follow-up.

#### Acceptance Criteria

1. WHEN a Pastor or Admin reassigns a soul, THE Outreach_System SHALL update assigned_member_id to the new Worker's member_id
2. THE Outreach_System SHALL validate that the new assigned_member_id references an active member
3. WHEN a Pastor reassigns a soul, THE Outreach_System SHALL validate that both the current and new Worker belong to the Pastor's branch
4. WHEN an Admin reassigns a soul, THE Outreach_System SHALL allow assignment to any active member across all branches
5. THE Outreach_System SHALL send a notification to the new Assigned_Worker when reassignment occurs
6. THE Outreach_System SHALL preserve all existing follow-up history when reassignment occurs

### Requirement 10: Soul Conversion to Member

**User Story:** As a Worker, I want to convert a soul to a member, so that they can be integrated into the church community.

#### Acceptance Criteria

1. WHEN a Worker converts a soul to member, THE Outreach_System SHALL create a new member record with data from the soul record
2. THE Outreach_System SHALL set the soul status to 'Converted'
3. THE Outreach_System SHALL set converted_to_member_id to the newly created member_id
4. THE Outreach_System SHALL transfer first_name, last_name, phone, email, address, city, and gender to the member record
5. THE Outreach_System SHALL set the member's home_branch_id to match the soul's associated branch
6. THE Outreach_System SHALL set membership_date to the current date
7. THE Outreach_System SHALL execute the conversion as an atomic transaction to prevent partial data creation
8. WHEN conversion fails, THE Outreach_System SHALL preserve the soul record in its pre-conversion state


### Requirement 11: Conversion Funnel Report

**User Story:** As a Pastor or Admin, I want to view conversion funnel metrics, so that I can measure evangelism effectiveness.

#### Acceptance Criteria

1. THE Outreach_System SHALL calculate the count of souls at each status: 'New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'
2. THE Outreach_System SHALL calculate the conversion rate as the percentage of souls with status 'Converted' divided by total souls
3. THE Outreach_System SHALL calculate the drop-off rate at each pipeline stage
4. WHEN a Pastor views the conversion funnel, THE Outreach_System SHALL filter metrics to the Pastor's branch only
5. WHEN an Admin views the conversion funnel, THE Outreach_System SHALL display metrics across all branches with optional branch filtering
6. THE Outreach_System SHALL allow filtering the conversion funnel by date range
7. THE Outreach_System SHALL allow filtering the conversion funnel by outreach_id to measure program effectiveness
8. THE Outreach_System SHALL display the average time in days between soul capture and conversion

### Requirement 12: Role-Based Access Control

**User Story:** As a System Administrator, I want to enforce role-based permissions, so that users access only authorized outreach data.

#### Acceptance Criteria

1. WHEN an Admin accesses outreach data, THE Outreach_System SHALL return data from all branches without filtering
2. WHEN a Pastor accesses outreach data, THE Outreach_System SHALL filter results to include only the Pastor's assigned branch_id
3. WHEN a Member accesses soul data, THE Outreach_System SHALL filter results to include only souls where assigned_member_id matches the Member's member_id
4. THE Outreach_System SHALL prevent Members from viewing souls assigned to other Members
5. THE Outreach_System SHALL allow Pastors to view all souls within their branch regardless of assignment
6. THE Outreach_System SHALL prevent Pastors from accessing outreach programs or souls from other branches
7. THE Outreach_System SHALL validate user role and branch_id on every API request before returning data
8. WHEN authorization fails, THE Outreach_System SHALL return an HTTP 403 Forbidden error with a descriptive message


### Requirement 13: Outreach Program Detail View

**User Story:** As a Coordinator, I want to view comprehensive program details, so that I can monitor program execution and outcomes.

#### Acceptance Criteria

1. WHEN a Coordinator views an outreach program, THE Outreach_System SHALL display program_name, program_date, location, address, city, description, coordinator name, and is_completed status
2. THE Outreach_System SHALL display the list of registered workers with their roles
3. THE Outreach_System SHALL display the count of souls captured during the program
4. THE Outreach_System SHALL display the list of souls captured with their current status
5. THE Outreach_System SHALL calculate and display follow-up outcome statistics including contact_method distribution and contact_status distribution
6. THE Outreach_System SHALL allow the Coordinator to mark the program as completed by setting is_completed to true
7. THE Outreach_System SHALL allow the Coordinator to update program details including location, description, and notes

### Requirement 14: Soul Search and Filtering

**User Story:** As a Pastor, I want to search and filter souls, so that I can find specific individuals or identify souls needing attention.

#### Acceptance Criteria

1. THE Outreach_System SHALL support searching souls by first_name, last_name, phone, or email using partial matching
2. THE Outreach_System SHALL support filtering souls by status
3. THE Outreach_System SHALL support filtering souls by assigned_member_id
4. THE Outreach_System SHALL support filtering souls by outreach_id
5. THE Outreach_System SHALL support filtering souls by date range using created_at
6. WHEN a Pastor searches or filters souls, THE Outreach_System SHALL apply branch_id filtering to results
7. WHEN an Admin searches or filters souls, THE Outreach_System SHALL return results across all branches unless branch_id filter is specified
8. THE Outreach_System SHALL return search results ordered by created_at descending by default


### Requirement 15: Data Validation and Error Handling

**User Story:** As a Developer, I want comprehensive input validation and error handling, so that the system provides clear feedback and maintains data integrity.

#### Acceptance Criteria

1. WHEN invalid data is submitted, THE Outreach_System SHALL return an HTTP 400 Bad Request error with field-specific validation messages
2. WHEN a database constraint violation occurs, THE Outreach_System SHALL return an HTTP 409 Conflict error with a descriptive message
3. WHEN a requested resource is not found, THE Outreach_System SHALL return an HTTP 404 Not Found error
4. WHEN authorization fails, THE Outreach_System SHALL return an HTTP 403 Forbidden error
5. THE Outreach_System SHALL validate all enum fields against allowed values before database insertion
6. THE Outreach_System SHALL sanitize all text inputs to prevent SQL injection
7. THE Outreach_System SHALL validate foreign key references exist before creating relationships
8. WHEN an error occurs, THE Outreach_System SHALL log the error with context including user_id, request_id, and timestamp

### Requirement 16: Outreach Program Listing and Pagination

**User Story:** As a Pastor, I want to view a paginated list of outreach programs, so that I can browse historical and upcoming programs efficiently.

#### Acceptance Criteria

1. THE Outreach_System SHALL support pagination with configurable page size between 10 and 100 records
2. THE Outreach_System SHALL return pagination metadata including current page, total pages, total count, and page size
3. THE Outreach_System SHALL support sorting by program_date in ascending or descending order
4. THE Outreach_System SHALL support filtering programs by is_completed status
5. THE Outreach_System SHALL support filtering programs by date range
6. WHEN a Pastor lists programs, THE Outreach_System SHALL filter results to the Pastor's branch_id
7. WHEN an Admin lists programs, THE Outreach_System SHALL return programs from all branches with optional branch_id filtering
8. THE Outreach_System SHALL include coordinator name and total_souls_reached in the list response


### Requirement 17: Soul Assignment Validation

**User Story:** As a System Administrator, I want to validate soul assignments, so that souls are only assigned to authorized and active members.

#### Acceptance Criteria

1. WHEN assigning a soul to a Worker, THE Outreach_System SHALL validate that assigned_member_id references an existing member record
2. THE Outreach_System SHALL validate that the assigned member has is_active set to true
3. WHEN a Pastor assigns a soul, THE Outreach_System SHALL validate that the assigned member belongs to the Pastor's branch
4. WHEN an Admin assigns a soul, THE Outreach_System SHALL allow assignment to any active member across all branches
5. WHEN a member is deactivated, THE Outreach_System SHALL retain existing soul assignments but prevent new assignments
6. THE Outreach_System SHALL allow reassignment of souls from inactive members to active members

### Requirement 18: Follow-Up History Access Control

**User Story:** As a Pastor, I want to view follow-up history for all souls in my branch, so that I can monitor worker effectiveness and provide support.

#### Acceptance Criteria

1. WHEN a Worker views follow-up history, THE Outreach_System SHALL display follow-ups for souls assigned to the Worker
2. WHEN a Pastor views follow-up history, THE Outreach_System SHALL display follow-ups for all souls within the Pastor's branch
3. WHEN an Admin views follow-up history, THE Outreach_System SHALL display follow-ups across all branches
4. THE Outreach_System SHALL display the member name who logged each follow-up
5. THE Outreach_System SHALL allow filtering follow-up history by contact_status
6. THE Outreach_System SHALL allow filtering follow-up history by contact_method
7. THE Outreach_System SHALL allow filtering follow-up history by date range


### Requirement 19: Outreach Program Statistics

**User Story:** As a Coordinator, I want to view program statistics, so that I can measure program success and identify improvement areas.

#### Acceptance Criteria

1. WHEN viewing an outreach program, THE Outreach_System SHALL calculate total_souls_reached as the count of souls linked to the outreach_id
2. THE Outreach_System SHALL calculate the count of workers registered for the program
3. THE Outreach_System SHALL calculate the distribution of soul statuses for the program
4. THE Outreach_System SHALL calculate the average follow-ups per soul for the program
5. THE Outreach_System SHALL calculate the conversion rate as converted souls divided by total souls
6. THE Outreach_System SHALL calculate the average days from capture to conversion for converted souls
7. THE Outreach_System SHALL update total_souls_reached automatically when souls are added or removed from the program

### Requirement 20: Branch Override for Cross-Branch Participation

**User Story:** As an Admin, I want to temporarily change a member's branch assignment, so that traveling members can participate in outreach programs at different branches.

#### Acceptance Criteria

1. WHEN an Admin updates a member's home_branch_id, THE Outreach_System SHALL validate that the target branch_id exists and is active
2. THE Outreach_System SHALL allow the member to register for outreach programs at the new branch after home_branch_id is updated
3. THE Outreach_System SHALL preserve the member's historical outreach participation records from the previous branch
4. THE Outreach_System SHALL use snake_case parameter names (home_branch_id) in API requests to match database schema
5. WHEN a member's branch is changed, THE Outreach_System SHALL update all future access control checks to use the new branch_id


### Requirement 21: Soul Data Export

**User Story:** As a Pastor or Admin, I want to export soul data to CSV, so that I can analyze data externally or share with leadership.

#### Acceptance Criteria

1. THE Outreach_System SHALL generate CSV files containing soul_id, first_name, last_name, phone, email, address, city, gender, age_range, status, assigned_member_name, outreach_program_name, and created_at
2. WHEN a Pastor exports souls, THE Outreach_System SHALL include only souls from the Pastor's branch
3. WHEN an Admin exports souls, THE Outreach_System SHALL include souls from all branches with optional branch_id filtering
4. THE Outreach_System SHALL apply active search and filter criteria to the export
5. THE Outreach_System SHALL include column headers in the CSV file
6. THE Outreach_System SHALL escape special characters in CSV fields to prevent injection attacks
7. THE Outreach_System SHALL set appropriate HTTP headers for CSV download (Content-Type: text/csv, Content-Disposition: attachment)

### Requirement 22: Follow-Up Reminder Notifications

**User Story:** As a Worker, I want to receive notifications for upcoming follow-ups, so that I don't miss scheduled contacts.

#### Acceptance Criteria

1. WHEN a follow-up has next_follow_up_date set, THE Outreach_System SHALL generate a reminder notification on the specified date
2. THE Outreach_System SHALL send the reminder notification to the Assigned_Worker
3. THE Outreach_System SHALL include soul name, phone, and last contact date in the reminder notification
4. THE Outreach_System SHALL generate reminders only for souls with status 'New', 'Following Up', or 'Interested'
5. THE Outreach_System SHALL not generate duplicate reminders for the same soul and date
6. WHEN a follow-up is logged after a reminder is sent, THE Outreach_System SHALL cancel any pending reminders for that soul


### Requirement 23: Localhost Deployment

**User Story:** As a Developer, I want to deploy the outreach module on localhost, so that the system runs entirely in the local Docker environment without cloud dependencies.

#### Acceptance Criteria

1. THE Outreach_System SHALL run on Docker PostgreSQL 15 without requiring Aurora Serverless v2
2. THE Outreach_System SHALL use bcrypt and jsonwebtoken for authentication without requiring AWS Cognito
3. THE Outreach_System SHALL store all data in the local PostgreSQL database
4. THE Outreach_System SHALL run the Hono API server on localhost port 3001
5. THE Outreach_System SHALL run the Next.js frontend on localhost port 3000
6. THE Outreach_System SHALL support all functionality without external API dependencies
7. WHEN starting the system, THE Outreach_System SHALL initialize via 'docker compose up -d' followed by 'npx turbo dev'
8. THE Outreach_System SHALL apply database migrations automatically on startup

### Requirement 24: Status Dropdown Fix

**User Story:** As a Worker, I want to see all six status options in the dropdown, so that I can update souls to any valid status including 'Lost Contact'.

#### Acceptance Criteria

1. THE Outreach_System SHALL display all six status values in the status dropdown: 'New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'
2. THE Outreach_System SHALL not limit the dropdown to only two options
3. THE Outreach_System SHALL display status options in a logical order reflecting the conversion pipeline
4. THE Outreach_System SHALL allow selection of any status regardless of current status
5. THE Outreach_System SHALL validate the selected status against the six allowed values before submission


### Requirement 25: Bidirectional Status Transitions

**User Story:** As a Worker, I want to move souls backward in the pipeline, so that I can correct status updates or reflect changing circumstances.

#### Acceptance Criteria

1. THE Outreach_System SHALL allow updating soul status from 'Following Up' to 'New'
2. THE Outreach_System SHALL allow updating soul status from 'Interested' to 'Following Up'
3. THE Outreach_System SHALL allow updating soul status from 'Converted' to any previous status
4. THE Outreach_System SHALL allow updating soul status from 'Not Interested' to 'Following Up' or 'Interested'
5. THE Outreach_System SHALL allow updating soul status from 'Lost Contact' to any other status
6. THE Outreach_System SHALL provide status update buttons in the soul detail view for common transitions
7. THE Outreach_System SHALL log status changes in the updated_at timestamp

### Requirement 26: Outreach Program Coordinator Assignment

**User Story:** As a Pastor or Admin, I want to assign coordinators to outreach programs, so that programs have clear leadership.

#### Acceptance Criteria

1. WHEN creating an outreach program, THE Outreach_System SHALL allow setting coordinator_id to any active member
2. THE Outreach_System SHALL validate that coordinator_id references an existing active member
3. WHEN a Pastor assigns a coordinator, THE Outreach_System SHALL validate that the coordinator belongs to the Pastor's branch
4. WHEN an Admin assigns a coordinator, THE Outreach_System SHALL allow assignment of any active member across all branches
5. THE Outreach_System SHALL allow updating coordinator_id after program creation
6. THE Outreach_System SHALL allow setting coordinator_id to null if no coordinator is assigned
7. WHEN displaying program details, THE Outreach_System SHALL show the coordinator's full name


### Requirement 27: Soul List View with Overdue Indicators

**User Story:** As a Pastor, I want to see which souls are overdue for follow-up, so that I can prioritize worker assignments and interventions.

#### Acceptance Criteria

1. WHEN displaying a list of souls, THE Outreach_System SHALL calculate days since last follow-up for each soul
2. WHEN a soul has no follow-up logged within 2 days and status is 'New' or 'Following Up', THE Outreach_System SHALL display a warning indicator
3. WHEN a soul has no follow-up logged within 3 days and status is 'Interested', THE Outreach_System SHALL display a warning indicator
4. THE Outreach_System SHALL display the warning indicator as a visual element (icon or badge) on the soul card or row
5. THE Outreach_System SHALL support sorting souls by days since last follow-up
6. THE Outreach_System SHALL allow filtering to show only overdue souls
7. WHEN a soul has status 'Converted', 'Not Interested', or 'Lost Contact', THE Outreach_System SHALL not display overdue indicators

### Requirement 28: Outreach Program Completion Workflow

**User Story:** As a Coordinator, I want to mark programs as completed, so that I can distinguish between active and historical programs.

#### Acceptance Criteria

1. WHEN a Coordinator marks a program as completed, THE Outreach_System SHALL set is_completed to true
2. THE Outreach_System SHALL allow only the Coordinator, Pastor, or Admin to mark programs as completed
3. THE Outreach_System SHALL allow reopening completed programs by setting is_completed to false
4. WHEN listing programs, THE Outreach_System SHALL support filtering by is_completed status
5. THE Outreach_System SHALL display completed programs with a visual indicator (badge or icon)
6. THE Outreach_System SHALL allow editing completed programs
7. THE Outreach_System SHALL preserve all souls and follow-up data when a program is marked completed


### Requirement 29: Ad-Hoc Soul Capture Support

**User Story:** As a Member, I want to capture souls from personal evangelism outside of organized programs, so that all evangelism efforts are tracked.

#### Acceptance Criteria

1. WHEN a Member captures a soul without selecting an outreach program, THE Outreach_System SHALL create the soul record with outreach_id set to null
2. THE Outreach_System SHALL allow filtering souls to show only ad-hoc captures (where outreach_id is null)
3. THE Outreach_System SHALL allow filtering souls to show only program-linked captures (where outreach_id is not null)
4. WHEN displaying soul details for ad-hoc captures, THE Outreach_System SHALL indicate "Ad-hoc Evangelism" as the source
5. THE Outreach_System SHALL include ad-hoc souls in all follow-up workflows and alerts
6. THE Outreach_System SHALL include ad-hoc souls in conversion funnel reports
7. THE Outreach_System SHALL use LEFT JOIN when querying souls with outreach programs to include ad-hoc souls in results

### Requirement 30: Follow-Up Query Optimization

**User Story:** As a Developer, I want optimized database queries for follow-ups, so that the system performs well with large datasets.

#### Acceptance Criteria

1. WHEN retrieving follow-ups for ad-hoc souls, THE Outreach_System SHALL use LEFT JOIN between souls and outreach_programs tables
2. THE Outreach_System SHALL not use INNER JOIN for follow-up queries to prevent excluding ad-hoc souls
3. THE Outreach_System SHALL create database indexes on soul_id and member_id columns in the follow_ups table
4. THE Outreach_System SHALL create database indexes on assigned_member_id and status columns in the souls table
5. THE Outreach_System SHALL limit query results to 1000 records by default with pagination for larger datasets
6. THE Outreach_System SHALL use database connection pooling to handle concurrent requests efficiently


### Requirement 31: Atomic Soul Conversion Transaction

**User Story:** As a Developer, I want soul-to-member conversion to be atomic, so that partial failures don't corrupt data.

#### Acceptance Criteria

1. WHEN converting a soul to member, THE Outreach_System SHALL execute all operations within a single database transaction
2. IF member creation fails, THE Outreach_System SHALL rollback the transaction and preserve the soul record unchanged
3. IF soul status update fails, THE Outreach_System SHALL rollback the transaction and delete the created member record
4. THE Outreach_System SHALL validate all required member fields before starting the transaction
5. THE Outreach_System SHALL set the member's is_active to true during conversion
6. THE Outreach_System SHALL commit the transaction only after both member creation and soul update succeed
7. WHEN transaction rollback occurs, THE Outreach_System SHALL return an error response with details of the failure

### Requirement 32: Case-Insensitive Duplicate Program Detection

**User Story:** As a Pastor, I want the system to prevent duplicate program names, so that I don't accidentally create the same program twice.

#### Acceptance Criteria

1. WHEN creating an outreach program, THE Outreach_System SHALL check for existing programs with the same program_name (case-insensitive) within the same branch_id and program_date
2. THE Outreach_System SHALL normalize program_name by converting to lowercase and trimming whitespace before comparison
3. IF a duplicate is detected, THE Outreach_System SHALL return an HTTP 409 Conflict error with message "A program with this name already exists on this date"
4. THE Outreach_System SHALL allow programs with the same name on different dates
5. THE Outreach_System SHALL allow programs with the same name in different branches
6. THE Outreach_System SHALL perform duplicate detection before database insertion to prevent constraint violations


### Requirement 33: Soul Status Normalization

**User Story:** As a Developer, I want status values to be normalized, so that variations in input don't cause validation failures.

#### Acceptance Criteria

1. WHEN receiving a soul status update, THE Outreach_System SHALL trim leading and trailing whitespace from the status value
2. THE Outreach_System SHALL normalize status values to match exact database enum values
3. THE Outreach_System SHALL handle common variations including 'following up' (lowercase) mapping to 'Following Up'
4. THE Outreach_System SHALL handle 'lost contact' (lowercase) mapping to 'Lost Contact'
5. IF normalization cannot map to a valid status, THE Outreach_System SHALL return an HTTP 400 Bad Request error listing valid status values
6. THE Outreach_System SHALL apply normalization before database validation to reduce user errors

### Requirement 34: Outreach Program Date Validation

**User Story:** As a Pastor, I want program dates to be validated, so that I don't create programs with invalid dates.

#### Acceptance Criteria

1. WHEN creating an outreach program, THE Outreach_System SHALL validate that program_date is a valid date format
2. THE Outreach_System SHALL allow program_date to be in the past for historical record keeping
3. THE Outreach_System SHALL allow program_date to be in the future for planned programs
4. THE Outreach_System SHALL validate that program_date is not more than 10 years in the past
5. THE Outreach_System SHALL validate that program_date is not more than 2 years in the future
6. IF date validation fails, THE Outreach_System SHALL return an HTTP 400 Bad Request error with a descriptive message


### Requirement 35: Follow-Up Contact Method Validation

**User Story:** As a Worker, I want contact methods to be validated, so that I can only select valid communication channels.

#### Acceptance Criteria

1. THE Outreach_System SHALL validate contact_method against the allowed values: 'Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other'
2. THE Outreach_System SHALL allow contact_method to be null when logging a follow-up
3. WHEN contact_method is 'Other', THE Outreach_System SHALL require notes to be provided
4. THE Outreach_System SHALL normalize contact_method values by trimming whitespace
5. IF an invalid contact_method is provided, THE Outreach_System SHALL return an HTTP 400 Bad Request error listing valid options

### Requirement 36: Soul Phone Number Formatting

**User Story:** As a Worker, I want phone numbers to be consistently formatted, so that contact information is standardized.

#### Acceptance Criteria

1. WHEN a soul is captured with a phone number, THE Outreach_System SHALL validate that phone contains only digits, spaces, hyphens, parentheses, and plus signs
2. THE Outreach_System SHALL store phone numbers in the format provided by the user without automatic reformatting
3. THE Outreach_System SHALL validate that phone length is between 7 and 20 characters
4. THE Outreach_System SHALL allow international phone numbers with country codes
5. IF phone validation fails, THE Outreach_System SHALL return an HTTP 400 Bad Request error with message "Invalid phone number format"


### Requirement 37: Outreach Module API Endpoints

**User Story:** As a Frontend Developer, I want well-defined API endpoints, so that I can integrate the outreach module with the Next.js application.

#### Acceptance Criteria

1. THE Outreach_System SHALL expose POST /api/outreach/programs to create outreach programs
2. THE Outreach_System SHALL expose GET /api/outreach/programs to list outreach programs with pagination and filtering
3. THE Outreach_System SHALL expose GET /api/outreach/programs/:id to retrieve a single program with details
4. THE Outreach_System SHALL expose PUT /api/outreach/programs/:id to update program details
5. THE Outreach_System SHALL expose POST /api/outreach/programs/:id/participants to register workers
6. THE Outreach_System SHALL expose POST /api/souls to capture new souls
7. THE Outreach_System SHALL expose GET /api/souls to list souls with filtering and search
8. THE Outreach_System SHALL expose GET /api/souls/:id to retrieve soul details with follow-up history
9. THE Outreach_System SHALL expose PUT /api/souls/:id/status to update soul status
10. THE Outreach_System SHALL expose PUT /api/souls/:id/assign to reassign souls to different workers
11. THE Outreach_System SHALL expose POST /api/souls/:id/follow-ups to log follow-up interactions
12. THE Outreach_System SHALL expose POST /api/souls/:id/convert to convert souls to members
13. THE Outreach_System SHALL expose GET /api/outreach/reports/conversion-funnel to retrieve conversion metrics
14. THE Outreach_System SHALL expose GET /api/souls/export to generate CSV exports
15. THE Outreach_System SHALL include authentication tokens in all API requests via Authorization header


### Requirement 38: Frontend Route Structure

**User Story:** As a User, I want intuitive navigation to outreach features, so that I can access functionality efficiently.

#### Acceptance Criteria

1. THE Outreach_System SHALL provide route /outreach/programs for the outreach programs list view
2. THE Outreach_System SHALL provide route /outreach/programs/new for creating new programs
3. THE Outreach_System SHALL provide route /outreach/programs/:id for program detail view
4. THE Outreach_System SHALL provide route /souls/capture for the soul capture form
5. THE Outreach_System SHALL provide route /souls for the soul Kanban board view
6. THE Outreach_System SHALL provide route /souls/:id for the soul detail view
7. THE Outreach_System SHALL provide route /outreach/reports for conversion funnel and analytics
8. THE Outreach_System SHALL integrate routes into the main navigation sidebar under "Evangelism" section

### Requirement 39: Responsive Design Support

**User Story:** As a User, I want the outreach module to work on mobile devices, so that I can capture souls and log follow-ups in the field.

#### Acceptance Criteria

1. THE Outreach_System SHALL render the soul capture form optimally on screens with width less than 768 pixels
2. THE Outreach_System SHALL adapt the Kanban_Board to a vertical scrolling list view on mobile devices
3. THE Outreach_System SHALL ensure all form inputs are touch-friendly with minimum 44x44 pixel touch targets
4. THE Outreach_System SHALL display program lists in a card layout on mobile devices
5. THE Outreach_System SHALL ensure all text is readable without horizontal scrolling on mobile devices
6. THE Outreach_System SHALL optimize table views for mobile by showing essential columns only with expandable details


### Requirement 40: Outreach Program Worker Roles

**User Story:** As a Coordinator, I want to assign specific roles to workers, so that responsibilities are clear during programs.

#### Acceptance Criteria

1. WHEN registering a worker for a program, THE Outreach_System SHALL allow specifying a role in the outreach_participants record
2. THE Outreach_System SHALL store role as a text field allowing free-form role descriptions
3. THE Outreach_System SHALL allow updating worker roles after registration
4. WHEN displaying program participants, THE Outreach_System SHALL show each worker's assigned role
5. THE Outreach_System SHALL allow role to be null if no specific role is assigned

### Requirement 41: Soul Gender and Age Range Tracking

**User Story:** As a Pastor, I want to track soul demographics, so that I can understand who is being reached through evangelism.

#### Acceptance Criteria

1. THE Outreach_System SHALL support gender values: 'Male', 'Female', or null
2. THE Outreach_System SHALL validate gender against allowed values when provided
3. THE Outreach_System SHALL store age_range as a text field allowing values like '18-25', '26-35', '36-50', '51+'
4. THE Outreach_System SHALL allow age_range to be null
5. THE Outreach_System SHALL include gender and age_range in soul detail views
6. THE Outreach_System SHALL include gender and age_range in CSV exports
7. THE Outreach_System SHALL support filtering souls by gender in list views


### Requirement 42: Total Souls Reached Counter

**User Story:** As a Coordinator, I want to see the total souls reached for each program, so that I can measure program impact.

#### Acceptance Criteria

1. THE Outreach_System SHALL calculate total_souls_reached as the count of souls where outreach_id matches the program
2. THE Outreach_System SHALL update total_souls_reached automatically when souls are added to the program
3. THE Outreach_System SHALL update total_souls_reached automatically when souls are removed from the program
4. THE Outreach_System SHALL display total_souls_reached in the program list view
5. THE Outreach_System SHALL display total_souls_reached in the program detail view
6. THE Outreach_System SHALL initialize total_souls_reached to 0 when a program is created

### Requirement 43: Follow-Up Duration Tracking

**User Story:** As a Pastor, I want to track follow-up duration, so that I can understand worker time investment.

#### Acceptance Criteria

1. WHEN logging a follow-up, THE Outreach_System SHALL allow specifying duration_minutes
2. THE Outreach_System SHALL validate that duration_minutes is greater than 0 when provided
3. THE Outreach_System SHALL allow duration_minutes to be null
4. THE Outreach_System SHALL display duration_minutes in follow-up history
5. THE Outreach_System SHALL calculate average follow-up duration per worker for reporting
6. THE Outreach_System SHALL calculate total follow-up time per soul for reporting


### Requirement 44: Next Follow-Up Date Scheduling

**User Story:** As a Worker, I want to schedule the next follow-up date, so that I can plan my outreach activities.

#### Acceptance Criteria

1. WHEN logging a follow-up, THE Outreach_System SHALL allow specifying next_follow_up_date
2. THE Outreach_System SHALL validate that next_follow_up_date is a valid date format
3. THE Outreach_System SHALL validate that next_follow_up_date is not in the past
4. THE Outreach_System SHALL allow next_follow_up_date to be null
5. WHEN next_follow_up_date is reached, THE Outreach_System SHALL generate a reminder notification to the Assigned_Worker
6. THE Outreach_System SHALL display next_follow_up_date in the soul detail view
7. THE Outreach_System SHALL allow filtering souls by next_follow_up_date range

### Requirement 45: Outreach Program Notes

**User Story:** As a Coordinator, I want to add notes to outreach programs, so that I can document important details and learnings.

#### Acceptance Criteria

1. THE Outreach_System SHALL store program notes in the notes field as text
2. THE Outreach_System SHALL allow notes to be null
3. THE Outreach_System SHALL allow updating notes after program creation
4. THE Outreach_System SHALL display notes in the program detail view
5. THE Outreach_System SHALL preserve notes when a program is marked as completed
6. THE Outreach_System SHALL support notes up to 10000 characters in length


### Requirement 46: Soul Notes and Context

**User Story:** As a Worker, I want to add notes to soul records, so that I can document important context and prayer requests.

#### Acceptance Criteria

1. THE Outreach_System SHALL store soul notes in the notes field as text
2. THE Outreach_System SHALL allow notes to be null
3. THE Outreach_System SHALL allow updating notes after soul creation
4. THE Outreach_System SHALL display notes in the soul detail view
5. THE Outreach_System SHALL preserve notes through status changes and reassignments
6. THE Outreach_System SHALL support notes up to 10000 characters in length

### Requirement 47: Outreach Program Location Details

**User Story:** As a Worker, I want detailed location information for programs, so that I can find the venue easily.

#### Acceptance Criteria

1. WHEN creating an outreach program, THE Outreach_System SHALL require location as a mandatory field
2. THE Outreach_System SHALL store optional address, city fields for detailed location information
3. THE Outreach_System SHALL display location, address, and city in the program detail view
4. THE Outreach_System SHALL display location in the program list view
5. THE Outreach_System SHALL support searching programs by location or city
6. THE Outreach_System SHALL validate that location is not empty or whitespace only


### Requirement 48: Hono Router Integration

**User Story:** As a Backend Developer, I want outreach routes integrated with the Hono framework, so that the module follows the existing architecture pattern.

#### Acceptance Criteria

1. THE Outreach_System SHALL implement all outreach endpoints using Hono router syntax
2. THE Outreach_System SHALL organize routes in apps/api/src/outreach/router.ts following the module pattern
3. THE Outreach_System SHALL implement service layer functions in apps/api/src/outreach/service.ts
4. THE Outreach_System SHALL define request/response schemas in apps/api/src/outreach/schemas.ts using Zod
5. THE Outreach_System SHALL register the outreach router with the main Hono app instance
6. THE Outreach_System SHALL apply authentication middleware to all outreach routes
7. THE Outreach_System SHALL follow the route alignment triplet pattern: Hono router → API client method → frontend hook

### Requirement 49: API Client Type Safety

**User Story:** As a Frontend Developer, I want type-safe API client methods, so that I catch integration errors at compile time.

#### Acceptance Criteria

1. THE Outreach_System SHALL generate TypeScript types for all API request and response payloads
2. THE Outreach_System SHALL provide typed API client methods in packages/api-client for all outreach endpoints
3. THE Outreach_System SHALL use camelCase for TypeScript property names in API client types
4. THE Outreach_System SHALL map snake_case database columns to camelCase in API responses
5. THE Outreach_System SHALL export all outreach-related types from packages/types
6. THE Outreach_System SHALL ensure API client methods return Promise types with proper error handling


### Requirement 50: Test-Driven Development Compliance

**User Story:** As a Developer, I want comprehensive test coverage, so that the outreach module is reliable and maintainable.

#### Acceptance Criteria

1. THE Outreach_System SHALL include unit tests for all service layer functions in apps/api/src/outreach/service.test.ts
2. THE Outreach_System SHALL include integration tests for all router endpoints in apps/api/src/outreach/router.test.ts
3. THE Outreach_System SHALL write failing tests before implementing each feature
4. THE Outreach_System SHALL achieve minimum 80% code coverage for service layer functions
5. THE Outreach_System SHALL test branch isolation logic for all data access operations
6. THE Outreach_System SHALL test role-based access control for Admin, Pastor, and Member roles
7. THE Outreach_System SHALL test error handling for validation failures, authorization failures, and database errors
8. THE Outreach_System SHALL use Vitest as the test framework following project conventions

### Requirement 51: Drizzle ORM Schema Definition

**User Story:** As a Backend Developer, I want Drizzle schemas for outreach tables, so that I have type-safe database access.

#### Acceptance Criteria

1. THE Outreach_System SHALL define outreach_programs schema in packages/database/src/schema with all columns mapped
2. THE Outreach_System SHALL define souls schema in packages/database/src/schema with all columns mapped
3. THE Outreach_System SHALL define follow_ups schema in packages/database/src/schema with all columns mapped
4. THE Outreach_System SHALL define outreach_participants schema in packages/database/src/schema with all columns mapped
5. THE Outreach_System SHALL use camelCase for TypeScript property names in Drizzle schemas
6. THE Outreach_System SHALL define foreign key relationships using Drizzle relations syntax
7. THE Outreach_System SHALL export all schemas from packages/database/src/schema/index.ts


### Requirement 52: Zustand State Management

**User Story:** As a Frontend Developer, I want centralized state management for outreach data, so that the UI remains synchronized across components.

#### Acceptance Criteria

1. THE Outreach_System SHALL implement a Zustand store for outreach programs state
2. THE Outreach_System SHALL implement a Zustand store for souls state
3. THE Outreach_System SHALL implement a Zustand store for follow-ups state
4. THE Outreach_System SHALL update Zustand stores when API mutations succeed
5. THE Outreach_System SHALL invalidate cached data when relevant mutations occur
6. THE Outreach_System SHALL persist selected filters and view preferences in Zustand stores
7. THE Outreach_System SHALL follow the existing Zustand patterns used in other modules

### Requirement 53: Shadcn/ui Component Usage

**User Story:** As a Frontend Developer, I want to use consistent UI components, so that the outreach module matches the existing design system.

#### Acceptance Criteria

1. THE Outreach_System SHALL use Shadcn/ui Button component for all action buttons
2. THE Outreach_System SHALL use Shadcn/ui Input component for all text inputs
3. THE Outreach_System SHALL use Shadcn/ui Select component for all dropdown menus
4. THE Outreach_System SHALL use Shadcn/ui Card component for soul cards and program cards
5. THE Outreach_System SHALL use Shadcn/ui Dialog component for modals and confirmations
6. THE Outreach_System SHALL use Shadcn/ui Table component for data tables
7. THE Outreach_System SHALL use Shadcn/ui Badge component for status indicators
8. THE Outreach_System SHALL apply Tailwind CSS classes following the project's design system


### Requirement 54: Error Message Clarity

**User Story:** As a User, I want clear error messages, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN validation fails, THE Outreach_System SHALL return error messages identifying the specific field and validation rule violated
2. WHEN authorization fails, THE Outreach_System SHALL return message "You do not have permission to access this resource"
3. WHEN a resource is not found, THE Outreach_System SHALL return message "The requested [resource type] was not found"
4. WHEN duplicate program detection triggers, THE Outreach_System SHALL return message "A program with this name already exists on this date for your branch"
5. WHEN conversion fails, THE Outreach_System SHALL return message indicating whether member creation or soul update failed
6. THE Outreach_System SHALL display error messages in the UI using toast notifications or inline form errors
7. THE Outreach_System SHALL log detailed error context server-side while showing user-friendly messages client-side

### Requirement 55: Outreach Program Description

**User Story:** As a Coordinator, I want to add detailed descriptions to programs, so that workers understand the program goals and approach.

#### Acceptance Criteria

1. THE Outreach_System SHALL store program description as text allowing up to 10000 characters
2. THE Outreach_System SHALL allow description to be null
3. THE Outreach_System SHALL display description in the program detail view
4. THE Outreach_System SHALL support line breaks and basic formatting in description text
5. THE Outreach_System SHALL sanitize description input to prevent XSS attacks


### Requirement 56: Soul Email Validation

**User Story:** As a Worker, I want email addresses to be validated, so that contact information is accurate for follow-up.

#### Acceptance Criteria

1. WHEN a soul is captured with an email, THE Outreach_System SHALL validate email format using RFC 5322 standard
2. THE Outreach_System SHALL allow email to be null
3. THE Outreach_System SHALL trim whitespace from email before validation
4. THE Outreach_System SHALL convert email to lowercase before storage
5. IF email validation fails, THE Outreach_System SHALL return an HTTP 400 Bad Request error with message "Invalid email format"
6. THE Outreach_System SHALL validate email length does not exceed 100 characters

### Requirement 57: Kanban Board Performance

**User Story:** As a Worker, I want the Kanban board to load quickly, so that I can access soul information without delays.

#### Acceptance Criteria

1. THE Outreach_System SHALL load the Kanban_Board with all soul cards within 2 seconds for up to 100 souls
2. THE Outreach_System SHALL implement pagination or virtual scrolling when displaying more than 100 souls
3. THE Outreach_System SHALL cache soul data in the frontend to reduce API calls
4. THE Outreach_System SHALL use database indexes on status and assigned_member_id for efficient queries
5. THE Outreach_System SHALL fetch only necessary fields for card display (not full soul details)
6. THE Outreach_System SHALL implement optimistic UI updates for drag-and-drop status changes


### Requirement 58: Follow-Up History Pagination

**User Story:** As a Worker, I want follow-up history to be paginated, so that I can view extensive contact history without performance issues.

#### Acceptance Criteria

1. THE Outreach_System SHALL paginate follow-up history with a default page size of 20 records
2. THE Outreach_System SHALL display the most recent follow-ups first (ordered by follow_up_date descending)
3. THE Outreach_System SHALL provide "Load More" functionality to fetch additional follow-up records
4. THE Outreach_System SHALL indicate when all follow-up records have been loaded
5. THE Outreach_System SHALL display the total count of follow-ups for the soul
6. THE Outreach_System SHALL load the first page of follow-ups automatically when opening soul detail view

### Requirement 59: Outreach Program Filtering

**User Story:** As a Pastor, I want to filter outreach programs, so that I can find specific programs quickly.

#### Acceptance Criteria

1. THE Outreach_System SHALL support filtering programs by is_completed status (completed, active, all)
2. THE Outreach_System SHALL support filtering programs by date range using program_date
3. THE Outreach_System SHALL support filtering programs by coordinator_id
4. THE Outreach_System SHALL support searching programs by program_name using partial matching
5. THE Outreach_System SHALL apply all active filters simultaneously
6. THE Outreach_System SHALL preserve filter selections in the UI when navigating between pages
7. THE Outreach_System SHALL provide a "Clear Filters" action to reset all filters


### Requirement 60: Conversion Success Notification

**User Story:** As a Worker, I want to receive confirmation when a soul is converted, so that I know the process completed successfully.

#### Acceptance Criteria

1. WHEN a soul is successfully converted to member, THE Outreach_System SHALL display a success notification with message "Soul successfully converted to member"
2. THE Outreach_System SHALL include the new member's name in the success notification
3. THE Outreach_System SHALL provide a link to the new member's profile in the notification
4. THE Outreach_System SHALL update the soul status to 'Converted' in the UI immediately
5. THE Outreach_System SHALL update the Kanban_Board to move the soul to the 'Converted' column
6. THE Outreach_System SHALL send a notification to the Pastor about the new conversion

## Iteration and Feedback Rules

This requirements document represents the initial specification for the Outreach Module. The document follows EARS patterns and INCOSE quality rules to ensure clarity, testability, and completeness.

**Modification Process:**
- All requirements are subject to review and refinement based on stakeholder feedback
- Changes must maintain EARS pattern compliance and INCOSE quality standards
- Requirements modifications must be documented with rationale

**Feedback Integration:**
- User feedback will be incorporated through requirement updates or new requirement additions
- Technical constraints discovered during implementation may necessitate requirement adjustments
- All changes will be tracked through version control

**Phase Completion:**
This requirements document is now complete and ready for review. Upon approval, the next phase will create the design document specifying the technical architecture and implementation approach.

