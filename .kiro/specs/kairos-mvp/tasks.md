# Implementation Plan: Kairos MVP Church Administration System

## Overview

This implementation plan breaks down the Kairos MVP into actionable coding tasks across a 10-week timeline targeting Easter 2026 launch (April 12, 2026). Tasks strictly follow the MVP scope, AI guardrails, and timeline constraints defined in the steering guide.

**Development Approach:**
- Incremental: Each task produces working, tested code
- Test-driven for critical paths (auth, payments, data isolation)
- Pragmatic for standard CRUD operations
- Checkpoints validate progress before moving forward

**Timeline:**
- Week 1-2: Foundation (infrastructure, database, auth)
- Week 3-4: Core entities (members, branches, departments, fellowships)
- Week 5-6: Attendance & outreach (services, fellowships, souls)
- Week 7-8: Financial & forms (Stripe, donations, form builder)
- Week 9: Notifications & reports (email, in-app, dashboards, Power BI)
- Week 10: Polish & launch (bug fixes, UAT, deployment)

**Stack (locked):**
- Backend: AWS Lambda (TypeScript, Node.js 20), granular functions (one per operation)
- Database: Aurora Serverless v2 (PostgreSQL 15), Drizzle ORM
- API: API Gateway HTTP API, Custom Authorizer Lambda
- Auth: Amazon Cognito + Custom Authorizer
- Frontend: Next.js 14 (React, TypeScript, Shadcn/ui)
- Infrastructure: AWS CDK (TypeScript)
- Payments: Stripe (GBP only)
- Email: Amazon SES
- Storage: S3 + CloudFront
- CI/CD: GitHub Actions
- Monorepo: Turborepo

## Tasks

### Week 1-2: Foundation

- [x] 1. Set up monorepo and project structure
  - Initialize Turborepo monorepo with apps/ (web, api) and packages/ (types, ui, utils, api-client) structure
  - Configure TypeScript with strict mode and shared tsconfig
  - Set up ESLint and Prettier
  - Create package.json for each workspace package
  - Configure GitHub repository with branch protection rules
  - _Requirements: Foundation for all development_

- [x] 2. Set up AWS CDK infrastructure
  - [x] 2.1 Create VPC and network stack
    - Define VPC with CIDR 10.0.0.0/16
    - Create 2 private subnets across 2 AZs (eu-west-2a, eu-west-2b)
    - Set up VPC endpoints (S3 Gateway, Secrets Manager, Systems Manager)
    - Configure security groups for Lambda and Aurora
    - _Requirements: 35.5, 35.6_

  - [x] 2.2 Create Aurora Serverless v2 database stack
    - Define Aurora Serverless v2 cluster (PostgreSQL 15)
    - Configure auto-scaling (0.5-16 ACUs for prod, 0.5-2 ACUs for staging)
    - Set up multi-AZ deployment
    - Enable automated backups with 7-day retention
    - Store master credentials in Secrets Manager with auto-rotation
    - _Requirements: 35.2, 35.3, 36.3_

  - [x] 2.3 Create S3 and CloudFront stack
    - Create S3 buckets: member-photos, form-uploads, csv-exports, analytics-exports
    - Configure S3 bucket policies and CORS
    - Set up CloudFront distribution with S3 origin
    - _Requirements: 32.5_

  - [x] 2.4 Create Cognito User Pool stack
    - Define Cognito User Pool with email/password auth
    - Configure MFA support
    - Configure password policy (min 8 chars, uppercase, lowercase, number)
    - Set up email verification via SES
    - Configure JWT token expiration (24 hours)
    - Create user pool client for web app
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.5 Create API Gateway HTTP API stack
    - Create HTTP API (not REST API — 70% cheaper)
    - Configure CORS for web app domain
    - Set up route structure with /v1/ prefix
    - Configure throttling and rate limiting
    - _Requirements: 36.9_

  - [x] 2.6 Deploy staging environment
    - Deploy all CDK stacks to staging (kairos-staging-* naming)
    - Verify resources created correctly
    - Test database connectivity
    - Test S3 upload and CloudFront delivery
    - _Requirements: 35.4_

- [x] 3. Set up database schema and Drizzle ORM
  - [x] 3.1 Install and configure Drizzle ORM
    - Install drizzle-orm and drizzle-kit
    - Create drizzle.config.ts with Aurora connection via Secrets Manager
    - Set up migration scripts in package.json
    - _Requirements: Database foundation_

  - [x] 3.2 Define core table schemas in Drizzle
    - Create schema files for: regions, branches, members, branch_leadership
    - Define TypeScript types matching database/schema.sql
    - Add indexes on foreign keys and frequently queried columns
    - Add update_updated_at_column() trigger function
    - _Requirements: Req 2, 3, 6_

  - [x] 3.3 Define department and fellowship schemas
    - Create schema files for: departments, branch_departments, department_members
    - Create schema files for: fellowships, fellowship_members, fellowship_meetings
    - Add unique constraints (one fellowship per member, lead ≠ deputy)
    - _Requirements: Req 7, 9_

  - [x] 3.4 Define attendance and outreach schemas
    - Create schema files for: services, service_attendance
    - Create schema files for: fellowship_meeting_attendance
    - Create schema files for: outreach_programs, outreach_workers, souls, follow_ups
    - Add unique constraints (no duplicate attendance per member per service/meeting)
    - _Requirements: Req 10, 11, 13, 14, 15_

  - [x] 3.5 Define donation, form, and notification schemas
    - Create schema files for: donations
    - Create schema files for: forms, form_submissions
    - Create schema files for: notifications, notification_recipients
    - Add CHECK constraints (amount > 0, description required when purpose = 'Other')
    - _Requirements: Req 17, 18, 20, 24_

  - [x] 3.6 Generate and run initial migration
    - Generate migration SQL from Drizzle schemas
    - Verify migration matches database/schema.sql
    - Run migration on staging database
    - Verify all tables, indexes, constraints, and triggers created
    - _Requirements: All data model requirements_

- [x] 4. Create shared Lambda layers and utilities
  - [x] 4.1 Create database client layer (@kairos/db-client)
    - Set up Drizzle connection with connection pooling
    - Create typed query helpers
    - Add transaction support
    - _Requirements: Foundation for all Lambdas_

  - [x] 4.2 Create validation layer (@kairos/validator)
    - Define Zod schemas for all API request types
    - Create validation helper functions
    - Add custom validators (email, phone, UK date format DD/MM/YYYY)
    - _Requirements: 1.12, 2.9, 36.6_

  - [x] 4.3 Create error handler layer (@kairos/error-handler)
    - Define error response format: { error: { code, message, details? } }
    - Map error types to HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500)
    - Add structured error logging to CloudWatch
    - _Requirements: API error handling strategy_

  - [x] 4.4 Create auth context layer (@kairos/auth-context)
    - Extract user context from API Gateway authorizer (member_id, branch_id, roles)
    - Create helper functions for permission checks (isAdmin, isPastor, isLeader, isMember)
    - Create branch isolation enforcement helper
    - _Requirements: 1.5, 1.6-1.9_

  - [x] 4.5 Create logger layer (@kairos/logger)
    - Set up structured JSON logging to CloudWatch
    - Include context (userId, branchId, operation) in all log entries
    - Add log levels (debug, info, warn, error)
    - _Requirements: Monitoring_

