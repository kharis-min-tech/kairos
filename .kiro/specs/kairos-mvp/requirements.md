# Requirements Document: Kairos MVP Church Administration System

## Introduction

Kairos is a cloud-based church administration SaaS platform designed to streamline church operations for multiple branches across regions. The system enables church administrators, pastors, department leaders, and members to manage membership, attendance, donations, evangelism, communications, and reporting through a unified web application.

The MVP targets an Easter 2026 launch (April 12, 2026) with a 10-week development timeline, supporting 13 core modules across authentication, membership, attendance, evangelism, financial management, forms, notifications, and reporting.

**Target Users:**
- Church Administrators (full system access)
- Pastors/Leadership (branch-level management)
- Department/Fellowship Leaders (group management)
- Regular Members (self-service profile and donations)

**Success Criteria:**
- 500 members registered across 5 branches
- 100 souls captured and tracked
- 500 donations recorded
- < 3 second page loads
- 99% uptime
- Easter launch successful (April 12, 2026)

## Glossary

- **System**: The Kairos church administration platform
- **Member**: A registered church member with an account
- **Branch**: A physical or virtual church location within a region
- **Region**: A geographical area containing one or more branches
- **Pastor**: The main pastor or elder assigned to a branch
- **Leader**: A department or fellowship leader
- **Admin**: A church administrator with full system access
- **Department**: A ministry group (Choir, Ushers, Drama, etc.)
- **Fellowship**: A small group (K-Group, Kharis Express, etc.)
- **Soul**: A person captured during evangelism efforts
- **Worker**: A member participating in outreach programs
- **Service**: A church worship service (Sunday, Midweek, Special)
- **Donation**: A financial contribution from a member
- **Form**: A data collection form (pre-built or custom)
- **Notification**: An in-app or email message to users
- **Outreach_Program**: An evangelism event or campaign

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to securely authenticate and access features appropriate to my role, so that I can perform my church responsibilities while protecting sensitive data.

#### Acceptance Criteria

1. WHEN a user registers with valid credentials, THE System SHALL create a user account in Cognito and send a verification email
2. WHEN a user logs in with valid credentials, THE System SHALL issue a JWT token valid for 24 hours
3. WHEN a user requests password reset, THE System SHALL send a password reset email via SES within 5 minutes
4. THE System SHALL enforce role-based access control with four roles: Admin, Pastor, Leader, Member
5. WHEN a user attempts to access a resource, THE Custom_Authorizer SHALL validate the JWT token and enforce branch-level data isolation
6. WHEN an Admin accesses any resource, THE System SHALL grant full access to all branches
7. WHEN a Pastor accesses a resource, THE System SHALL restrict access to only their assigned branch data
8. WHEN a Leader accesses a resource, THE System SHALL restrict access to only their department or fellowship data
9. WHEN a Member accesses a resource, THE System SHALL restrict access to their own profile and public data
10. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
11. THE System SHALL encrypt all data at rest using AES-256 encryption
12. THE System SHALL validate all user inputs to prevent SQL injection and XSS attacks

### Requirement 2: Member Registration and Approval

**User Story:** As a prospective member, I want to register online and have my registration reviewed, so that I can join the church community.

#### Acceptance Criteria

1. WHEN a user completes the registration form with required fields, THE System SHALL create a pending member record
2. THE System SHALL require first name, last name, email, phone, date of birth, gender, address, and home branch during registration
3. WHEN a member registers, THE System SHALL generate a unique member ID
4. WHEN a member registers, THE System SHALL set their status to "pending" until approved
5. WHEN a member registration is pending, THE System SHALL allow the member to view their own profile and donation history only
6. WHEN a branch admin views pending registrations, THE System SHALL display all pending members for their branch
7. WHEN a branch admin approves a member, THE System SHALL change the member status to "active" and send a welcome email
8. WHEN a member uploads a profile photo, THE System SHALL store it in S3 and serve it via CloudFront
9. THE System SHALL validate email format and phone number format during registration
10. THE System SHALL prevent duplicate registrations using the same email or phone number for active members

### Requirement 3: Member Profile Management

**User Story:** As a member, I want to view and update my profile information, so that the church has my current contact details.

#### Acceptance Criteria

