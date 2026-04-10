# Implementation Plan: Outreach Module

## Overview

This implementation plan breaks down the Outreach Module into discrete, testable tasks following TDD principles. The module enables church branches to manage evangelism activities through structured outreach programs and ad-hoc soul capture, tracking souls from initial contact through conversion with automated follow-up workflows.

The implementation follows the Kairos architecture: Hono API backend, Next.js 15 frontend, Drizzle ORM with PostgreSQL 15, and strict TDD with Vitest and fast-check for property-based testing.

## Tasks

- [ ] 1. Database schema and migrations
  - [ ] 1.1 Create Drizzle schema definitions for outreach tables
    - Define outreach_programs, souls, follow_ups, outreach_participants tables in packages/database/src/schema/outreach.ts
    - Use camelCase for TypeScript properties, snake_case for SQL columns
    - Define all foreign key relationships using Drizzle relations syntax
    - Export schemas from packages/database/src/schema/index.ts
    - _Requirements: 51.1, 51.2, 51.3, 51.4, 51.5, 51.6, 51.7_
  
  - [ ] 1.2 Create SQL migration file
    - Write migration SQL in packages/database/migrations/0005_outreach_module.sql
    - Create outreach_programs table with all columns, constraints, indexes
    - Create souls table with status enum check, unique constraints on phone/email per outreach
    - Create follow_ups table with contact_method and contact_status enums
    - Create outreach_participants table with composite primary key
    - Add updated_at triggers for all tables
    - _Requirements: 1.1, 3.1, 4.1, 5.2, 5.3, 29.1_

- [ ] 2. Shared types and validation schemas
  - [ ] 2.1 Define TypeScript types in packages/types
    - Create packages/types/src/outreach.ts with SoulStatus, ContactMethod, ContactStatus enums
    - Define OutreachProgram, Soul, FollowUp, OutreachParticipant interfaces
    - Define request/response types: CreateProgramInput, CaptureSoulInput, LogFollowUpInput, ConversionResult
    - Export all types from packages/types/src/index.ts
    - _Requirements: 37.1-37.15, 49.1, 49.2, 49.5_
  
  - [ ] 2.2 Create Zod validation schemas
    - Write apps/api/src/outreach/schemas.ts with all validation schemas
    - Define createProgramSchema, captureSoulSchema, logFollowUpSchema, updateSoulStatusSchema
    - Define query schemas: listProgramsQuerySchema, listSoulsQuerySchema
    - Add phone regex validation, email validation, enum validations
    - _Requirements: 3.8, 3.9, 5.2, 5.3, 36.1, 56.1_


- [ ] 3. Backend: Outreach programs service layer (TDD)
  - [ ] 3.1 Write failing tests for createProgram function
    - Test creating program with all fields
    - Test auto-set branch_id for Pastor users
    - Test branch_id requirement for Admin users
    - Test case-insensitive duplicate detection
    - Test coordinator validation
    - Test branch isolation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 32.1, 32.2, 32.3_
  
  - [ ] 3.2 Implement createProgram service function
    - Write apps/api/src/outreach/service.ts with createProgram function
    - Auto-set branch_id for Pastor, require for Admin
    - Normalize program_name (lowercase, trim) for duplicate check
    - Validate coordinator is active member from correct branch
    - Return created program with all fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 26.1, 26.2, 26.3_
  
  - [ ]*  3.3 Write property test for program field persistence
    - **Property 1: Program Field Persistence**
    - **Validates: Requirements 1.1**
    - Generate random valid program inputs with fast-check
    - Verify all fields are stored and retrievable
    - Run 100 iterations minimum
  
  - [ ] 3.4 Write failing tests for listPrograms function
    - Test pagination with page and limit parameters
    - Test branch isolation for Pastor users
    - Test Admin sees all branches
    - Test filtering by is_completed, date range, coordinator
    - Test search by program_name
    - _Requirements: 1.5, 16.1, 16.2, 16.6, 16.7, 59.1-59.5_
  
  - [ ] 3.5 Implement listPrograms service function
    - Apply branch isolation based on user role
    - Build dynamic WHERE conditions for filters
    - Join with branches and members tables for names
    - Return paginated results with metadata
    - _Requirements: 1.5, 16.1, 16.2, 16.6, 16.7, 16.8_
  
  - [ ]*  3.6 Write property test for branch isolation
    - **Property 5: Branch Isolation for Data Access**
    - **Validates: Requirements 1.5, 12.1, 12.2**
    - Generate programs across multiple branches
    - Verify Pastor only sees their branch
    - Verify Admin sees all branches
  
  - [ ] 3.7 Write failing tests for getProgram function
    - Test retrieving program with participants and souls
    - Test calculating statistics (total workers, souls, conversion rate)
    - Test authorization checks
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 19.1-19.6_
  
  - [ ] 3.8 Implement getProgram service function
    - Fetch program with all relations using Drizzle query API
    - Calculate statistics: total workers, souls by status, conversion rate
    - Enforce branch isolation
    - _Requirements: 13.1-13.7, 19.1-19.7_
  
  - [ ] 3.9 Write failing tests for updateProgram function
    - Test updating program fields
    - Test authorization (Admin, Pastor, Coordinator only)
    - Test marking program as completed
    - _Requirements: 1.6, 28.1, 28.2, 28.3_
  
  - [ ] 3.10 Implement updateProgram service function
    - Validate user has permission to update
    - Update allowed fields only
    - Preserve souls and follow-up data when marking completed
    - _Requirements: 1.6, 13.7, 28.1-28.7_
  
  - [ ] 3.11 Write failing tests for registerWorker function
    - Test registering member for program
    - Test preventing duplicate registrations
    - Test role assignment
    - _Requirements: 2.1, 2.2, 2.3, 40.1-40.5_
  
  - [ ] 3.12 Implement registerWorker service function
    - Create outreach_participants record
    - Check for existing registration (composite PK)
    - Allow optional role and notes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 40.1-40.5_


