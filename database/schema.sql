-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- Generated from ADMINISTRATION.md specification
-- ============================================================================

-- ============================================================================
-- SECTION 1: UTILITY FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REGIONS
-- Purpose: Store geographical regions where branches are located
-- ----------------------------------------------------------------------------
CREATE TABLE regions (
    region_id SERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes (Primary key index is automatic, unique index on region_name is automatic)
COMMENT ON TABLE regions IS 'Store geographical regions where branches are located';

-- ----------------------------------------------------------------------------
-- 2. BRANCHES
-- Purpose: Store church branch information across different regions
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(150) NOT NULL,
    region_id INTEGER NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    established_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_branches_region
        FOREIGN KEY (region_id)
        REFERENCES regions(region_id)
        ON DELETE RESTRICT,
    
    -- Unique Constraints
    CONSTRAINT uq_branches_name_region UNIQUE (branch_name, region_id),
    CONSTRAINT uq_branches_email UNIQUE (email),
    CONSTRAINT uq_branches_phone UNIQUE (phone)
);

-- Trigger for updated_at
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_branches_region_id ON branches(region_id);

COMMENT ON TABLE branches IS 'Store church branch information across different regions';

-- ----------------------------------------------------------------------------
-- 3. MEMBERS
-- Purpose: Store church member information
-- ----------------------------------------------------------------------------
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    email VARCHAR(100) UNIQUE,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_members_home_branch
        FOREIGN KEY (home_branch_id)
        REFERENCES branches(branch_id)
        ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_members_gender CHECK (gender IN ('Male', 'Female')),
    CONSTRAINT chk_members_membership_date CHECK (membership_date <= CURRENT_DATE)
);

-- Trigger for updated_at
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_members_home_branch_id ON members(home_branch_id);
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE INDEX idx_members_name ON members(last_name, first_name);

-- Partial unique index on phone where active
CREATE UNIQUE INDEX idx_members_phone_active 
    ON members(phone) 
    WHERE phone IS NOT NULL AND is_active = TRUE;

COMMENT ON TABLE members IS 'Store church member information';

-- ----------------------------------------------------------------------------
-- 4. BRANCH_LEADERSHIP
-- Purpose: Store pastor and elder assignments for each branch
-- ----------------------------------------------------------------------------
CREATE TABLE branch_leadership (
    leadership_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_branch_leadership_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_branch_leadership_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_branch_leadership_role CHECK (role IN ('Main Pastor', 'Elder')),
    CONSTRAINT chk_branch_leadership_dates CHECK (end_date IS NULL OR end_date >= start_date),
    
    -- Unique Constraints
    CONSTRAINT uq_branch_leadership_assignment UNIQUE (branch_id, member_id, role, start_date)
);

-- Trigger for updated_at
CREATE TRIGGER branch_leadership_updated_at
    BEFORE UPDATE ON branch_leadership
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_branch_leadership_branch_id ON branch_leadership(branch_id);
CREATE INDEX idx_branch_leadership_member_id ON branch_leadership(member_id);
CREATE INDEX idx_branch_leadership_is_current ON branch_leadership(is_current);

-- Partial unique index: only one current Main Pastor per branch
CREATE UNIQUE INDEX idx_branch_leadership_current_pastor 
    ON branch_leadership(branch_id) 
    WHERE role = 'Main Pastor' AND is_current = TRUE;

-- Partial unique index: only one current role per member per branch
CREATE UNIQUE INDEX idx_branch_leadership_current_member_role 
    ON branch_leadership(branch_id, member_id, role) 
    WHERE is_current = TRUE;

COMMENT ON TABLE branch_leadership IS 'Store pastor and elder assignments for each branch';

-- ----------------------------------------------------------------------------
-- 5. ROLES
-- Purpose: Store church role definitions (e.g., Choir Member, Usher, Teacher)
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_roles_is_active ON roles(is_active);

COMMENT ON TABLE roles IS 'Store church role definitions (e.g., Choir Member, Usher, Teacher)';