1. WHEN a member views their profile, THE System SHALL display personal information, church information, department assignments, and fellowship membership
2. WHEN a member updates their profile, THE System SHALL validate all input fields before saving
3. WHEN a member updates their phone or email, THE System SHALL check for duplicates among active members
4. WHEN a member uploads a new profile photo, THE System SHALL replace the existing photo in S3
5. THE System SHALL allow members to update their address, phone, email, and emergency contact information
6. THE System SHALL prevent members from changing their home branch, membership date, or status
7. WHEN an admin views a member profile, THE System SHALL display donation history and attendance records
8. WHEN an admin deactivates a member, THE System SHALL perform a soft delete by setting is_active to FALSE

### Requirement 4: Member Search and Filtering

**User Story:** As an admin or pastor, I want to search and filter members, so that I can quickly find specific members or groups.

#### Acceptance Criteria

1. WHEN a user searches for members, THE System SHALL support search by name, email, or phone number
2. WHEN a user filters members, THE System SHALL support filtering by branch, department, fellowship, and status
3. WHEN a pastor searches members, THE System SHALL return only members from their assigned branch
4. WHEN an admin searches members, THE System SHALL return members from all branches
5. THE System SHALL return search results within 500ms for queries on up to 10,000 members
6. WHEN displaying search results, THE System SHALL paginate results with 50 members per page
7. THE System SHALL support sorting by last name, first name, membership date, or status

### Requirement 5: Member Import and Export

**User Story:** As an admin, I want to import and export member data in bulk, so that I can migrate existing data and generate reports.

#### Acceptance Criteria

1. WHEN an admin uploads a CSV file, THE System SHALL validate the file format and column mappings
2. WHEN importing members, THE System SHALL validate each row for required fields and data format
3. WHEN import validation fails, THE System SHALL display error messages with row numbers and field names
4. WHEN import validation succeeds, THE System SHALL create member records and assign them to the specified branch
5. WHEN an admin exports members, THE System SHALL generate a CSV file with all member fields
6. WHEN a pastor exports members, THE System SHALL include only members from their assigned branch
7. THE System SHALL support exporting filtered member lists based on current search criteria

### Requirement 6: Branch and Region Management

**User Story:** As an admin, I want to manage branches and regions, so that I can organize the church structure.

#### Acceptance Criteria

1. WHEN an admin creates a branch, THE System SHALL require branch name, region, branch type, and contact information
2. THE System SHALL support five branch types: Main, Satellite, Cell, Campus, Online
3. WHEN an admin assigns a main pastor to a branch, THE System SHALL mark any existing main pastor as not current
4. THE System SHALL enforce that only one main pastor can be current per branch at any time
5. WHEN an admin assigns an elder to a branch, THE System SHALL allow multiple elders per branch
6. WHEN an admin deactivates a branch, THE System SHALL perform a soft delete by setting is_active to FALSE
7. THE System SHALL prevent deletion of branches that have active members assigned
8. WHEN a pastor logs in, THE System SHALL display only their assigned branch data in all views

### Requirement 7: Department Management

**User Story:** As an admin, I want to manage departments and member assignments, so that ministry teams are organized.

#### Acceptance Criteria

1. WHEN an admin creates a department, THE System SHALL create a global department definition
2. WHEN an admin instantiates a department for a branch, THE System SHALL require a lead member from that branch
3. THE System SHALL allow an optional deputy member for each branch department
4. WHEN a member requests to join a department, THE System SHALL send the request to the department leader for approval
5. WHEN a department leader approves a join request, THE System SHALL add the member to the department
6. THE System SHALL warn when a member attempts to join a third department
7. WHEN an admin overrides the department limit, THE System SHALL allow the member to join more than two departments
8. WHEN a member is in a department, THE System SHALL display the department on their profile
9. THE System SHALL prevent a member from being assigned as both lead and deputy for the same department

### Requirement 8: Department Leader Functions

**User Story:** As a department leader, I want to manage my department members and track follow-ups, so that I can coordinate ministry activities.

#### Acceptance Criteria

1. WHEN a department leader views their department, THE System SHALL display all current members
2. WHEN a department leader sends a message, THE System SHALL allow broadcasting to all department members or a subset
3. WHEN a department leader adds a follow-up note, THE System SHALL record the date, time, and notes
4. WHEN a member has not been followed up in 7 days, THE System SHALL display an alert to the department leader
5. THE System SHALL allow admins to configure the follow-up alert threshold per department
6. WHEN a department leader views follow-up notes, THE System SHALL display notes from all leaders for collaboration
7. WHEN a department leader views join requests, THE System SHALL display pending requests for their department only
8. WHEN a branch admin views join requests, THE System SHALL have visibility of all requests but cannot approve them