- [ ] 4. Backend: Souls service layer (TDD)
  - [ ] 4.1 Write failing tests for captureSoul function
    - Test capturing soul with required fields only
    - Test auto-assignment to capturing worker
    - Test status initialization to 'New'
    - Test ad-hoc soul capture (outreach_id = null)
    - Test phone format validation
    - Test email format validation and lowercase normalization
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9, 29.1, 56.1, 56.4_
  
  - [ ] 4.2 Implement captureSoul service function
    - Write apps/api/src/outreach/souls-service.ts with captureSoul function
    - Validate required fields (first_name, last_name, phone)
    - Auto-set assigned_member_id to auth.memberId
    - Initialize status to 'New'
    - Normalize email to lowercase
    - Support null outreach_id for ad-hoc captures
    - _Requirements: 3.1-3.9, 29.1, 56.4_
  
  - [ ]*  4.3 Write property tests for soul capture
    - **Property 6: Soul Capture Required Fields**
    - **Validates: Requirements 3.1**
    - **Property 7: Soul Auto-Assignment**
    - **Validates: Requirements 3.4**
    - **Property 8: Soul Status Initialization**
    - **Validates: Requirements 3.5**
    - Generate random soul inputs with fast-check
    - Verify required field validation, auto-assignment, status initialization
  
  - [ ] 4.4 Write failing tests for updateSoulStatus function
    - Test updating to all six valid statuses
    - Test bidirectional transitions (backward and forward)
    - Test status normalization (trim, case handling)
    - Test converted_to_member_id requirement for 'Converted' status
    - Test invalid status rejection
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 25.1-25.7, 33.1-33.6_
  
  - [ ] 4.5 Implement updateSoulStatus service function
    - Normalize status value (trim whitespace)
    - Validate status against six allowed values
    - Require converted_to_member_id when status='Converted'
    - Allow bidirectional transitions without restrictions
    - Update updated_at timestamp
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 25.1-25.7, 33.1-33.6_
  
  - [ ]*  4.6 Write property test for bidirectional status transitions
    - **Property 11: Bidirectional Status Transitions**
    - **Validates: Requirements 4.5, 25.1-25.5**
    - Generate all combinations of from/to status pairs
    - Verify all transitions are allowed
  
  - [ ] 4.7 Write failing tests for listSouls function
    - Test pagination and filtering
    - Test assignment-based access for Members
    - Test branch isolation for Pastors
    - Test Admin sees all branches
    - Test LEFT JOIN includes ad-hoc souls
    - Test search by name, phone, email
    - Test overdue calculation
    - _Requirements: 12.3, 12.4, 12.5, 14.1-14.8, 29.7, 30.1_
  
  - [ ] 4.8 Implement listSouls service function
    - Use LEFT JOIN for outreach_programs to include ad-hoc souls
    - Apply role-based filtering (Member: assigned only, Pastor: branch only, Admin: all)
    - Build dynamic WHERE conditions for filters
    - Calculate days_since_last_follow_up using SQL
    - Return paginated results with overdue indicators
    - _Requirements: 12.3-12.5, 14.1-14.8, 29.7, 30.1, 30.2_
  
  - [ ] 4.9 Write failing tests for getSoul function
    - Test retrieving soul with all relations
    - Test follow-up history ordered by date descending
    - Test authorization checks (assignment-based for Members)
    - Test calculating follow-up statistics
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.8, 18.1-18.3_
  
  - [ ] 4.10 Implement getSoul service function
    - Fetch soul with outreachProgram, assignedMember, convertedToMember relations
    - Fetch follow-up history with pagination
    - Calculate statistics: total follow-ups, last follow-up date, average duration
    - Enforce access control based on role and assignment
    - _Requirements: 8.1-8.8, 18.1-18.4_
  
  - [ ] 4.11 Write failing tests for reassignSoul function
    - Test updating assigned_member_id
    - Test validating new member is active
    - Test Pastor can only reassign within branch
    - Test Admin can reassign across branches
    - Test preserving follow-up history
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 17.1-17.6_
  
  - [ ] 4.12 Implement reassignSoul service function
    - Validate new assigned_member_id references active member
    - Enforce branch constraints for Pastor
    - Update assigned_member_id
    - Send notification to new worker
    - _Requirements: 9.1-9.6, 17.1-17.6_
  
  - [ ] 4.13 Write failing tests for searchSouls and filterSoulsByStatus
    - Test partial matching on name, phone, email
    - Test filtering by status
    - Test combining search and filters
    - _Requirements: 14.1, 14.2, 14.8_
  
  - [ ] 4.14 Implement searchSouls and filterSoulsByStatus functions
    - Use ILIKE for case-insensitive partial matching
    - Apply branch isolation and assignment filtering
    - Order by created_at descending
    - _Requirements: 14.1-14.8_
  
  - [ ] 4.15 Write failing tests for exportSoulsToCSV function
    - Test CSV generation with all columns
    - Test branch filtering for Pastor
    - Test applying active filters to export
    - Test CSV header row
    - Test special character escaping
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_
  
  - [ ] 4.16 Implement exportSoulsToCSV service function
    - Query souls with filters applied
    - Generate CSV with headers
    - Escape special characters for CSV safety
    - Return CSV string
    - _Requirements: 21.1-21.7_