- [x] 5. Implement Custom Authorizer Lambda
  - [x] 5.1 Create authorizer Lambda function
    - Validate JWT from Cognito using aws-jwt-verify
    - Extract user claims (sub, email, custom:role, custom:branchId)
    - Look up member record to verify is_active=TRUE
    - Return IAM policy with user context (member_id, branch_id, roles)
    - _Requirements: 1.5_

  - [x] 5.2 Write tests for authorizer
    - Test: Valid token returns Allow policy with correct context
    - Test: Expired/invalid token returns Unauthorized
    - Test: Inactive user returns Unauthorized
    - Test: Branch isolation — pastor context includes only their branch_id
    - Test: Role-based access — Admin gets full access, Pastor gets branch access, Leader gets group access, Member gets self access
    - **Properties: Branch-Level Data Isolation, Role-Based Access Control**
    - **Validates: Req 1.5, 1.6-1.9**

  - [x] 5.3 Deploy authorizer and wire to API Gateway
    - Deploy authorizer Lambda to staging
    - Configure authorizer on API Gateway HTTP API
    - Test with valid/invalid tokens via curl or Postman
    - _Requirements: 1.5_

- [x] 6. Checkpoint — Foundation verification
  - Verify all CDK stacks deployed successfully to staging
  - Test database connectivity from Lambda in VPC
  - Test Cognito user creation, login, and JWT issuance
  - Test Custom Authorizer with sample requests (valid token, invalid token, expired token)
  - Verify shared layers import correctly in a test Lambda
  - Ensure all tests pass. Ask the user if questions arise.


### Week 3-4: Core Entities

- [x] 7. Implement member management API
  - [x] 7.1 Create members-create Lambda
    - Parse and validate input (first_name, last_name, email, phone, date_of_birth, gender, address, home_branch_id)
    - Generate unique member_id
    - Set status to "pending"
    - Upload profile photo to S3 if provided
    - Enforce branch-level authorization
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.2 Write tests for member creation
    - Test: Valid registration creates pending member
    - Test: Duplicate email/phone among active members is rejected
    - Test: Missing required fields returns 400
    - **Properties: Member Registration Approval Workflow, Unique Email and Phone**
    - **Validates: Req 2.1, 2.5, 2.10**

  - [x] 7.3 Create members-list Lambda
    - Implement pagination (default 50 per page)
    - Add search by name, email, phone
    - Add filters: branch, department, fellowship, status
    - Add sorting: lastName, firstName, membershipDate, status
    - Enforce branch isolation — pastors see only their branch members
    - _Requirements: 4.1-4.7_

  - [x] 7.4 Write tests for member search and filtering
    - Test: Search returns matching members only
    - Test: Pastor sees only their branch members
    - Test: Admin sees all branches
    - Test: Pagination returns correct page counts
    - **Property: Search and Filter Correctness**
    - **Validates: Req 4.1-4.6**

  - [x] 7.5 Create members-get Lambda
    - Return member profile with personal info, church info, department assignments, fellowship membership
    - Members see own profile only; admins/pastors see branch members
    - _Requirements: 3.1_

  - [x] 7.6 Create members-update Lambda
    - Validate email/phone uniqueness among active members
    - Handle profile photo upload/replacement in S3
    - Prevent members from changing home_branch_id, membership_date, status
    - _Requirements: 3.2-3.6_

  - [x] 7.7 Create members-delete Lambda
    - Soft delete: set is_active=FALSE
    - Preserve all historical data (donations, attendance, etc.)
    - _Requirements: 3.8_

  - [x] 7.8 Write tests for soft delete
    - Test: Deactivated member has is_active=FALSE
    - Test: Historical data preserved after deactivation
    - Test: Deactivated member excluded from active member queries
    - **Property: Soft Delete Preservation**
    - **Validates: Req 3.8**

  - [x] 7.9 Create members-approve Lambda
    - Change status from "pending" to "active"
    - Send welcome email via SES
    - Restrict to branch admins only (not central admin bottleneck)
    - _Requirements: 2.7_

  - [x] 7.10 Create members-import Lambda
    - Parse CSV file, validate column mappings
    - Validate each row for required fields and data format
    - Report errors with row numbers and field names
    - Bulk create valid member records assigned to specified branch
    - _Requirements: 5.1-5.4_

  - [x] 7.11 Write tests for CSV import
    - Test: Valid CSV creates member records
    - Test: Invalid rows reported with row numbers
    - Test: Missing required fields rejected per row
    - **Property: CSV Import Validation and Creation**
    - **Validates: Req 5.1-5.4**

  - [x] 7.12 Create members-export Lambda
    - Generate CSV with all member fields
    - Apply current filters and search criteria
    - Enforce branch isolation (pastors export only their branch)
    - Upload CSV to S3, return presigned download URL
    - Format dates as DD/MM/YYYY (UK timezone)
    - _Requirements: 5.5-5.7, 31.2-31.6_

- [x] 8. Implement branch and region management API
  - [x] 8.1 Create branches-create Lambda
    - Require: branch_name, region_id, branch_type, contact info
    - Validate branch_type enum: Main, Satellite, Cell, Campus, Online
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Create branches-list Lambda
    - List branches with filters
    - Pastors see only their assigned branch
    - _Requirements: 6_

  - [x] 8.3 Create branches-get Lambda
    - Return branch details with current pastor, elders, member count
    - _Requirements: 6_

  - [x] 8.4 Create branches-update Lambda
    - Update branch details
    - _Requirements: 6_

  - [x] 8.5 Create branches-assign-pastor Lambda
    - Mark existing current main pastor as is_current=FALSE, set end_date
    - Assign new pastor with is_current=TRUE
    - Enforce: only one current main pastor per branch
    - _Requirements: 6.3, 6.4_

  - [x] 8.6 Write tests for pastor assignment
    - Test: Assigning new pastor marks previous as not current
    - Test: Only one is_current=TRUE main pastor per branch at any time
    - **Property: Single Current Pastor Per Branch**
    - **Validates: Req 6.3, 6.4**

  - [x] 8.7 Create branches-assign-elder Lambda
    - Allow multiple elders per branch
    - _Requirements: 6.5_

  - [x] 8.8 Create branches-delete Lambda
    - Soft delete (is_active=FALSE)
    - Prevent deletion if active members assigned
    - _Requirements: 6.6, 6.7_

  - [x] 8.9 Write tests for branch deletion
    - Test: Branch with active members cannot be deleted
    - Test: Branch without active members soft-deleted successfully
    - **Property: Referential Integrity for Branch Deletion**
    - **Validates: Req 6.7**