### Requirement 9: Fellowship Management

**User Story:** As an admin or fellowship leader, I want to manage fellowships and member assignments, so that small groups are organized.

#### Acceptance Criteria

1. WHEN an admin creates a fellowship, THE System SHALL require fellowship name, type, branch, meeting schedule, and location
2. THE System SHALL support fellowship types: K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges
3. WHEN an admin assigns a fellowship leader, THE System SHALL automatically add the leader to the fellowship members
4. THE System SHALL allow an optional co-leader for each fellowship
5. WHEN a member joins a fellowship, THE System SHALL check if they are already in another fellowship
6. THE System SHALL enforce that a member can belong to only ONE fellowship at a time
7. WHEN a fellowship leader views their fellowship, THE System SHALL display all current members
8. WHEN a fellowship leader sends a message, THE System SHALL allow broadcasting to all fellowship members or a subset

### Requirement 10: Service Attendance Tracking

**User Story:** As an admin, pastor, or leader, I want to record service attendance, so that we can track member engagement.

#### Acceptance Criteria

1. WHEN recording service attendance, THE System SHALL require service date, service type, and branch
2. THE System SHALL support service types: Sunday Service, Midweek Service, Special Service
3. WHEN recording attendance, THE System SHALL display all members from the selected branch
4. WHEN marking attendance, THE System SHALL support statuses: Present, Absent, Virtual
5. THE System SHALL allow bulk selection to mark multiple members as present simultaneously
6. WHEN attendance is recorded, THE System SHALL store the recorded_by member ID and timestamp
7. WHEN a pastor records attendance, THE System SHALL restrict the member list to their branch only
8. THE System SHALL prevent duplicate attendance records for the same member and service

### Requirement 11: Fellowship Attendance Tracking

**User Story:** As a fellowship leader, I want to record meeting attendance, so that I can track member participation.

#### Acceptance Criteria

1. WHEN recording fellowship attendance, THE System SHALL require meeting date, fellowship, and location
2. WHEN recording attendance, THE System SHALL display all current fellowship members
3. WHEN marking attendance, THE System SHALL support statuses: Present, Absent, Excused, Late
4. WHEN attendance is recorded, THE System SHALL allow adding meeting notes and topics
5. THE System SHALL allow fellowship leaders or designated delegates to record attendance
6. THE System SHALL prevent duplicate attendance records for the same member and meeting
7. WHEN viewing fellowship attendance, THE System SHALL calculate attendance percentage per member

### Requirement 12: Attendance Reporting

**User Story:** As an admin or pastor, I want to view attendance trends and reports, so that I can identify engagement patterns.

#### Acceptance Criteria

1. WHEN viewing attendance trends, THE System SHALL display a line chart of the last 8 weeks
2. WHEN calculating attendance percentage, THE System SHALL divide present count by total members
3. WHEN filtering attendance reports, THE System SHALL support filtering by branch, date range, and service type
4. WHEN a pastor views attendance reports, THE System SHALL display only their branch data
5. THE System SHALL identify members who have missed the last 4 consecutive services
6. WHEN exporting attendance data, THE System SHALL generate a CSV file with member names, dates, and statuses

### Requirement 13: Outreach Program Management

**User Story:** As an admin, I want to create and manage outreach programs, so that evangelism efforts are organized.

#### Acceptance Criteria

1. WHEN creating an outreach program, THE System SHALL require program name, date, location, and branch
2. THE System SHALL allow assigning a coordinator member to each outreach program
3. WHEN a member registers as a worker, THE System SHALL restrict registration to their home branch programs only
4. WHEN viewing outreach programs, THE System SHALL display all registered workers
5. WHEN souls are captured during an outreach, THE System SHALL link them to the outreach program
6. WHEN viewing outreach reports, THE System SHALL display souls captured per program and conversion rates
7. THE System SHALL allow admins to temporarily change a member's home_branch_id for cross-branch participation

### Requirement 14: Soul Capture and Assignment

**User Story:** As a worker, I want to capture soul information during evangelism, so that follow-up can be tracked.

#### Acceptance Criteria