- [ ] 5. Backend: Conversion service (TDD)
  - [ ] 5.1 Write failing tests for convertSoulToMember function
    - Test creating member with soul data
    - Test updating soul status to 'Converted'
    - Test setting converted_to_member_id
    - Test transaction atomicity (rollback on failure)
    - Test member field mapping (first_name, last_name, phone, email, address, city, gender)
    - Test setting home_branch_id from soul's branch
    - Test setting membership_date to current date
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 31.1-31.7_
  
  - [ ] 5.2 Implement convertSoulToMember service function
    - Write apps/api/src/outreach/conversion-service.ts
    - Wrap in db.transaction for atomicity
    - Fetch soul with outreachProgram and branch relations
    - Create member record with mapped fields
    - Update soul status and converted_to_member_id
    - Commit transaction or rollback on error
    - _Requirements: 10.1-10.8, 31.1-31.7_
  
  - [ ]*  5.3 Write property test for conversion transaction atomicity
    - **Property 16: Conversion Transaction Atomicity**
    - **Validates: Requirements 10.7, 10.8, 31.1, 31.2**
    - Simulate member creation failures
    - Verify soul remains unchanged on rollback
    - Verify no orphaned member records
  
  - [ ]*  5.4 Write property test for soul-to-member data transfer
    - **Property 15: Soul-to-Member Data Transfer**
    - **Validates: Requirements 10.1, 10.4**
    - Generate random soul data
    - Verify all transferable fields copied correctly

- [ ] 6. Backend: Follow-ups service (TDD)
  - [ ] 6.1 Write failing tests for logFollowUp function
    - Test creating follow-up with required fields
    - Test validating contact_method enum
    - Test validating contact_status enum
    - Test validating duration_minutes > 0
    - Test auto-setting follow_up_date to current timestamp
    - Test updating soul.updated_at
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 35.1-35.5, 43.1-43.6_
  
  - [ ] 6.2 Implement logFollowUp service function
    - Write apps/api/src/outreach/follow-ups-service.ts
    - Validate contact_method and contact_status enums
    - Validate duration_minutes > 0 when provided
    - Default follow_up_date to current timestamp
    - Update soul.updated_at
    - _Requirements: 5.1-5.8, 35.1-35.5, 43.1-43.6_
  
  - [ ]*  6.3 Write property test for follow-up required fields
    - **Property 12: Follow-Up Required Fields**
    - **Validates: Requirements 5.1**
    - Generate follow-ups with missing required fields
    - Verify validation errors
  
  - [ ] 6.4 Write failing tests for getFollowUpHistory function
    - Test retrieving follow-ups for a soul
    - Test pagination with default page size 20
    - Test ordering by follow_up_date descending
    - Test LEFT JOIN includes ad-hoc souls
    - Test access control (Members see assigned souls only)
    - _Requirements: 5.5, 5.6, 18.1, 18.2, 58.1-58.6_
  
  - [ ] 6.5 Implement getFollowUpHistory service function
    - Use LEFT JOIN for souls and outreach_programs
    - Order by follow_up_date DESC
    - Apply pagination with default limit 20
    - Enforce access control
    - _Requirements: 5.5, 5.6, 18.1-18.7, 58.1-58.6_
  
  - [ ] 6.6 Write failing tests for getFollowUpStatistics function
    - Test calculating total follow-ups per soul
    - Test calculating average duration
    - Test calculating days since last follow-up
    - _Requirements: 8.3, 43.5, 43.6_
  
  - [ ] 6.7 Implement getFollowUpStatistics service function
    - Calculate total follow-ups count
    - Calculate average duration_minutes
    - Calculate days since last follow-up using SQL
    - _Requirements: 8.3, 43.5, 43.6_