- [x] 9. Implement department management API
  - [x] 9.1 Create departments-create Lambda
    - Create global department definition
    - Create branch department instance with lead_member_id (must be from same branch)
    - Optional deputy_member_id (must differ from lead, same branch)
    - _Requirements: 7.1, 7.2, 7.3, 7.9_

  - [x] 9.2 Create departments-list Lambda
    - List departments by branch with lead, deputy, member count
    - _Requirements: 7_

  - [x] 9.3 Create departments-assign-member Lambda
    - Create join request for department leader approval
    - Warn if member already in 2 departments
    - Allow admin override for 3rd+ department
    - Prevent same member as lead and deputy
    - _Requirements: 7.4, 7.6, 7.7, 7.9_

  - [x] 9.4 Write tests for department assignment
    - Test: Join request created and sent to department leader
    - Test: Warning at 3rd department, admin can override
    - Test: Same member as lead and deputy rejected
    - **Properties: Department Join Request Workflow, Lead and Deputy Uniqueness**
    - **Validates: Req 7.4, 7.6, 7.7, 7.9**

  - [x] 9.5 Create departments-approve-request Lambda
    - Department leader approves join request
    - Add member to department
    - Send notification to member
    - Branch admin has visibility but cannot approve
    - _Requirements: 7.4, 7.5, 8.7, 8.8_

  - [x] 9.6 Create departments-add-followup Lambda
    - Record follow-up note with date, time, notes
    - Notes visible to all leaders of that department (collaboration)
    - _Requirements: 8.3, 8.6_

  - [x] 9.7 Write tests for follow-up note visibility
    - Test: Follow-up notes visible to all department leaders
    - **Property: Follow-up Note Visibility**
    - **Validates: Req 8.6**

  - [x] 9.8 Create departments-get-alerts Lambda
    - Query members not followed up within threshold (default 7 days, configurable by admin)
    - Return members past threshold with last follow-up date
    - _Requirements: 8.4, 8.5_

  - [x] 9.9 Write tests for follow-up alerts
    - Test: Members past 7-day threshold appear in alerts
    - Test: Custom threshold respected when configured
    - **Property: Follow-up Alert Threshold**
    - **Validates: Req 8.4, 8.5**

- [x] 10. Implement fellowship management API
  - [x] 10.1 Create fellowships-create Lambda
    - Require: name, type, branch_id, meeting_schedule, location
    - Validate type enum: K-Groups, Kharis Express, New Breeds, Kharis on Campus, Kharis on Campus Colleges
    - Assign leader (auto-add to fellowship members) and optional co-leader
    - _Requirements: 9.1-9.4_

  - [x] 10.2 Create fellowships-list Lambda
    - List fellowships by branch with leader, co-leader, member count
    - _Requirements: 9_

  - [x] 10.3 Create fellowships-add-member Lambda
    - Check if member already in another fellowship
    - Enforce: member can belong to ONE fellowship only
    - _Requirements: 9.5, 9.6_

  - [x] 10.4 Write tests for fellowship membership
    - Test: Member in one fellowship cannot join another
    - Test: Removing from fellowship allows joining a new one
    - **Property: Single Fellowship Membership**
    - **Validates: Req 9.5, 9.6**

  - [x] 10.5 Create fellowships-get Lambda
    - Return fellowship details with all current members
    - _Requirements: 9.7_

  - [x] 10.6 Create fellowships-send-message Lambda
    - Broadcast to all fellowship members or subset
    - Restrict to fellowship leader or co-leader only
    - _Requirements: 9.8_

- [x] 11. Checkpoint — Core entities verification
  - Verify all member CRUD, import, export, approval APIs functional
  - Test branch-level authorization for pastors
  - Test department join workflow (request → leader approval)
  - Test fellowship single-membership constraint
  - Test department max-2 warning and admin override
  - Ensure all tests pass. Ask the user if questions arise.


### Week 5-6: Attendance & Outreach

- [x] 12. Implement attendance tracking API
  - [x] 12.1 Create attendance-record-service Lambda
    - Require: service_date, service_type (Sunday Service, Midweek Service, Special Service), branch_id
    - Display all members from selected branch
    - Support bulk selection for marking present
    - Support statuses: Present, Absent, Virtual
    - Store recorded_by member_id and timestamp
    - Prevent duplicate attendance records (unique on service_id + member_id)
    - Pastors restricted to their branch only
    - _Requirements: 10.1-10.8_

  - [x] 12.2 Write tests for service attendance
    - Test: Duplicate attendance for same member and service rejected
    - Test: Pastor can only record for their branch
    - **Property: Duplicate Attendance Prevention**
    - **Validates: Req 10.8**

  - [x] 12.3 Create attendance-list-service Lambda
    - List service attendance with filters: branch, date range, service type
    - Enforce branch-level authorization
    - _Requirements: 10.7_

  - [x] 12.4 Create attendance-record-fellowship Lambda
    - Require: meeting_date, fellowship_id, location
    - Display current fellowship members
    - Support statuses: Present, Absent, Excused, Late
    - Allow meeting notes and topics
    - Fellowship leader or delegate can record
    - Prevent duplicate records (unique on meeting_id + member_id)
    - _Requirements: 11.1-11.6_

  - [x] 12.5 Create attendance-list-fellowship Lambda
    - List fellowship attendance
    - Calculate attendance percentage per member: (present / total meetings) * 100
    - _Requirements: 11.7_

  - [x] 12.6 Write tests for attendance percentage
    - Test: Percentage calculated correctly across multiple meetings
    - **Property: Attendance Percentage Calculation**
    - **Validates: Req 11.7**

  - [x] 12.7 Create attendance-get-trends Lambda
    - Return line chart data for last 8 weeks
    - Calculate attendance percentage per service: (present / total members)
    - Filter by branch and date range
    - Enforce branch isolation for pastors
    - _Requirements: 12.1-12.4_

  - [x] 12.8 Write tests for attendance trends
    - Test: Trend data correct for 8-week window
    - Test: Pastor sees only their branch trends
    - **Property: Attendance Trend Reporting**
    - **Validates: Req 12.1, 12.2**

  - [x] 12.9 Create attendance-get-missing-members Lambda
    - Identify members who missed last 4 consecutive services
    - Return member list with last attendance date
    - _Requirements: 12.5_

  - [x] 12.10 Write tests for consecutive absence detection
    - Test: Members missing exactly 4 consecutive services flagged
    - Test: Members with intermittent attendance not flagged
    - **Property: Consecutive Absence Detection**
    - **Validates: Req 12.5**

  - [x] 12.11 Create attendance-export Lambda
    - Generate CSV with member names, dates, statuses
    - Apply filters and branch authorization
    - Format dates DD/MM/YYYY
    - _Requirements: 12.6_