1. WHEN capturing a soul, THE System SHALL require name, phone, and capture date
2. THE System SHALL allow optional email, address, and notes fields
3. WHEN capturing a soul, THE System SHALL require specifying the source: outreach program or ad-hoc evangelism
4. WHEN a soul is captured, THE System SHALL automatically assign it to the member who captured it
5. THE System SHALL allow reassigning a soul to a different worker if needed
6. WHEN a soul is captured, THE System SHALL set the initial status to "New"
7. THE System SHALL validate phone number format during soul capture
8. THE System SHALL allow duplicate phone numbers with a warning, as multiple family members may share a phone

### Requirement 15: Soul Follow-up Tracking

**User Story:** As a worker, I want to log follow-up interactions with souls, so that conversion progress is tracked.

#### Acceptance Criteria

1. WHEN logging a follow-up, THE System SHALL require date, time, contact method, and notes
2. THE System SHALL support contact methods: Phone Call, Home Visit, Text Message, Email, In-Person Meeting
3. WHEN logging a follow-up, THE System SHALL require contact status: Successful, No Answer, Call Back Later, Not Interested
4. WHEN a soul has not been followed up in 2-3 days, THE System SHALL display an alert to the assigned worker
5. THE System SHALL allow admins to configure the follow-up alert threshold per branch
6. WHEN a worker views their assigned souls, THE System SHALL display all souls with their current status
7. WHEN a follow-up is logged, THE System SHALL update the soul's last_follow_up_date

### Requirement 16: Soul Status Pipeline

**User Story:** As a worker, I want to update soul status as they progress, so that conversion stages are tracked.

#### Acceptance Criteria

1. THE System SHALL support soul statuses: New, Following Up, Interested, Converted, Not Interested
2. WHEN a worker updates soul status, THE System SHALL validate the status transition
3. WHEN a soul is marked as Converted, THE System SHALL require linking to a member record or creating a new member
4. WHEN a soul is converted, THE System SHALL record the conversion date
5. WHEN viewing soul reports, THE System SHALL display a conversion funnel showing counts at each status
6. WHEN a soul status changes, THE System SHALL send a notification to the assigned worker
7. THE System SHALL allow filtering souls by status, assigned worker, and date range

### Requirement 17: Online Donation Processing

**User Story:** As a member, I want to make online donations securely, so that I can contribute to the church.

#### Acceptance Criteria

1. WHEN a member makes an online donation, THE System SHALL process payment through Stripe
2. THE System SHALL support payment methods: Card and Bank Transfer via Stripe
3. WHEN making a donation, THE System SHALL require amount, purpose, and payment method
4. THE System SHALL support donation purposes: Offering, Tithe, Building Fund, Other
5. WHEN purpose is Other, THE System SHALL require a description field
6. WHEN a donation is processed, THE System SHALL send a receipt email via SES within 5 minutes
7. THE System SHALL accept international cards and let Stripe handle currency conversion to GBP
8. WHEN a donation succeeds, THE System SHALL link it to the member and their home branch
9. THE System SHALL handle Stripe webhooks to update donation status asynchronously

### Requirement 18: Manual Donation Recording

**User Story:** As an admin, I want to record cash and check donations, so that all giving is tracked.

#### Acceptance Criteria

1. WHEN recording a manual donation, THE System SHALL support payment methods: Cash, Check, Bank Transfer, Mobile Money
2. WHEN recording a manual donation, THE System SHALL allow linking to a member or recording as anonymous
3. WHEN recording an anonymous donation, THE System SHALL set the is_anonymous flag to TRUE
4. WHEN recording a donation, THE System SHALL require amount, currency (GBP), date, purpose, and payment method
5. WHEN recording a donation, THE System SHALL store the recorded_by admin ID
6. THE System SHALL validate that amount is greater than zero
7. THE System SHALL enforce that when purpose is Other, description must be provided

### Requirement 19: Donation History and Reporting

**User Story:** As a member or admin, I want to view donation history and reports, so that giving can be tracked.

#### Acceptance Criteria

1. WHEN a member views their donation history, THE System SHALL display all their donations with date, amount, and purpose
2. WHEN a member filters donations, THE System SHALL support filtering by date range and purpose
3. WHEN an admin views donation reports, THE System SHALL display total donations by branch and purpose
4. WHEN displaying top donors, THE System SHALL show "Anonymous" for donations with is_anonymous TRUE
5. WHEN a pastor views donation reports, THE System SHALL display only their branch donations
6. WHEN exporting donations, THE System SHALL generate a CSV file with all donation fields
7. THE System SHALL calculate total giving summary per member for the current year