- [ ] 7. Backend: Alerts service (TDD)
  - [ ] 7.1 Write failing tests for generateFollowUpAlerts function
    - Test querying overdue souls by status thresholds
    - Test excluding Converted, Not Interested, Lost Contact statuses
    - Test calculating days since last follow-up
    - Test generating notifications to assigned workers
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 27.1-27.7_
  
  - [ ] 7.2 Implement generateFollowUpAlerts service function
    - Write apps/api/src/outreach/alerts-service.ts
    - Query souls with LEFT JOIN to follow_ups
    - Calculate days since last follow-up using SQL EXTRACT
    - Apply status-specific thresholds (New/Following Up: 2 days, Interested: 3 days)
    - Create notifications for assigned workers
    - _Requirements: 6.1-6.6, 27.1-27.7_
  
  - [ ] 7.3 Write failing tests for getAlertConfiguration and updateAlertConfiguration
    - Test retrieving default thresholds
    - Test Admin updating thresholds
    - Test non-Admin cannot update thresholds
    - _Requirements: 6.4_
  
  - [ ] 7.4 Implement alert configuration functions
    - Store configuration in database or environment variables
    - Allow Admin to update thresholds
    - Return current configuration
    - _Requirements: 6.4_


- [ ] 8. Backend: Outreach router (TDD)
  - [ ] 8.1 Write failing integration tests for POST /api/outreach/programs
    - Test successful program creation
    - Test authentication requirement
    - Test role authorization (Admin, Pastor only)
    - Test validation errors return 400
    - Test duplicate detection returns 409
    - _Requirements: 37.1, 48.1, 48.6_
  
  - [ ] 8.2 Implement POST /api/outreach/programs endpoint
    - Create apps/api/src/outreach/router.ts
    - Apply authMiddleware and requireRole middleware
    - Use zValidator with createProgramSchema
    - Call createProgram service function
    - Return 201 with success response
    - _Requirements: 37.1, 48.1, 48.2, 48.6_
  
  - [ ] 8.3 Write failing integration tests for GET /api/outreach/programs
    - Test listing with pagination
    - Test filtering by is_completed, date range, coordinator
    - Test search by program_name
    - Test branch isolation
    - _Requirements: 37.2, 16.1-16.8_
  
  - [ ] 8.4 Implement GET /api/outreach/programs endpoint
    - Use zValidator with listProgramsQuerySchema
    - Call listPrograms service function
    - Return paginated response
    - _Requirements: 37.2, 16.1-16.8_
  
  - [ ] 8.5 Write failing integration tests for GET /api/outreach/programs/:id
    - Test retrieving program with details
    - Test authorization checks
    - Test 404 for non-existent program
    - _Requirements: 37.3, 13.1-13.7_
  
  - [ ] 8.6 Implement GET /api/outreach/programs/:id endpoint
    - Call getProgram service function
    - Return program with participants, souls, statistics
    - _Requirements: 37.3, 13.1-13.7_
  
  - [ ] 8.7 Write failing integration tests for PUT /api/outreach/programs/:id
    - Test updating program fields
    - Test authorization (Admin, Pastor, Coordinator)
    - Test marking as completed
    - _Requirements: 37.4, 1.6, 28.1-28.7_
  
  - [ ] 8.8 Implement PUT /api/outreach/programs/:id endpoint
    - Use zValidator with updateProgramSchema
    - Call updateProgram service function
    - Return updated program
    - _Requirements: 37.4, 1.6, 28.1-28.7_
  
  - [ ] 8.9 Write failing integration tests for POST /api/outreach/programs/:id/participants
    - Test registering worker for program
    - Test preventing duplicate registrations
    - Test role assignment
    - _Requirements: 37.5, 2.1-2.5_
  
  - [ ] 8.10 Implement POST /api/outreach/programs/:id/participants endpoint
    - Use zValidator with registerWorkerSchema
    - Call registerWorker service function
    - Return 201 with participant record
    - _Requirements: 37.5, 2.1-2.5_
  
  - [ ] 8.11 Write failing integration tests for GET /api/outreach/reports/conversion-funnel
    - Test calculating status counts
    - Test calculating conversion rate
    - Test branch filtering
    - Test date range filtering
    - _Requirements: 37.13, 11.1-11.8_
  
  - [ ] 8.12 Implement GET /api/outreach/reports/conversion-funnel endpoint
    - Create getConversionFunnelMetrics service function
    - Calculate status distribution, conversion rate, drop-off rates
    - Calculate average days to conversion
    - Apply branch isolation
    - _Requirements: 37.13, 11.1-11.8_