-- ----------------------------------------------------------------------------
-- 6. MEMBER_ROLES
-- Purpose: Store member role assignments (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE member_roles (
    member_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (member_id, role_id, branch_id),
    
    -- Foreign Keys
    CONSTRAINT fk_member_roles_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_member_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_member_roles_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_member_roles_dates CHECK (end_date IS NULL OR end_date >= assigned_date)
);

-- Trigger for updated_at
CREATE TRIGGER member_roles_updated_at
    BEFORE UPDATE ON member_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_member_roles_member_id ON member_roles(member_id);
CREATE INDEX idx_member_roles_role_id ON member_roles(role_id);
CREATE INDEX idx_member_roles_branch_id ON member_roles(branch_id);
CREATE INDEX idx_member_roles_is_active ON member_roles(is_active);

COMMENT ON TABLE member_roles IS 'Store member role assignments (many-to-many relationship)';

-- ----------------------------------------------------------------------------
-- 7. FELLOWSHIPS
-- Purpose: Store fellowship group information
-- ----------------------------------------------------------------------------
CREATE TABLE fellowships (
    fellowship_id SERIAL PRIMARY KEY,
    fellowship_name VARCHAR(150) NOT NULL,
    branch_id INTEGER NOT NULL,
    description TEXT,
    leader_id INTEGER,
    co_leader_id INTEGER,
    meeting_schedule VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_fellowships_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fellowships_leader
        FOREIGN KEY (leader_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_fellowships_co_leader
        FOREIGN KEY (co_leader_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_fellowships_leaders_different CHECK (leader_id IS NULL OR co_leader_id IS NULL OR leader_id != co_leader_id),
    
    -- Unique Constraints
    CONSTRAINT uq_fellowships_name_branch UNIQUE (fellowship_name, branch_id)
);

-- Trigger for updated_at
CREATE TRIGGER fellowships_updated_at
    BEFORE UPDATE ON fellowships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_fellowships_branch_id ON fellowships(branch_id);
CREATE INDEX idx_fellowships_leader_id ON fellowships(leader_id);
CREATE INDEX idx_fellowships_is_active ON fellowships(is_active);

COMMENT ON TABLE fellowships IS 'Store fellowship group information';

-- ----------------------------------------------------------------------------
-- 8. FELLOWSHIP_MEMBERS
-- Purpose: Store member assignments to fellowships (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE fellowship_members (
    fellowship_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (fellowship_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_fellowship_members_fellowship
        FOREIGN KEY (fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fellowship_members_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_fellowship_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date)
);

-- Trigger for updated_at
CREATE TRIGGER fellowship_members_updated_at
    BEFORE UPDATE ON fellowship_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_fellowship_members_fellowship_id ON fellowship_members(fellowship_id);
CREATE INDEX idx_fellowship_members_member_id ON fellowship_members(member_id);
CREATE INDEX idx_fellowship_members_is_active ON fellowship_members(is_active);

COMMENT ON TABLE fellowship_members IS 'Store member assignments to fellowships (many-to-many relationship)';

-- ----------------------------------------------------------------------------
-- 9. FELLOWSHIP_MEETINGS
-- Purpose: Store fellowship meeting information
-- ----------------------------------------------------------------------------
CREATE TABLE fellowship_meetings (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_fellowship_meetings_fellowship
        FOREIGN KEY (fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fellowship_meetings_created_by
        FOREIGN KEY (created_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_fellowship_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    
    -- Unique Constraints
    CONSTRAINT uq_fellowship_meetings_date UNIQUE (fellowship_id, meeting_date)
);

-- Trigger for updated_at
CREATE TRIGGER fellowship_meetings_updated_at
    BEFORE UPDATE ON fellowship_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_fellowship_meetings_fellowship_id ON fellowship_meetings(fellowship_id);
CREATE INDEX idx_fellowship_meetings_meeting_date ON fellowship_meetings(meeting_date);

COMMENT ON TABLE fellowship_meetings IS 'Store fellowship meeting information';

-- ----------------------------------------------------------------------------
-- 10. FELLOWSHIP_MEETING_ATTENDANCE
-- Purpose: Store attendance records for fellowship meetings
-- ----------------------------------------------------------------------------
CREATE TABLE fellowship_meeting_attendance (
    meeting_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'Present',
    arrival_time TIMESTAMP,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    
    -- Primary Key
    PRIMARY KEY (meeting_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_fellowship_meeting_attendance_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES fellowship_meetings(meeting_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fellowship_meeting_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_fellowship_meeting_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_fellowship_meeting_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late'))
);

-- Indexes
CREATE INDEX idx_fellowship_meeting_attendance_meeting_id ON fellowship_meeting_attendance(meeting_id);
CREATE INDEX idx_fellowship_meeting_attendance_member_id ON fellowship_meeting_attendance(member_id);
CREATE INDEX idx_fellowship_meeting_attendance_status ON fellowship_meeting_attendance(attendance_status);

COMMENT ON TABLE fellowship_meeting_attendance IS 'Store attendance records for fellowship meetings';

-- ----------------------------------------------------------------------------
-- 11. DEPARTMENTS
-- Purpose: Store department definitions (common across all branches)
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE departments IS 'Store department definitions (common across all branches)';

-- ----------------------------------------------------------------------------
-- 12. OUTREACH_PROGRAMS
-- Purpose: Store outreach program information and activities
-- ----------------------------------------------------------------------------
CREATE TABLE outreach_programs (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_outreach_programs_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_outreach_programs_coordinator
        FOREIGN KEY (coordinator_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_outreach_programs_souls CHECK (total_souls_reached >= 0),
    
    -- Unique Constraints
    CONSTRAINT uq_outreach_programs_unique UNIQUE (branch_id, program_name, program_date, location)
);

-- Trigger for updated_at
CREATE TRIGGER outreach_programs_updated_at
    BEFORE UPDATE ON outreach_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_outreach_programs_branch_id ON outreach_programs(branch_id);
CREATE INDEX idx_outreach_programs_coordinator_id ON outreach_programs(coordinator_id);
CREATE INDEX idx_outreach_programs_program_date ON outreach_programs(program_date);
CREATE INDEX idx_outreach_programs_is_completed ON outreach_programs(is_completed);

COMMENT ON TABLE outreach_programs IS 'Store outreach program information and activities';

-- ----------------------------------------------------------------------------
-- 13. SOULS
-- Purpose: Store information about new individuals reached through outreach
-- ----------------------------------------------------------------------------
CREATE TABLE souls (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_souls_outreach
        FOREIGN KEY (outreach_id)
        REFERENCES outreach_programs(outreach_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_souls_assigned_member
        FOREIGN KEY (assigned_member_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_souls_converted_to_member
        FOREIGN KEY (converted_to_member_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_souls_gender CHECK (gender IS NULL OR gender IN ('Male', 'Female')),
    CONSTRAINT chk_souls_status 
        CHECK (status IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'))
);

-- Trigger for updated_at
CREATE TRIGGER souls_updated_at
    BEFORE UPDATE ON souls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_souls_outreach_id ON souls(outreach_id);
CREATE INDEX idx_souls_assigned_member_id ON souls(assigned_member_id);
CREATE INDEX idx_souls_converted_to_member_id ON souls(converted_to_member_id);
CREATE INDEX idx_souls_status ON souls(status);
CREATE INDEX idx_souls_phone ON souls(phone);
CREATE INDEX idx_souls_email ON souls(email);

-- Partial unique indexes for phone and email within same outreach
CREATE UNIQUE INDEX idx_souls_phone_outreach 
    ON souls(phone, outreach_id) 
    WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_souls_email_outreach 
    ON souls(email, outreach_id) 
    WHERE email IS NOT NULL;

COMMENT ON TABLE souls IS 'Store information about new individuals reached through outreach';

-- ----------------------------------------------------------------------------
-- 14. FOLLOW_UPS
-- Purpose: Store follow-up activities for souls
-- ----------------------------------------------------------------------------
CREATE TABLE follow_ups (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_follow_ups_soul
        FOREIGN KEY (soul_id)
        REFERENCES souls(soul_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_follow_ups_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_follow_ups_contact_method 
        CHECK (contact_method IS NULL OR contact_method IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')),
    CONSTRAINT chk_follow_ups_contact_status 
        CHECK (contact_status IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')),
    CONSTRAINT chk_follow_ups_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Trigger for updated_at
CREATE TRIGGER follow_ups_updated_at
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_follow_ups_soul_id ON follow_ups(soul_id);
CREATE INDEX idx_follow_ups_member_id ON follow_ups(member_id);
CREATE INDEX idx_follow_ups_follow_up_date ON follow_ups(follow_up_date);
CREATE INDEX idx_follow_ups_contact_status ON follow_ups(contact_status);
CREATE INDEX idx_follow_ups_next_follow_up_date ON follow_ups(next_follow_up_date);

COMMENT ON TABLE follow_ups IS 'Store follow-up activities for souls';

-- ----------------------------------------------------------------------------
-- 15. OUTREACH_PARTICIPANTS
-- Purpose: Store member participation in outreach programs
-- ----------------------------------------------------------------------------
CREATE TABLE outreach_participants (
    outreach_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    role VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (outreach_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_outreach_participants_outreach
        FOREIGN KEY (outreach_id)
        REFERENCES outreach_programs(outreach_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_outreach_participants_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_outreach_participants_outreach_id ON outreach_participants(outreach_id);
CREATE INDEX idx_outreach_participants_member_id ON outreach_participants(member_id);

COMMENT ON TABLE outreach_participants IS 'Store member participation in outreach programs';

-- ----------------------------------------------------------------------------
-- 16. BRANCH_DEPARTMENTS
-- Purpose: Link departments to specific branches with leadership assignments
-- ----------------------------------------------------------------------------
CREATE TABLE branch_departments (
    branch_department_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    lead_member_id INTEGER NOT NULL,
    deputy_member_id INTEGER,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_branch_departments_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_branch_departments_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_branch_departments_lead
        FOREIGN KEY (lead_member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_branch_departments_deputy
        FOREIGN KEY (deputy_member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    
    -- Check Constraints
    CONSTRAINT chk_branch_departments_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_branch_departments_leaders_different 
        CHECK (deputy_member_id IS NULL OR lead_member_id != deputy_member_id)
);

-- Trigger for updated_at
CREATE TRIGGER branch_departments_updated_at
    BEFORE UPDATE ON branch_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Partial unique index: one active department instance per branch
CREATE UNIQUE INDEX idx_branch_departments_active 
    ON branch_departments(branch_id, department_id) 
    WHERE is_active = TRUE;

-- Indexes
CREATE INDEX idx_branch_departments_branch_id ON branch_departments(branch_id);
CREATE INDEX idx_branch_departments_department_id ON branch_departments(department_id);
CREATE INDEX idx_branch_departments_lead_member_id ON branch_departments(lead_member_id);
CREATE INDEX idx_branch_departments_is_active ON branch_departments(is_active);

COMMENT ON TABLE branch_departments IS 'Link departments to specific branches with leadership assignments';

-- ----------------------------------------------------------------------------
-- 17. DEPARTMENT_MEMBERS
-- Purpose: Store member assignments to departments (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE department_members (
    branch_department_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (branch_department_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_department_members_branch_department
        FOREIGN KEY (branch_department_id)
        REFERENCES branch_departments(branch_department_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_department_members_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_department_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date)
);

-- Trigger for updated_at
CREATE TRIGGER department_members_updated_at
    BEFORE UPDATE ON department_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_department_members_branch_department_id ON department_members(branch_department_id);
CREATE INDEX idx_department_members_member_id ON department_members(member_id);
CREATE INDEX idx_department_members_is_active ON department_members(is_active);

COMMENT ON TABLE department_members IS 'Store member assignments to departments (many-to-many relationship)';

-- ----------------------------------------------------------------------------
-- 18. DEPARTMENT_MEETINGS
-- Purpose: Store department meeting information
-- ----------------------------------------------------------------------------
CREATE TABLE department_meetings (
    meeting_id SERIAL PRIMARY KEY,
    branch_department_id INTEGER NOT NULL,
    meeting_date TIMESTAMP NOT NULL,
    meeting_title VARCHAR(200),
    meeting_notes TEXT,
    location VARCHAR(200),
    duration_minutes INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_department_meetings_branch_department
        FOREIGN KEY (branch_department_id)
        REFERENCES branch_departments(branch_department_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_department_meetings_created_by
        FOREIGN KEY (created_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_department_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    
    -- Unique Constraints
    CONSTRAINT uq_department_meetings_date UNIQUE (branch_department_id, meeting_date)
);

-- Trigger for updated_at
CREATE TRIGGER department_meetings_updated_at
    BEFORE UPDATE ON department_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_department_meetings_branch_department_id ON department_meetings(branch_department_id);
CREATE INDEX idx_department_meetings_meeting_date ON department_meetings(meeting_date);

COMMENT ON TABLE department_meetings IS 'Store department meeting information';

-- ----------------------------------------------------------------------------
-- 19. MEETING_ATTENDANCE
-- Purpose: Store attendance records for department meetings
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_attendance (
    meeting_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL,
    arrival_time TIMESTAMP,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    
    -- Primary Key
    PRIMARY KEY (meeting_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_meeting_attendance_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES department_meetings(meeting_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_meeting_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_meeting_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_meeting_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late'))
);

-- Indexes
CREATE INDEX idx_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_member_id ON meeting_attendance(member_id);
CREATE INDEX idx_meeting_attendance_status ON meeting_attendance(attendance_status);

COMMENT ON TABLE meeting_attendance IS 'Store attendance records for department meetings';

-- ----------------------------------------------------------------------------
-- 20. SERVICES
-- Purpose: Store weekly service information for each branch
-- ----------------------------------------------------------------------------
CREATE TABLE services (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_services_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_services_preacher
        FOREIGN KEY (preacher_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_services_type 
        CHECK (service_type IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')),
    CONSTRAINT chk_services_expected_attendance CHECK (expected_attendance IS NULL OR expected_attendance >= 0),
    
    -- Unique Constraints
    CONSTRAINT uq_services_unique UNIQUE (branch_id, service_date, service_type)
);

-- Trigger for updated_at
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_services_branch_id ON services(branch_id);
CREATE INDEX idx_services_service_date ON services(service_date);
CREATE INDEX idx_services_service_type ON services(service_type);

COMMENT ON TABLE services IS 'Store weekly service information for each branch';

-- ----------------------------------------------------------------------------
-- 21. SERVICE_ATTENDANCE
-- Purpose: Store attendance records for services
-- ----------------------------------------------------------------------------
CREATE TABLE service_attendance (
    service_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    attendance_status VARCHAR(20) NOT NULL,
    arrival_time TIMESTAMP,
    is_first_time_visitor BOOLEAN DEFAULT FALSE,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    
    -- Primary Key
    PRIMARY KEY (service_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_service_attendance_service
        FOREIGN KEY (service_id)
        REFERENCES services(service_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_service_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_service_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_service_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Virtual'))
);

-- Indexes
CREATE INDEX idx_service_attendance_service_id ON service_attendance(service_id);
CREATE INDEX idx_service_attendance_member_id ON service_attendance(member_id);
CREATE INDEX idx_service_attendance_status ON service_attendance(attendance_status);

COMMENT ON TABLE service_attendance IS 'Store attendance records for services';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