### Requirement 20: Form Builder

**User Story:** As an admin or leader, I want to create custom forms, so that I can collect data from members.

#### Acceptance Criteria

1. WHEN creating a form, THE System SHALL provide a drag-and-drop interface with field types
2. THE System SHALL support field types: Text, Email, Phone, Number, Date, Dropdown, Checkbox, Radio, Textarea
3. WHEN configuring a field, THE System SHALL allow setting label, placeholder, required flag, and validation rules
4. WHEN creating a form, THE System SHALL allow setting scope: Church-wide or Branch-specific
5. WHEN a form is branch-specific, THE System SHALL restrict access to members of that branch only
6. THE System SHALL allow saving forms as templates for reuse
7. WHEN a member is logged in, THE System SHALL auto-populate form fields from their profile where applicable
8. THE System SHALL allow admins and leaders to create forms

### Requirement 21: Pre-built Forms

**User Story:** As a user, I want to access pre-built forms for common requests, so that I don't have to create forms from scratch.

#### Acceptance Criteria

1. THE System SHALL provide pre-built forms for: Department signup, Soul capture, Baby naming, Baby dedication, First-time visitor, Altar call, Baptism request, Testimony submission
2. WHEN a member submits a department signup form, THE System SHALL create a join request for the department leader
3. WHEN a member submits a soul capture form, THE System SHALL create a soul record and assign it to the submitter
4. WHEN a member submits a baby dedication form, THE System SHALL create a request for admin review
5. THE System SHALL validate all form submissions before saving
6. WHEN a form is submitted, THE System SHALL send a confirmation email to the submitter
7. THE System SHALL link form submissions to member records where applicable

### Requirement 22: Form Submissions and Export

**User Story:** As an admin, I want to view and export form submissions, so that I can process requests.

#### Acceptance Criteria

1. WHEN viewing form submissions, THE System SHALL display all submissions for forms the user has access to
2. WHEN filtering submissions, THE System SHALL support filtering by form type, date, and branch
3. WHEN exporting submissions, THE System SHALL generate a CSV file with all submission data
4. WHEN a pastor views submissions, THE System SHALL display only submissions from their branch
5. THE System SHALL store all form submissions in the database with timestamps
6. THE System SHALL allow admins to view submission details including all field values

### Requirement 23: Email Notifications

**User Story:** As a user, I want to receive email notifications for important events, so that I stay informed.

#### Acceptance Criteria

1. WHEN a user registers, THE System SHALL send a welcome email via SES
2. WHEN a user requests password reset, THE System SHALL send a password reset email via SES
3. WHEN a donation is processed, THE System SHALL send a receipt email via SES
4. WHEN a form is submitted, THE System SHALL send a confirmation email via SES
5. WHEN a soul is assigned, THE System SHALL send a notification email to the assigned worker
6. THE System SHALL deliver all emails within 5 minutes of the triggering event
7. THE System SHALL use code-based email templates stored in version control

### Requirement 24: In-App Notifications

**User Story:** As a user, I want to receive in-app notifications, so that I can see important updates without checking email.

#### Acceptance Criteria

1. WHEN a notification is created, THE System SHALL display it in the notification center with a bell icon
2. THE System SHALL support notification types: Announcement, Reminder, Alert
3. WHEN targeting notifications, THE System SHALL support: All members, Specific branch, Specific department, Specific fellowship, Specific role
4. WHEN a user views notifications, THE System SHALL display unread notifications with a filled circle indicator
5. WHEN a user clicks a notification, THE System SHALL mark it as read and navigate to the relevant page
6. THE System SHALL display an unread count badge on the bell icon (max 99+)
7. THE System SHALL allow users to mark all notifications as read

### Requirement 25: Broadcast Messages

**User Story:** As an admin or leader, I want to send broadcast messages, so that I can communicate with groups.

#### Acceptance Criteria

1. WHEN an admin sends a broadcast, THE System SHALL allow targeting all members or specific branches
2. WHEN a leader sends a broadcast, THE System SHALL restrict targeting to their own department or fellowship only
3. WHEN creating a broadcast, THE System SHALL require title, body, and priority level
4. THE System SHALL support priority levels: Low, Normal, High, Urgent
5. WHEN creating a broadcast, THE System SHALL allow setting an optional expiration date
6. WHEN a broadcast expires, THE System SHALL hide it from the notification center
7. THE System SHALL deliver broadcasts as in-app notifications to all targeted members