- [ ] 9. Backend: Souls router (TDD)
  - [ ] 9.1 Write failing integration tests for POST /api/souls
    - Test capturing soul with all fields
    - Test capturing ad-hoc soul
    - Test validation errors
    - Test authentication requirement
    - _Requirements: 37.6, 3.1-3.9, 29.1_
  
  - [ ] 9.2 Implement POST /api/souls endpoint
    - Create apps/api/src/outreach/souls-router.ts
    - Apply authMiddleware
    - Use zValidator with captureSoulSchema
    - Call captureSoul service function
    - Return 201 with soul record
    - _Requirements: 37.6, 3.1-3.9, 29.1_
  
  - [ ] 9.3 Write failing integration tests for GET /api/souls
    - Test listing with pagination
    - Test filtering by status, assigned_member_id, outreach_id
    - Test search functionality
    - Test assignment-based filtering for Members
    - Test overdue_only filter
    - _Requirements: 37.7, 14.1-14.8, 27.6_
  
  - [ ] 9.4 Implement GET /api/souls endpoint
    - Use zValidator with listSoulsQuerySchema
    - Call listSouls service function
    - Return paginated souls with overdue indicators
    - _Requirements: 37.7, 14.1-14.8, 27.6_
  
  - [ ] 9.5 Write failing integration tests for GET /api/souls/:id
    - Test retrieving soul details
    - Test follow-up history included
    - Test authorization checks
    - Test 404 for non-existent soul
    - _Requirements: 37.8, 8.1-8.8_
  
  - [ ] 9.6 Implement GET /api/souls/:id endpoint
    - Call getSoul service function
    - Return soul with relations and statistics
    - _Requirements: 37.8, 8.1-8.8_
  
  - [ ] 9.7 Write failing integration tests for PUT /api/souls/:id/status
    - Test updating status
    - Test bidirectional transitions
    - Test converted_to_member_id requirement
    - Test authorization
    - _Requirements: 37.9, 4.1-4.7, 25.1-25.7_
  
  - [ ] 9.8 Implement PUT /api/souls/:id/status endpoint
    - Use zValidator with updateSoulStatusSchema
    - Call updateSoulStatus service function
    - Return updated soul
    - _Requirements: 37.9, 4.1-4.7, 25.1-25.7_
  
  - [ ] 9.9 Write failing integration tests for PUT /api/souls/:id/assign
    - Test reassigning soul
    - Test authorization (Admin, Pastor only)
    - Test validation of new member
    - _Requirements: 37.10, 9.1-9.6_
  
  - [ ] 9.10 Implement PUT /api/souls/:id/assign endpoint
    - Use zValidator with reassignSoulSchema
    - Call reassignSoul service function
    - Return updated soul
    - _Requirements: 37.10, 9.1-9.6_
  
  - [ ] 9.11 Write failing integration tests for POST /api/souls/:id/follow-ups
    - Test logging follow-up
    - Test validation of enums
    - Test authorization
    - _Requirements: 37.11, 5.1-5.8_
  
  - [ ] 9.12 Implement POST /api/souls/:id/follow-ups endpoint
    - Use zValidator with logFollowUpSchema
    - Call logFollowUp service function
    - Return 201 with follow-up record
    - _Requirements: 37.11, 5.1-5.8_
  
  - [ ] 9.13 Write failing integration tests for POST /api/souls/:id/convert
    - Test successful conversion
    - Test transaction rollback on failure
    - Test authorization
    - Test 409 on duplicate email
    - _Requirements: 37.12, 10.1-10.8_
  
  - [ ] 9.14 Implement POST /api/souls/:id/convert endpoint
    - Call convertSoulToMember service function
    - Return conversion result with soul and member
    - Handle transaction errors
    - _Requirements: 37.12, 10.1-10.8_
  
  - [ ] 9.15 Write failing integration tests for GET /api/souls/export
    - Test CSV generation
    - Test branch filtering
    - Test CSV headers
    - Test authorization (Admin, Pastor only)
    - _Requirements: 37.14, 21.1-21.7_
  
  - [ ] 9.16 Implement GET /api/souls/export endpoint
    - Call exportSoulsToCSV service function
    - Set CSV content-type and disposition headers
    - Return CSV response
    - _Requirements: 37.14, 21.1-21.7_


- [ ] 10. Backend: Register routers with main app
  - [ ] 10.1 Register outreach and souls routers
    - Import outreachRouter and soulsRouter in apps/api/src/app.ts
    - Mount outreachRouter at /api/outreach
    - Mount soulsRouter at /api/souls
    - Ensure error handling middleware is applied
    - _Requirements: 48.5, 48.6_

- [ ] 11. API client implementation
  - [ ] 11.1 Create OutreachClient class
    - Write packages/api-client/src/outreach.ts
    - Implement methods for all outreach program endpoints
    - Implement methods for all soul endpoints
    - Implement methods for follow-ups and conversion
    - Use typed request/response interfaces
    - Handle authentication tokens
    - _Requirements: 49.1, 49.2, 49.3, 49.4, 49.6_
  
  - [ ] 11.2 Export OutreachClient from api-client package
    - Export from packages/api-client/src/index.ts
    - Ensure type safety for all methods
    - _Requirements: 49.1, 49.5_

- [ ] 12. Frontend: Zustand stores
  - [ ] 12.1 Create outreach programs store
    - Write apps/web/src/stores/outreach-store.ts
    - Define state: programs, pagination, filters, loading, error
    - Implement actions: fetchPrograms, createProgram, updateProgram, setFilters
    - Use apiClient for all API calls
    - _Requirements: 52.1, 52.4, 52.6, 52.7_
  
  - [ ] 12.2 Create souls store
    - Write apps/web/src/stores/souls-store.ts
    - Define state: souls, filters, loading, error
    - Implement actions: fetchSouls, captureSoul, updateSoulStatus, reassignSoul
    - Update state optimistically for drag-and-drop
    - _Requirements: 52.2, 52.4, 52.5, 52.6, 52.7_
  
  - [ ] 12.3 Create follow-ups store
    - Write apps/web/src/stores/follow-ups-store.ts
    - Define state: followUps, pagination, loading, error
    - Implement actions: fetchFollowUps, logFollowUp
    - _Requirements: 52.3, 52.4, 52.7_