- [x] 13. Implement outreach and evangelism API
  - [x] 13.1 Create outreach-create-program Lambda
    - Require: program_name, program_date, location, branch_id
    - Assign coordinator member
    - _Requirements: 13.1, 13.2_

  - [x] 13.2 Create outreach-list-programs Lambda
    - List programs by branch with coordinator and worker count
    - Include souls captured per program
    - _Requirements: 13.4, 13.6_

  - [x] 13.3 Create outreach-register-worker Lambda
    - Register member as worker
    - Restrict to member's home branch programs only
    - _Requirements: 13.3_

  - [x] 13.4 Create souls-capture Lambda
    - Require: first_name, last_name, phone, capture_date
    - Optional: email, address, notes
    - Require source: outreach_id (program) or ad-hoc
    - Automatically assign to capturing member (assigned_member_id = capturer)
    - Set initial status to "New"
    - Validate phone format; allow duplicates with warning (family members may share)
    - _Requirements: 14.1-14.8_

  - [x] 13.5 Write tests for soul capture and assignment
    - Test: Soul automatically assigned to capturing member
    - Test: Initial status is "New"
    - Test: Duplicate phone allowed with warning
    - **Property: Automatic Soul Assignment**
    - **Validates: Req 14.4**

  - [x] 13.6 Create souls-list Lambda
    - Filter by status, assigned worker, date range
    - Workers see their assigned souls; leaders see all in their scope
    - _Requirements: 15.6, 16.7_

  - [x] 13.7 Create souls-get Lambda
    - Return soul details with full follow-up history
    - _Requirements: 15_

  - [x] 13.8 Create souls-log-followup Lambda
    - Require: contact_date, contact_method, contact_status, notes
    - Contact methods: Phone Call, Home Visit, Text Message, Email, In-Person Meeting
    - Contact statuses: Successful, No Answer, Call Back Later, Not Interested
    - Update soul's last_follow_up_date
    - _Requirements: 15.1-15.3, 15.7_

  - [x] 13.9 Write tests for follow-up date update
    - Test: last_follow_up_date updated after logging follow-up
    - **Property: Follow-up Date Update**
    - **Validates: Req 15.7**

  - [x] 13.10 Create souls-update-status Lambda
    - Validate status transitions: New → Following Up → Interested → Converted / Not Interested
    - When Converted: require converted_to_member_id, record conversion_date
    - Send notification to assigned worker on status change
    - _Requirements: 16.1-16.4, 16.6_

  - [x] 13.11 Write tests for status transitions
    - Test: Valid transitions accepted
    - Test: Invalid transitions rejected (e.g., New → Converted)
    - Test: Converted requires converted_to_member_id
    - **Property: Soul Status Transition Validation**
    - **Validates: Req 16.2, 16.3**

  - [x] 13.12 Create souls-get-alerts Lambda
    - Query souls not followed up within threshold (default 2-3 days, configurable by admin)
    - Return souls past threshold with assigned worker info
    - _Requirements: 15.4, 15.5_

  - [x] 13.13 Create souls-get-conversion-funnel Lambda
    - Return counts at each status stage: New, Following Up, Interested, Converted, Not Interested
    - Calculate conversion rates
    - _Requirements: 16.5_

  - [x] 13.14 Create souls-reassign Lambda
    - Allow reassigning a soul to a different worker
    - _Requirements: 14.5_

  - [x] 13.15 Create outreach-override-branch Lambda
    - Allow admins to temporarily change a member's home_branch_id for cross-branch outreach participation
    - Store original home_branch_id so it can be restored after the program ends
    - Restrict to admins only
    - _Requirements: 13.7_

- [x] 14. Checkpoint — Attendance and evangelism verification
  - Verify service and fellowship attendance recording (no duplicates)
  - Test attendance trend calculations and 8-week chart data
  - Test soul capture, automatic assignment, and follow-up workflow
  - Test status transition validation (especially Converted requiring member link)
  - Test follow-up alert thresholds
  - Ensure all tests pass. Ask the user if questions arise.


### Week 7-8: Financial & Forms

- [x] 15. Implement Stripe payment integration and donations API
  - [x] 15.1 Set up Stripe SDK and configuration
    - Install Stripe SDK
    - Store Stripe API keys in Parameter Store (not hardcoded)
    - Store Stripe webhook secret in Secrets Manager
    - _Requirements: 17, 36.3, 36.4_

  - [x] 15.2 Create donations-create-online Lambda
    - Create Stripe payment intent
    - Require: amount, purpose, payment_method
    - Validate: amount > 0, currency = GBP
    - When purpose = "Other", require description
    - Support purposes: Offering, Tithe, Building Fund, Other
    - Create donation record with stripe_payment_id
    - Link to member and their home branch
    - _Requirements: 17.1-17.5, 17.8_

  - [x] 15.3 Write tests for donation validation
    - Test: Amount <= 0 rejected
    - Test: Purpose "Other" without description rejected
    - Test: Valid donation creates record with stripe_payment_id
    - **Property: Donation Purpose and Description Validation**
    - **Validates: Req 17.3-17.5**

  - [x] 15.4 Create donations-webhook Lambda
    - Verify Stripe webhook signature
    - Update donation status based on payment event (succeeded, failed)
    - Send receipt email via SES on success (within 5 minutes)
    - _Requirements: 17.6, 17.9_

  - [x] 15.5 Write tests for Stripe webhook handling
    - Test: Valid webhook updates donation status
    - Test: Invalid signature rejected
    - Test: Receipt email triggered on success
    - **Property: Stripe Payment Integration**
    - **Validates: Req 17.1, 17.9**

  - [x] 15.6 Create donations-create-manual Lambda
    - Support payment methods: Cash, Check, Bank Transfer, Mobile Money
    - Allow linking to member or recording as anonymous (is_anonymous=TRUE)
    - Require: amount, currency (GBP), donation_date, purpose, payment_method
    - Validate: amount > 0, description required when purpose = "Other"
    - Store recorded_by admin ID
    - _Requirements: 18.1-18.7_

  - [x] 15.7 Write tests for anonymous donations
    - Test: Anonymous donation has is_anonymous=TRUE, no member_id
    - Test: Anonymous donations show as "Anonymous" in reports
    - **Property: Anonymous Donation Handling**
    - **Validates: Req 18.3, 19.4**

  - [x] 15.8 Create donations-list Lambda
    - Filter by member, branch, date range, purpose
    - Enforce branch-level authorization (pastors see only their branch)
    - Paginate results
    - _Requirements: 19.1, 19.2_

  - [x] 15.9 Create donations-get-reports Lambda
    - Total donations by branch and purpose
    - Top donors list (show "Anonymous" for is_anonymous=TRUE)
    - Date range filtering
    - Enforce branch isolation for pastors
    - _Requirements: 19.3-19.5_

  - [x] 15.10 Create donations-export Lambda
    - CSV export with all donation fields
    - Apply current filters and branch authorization
    - Format dates DD/MM/YYYY, currency as GBP (£)
    - _Requirements: 19.6_

  - [x] 15.11 Create donations-get-member-summary Lambda
    - Calculate total giving per member for current year
    - _Requirements: 19.7_