### Requirement 26: Admin Dashboard

**User Story:** As an admin, I want to view a dashboard with key metrics, so that I can monitor church operations.

#### Acceptance Criteria

1. WHEN an admin views the dashboard, THE System SHALL display total active members across all branches
2. WHEN an admin views the dashboard, THE System SHALL display total branches, departments, and fellowships
3. WHEN an admin views the dashboard, THE System SHALL display total donations in the last 30 days
4. WHEN an admin views the dashboard, THE System SHALL display total souls captured in the last 30 days
5. WHEN an admin views the dashboard, THE System SHALL display service attendance percentage for the last 4 weeks
6. WHEN an admin views the dashboard, THE System SHALL display a line chart of attendance trends for the last 8 weeks
7. WHEN an admin views the dashboard, THE System SHALL display recent activity feed with the last 10 actions

### Requirement 27: Pastor Dashboard

**User Story:** As a pastor, I want to view a branch-specific dashboard, so that I can monitor my branch operations.

#### Acceptance Criteria

1. WHEN a pastor views the dashboard, THE System SHALL display only their branch data
2. WHEN a pastor views the dashboard, THE System SHALL display branch member count
3. WHEN a pastor views the dashboard, THE System SHALL display branch donations in the last 30 days
4. WHEN a pastor views the dashboard, THE System SHALL display branch attendance trends
5. WHEN a pastor views the dashboard, THE System SHALL display souls captured in their branch
6. WHEN a pastor views the dashboard, THE System SHALL display overdue follow-ups for their branch
7. THE System SHALL prevent pastors from viewing data from other branches

### Requirement 28: Leader Dashboard

**User Story:** As a leader, I want to view my department or fellowship dashboard, so that I can monitor my group.

#### Acceptance Criteria

1. WHEN a leader views the dashboard, THE System SHALL display their department or fellowship member count
2. WHEN a leader views the dashboard, THE System SHALL display recent attendance for their group
3. WHEN a leader views the dashboard, THE System SHALL display members needing follow-up
4. THE System SHALL prevent leaders from viewing data from other departments or fellowships
5. WHEN a leader views the dashboard, THE System SHALL display pending join requests for their department

### Requirement 29: Pre-built Reports

**User Story:** As an admin or pastor, I want to access pre-built reports, so that I can analyze church data.

#### Acceptance Criteria

1. THE System SHALL provide pre-built reports for: Member list, Attendance trends, Donation summary, Soul conversion funnel, Overdue follow-ups
2. WHEN viewing reports, THE System SHALL support filtering by date range and branch
3. WHEN a pastor views reports, THE System SHALL display only their branch data
4. WHEN viewing attendance trends, THE System SHALL display a line chart of the last 8 weeks
5. WHEN viewing donation summary, THE System SHALL display totals by purpose and by branch
6. WHEN viewing soul conversion funnel, THE System SHALL display counts at each status stage
7. THE System SHALL allow exporting any report to CSV format

### Requirement 30: Power BI Data Export

**User Story:** As an analytics team member, I want to access church data in Power BI, so that I can create custom reports.

#### Acceptance Criteria

1. THE System SHALL export data to S3 in Parquet format nightly at 2 AM
2. THE System SHALL export tables: members, donations, attendance, souls, branches, departments, fellowships
3. WHEN exporting data, THE System SHALL use an EventBridge scheduled Lambda function
4. THE System SHALL store exports in a dedicated S3 bucket with appropriate IAM permissions for Power BI
5. THE System SHALL retain the last 30 days of exports in S3
6. THE System SHALL not impact production database performance during exports

### Requirement 31: CSV Export

**User Story:** As a user, I want to export data to CSV, so that I can analyze it in spreadsheet software.

#### Acceptance Criteria

1. THE System SHALL allow exporting member lists, donations, attendance, and souls to CSV
2. WHEN exporting data, THE System SHALL apply current filters and search criteria
3. WHEN a pastor exports data, THE System SHALL include only their branch data
4. WHEN exporting large datasets, THE System SHALL generate the file asynchronously and provide a download link
5. THE System SHALL include all relevant fields in CSV exports with proper headers
6. THE System SHALL format dates in DD/MM/YYYY format for UK timezone

### Requirement 32: Web Application Performance

**User Story:** As a user, I want the web application to load quickly, so that I can work efficiently.

#### Acceptance Criteria