- [ ] 13. Frontend: Outreach programs list page
  - [ ] 13.1 Create programs list page component
    - Create apps/web/src/app/(dashboard)/outreach/programs/page.tsx
    - Display paginated table of programs
    - Show program_name, program_date, location, coordinator, total_souls_reached, is_completed
    - Add "Create Program" button
    - Use Shadcn Table component
    - _Requirements: 38.1, 1.8, 53.6_
  
  - [ ] 13.2 Add filters and search to programs list
    - Add filter controls for is_completed, date range, coordinator
    - Add search input for program_name
    - Connect to outreach store filters
    - Use Shadcn Input and Select components
    - _Requirements: 59.1-59.7, 53.2, 53.3_
  
  - [ ]*  13.3 Write component tests for programs list
    - Test rendering programs table
    - Test pagination controls
    - Test filter interactions
    - Test search functionality


- [ ] 14. Frontend: Create program page
  - [ ] 14.1 Create program form page
    - Create apps/web/src/app/(dashboard)/outreach/programs/new/page.tsx
    - Add form fields: program_name, program_date, location, address, city, description, coordinator_id
    - Auto-set branch_id for Pastor users
    - Show branch selector for Admin users
    - Use Shadcn Input, Select, Textarea components
    - _Requirements: 38.2, 1.1, 1.3, 1.4, 53.2, 53.3_
  
  - [ ] 14.2 Implement form validation and submission
    - Validate required fields client-side
    - Call apiClient.outreach.createProgram
    - Show success toast notification
    - Redirect to program detail page on success
    - Display validation errors inline
    - _Requirements: 15.1, 54.1, 54.6_
  
  - [ ]*  14.3 Write component tests for create program form
    - Test form rendering
    - Test validation
    - Test successful submission
    - Test error handling

- [ ] 15. Frontend: Program detail page
  - [ ] 15.1 Create program detail page component
    - Create apps/web/src/app/(dashboard)/outreach/programs/[id]/page.tsx
    - Display program information card
    - Display participants list with roles
    - Display souls captured list with statuses
    - Display follow-up statistics
    - Use Shadcn Card component
    - _Requirements: 38.3, 13.1-13.5, 53.4_
  
  - [ ] 15.2 Add program actions
    - Add "Mark as Completed" button
    - Add "Edit Program" button
    - Add "Register as Worker" button
    - Implement authorization checks (show buttons based on role)
    - _Requirements: 13.6, 13.7, 28.1-28.3, 53.1_
  
  - [ ]*  15.3 Write component tests for program detail page
    - Test rendering program details
    - Test participants list
    - Test souls list
    - Test action buttons

- [ ] 16. Frontend: Soul capture form
  - [ ] 16.1 Create soul capture form page
    - Create apps/web/src/app/(dashboard)/souls/capture/page.tsx
    - Add form fields: first_name, last_name, phone, email, address, city, gender, age_range, notes
    - Add optional outreach program selector
    - Validate phone and email formats
    - Use Shadcn Input, Select, Textarea components
    - _Requirements: 38.4, 3.1-3.9, 53.2, 53.3_
  
  - [ ] 16.2 Implement form submission
    - Call apiClient.souls.captureSoul
    - Show success notification with link to soul detail
    - Clear form on success
    - Display validation errors
    - _Requirements: 3.1-3.9, 54.6, 60.1_
  
  - [ ] 16.3 Make form mobile-responsive
    - Ensure touch-friendly inputs (44x44px minimum)
    - Test on mobile viewport
    - _Requirements: 39.1, 39.3_
  
  - [ ]*  16.4 Write component tests for soul capture form
    - Test form rendering
    - Test validation
    - Test successful submission
    - Test ad-hoc capture (no program selected)


- [ ] 17. Frontend: Souls Kanban board
  - [ ] 17.1 Install @dnd-kit dependencies
    - Install @dnd-kit/core and @dnd-kit/sortable
    - Add to apps/web/package.json
    - _Requirements: 7.3_
  
  - [ ] 17.2 Create Kanban board page component
    - Create apps/web/src/app/(dashboard)/souls/page.tsx
    - Set up DndContext for drag-and-drop
    - Display four columns: New, Following Up, Interested, Converted
    - Exclude Not Interested and Lost Contact from board
    - Add search and filter controls
    - _Requirements: 38.5, 7.1, 7.2, 7.7, 7.8_
  
  - [ ] 17.3 Implement drag-and-drop status updates
    - Handle onDragEnd event
    - Call updateSoulStatus on drop
    - Update UI optimistically
    - Show error toast on failure
    - _Requirements: 7.3, 7.4, 57.6_
  
  - [ ] 17.4 Create KanbanColumn component
    - Create apps/web/src/components/souls/kanban-column.tsx
    - Use useDroppable hook
    - Display column title and soul count badge
    - Render soul cards
    - Use Shadcn Card and Badge components
    - _Requirements: 7.1, 53.4, 53.7_
  
  - [ ] 17.5 Create SoulCard component
    - Create apps/web/src/components/souls/soul-card.tsx
    - Use useDraggable hook
    - Display name, phone, days since last follow-up
    - Show overdue warning indicator when applicable
    - Make card clickable to navigate to detail view
    - Use Shadcn Card and Badge components
    - _Requirements: 7.5, 7.6, 27.2, 27.3, 27.4, 53.4, 53.7_
  
  - [ ] 17.6 Implement Kanban board mobile responsiveness
    - Convert to vertical scrolling list on mobile
    - Ensure touch-friendly interactions
    - _Requirements: 39.2, 39.3_
  
  - [ ]*  17.7 Write component tests for Kanban board
    - Test rendering four columns
    - Test drag-and-drop functionality
    - Test overdue indicators
    - Test filtering by assignment