- [x] 16. Implement forms and data capture API
  - [x] 16.1 Create forms-create Lambda
    - Store form definition as JSON schema
    - Support field types: Text, Email, Phone, Number, Date, Dropdown, Checkbox, Radio, Textarea
    - Allow setting field config: label, placeholder, required, validation rules
    - Allow setting scope: Church-wide or Branch-specific
    - When Branch-specific, require target_branch_id
    - Restrict to admins and leaders
    - _Requirements: 20.1-20.5, 20.8_

  - [x] 16.2 Write tests for form scope and access
    - Test: Branch-specific form requires target_branch_id
    - Test: Branch-specific form accessible only to that branch's members
    - Test: Church-wide form accessible to all members
    - **Property: Form Scope and Access Control**
    - **Validates: Req 20.4, 20.5**

  - [x] 16.3 Create forms-list Lambda
    - List forms filtered by scope and branch
    - Enforce authorization (branch-specific forms only for that branch)
    - _Requirements: 20.5_

  - [x] 16.4 Create forms-get Lambda
    - Return form definition
    - Auto-populate fields from member profile if logged in
    - _Requirements: 20.7_

  - [x] 16.5 Create forms-submit Lambda
    - Validate submission data against form definition schema
    - Store submission in database with timestamp
    - Link to member record if logged in
    - Send confirmation email via SES
    - _Requirements: 21.5, 21.6_

  - [x] 16.6 Create forms-list-submissions Lambda
    - Filter by form type, date, branch
    - Pastors see only their branch submissions
    - _Requirements: 22.1, 22.2, 22.4_

  - [x] 16.7 Create forms-export-submissions Lambda
    - CSV export with all field values
    - _Requirements: 22.3_

  - [x] 16.8 Create forms-save-template Lambda
    - Save an existing form definition as a reusable template
    - List available templates when creating a new form
    - Allow creating a new form from a saved template (clone definition)
    - Restrict template management to admins and leaders
    - _Requirements: 20.6_

  - [x] 16.9 Create pre-built form handlers
    - Department signup form → creates join request for department leader
    - Soul capture form → creates soul record, assigns to submitter
    - Baby dedication form → creates request for admin review
    - First-time visitor, Altar call, Baptism request, Baby naming, Testimony → store submissions
    - _Requirements: 21.1-21.4_

  - [x] 16.10 Write tests for pre-built form integrations
    - Test: Department signup creates join request
    - Test: Soul capture form creates soul record assigned to submitter
    - **Property: Form Submission Integration**
    - **Validates: Req 21.2, 21.3**

- [x] 17. Checkpoint — Financial and forms verification
  - Verify Stripe payment flow end-to-end (create intent → webhook → receipt email)
  - Test manual donation recording (cash, check, anonymous)
  - Test donation reports with branch isolation
  - Test form builder (create, submit, validate)
  - Test pre-built form integrations (department signup → join request, soul capture → soul record)
  - Ensure all tests pass. Ask the user if questions arise.


### Week 9: Notifications & Reports

- [x] 18. Implement email notifications with SES
  - [x] 18.1 Set up SES and email templates
    - Configure SES in eu-west-2
    - Verify sender email domain
    - Create code-based email templates stored in version control
    - Templates: welcome, password reset, donation receipt, form confirmation, soul assignment
    - _Requirements: 23.7_

  - [x] 18.2 Create notification helper functions
    - sendWelcomeEmail (on member approval)
    - sendPasswordResetEmail (on password reset request)
    - sendDonationReceiptEmail (on successful payment)
    - sendFormConfirmationEmail (on form submission)
    - sendSoulAssignmentEmail (on soul capture/reassignment)
    - All emails delivered within 5 minutes of triggering event
    - _Requirements: 23.1-23.6_

  - [x] 18.3 Write tests for email notifications
    - Test: Each event triggers correct email template
    - Test: Email sent within expected timeframe
    - **Property: Email Notification Delivery**
    - **Validates: Req 23.1-23.6**

  - [x] 18.4 Integrate email sending into existing Lambdas
    - members-approve → welcome email
    - donations-webhook → receipt email
    - forms-submit → confirmation email
    - souls-capture → assignment email
    - _Requirements: 23.1-23.5_

- [x] 19. Implement in-app notifications API
  - [x] 19.1 Create notifications-create Lambda
    - Support types: Announcement, Reminder, Alert
    - Support targeting: All, Branch, Department, Fellowship, Role, Leadership
    - Validate target scope matches target_*_id field
    - Support priority: Low, Normal, High, Urgent
    - Optional: scheduled_for, expires_at
    - Populate notification_recipients for all targeted members
    - _Requirements: 24.2, 24.3_

  - [x] 19.2 Create notifications-list Lambda
    - List notifications for current user based on their associations
    - Include is_read status
    - Order by sent_at descending
    - Hide expired notifications (expires_at < now)
    - _Requirements: 24.4, 24.5_

  - [x] 19.3 Create notifications-mark-read Lambda
    - Mark single notification as read with read_at timestamp
    - Support "mark all as read"
    - _Requirements: 24.5, 24.7_

  - [x] 19.4 Create notifications-get-unread-count Lambda
    - Count unread notifications (is_read=FALSE)
    - Cap display at 99+
    - _Requirements: 24.6_

  - [x] 19.5 Write tests for unread count
    - Test: Count reflects actual unread notifications
    - Test: Marking as read decrements count
    - **Property: Unread Notification Count**
    - **Validates: Req 24.6**

  - [x] 19.6 Create notifications-send-broadcast Lambda
    - Admins can target all members or specific branches
    - Leaders restricted to their own department/fellowship only
    - Require: title, body, priority
    - Optional: expiration date
    - Populate notification_recipients for all targeted members
    - _Requirements: 25.1-25.7_

  - [x] 19.7 Write tests for broadcast authorization
    - Test: Leader can only broadcast to their own department/fellowship
    - Test: Admin can broadcast to any scope
    - **Property: Broadcast Message Authorization**
    - **Validates: Req 25.2**