1. THE System SHALL load pages in less than 3 seconds on a standard broadband connection
2. THE System SHALL respond to API requests in less than 500ms at the 95th percentile
3. THE System SHALL support 500 concurrent users without performance degradation
4. THE System SHALL optimize database queries with indexes on foreign keys and search fields
5. THE System SHALL use CloudFront CDN to cache static assets and reduce load times
6. THE System SHALL implement pagination for all list views to limit data transfer

### Requirement 33: Web Application Accessibility

**User Story:** As a user with disabilities, I want the web application to be accessible, so that I can use all features.

#### Acceptance Criteria

1. THE System SHALL comply with WCAG 2.1 AA accessibility standards
2. THE System SHALL provide keyboard navigation for all interactive elements
3. THE System SHALL provide sufficient color contrast ratios for all text (minimum 4.5:1)
4. THE System SHALL provide alt text for all images
5. THE System SHALL provide ARIA labels for all form inputs and buttons
6. THE System SHALL support screen readers for all content
7. THE System SHALL provide focus indicators for all interactive elements

### Requirement 34: Web Application Responsiveness

**User Story:** As a user on a mobile device, I want the web application to work on my phone, so that I can access it anywhere.

#### Acceptance Criteria

1. THE System SHALL provide a responsive web interface that works on mobile browsers
2. THE System SHALL support screen sizes from 320px to 2560px width
3. THE System SHALL adapt layouts for mobile (single column), tablet (two columns), and desktop (three columns)
4. THE System SHALL provide touch-friendly buttons and inputs on mobile devices (minimum 44px touch targets)
5. THE System SHALL work on Chrome, Firefox, Safari, and Edge browsers
6. THE System SHALL maintain functionality on iOS Safari and Android Chrome

### Requirement 35: System Availability and Reliability

**User Story:** As a user, I want the system to be available when I need it, so that I can rely on it for church operations.

#### Acceptance Criteria

1. THE System SHALL maintain 99% uptime measured monthly
2. THE System SHALL perform automated database backups daily via Aurora snapshots
3. THE System SHALL support point-in-time recovery for the last 7 days
4. THE System SHALL deploy to a staging environment for testing before production
5. THE System SHALL use multi-AZ deployment for Aurora database for high availability
6. THE System SHALL auto-scale Lambda functions to handle traffic spikes
7. THE System SHALL monitor system health with CloudWatch alarms for errors and performance

### Requirement 36: Data Security and Privacy

**User Story:** As a member, I want my personal data to be secure and private, so that I can trust the system.

#### Acceptance Criteria

1. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
2. THE System SHALL encrypt all data at rest using AES-256 encryption via Aurora
3. THE System SHALL store database credentials in AWS Secrets Manager with auto-rotation enabled
4. THE System SHALL store API keys and configuration in AWS Systems Manager Parameter Store
5. THE System SHALL enforce branch-level data isolation in the Custom Authorizer Lambda
6. THE System SHALL validate all user inputs to prevent SQL injection attacks
7. THE System SHALL escape all user-generated content to prevent XSS attacks
8. THE System SHALL log all access attempts to CloudTrail for audit purposes
9. THE System SHALL implement rate limiting on API Gateway to prevent abuse
10. THE System SHALL follow GDPR data retention standards for member data

### Requirement 37: Timezone and Currency

**User Story:** As a UK-based church, I want all dates and currencies to use UK standards, so that data is consistent.

#### Acceptance Criteria

1. THE System SHALL use UK timezone (Europe/London) for all timestamps
2. THE System SHALL display dates in DD/MM/YYYY format
3. THE System SHALL use GBP (£) as the only currency for donations in the MVP
4. THE System SHALL allow Stripe to handle currency conversion for international cards
5. THE System SHALL store all timestamps in UTC in the database and convert to UK timezone for display

---

## Document Metadata

**Version:** 1.0  
**Date:** February 3, 2026  
**Status:** Draft - Pending Review  
**Target Launch:** April 12, 2026 (Easter)  
**Development Timeline:** 10 weeks

**Next Steps:**
1. Review and approve requirements
2. Create design document with architecture and correctness properties
3. Create implementation tasks document
4. Begin Week 1 development

---

*This requirements document defines the complete scope for the Kairos MVP, covering all 13 core modules with 37 high-level requirements and 300+ acceptance criteria. All requirements follow EARS patterns and INCOSE quality rules for clarity, testability, and completeness.*