- [ ] 18. Frontend: Soul detail page
  - [ ] 18.1 Create soul detail page component
    - Create apps/web/src/app/(dashboard)/souls/[id]/page.tsx
    - Display soul information card
    - Display follow-up history (paginated)
    - Show outreach program link if applicable
    - Show converted member link if converted
    - Use Shadcn Card component
    - _Requirements: 38.6, 8.1, 8.2, 8.7, 8.8, 53.4_
  
  - [ ] 18.2 Add log follow-up form to detail page
    - Create inline form for logging follow-ups
    - Add fields: contact_method, contact_status, duration_minutes, notes, next_follow_up_date
    - Validate enums and duration > 0
    - Refresh follow-up history on success
    - Use Shadcn Input, Select, Textarea components
    - _Requirements: 8.4, 5.1-5.8, 53.2, 53.3_
  
  - [ ] 18.3 Add status update controls
    - Create status dropdown with all six options
    - Display in logical pipeline order
    - Allow bidirectional transitions
    - Update soul status on selection
    - Use Shadcn Select component
    - _Requirements: 8.5, 24.1-24.5, 25.6, 53.3_
  
  - [ ] 18.4 Add reassign worker control
    - Add "Reassign" button (visible to Pastor/Admin only)
    - Show member selector dialog
    - Call apiClient.souls.reassign
    - Update UI on success
    - Use Shadcn Button and Dialog components
    - _Requirements: 8.6, 9.1-9.6, 53.1, 53.5_
  
  - [ ] 18.5 Add convert to member button
    - Add "Convert to Member" button
    - Show confirmation dialog
    - Call apiClient.souls.convert
    - Show success notification with member link
    - Navigate to member profile on success
    - Use Shadcn Button and Dialog components
    - _Requirements: 8.6, 10.1-10.8, 60.1-60.6, 53.1, 53.5_
  
  - [ ]*  18.6 Write component tests for soul detail page
    - Test rendering soul information
    - Test follow-up history display
    - Test log follow-up form
    - Test status update
    - Test conversion flow


- [ ] 19. Frontend: Conversion funnel report page
  - [ ] 19.1 Create reports page component
    - Create apps/web/src/app/(dashboard)/outreach/reports/page.tsx
    - Display funnel visualization showing counts at each status
    - Show conversion rate percentage
    - Show drop-off rates between stages
    - Show average days to conversion
    - Use Shadcn Card component
    - _Requirements: 38.7, 11.1-11.8, 53.4_
  
  - [ ] 19.2 Add report filters
    - Add date range filter
    - Add outreach program filter
    - Add branch filter (Admin only)
    - Connect to API client
    - Use Shadcn Select and Input components
    - _Requirements: 11.6, 11.7, 11.5, 53.2, 53.3_
  
  - [ ] 19.3 Create funnel visualization component
    - Create apps/web/src/components/reports/conversion-funnel.tsx
    - Display status counts as horizontal bars or funnel chart
    - Show percentages and absolute numbers
    - Highlight conversion rate
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]*  19.4 Write component tests for reports page
    - Test rendering funnel visualization
    - Test filter interactions
    - Test branch filtering for Admin

- [ ] 20. Frontend: Navigation integration
  - [ ] 20.1 Add Evangelism section to sidebar navigation
    - Update apps/web/src/components/layout/sidebar.tsx
    - Add "Evangelism" section with links to:
      - Outreach Programs (/outreach/programs)
      - My Souls (/souls)
      - Capture Soul (/souls/capture)
      - Reports (/outreach/reports)
    - Show/hide links based on user role
    - _Requirements: 38.8_

- [ ] 21. Error handling and user feedback
  - [ ] 21.1 Implement error toast notifications
    - Use sonner toast library (already in project)
    - Show error toasts for API failures
    - Display field-specific validation errors inline
    - _Requirements: 54.6, 54.7_
  
  - [ ] 21.2 Implement success notifications
    - Show success toast on program creation
    - Show success toast on soul capture with link to detail
    - Show success toast on conversion with member link
    - _Requirements: 60.1, 60.2, 60.3_
  
  - [ ] 21.3 Add loading states
    - Show loading spinners during API calls
    - Disable form buttons during submission
    - Show skeleton loaders for lists
    - _Requirements: 57.1_

- [ ] 22. Checkpoint - Backend and frontend integration
  - Ensure all tests pass
  - Test end-to-end flows manually
  - Verify branch isolation works correctly
  - Verify role-based access control
  - Ask the user if questions arise