- [x] 20. Implement WebSocket API for real-time notifications
  - [x] 20.1 Create WebSocket connect Lambda
    - Validate JWT from query string
    - Store connection_id with member_id in database
    - _Requirements: Real-time notifications_

  - [x] 20.2 Create WebSocket disconnect Lambda
    - Remove connection_id from database
    - _Requirements: Real-time notifications_

  - [x] 20.3 Create WebSocket send-message Lambda
    - Route notification to user's active WebSocket connections
    - _Requirements: Real-time notifications_

  - [x] 20.4 Integrate WebSocket push with notification creation
    - When notification created, push to targeted users' active connections
    - _Requirements: Real-time notifications_

- [x] 21. Implement reporting and analytics API
  - [x] 21.1 Create reports-get-admin-dashboard Lambda
    - Total active members across all branches
    - Total branches, departments, fellowships
    - Total donations last 30 days
    - Total souls captured last 30 days
    - Service attendance % last 4 weeks
    - Attendance trend chart data (last 8 weeks)
    - Recent activity feed (last 10 actions)
    - _Requirements: 26.1-26.7_

  - [x] 21.2 Create reports-get-pastor-dashboard Lambda
    - All metrics filtered by pastor's branch only
    - Branch member count, donations, attendance trends, souls, overdue follow-ups
    - Prevent viewing other branches' data
    - _Requirements: 27.1-27.7_

  - [x] 21.3 Create reports-get-leader-dashboard Lambda
    - Department/fellowship member count
    - Recent attendance for their group
    - Members needing follow-up
    - Pending join requests (department leaders)
    - Prevent viewing other groups' data
    - _Requirements: 28.1-28.5_

  - [x] 21.4 Write tests for dashboard authorization
    - Test: Pastor dashboard returns only their branch data
    - Test: Leader dashboard returns only their group data
    - Test: Admin dashboard returns all data
    - **Property: Dashboard Data Authorization**
    - **Validates: Req 26-28**

  - [x] 21.5 Create reports-get-attendance-trends Lambda
    - Line chart data for last 8 weeks
    - Filter by branch and date range
    - _Requirements: 29.1, 29.4_

  - [x] 21.6 Create reports-get-donation-summary Lambda
    - Totals by purpose and by branch
    - Filter by date range
    - _Requirements: 29.1, 29.5_

  - [x] 21.7 Create reports-get-soul-funnel Lambda
    - Counts at each status stage
    - Conversion rates
    - _Requirements: 29.1, 29.6_

  - [x] 21.8 Create reports-export-csv Lambda
    - Generic CSV export for any report data
    - Apply filters and authorization
    - _Requirements: 29.7_

- [x] 22. Implement Power BI data export
  - [x] 22.1 Create analytics-export-to-s3 Lambda
    - Export tables: members, donations, attendance, souls, branches, departments, fellowships
    - Convert to Parquet format
    - Upload to dedicated S3 bucket with IAM permissions for Power BI
    - Ensure no impact on production database performance
    - _Requirements: 30.1, 30.2, 30.4, 30.6_

  - [x] 22.2 Create EventBridge scheduled rule
    - Trigger analytics-export-to-s3 Lambda at 2 AM daily
    - _Requirements: 30.3_

  - [x] 22.3 Configure S3 lifecycle policy
    - Retain last 30 days of exports
    - Auto-delete older exports
    - _Requirements: 30.5_

- [x] 23. Checkpoint — Notifications and reports verification
  - Verify email notifications sent for all trigger events
  - Test in-app notification creation, listing, mark-as-read
  - Test WebSocket real-time notification delivery
  - Test broadcast authorization (leaders restricted to own groups)
  - Test all three dashboards (admin, pastor, leader) with correct data scoping
  - Test Power BI export generates Parquet files in S3
  - Ensure all tests pass. Ask the user if questions arise.


### Week 9-10: Frontend & Polish

