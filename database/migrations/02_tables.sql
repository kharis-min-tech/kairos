-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 02_tables.sql
-- Purpose: Core table definitions (structure only, no constraints)
-- ============================================================================
-- Execution Order: 2 (After functions)
-- Dependencies: 01_functions.sql
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================
-- Schema Layout:
--   dev.languages, dev.regions, dev.branches, dev.members, dev.branch_leadership
--   dev.roles, dev.member_roles, dev.fellowships, dev.fellowship_members,
--   dev.fellowship_meetings, dev.fellowship_meeting_attendance, dev.departments,
--   dev.branch_departments, dev.department_members, dev.department_meetings,
--   dev.meeting_attendance, dev.services, dev.service_attendance
--   dev.outreach_programs, dev.outreach_participants, dev.souls, dev.follow_ups
--   dev.donations
--   dev.notifications, dev.notification_recipients, dev.events, dev.event_organizers,
--   dev.event_notes, dev.event_registrations
-- ============================================================================

-- ############################################################################
-- CORE SCHEMA TABLES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 1. dev.LANGUAGES
-- Purpose: Store languages used in church services and communications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.languages (
    language_id SERIAL PRIMARY KEY,
    language_name VARCHAR(50) NOT NULL UNIQUE,
    language_code VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. dev.REGIONS
-- Purpose: Store geographical regions where branches are located
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.regions (
    region_id SERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. dev.BRANCHES
-- Purpose: Store church branch information across different regions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(150) NOT NULL,
    region_id INTEGER NOT NULL,
    language_id INTEGER,
    branch_type VARCHAR(50) NOT NULL DEFAULT 'Main',
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    established_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. dev.MEMBERS
-- Purpose: Store church member information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.members (
    member_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    home_branch_id INTEGER NOT NULL,
    membership_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    photo_url VARCHAR(255),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. dev.BRANCH_LEADERSHIP
-- Purpose: Store pastor and elder assignments for each branch
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.branch_leadership (
    leadership_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ############################################################################
-- MINISTRY SCHEMA TABLES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 6. dev.ROLES
-- Purpose: Store church role definitions (e.g., Choir Member, Usher, Teacher)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. dev.MEMBER_ROLES
-- Purpose: Store member role assignments (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.member_roles (
    member_role_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. dev.FELLOWSHIPS
-- Purpose: Store fellowship group information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.fellowships (
    fellowship_id SERIAL PRIMARY KEY,
    fellowship_name VARCHAR(150) NOT NULL,
    branch_id INTEGER NOT NULL,
    description TEXT,
    leader_id INTEGER,
    co_leader_id INTEGER,
    meeting_schedule VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. dev.FELLOWSHIP_MEMBERS
-- Purpose: Store member assignments to fellowships (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.fellowship_members (
    fellowship_member_id SERIAL PRIMARY KEY,
    fellowship_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. dev.FELLOWSHIP_MEETINGS
-- Purpose: Store fellowship meeting information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.fellowship_meetings (
    meeting_id SERIAL PRIMARY KEY,
    fellowship_id INTEGER NOT NULL,
    meeting_date TIMESTAMP NOT NULL,
    meeting_title VARCHAR(200),
    meeting_topic VARCHAR(200),
    meeting_notes TEXT,
    location VARCHAR(200),
    duration_minutes INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 11. dev.FELLOWSHIP_MEETING_ATTENDANCE
-- Purpose: Store attendance records for fellowship meetings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.fellowship_meeting_attendance (
    meeting_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'Present',
    arrival_time TIMESTAMP,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    PRIMARY KEY (meeting_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 12. dev.DEPARTMENTS
-- Purpose: Store department definitions (common across all branches)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 13. dev.BRANCH_DEPARTMENTS
-- Purpose: Link departments to specific branches with leadership assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.branch_departments (
    branch_department_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    lead_member_id INTEGER NOT NULL,
    deputy_member_id INTEGER,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 14. dev.DEPARTMENT_MEMBERS
-- Purpose: Store member assignments to departments (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.department_members (
    department_member_id SERIAL PRIMARY KEY,
    branch_department_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 15. dev.DEPARTMENT_MEETINGS
-- Purpose: Store department meeting information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.department_meetings (
    meeting_id SERIAL PRIMARY KEY,
    branch_department_id INTEGER NOT NULL,
    meeting_date TIMESTAMP NOT NULL,
    meeting_title VARCHAR(200),
    meeting_notes TEXT,
    location VARCHAR(200),
    duration_minutes INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 16. dev.MEETING_ATTENDANCE
-- Purpose: Store attendance records for department meetings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.meeting_attendance (
    meeting_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL,
    arrival_time TIMESTAMP,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    PRIMARY KEY (meeting_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 17. dev.SERVICES
-- Purpose: Store weekly service information for each branch
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.services (
    service_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    service_date TIMESTAMP NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_title VARCHAR(200),
    preacher_id INTEGER,
    topic VARCHAR(200),
    notes TEXT,
    expected_attendance INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 18. dev.SERVICE_ATTENDANCE
-- Purpose: Store attendance records for services
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.service_attendance (
    service_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL,
    arrival_time TIMESTAMP,
    is_first_time_visitor BOOLEAN DEFAULT FALSE,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    PRIMARY KEY (service_id, member_id)
);

-- ############################################################################
-- OUTREACH SCHEMA TABLES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 19. dev.OUTREACH_PROGRAMS
-- Purpose: Store outreach program information and activities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.outreach_programs (
    outreach_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    program_name VARCHAR(200) NOT NULL,
    program_date DATE NOT NULL,
    location VARCHAR(300) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    description TEXT,
    coordinator_id INTEGER,
    total_souls_reached INTEGER DEFAULT 0,
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 20. dev.OUTREACH_PARTICIPANTS
-- Purpose: Store member participation in outreach programs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.outreach_participants (
    outreach_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    role VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (outreach_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 21. dev.SOULS
-- Purpose: Store information about new individuals reached through outreach
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.souls (
    soul_id SERIAL PRIMARY KEY,
    outreach_id INTEGER NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    gender VARCHAR(10),
    age_range VARCHAR(20),
    assigned_member_id INTEGER,
    converted_to_member_id INTEGER,
    status VARCHAR(30) DEFAULT 'New',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 22. dev.FOLLOW_UPS
-- Purpose: Store follow-up activities for souls
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.follow_ups (
    follow_up_id SERIAL PRIMARY KEY,
    soul_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    follow_up_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contact_method VARCHAR(30),
    contact_status VARCHAR(30) NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    next_follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ############################################################################
-- FINANCE SCHEMA TABLES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 23. dev.DONATIONS
-- Purpose: Store member donation/giving records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.donations (
    donation_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    donation_purpose VARCHAR(30) NOT NULL,
    description TEXT,
    payment_method VARCHAR(30),
    reference_number VARCHAR(100),
    is_anonymous BOOLEAN DEFAULT FALSE,
    notes TEXT,
    recorded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ############################################################################
-- COMMS SCHEMA TABLES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 24. dev.NOTIFICATIONS
-- Purpose: Store notifications and announcements broadcast to members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.notifications (
    notification_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal',
    target_scope VARCHAR(30) NOT NULL,
    target_branch_id INTEGER,
    target_region_id INTEGER,
    target_department_id INTEGER,
    target_fellowship_id INTEGER,
    target_role_id INTEGER,
    target_leadership_role VARCHAR(50),
    sent_by INTEGER NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 25. dev.NOTIFICATION_RECIPIENTS
-- Purpose: Track which members received and read notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.notification_recipients (
    notification_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 26. dev.EVENTS
-- Purpose: Store church-wide and branch events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.events (
    event_id SERIAL PRIMARY KEY,
    event_title VARCHAR(200) NOT NULL,
    event_theme VARCHAR(300),
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue VARCHAR(300),
    address TEXT,
    city VARCHAR(100),
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_link VARCHAR(500),
    branch_id INTEGER,
    region_id INTEGER,
    requires_registration BOOLEAN DEFAULT FALSE,
    registration_deadline DATE,
    max_attendees INTEGER,
    coordinator_id INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 27. dev.EVENT_ORGANIZERS
-- Purpose: Store organizing team members for events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.event_organizers (
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    organizer_role VARCHAR(100),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, member_id)
);

-- ----------------------------------------------------------------------------
-- 28. dev.EVENT_NOTES
-- Purpose: Store messages and notes logged by event organizers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.event_notes (
    note_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    note_title VARCHAR(200),
    note_content TEXT NOT NULL,
    note_type VARCHAR(30) DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 29. dev.EVENT_REGISTRATIONS
-- Purpose: Store member registrations for events requiring sign-up
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dev.event_registrations (
    registration_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registration_status VARCHAR(30) NOT NULL DEFAULT 'Registered',
    guest_count INTEGER DEFAULT 0,
    notes TEXT,
    attended BOOLEAN,
    check_in_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- END OF TABLES
-- ============================================================================