- [ ] 23. Bug fixes and enhancements
  - [ ] 23.1 Fix status dropdown to show all six options
    - Verify status dropdown displays: New, Following Up, Interested, Not Interested, Converted, Lost Contact
    - Ensure dropdown is not limited to two options
    - Display in logical pipeline order
    - _Requirements: 24.1, 24.2, 24.3_
  
  - [ ] 23.2 Ensure bidirectional status transitions work
    - Test moving souls backward in pipeline (e.g., Interested → Following Up)
    - Test moving from Converted to any previous status
    - Test moving from Not Interested back to active statuses
    - Verify no restrictions on transitions
    - _Requirements: 25.1-25.7_
  
  - [ ] 23.3 Verify LEFT JOIN for ad-hoc souls
    - Review all soul queries to ensure LEFT JOIN with outreach_programs
    - Test that ad-hoc souls (outreach_id = null) appear in results
    - Test follow-up queries include ad-hoc souls
    - _Requirements: 5.5, 29.7, 30.1, 30.2_
  
  - [ ] 23.4 Add database indexes for performance
    - Verify indexes on soul_id, member_id in follow_ups table
    - Verify indexes on assigned_member_id, status in souls table
    - Verify indexes on branch_id, program_date in outreach_programs table
    - _Requirements: 30.3, 30.4, 57.4_
  
  - [ ] 23.5 Implement query result limits and pagination
    - Ensure default limit of 1000 records for large queries
    - Implement pagination for all list endpoints
    - _Requirements: 30.5_

- [ ] 24. Performance optimization
  - [ ] 24.1 Optimize Kanban board loading
    - Fetch only necessary fields for card display
    - Implement caching in Zustand store
    - Test loading time with 100+ souls
    - _Requirements: 57.1, 57.3, 57.5_
  
  - [ ] 24.2 Implement optimistic UI updates
    - Update Kanban board immediately on drag-and-drop
    - Revert on API error
    - _Requirements: 57.6_
  
  - [ ] 24.3 Add virtual scrolling for large lists
    - Implement virtual scrolling if more than 100 souls
    - Test performance with large datasets
    - _Requirements: 57.2_

- [ ] 25. Data validation and security
  - [ ] 25.1 Verify SQL injection prevention
    - Review all queries for parameterization
    - Test with malicious input strings
    - Ensure Drizzle ORM handles escaping
    - _Requirements: 15.6, 19.1_
  
  - [ ] 25.2 Verify XSS prevention in description fields
    - Sanitize program description and notes
    - Sanitize soul notes and follow-up notes
    - Test with script tags in input
    - _Requirements: 55.5_
  
  - [ ] 25.3 Verify authorization on all endpoints
    - Test each endpoint with different roles
    - Verify 403 errors for unauthorized access
    - Test branch isolation enforcement
    - _Requirements: 12.7, 12.8, 15.4_


- [ ] 26. Integration testing
  - [ ]*  26.1 Write end-to-end test for program creation flow
    - Test creating program as Pastor
    - Test registering as worker
    - Test capturing souls for program
    - Verify branch isolation
    - _Requirements: 1.1-1.8, 2.1-2.5, 3.1-3.9_
  
  - [ ]*  26.2 Write end-to-end test for soul follow-up flow
    - Test capturing soul
    - Test logging multiple follow-ups
    - Test updating status through pipeline
    - Test converting to member
    - _Requirements: 3.1-3.9, 5.1-5.8, 4.1-4.7, 10.1-10.8_
  
  - [ ]*  26.3 Write end-to-end test for Kanban board workflow
    - Test loading souls in Kanban view
    - Test drag-and-drop status updates
    - Test overdue indicators
    - Test filtering by assignment
    - _Requirements: 7.1-7.8, 27.1-27.7_
  
  - [ ]*  26.4 Write end-to-end test for conversion funnel report
    - Test generating report with filters
    - Test branch filtering
    - Test date range filtering
    - Verify calculations are correct
    - _Requirements: 11.1-11.8_

- [ ] 27. Documentation and cleanup
  - [ ] 27.1 Add API documentation comments
    - Document all service functions with JSDoc
    - Document all router endpoints with descriptions
    - Document expected request/response formats
    - _Requirements: 48.7_
  
  - [ ] 27.2 Update README with outreach module info
    - Add outreach module to feature list
    - Document new API endpoints
    - Document new frontend routes
    - _Requirements: 23.7_
  
  - [ ] 27.3 Verify localhost deployment works
    - Test docker compose up -d starts PostgreSQL
    - Test npx turbo dev starts API and frontend
    - Test migrations run automatically
    - Test all functionality without cloud dependencies
    - _Requirements: 23.1-23.8_

- [ ] 28. Final checkpoint - Complete testing and validation
  - Run all unit tests and property tests
  - Run all integration tests
  - Test with different user roles (Admin, Pastor, Member)
  - Test branch isolation thoroughly
  - Test conversion transaction atomicity
  - Verify all 60 requirements are covered
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Follow TDD workflow: write failing test → implement → refactor
- Property tests use fast-check with minimum 100 iterations
- All queries must use LEFT JOIN for outreach_programs to include ad-hoc souls
- Status dropdown must show all six status values
- Bidirectional status transitions must be allowed without restrictions
- Conversion must be atomic using database transactions
- Branch isolation must be enforced at service layer for all data access