- [x] 24. Set up Next.js web application foundation
  - [x] 24.1 Initialize Next.js project
    - Create Next.js 14 app with App Router in apps/web/
    - Configure TypeScript strict mode
    - Install and configure Shadcn/ui components
    - Set up Tailwind CSS with design system colors (Purple #7C3AED primary, Blue #3B82F6 secondary, Gold #F59E0B accent, Burgundy #991B1B highlight)
    - Configure Inter font (Google Fonts)
    - _Requirements: 34_

  - [x] 24.2 Create application shell layout
    - Top bar (64px): logo, branch selector, search, notifications bell, user menu
    - Collapsible sidebar (240px expanded, 64px collapsed) with navigation icons + labels
    - Breadcrumbs for deep navigation
    - Responsive: hamburger menu on mobile (<640px)
    - _Requirements: Design system layout_

  - [x] 24.3 Set up authentication provider
    - React Context for auth state
    - Cognito SDK integration
    - Token management and auto-refresh
    - Protected route wrapper (redirect to login if unauthenticated)
    - _Requirements: Req 1_

  - [x] 24.4 Generate type-safe API client
    - Create OpenAPI specification for all endpoints
    - Generate TypeScript client with openapi-typescript
    - Configure automatic Bearer token injection
    - Add error handling
    - _Requirements: API integration_

  - [x] 24.5 Set up WebSocket client
    - Connection manager with auto-reconnect
    - Integrate with notification store (Zustand)
    - _Requirements: Real-time notifications_

  - [x] 24.6 Create shared UI components
    - Button (primary, secondary, danger, ghost variants)
    - Form inputs (text, select, checkbox, radio, textarea, date picker)
    - Data table (TanStack Table: sortable columns, pagination, bulk selection, row actions)
    - Modal (centered overlay, header + body + footer)
    - Card and stat card components
    - Badge (Active, Inactive, Pending, Error)
    - Alert (Success, Warning, Error, Info)
    - Loading states (spinner, skeleton)
    - _Requirements: 34, Design system_

- [x] 25. Implement authentication pages
  - [x] 25.1 Create login page
    - Email + password form
    - Cognito integration
    - JWT token storage
    - Redirect to dashboard on success
    - _Requirements: 1.2_

  - [x] 25.2 Create registration page
    - All required fields: first name, last name, email, phone, DOB, gender, address, home branch
    - Branch selector dropdown
    - Integrate with members-create API
    - Show "pending approval" message after submission
    - _Requirements: 2.1, 2.2_

  - [x] 25.3 Create password reset page
    - Email input → Cognito forgot password flow
    - Confirmation code + new password form
    - _Requirements: 1.3_

- [x] 26. Implement member management pages
  - [x] 26.1 Create member list page
    - Data table with search (name, email, phone)
    - Filters: branch, department, fellowship, status
    - Pagination (50 per page)
    - Action buttons: Add Member, Import CSV, Export CSV
    - Branch isolation for pastors
    - _Requirements: Req 4_

  - [x] 26.2 Create member detail page
    - Tabs: Profile, Donations, Attendance
    - Display department assignments and fellowship membership
    - Edit and Deactivate buttons
    - _Requirements: 3.1_

  - [x] 26.3 Create member edit modal
    - Editable fields with validation
    - Profile photo upload
    - Prevent editing: home branch, membership date, status
    - _Requirements: 3.2-3.6_

  - [x] 26.4 Create CSV import page
    - File upload with column mapping interface
    - Validation error display with row numbers
    - Success summary
    - _Requirements: 5.1-5.4_

  - [x] 26.5 Create pending approvals page
    - List pending members for branch admin
    - Approve / Reject buttons
    - Member detail preview
    - _Requirements: 2.5, 2.7_

- [x] 27. Implement attendance tracking pages
  - [x] 27.1 Create service attendance recording page
    - Service date picker and type selector
    - Member list with bulk checkboxes
    - Status dropdown per member (Present, Absent, Virtual)
    - _Requirements: Req 10_

  - [x] 27.2 Create fellowship attendance recording page
    - Meeting date and fellowship selector
    - Fellowship member list with status dropdowns (Present, Absent, Excused, Late)
    - Meeting notes field
    - _Requirements: Req 11_

  - [x] 27.3 Create attendance reports page
    - Line chart: attendance trends (last 8 weeks)
    - Date range and branch filters
    - Members missing 4 consecutive services list
    - Export CSV button
    - _Requirements: Req 12_

- [x] 28. Implement evangelism pages
  - [x] 28.1 Create soul capture form page
    - Required: name, phone, date
    - Optional: email, address, notes
    - Source selector (outreach program or ad-hoc)
    - _Requirements: Req 14_

  - [x] 28.2 Create soul tracking Kanban board
    - Columns: New, Following Up, Interested, Converted
    - Soul cards with name, phone, days since last follow-up
    - Drag-and-drop to update status
    - Warning icon for overdue follow-ups
    - Click card → detail modal
    - _Requirements: Req 15, 16_

  - [x] 28.3 Create soul detail and follow-up modals
    - Soul info display with follow-up history
    - Log Follow-up form: date, time, method, status, notes
    - Update Status button with transition validation
    - _Requirements: 15.1-15.3, 16_

  - [x] 28.4 Create outreach programs page
    - Program list with create button
    - Worker registration
    - Souls captured per program display
    - Admin action to temporarily override a member's branch for cross-branch participation
    - _Requirements: Req 13_

- [x] 29. Implement donation pages
  - [x] 29.1 Create donation recording page
    - Tabs: Online (Stripe payment form), Manual Entry
    - Purpose selector with conditional description field for "Other"
    - Anonymous toggle for manual entry
    - _Requirements: Req 17, 18_

  - [x] 29.2 Create donation history page
    - Donation list with filters (member, date range, purpose)
    - Total giving summary
    - Export CSV button
    - _Requirements: 19.1, 19.2_

  - [x] 29.3 Create donation reports page
    - Summary by purpose and by branch
    - Top donors (show "Anonymous" for anonymous)
    - Date range filter
    - _Requirements: 19.3-19.5_

- [x] 30. Implement forms pages
  - [x] 30.1 Create form builder page
    - Drag-and-drop field type palette
    - Field configuration panel (label, placeholder, required, validation)
    - Live preview
    - Scope selector (Church-wide / Branch-specific)
    - "Save as template" button (calls forms-save-template API)
    - "Create from template" option showing available templates
    - _Requirements: Req 20_

  - [x] 30.2 Create form list page
    - List forms with scope and branch filters
    - Create, Preview, Edit buttons
    - _Requirements: Req 20_

  - [x] 30.3 Create form submission page
    - Render form from JSON definition
    - Auto-populate from member profile if logged in
    - Client-side validation
    - Confirmation message on submit
    - _Requirements: 20.7, 21.6_

  - [x] 30.4 Create form submissions list page
    - Filter by form type, date, branch
    - Export CSV button
    - _Requirements: Req 22_

- [x] 31. Implement dashboard pages
  - [x] 31.1 Create admin dashboard
    - Stat cards: total members, branches, donations (30d), souls (30d)
    - Attendance trend chart (8 weeks)
    - Recent activity feed (10 items)
    - _Requirements: Req 26_

  - [x] 31.2 Create pastor dashboard
    - Branch-specific stat cards
    - Branch attendance trends
    - Overdue follow-ups
    - _Requirements: Req 27_

  - [x] 31.3 Create leader dashboard
    - Group member count
    - Recent attendance
    - Members needing follow-up
    - Pending join requests
    - _Requirements: Req 28_

- [x] 32. Implement notification center
  - [x] 32.1 Create notification center component
    - Bell icon with unread count badge (max 99+)
    - Dropdown notification list with unread indicator (filled circle)
    - "Mark all as read" button
    - Click notification → navigate to relevant page
    - _Requirements: Req 24_

  - [x] 32.2 Integrate WebSocket for real-time updates
    - Connect on login, auto-reconnect
    - Update notification store on new messages
    - Toast for high-priority notifications
    - _Requirements: Real-time notifications_

- [x] 33. Implement accessibility
  - [x] 33.1 Add ARIA labels, alt text, semantic HTML
    - ARIA labels on all form inputs and buttons
    - Alt text on all images
    - Semantic HTML elements (nav, main, header, footer, section)
    - ARIA roles on interactive elements
    - _Requirements: 33.2, 33.4, 33.5, 33.6_

  - [x] 33.2 Ensure keyboard navigation
    - All interactive elements keyboard accessible
    - Visible focus indicators (Purple 700 outline)
    - Logical tab order
    - Minimum 44x44px touch targets
    - _Requirements: 33.2, 33.7, 34.4_

  - [x] 33.3 Verify color contrast
    - All text meets 4.5:1 minimum contrast ratio
    - Large text meets 3:1 minimum
    - _Requirements: 33.3_

- [x] 34. Checkpoint — Web application verification
  - Test all pages load correctly and are responsive
  - Test auth flow: login, register, password reset
  - Test member management: list, detail, edit, import, export, approval
  - Test attendance recording and reports
  - Test soul capture, Kanban board, follow-up logging
  - Test donation recording (online + manual) and reports
  - Test form builder, submission, and pre-built forms
  - Test dashboards for all three roles (admin, pastor, leader)
  - Test notification center with real-time updates
  - Test keyboard navigation and screen reader compatibility
  - Ensure all tests pass. Ask the user if questions arise.


### Week 10: CI/CD, Security, Polish & Launch

- [x] 35. Set up CI/CD pipeline with GitHub Actions
  - [x] 35.1 Create test workflow
    - Trigger on pull request
    - Set up PostgreSQL service container
    - Run unit tests, property tests, integration tests
    - Run linting and type checking
    - _Requirements: Testing strategy_

  - [x] 35.2 Create staging deployment workflow
    - Trigger on push to staging branch
    - Build Lambda bundles and Next.js app
    - Deploy CDK stacks to staging (kairos-staging-*)
    - Run smoke tests
    - _Requirements: 35.4_

  - [x] 35.3 Create production deployment workflow
    - Trigger on push to main branch
    - Require manual approval gate
    - Build and deploy to production (kairos-prod-*)
    - Monitor CloudWatch for errors post-deploy
    - _Requirements: 35.4_

- [x] 36. Implement monitoring and alerting
  - [x] 36.1 Create CloudWatch alarms
    - Lambda error rate > 5%
    - Lambda duration > 10s (p99)
    - API Gateway 5xx errors > 1%
    - Aurora CPU > 80%
    - Aurora connections > 80% of max
    - _Requirements: 35.7_

  - [x] 36.2 Create CloudWatch dashboards
    - API performance (latency, errors, requests)
    - Lambda performance (duration, errors, throttles)
    - Database performance (CPU, connections)
    - _Requirements: Monitoring_

  - [x] 36.3 Configure X-Ray tracing
    - Enable on all Lambda functions
    - 10% sampling rate
    - _Requirements: Monitoring_

- [ ] 37. Performance optimization
  - [ ] 37.1 Optimize Lambda cold starts
    - Review bundle sizes (target small bundles with Drizzle ~30KB)
    - Use Lambda layers for shared code
    - Target < 200ms cold start
    - _Requirements: 32.2_

  - [] 37.2 Optimize database queries
    - Review slow queries via CloudWatch Logs Insights
    - Add missing indexes
    - Fix N+1 queries
    - Target < 100ms query time (p95)
    - _Requirements: 32.2, 32.4_

  - [] 37.3 Verify page load performance
    - CloudFront caching configured with appropriate TTLs
    - Compression enabled
    - Target < 3 second page load
    - _Requirements: 32.1, 32.5_

- [ ] 38. Security hardening
  - [] 38.1 Review IAM policies
    - Ensure least privilege for all Lambda roles
    - Resource-level restrictions
    - _Requirements: 36_

  - [] 38.2 Enable API Gateway rate limiting
    - Configure throttling and burst limits
    - _Requirements: 36.9_

  - [] 38.3 Verify secrets management
    - All secrets in Secrets Manager or Parameter Store
    - Auto-rotation enabled for database credentials
    - No hardcoded credentials anywhere
    - _Requirements: 36.3, 36.4_

  - [] 38.4 Enable CloudTrail logging
    - Log all API calls
    - Set up log retention
    - _Requirements: 36.8_

- [x] 39. Seed data and migration
  - [x] 39.1 Create seed data script
    - Sample regions and branches (5 branches)
    - Sample members across roles (admin, pastor, leader, member)
    - Sample departments and fellowships
    - Sample attendance, souls, follow-ups, donations
    - _Requirements: Testing and demo_

- [ ] 40. User acceptance testing
  - [] 40.1 Create UAT test plan
    - Test scenarios for each persona: Admin, Pastor, Leader, Member
    - Cover all 13 core modules
    - _Requirements: All_

  - [] 40.2 Conduct UAT and fix critical bugs
    - Run through all scenarios
    - Collect feedback, log bugs
    - Fix critical and high-priority bugs
    - Retest fixes
    - _Requirements: All_

- [ ] 41. Documentation
  - [] 41.1 Create user guides
    - Admin guide, Pastor guide, Leader guide, Member guide
    - Screenshots and step-by-step instructions
    - _Requirements: User support_

  - [] 41.2 Create technical documentation
    - API documentation (OpenAPI spec)
    - Database schema documentation
    - Deployment and monitoring runbook
    - _Requirements: Developer support_

- [ ] 42. Final pre-launch checklist
  - [] 42.1 Verify all 13 modules functional
    - Auth, Members, Branches, Departments, Fellowships
    - Attendance (service + fellowship), Outreach, Evangelism (souls)
    - Donations (online + manual), Forms (builder + pre-built)
    - Notifications (email + in-app), Reports (dashboards + CSV + Power BI)
    - _Requirements: All_

  - [] 42.2 Verify performance targets
    - Page load < 3 seconds
    - API response < 500ms (p95)
    - Support 500 concurrent users
    - _Requirements: 32.1-32.3_

  - [] 42.3 Verify security requirements
    - TLS 1.2+ on all connections
    - AES-256 encryption at rest
    - Branch-level data isolation enforced
    - Input validation on all forms
    - No SQL injection or XSS vulnerabilities
    - _Requirements: 36.1-36.7_

  - [] 42.4 Verify accessibility
    - Keyboard navigation functional
    - Screen reader compatible
    - Color contrast meets 4.5:1 minimum
    - _Requirements: 33.1-33.7_

  - [] 42.5 Verify monitoring
    - CloudWatch alarms configured and tested
    - Dashboards showing data
    - X-Ray tracing active
    - _Requirements: 35.7_

- [ ] 43. Production deployment
  - [] 43.1 Deploy to production
    - Final staging verification
    - Stakeholder approval
    - Deploy CDK stacks to production (kairos-prod-*)
    - Deploy Next.js to production
    - Verify all services running
    - _Requirements: 35.4_

  - [] 43.2 Post-deployment monitoring
    - Watch CloudWatch metrics for errors
    - Monitor user activity
    - Be ready to rollback if needed
    - _Requirements: 35.7_

  - [ ] 43.3 Launch communication
    - Announcement email to all members
    - Support contact information provided
    - _Requirements: Launch_

- [ ] 44. Post-launch support
  - [ ] 44.1 Monitor system health
    - Daily CloudWatch dashboard review
    - Error log review
    - User feedback monitoring
    - _Requirements: 35.7_

  - [ ] 44.2 Address user issues
    - Respond to support requests
    - Fix bugs as they arise
    - _Requirements: User support_

## Notes

- Tasks marked with `*` include property-based tests for critical paths (auth, payments, data isolation, multi-tenancy). These are required per the testing strategy.
- Standard CRUD operations use pragmatic testing (happy path + key edge cases).
- Checkpoints (tasks 6, 11, 14, 17, 23, 34) are mandatory validation gates before proceeding.
- All Lambda functions follow the granular pattern: one function per operation. Do NOT consolidate.
- All queries MUST filter by branch_id or enforce via authorizer. No exceptions.
- GBP only, UK timezone (Europe/London) only, English only for MVP.
- No Phase 2 features included. See steering guide "Deferred to Phase 2" section for excluded items.

## Success Metrics

**By Easter Launch (April 12, 2026):**
- ✅ All 13 core modules functional
- ✅ 500 members registered across 5 branches
- ✅ 100 souls captured and tracked
- ✅ 500 donations recorded
- ✅ < 3 second page loads
- ✅ 99% uptime
- ✅ All critical path tests passing
- ✅ Zero critical bugs

---

**Document Version:** 2.0
**Date:** February 7, 2026
**Status:** Ready for Implementation
**Target Launch:** April 12, 2026 (Easter)
**Development Timeline:** 10 weeks (Week 1 starts Feb 2, 2026)
