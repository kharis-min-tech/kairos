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
    branch_type VARCHAR(50) NOT NULL DEFAULT 'Main',
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

    -- Check Constraints
    CONSTRAINT chk_branches_type CHECK (branch_type IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online')),

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
    member_role_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
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
    CONSTRAINT chk_member_roles_dates CHECK (end_date IS NULL OR end_date >= assigned_date),
    
    -- Unique Constraints (prevent duplicate active assignments)
    CONSTRAINT uq_member_roles_assignment UNIQUE (member_id, role_id, branch_id, assigned_date)
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
    fellowship_member_id SERIAL PRIMARY KEY,
    fellowship_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
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
    CONSTRAINT chk_fellowship_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date),
    
    -- Unique Constraints (prevent duplicate active assignments)
    CONSTRAINT uq_fellowship_members_assignment UNIQUE (fellowship_id, member_id, join_date)
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
    department_member_id SERIAL PRIMARY KEY,
    branch_department_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
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
    CONSTRAINT chk_department_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date),
    
    -- Unique Constraints (prevent duplicate active assignments)
    CONSTRAINT uq_department_members_assignment UNIQUE (branch_department_id, member_id, join_date)
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

-- ----------------------------------------------------------------------------
-- 22. DONATIONS
-- Purpose: Store member donation/giving records
-- ----------------------------------------------------------------------------
CREATE TABLE donations (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_donations_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_donations_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_donations_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_donations_amount CHECK (amount > 0),
    CONSTRAINT chk_donations_purpose CHECK (donation_purpose IN ('Offering', 'Building Fund', 'Other')),
    CONSTRAINT chk_donations_payment_method CHECK (payment_method IS NULL OR payment_method IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')),
    CONSTRAINT chk_donations_description CHECK (
        (donation_purpose != 'Other') OR 
        (donation_purpose = 'Other' AND description IS NOT NULL AND description != '')
    )
);

-- Trigger for updated_at
CREATE TRIGGER donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_donations_member_id ON donations(member_id);
CREATE INDEX idx_donations_branch_id ON donations(branch_id);
CREATE INDEX idx_donations_donation_date ON donations(donation_date);
CREATE INDEX idx_donations_purpose ON donations(donation_purpose);

COMMENT ON TABLE donations IS 'Store member donation/giving records with purpose tracking';

-- ----------------------------------------------------------------------------
-- 23. NOTIFICATIONS
-- Purpose: Store notifications and announcements broadcast to members
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal',
    
    -- Target audience (nullable - determines scope)
    target_scope VARCHAR(30) NOT NULL,
    target_branch_id INTEGER,
    target_region_id INTEGER,
    target_department_id INTEGER,
    target_fellowship_id INTEGER,
    target_role_id INTEGER,
    target_leadership_role VARCHAR(50),
    
    -- Sender info
    sent_by INTEGER NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Scheduling
    scheduled_for TIMESTAMP,
    expires_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_notifications_sent_by
        FOREIGN KEY (sent_by)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_notifications_branch
        FOREIGN KEY (target_branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_region
        FOREIGN KEY (target_region_id)
        REFERENCES regions(region_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_department
        FOREIGN KEY (target_department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_fellowship
        FOREIGN KEY (target_fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_role
        FOREIGN KEY (target_role_id)
        REFERENCES roles(role_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_notifications_type CHECK (notification_type IN ('Announcement', 'Reminder', 'Alert', 'Event', 'General')),
    CONSTRAINT chk_notifications_priority CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    CONSTRAINT chk_notifications_scope CHECK (target_scope IN ('All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership')),
    CONSTRAINT chk_notifications_leadership_role CHECK (target_leadership_role IS NULL OR target_leadership_role IN ('Main Pastor', 'Elder')),
    CONSTRAINT chk_notifications_target_consistency CHECK (
        (target_scope = 'All' AND target_branch_id IS NULL AND target_region_id IS NULL AND target_department_id IS NULL AND target_fellowship_id IS NULL AND target_role_id IS NULL AND target_leadership_role IS NULL) OR
        (target_scope = 'Branch' AND target_branch_id IS NOT NULL) OR
        (target_scope = 'Region' AND target_region_id IS NOT NULL) OR
        (target_scope = 'Department' AND target_department_id IS NOT NULL) OR
        (target_scope = 'Fellowship' AND target_fellowship_id IS NOT NULL) OR
        (target_scope = 'Role' AND target_role_id IS NOT NULL) OR
        (target_scope = 'Leadership' AND target_leadership_role IS NOT NULL)
    )
);

-- Trigger for updated_at
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_notifications_sent_by ON notifications(sent_by);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_target_scope ON notifications(target_scope);
CREATE INDEX idx_notifications_target_branch_id ON notifications(target_branch_id);
CREATE INDEX idx_notifications_target_region_id ON notifications(target_region_id);
CREATE INDEX idx_notifications_target_department_id ON notifications(target_department_id);
CREATE INDEX idx_notifications_target_fellowship_id ON notifications(target_fellowship_id);
CREATE INDEX idx_notifications_target_role_id ON notifications(target_role_id);
CREATE INDEX idx_notifications_target_leadership_role ON notifications(target_leadership_role);
CREATE INDEX idx_notifications_is_active ON notifications(is_active);

COMMENT ON TABLE notifications IS 'Store notifications and announcements broadcast to members with targeting options';

-- ----------------------------------------------------------------------------
-- 24. NOTIFICATION_RECIPIENTS
-- Purpose: Track which members received and read notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notification_recipients (
    notification_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (notification_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_notification_recipients_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications(notification_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_recipients_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_member_id ON notification_recipients(member_id);
CREATE INDEX idx_notification_recipients_is_read ON notification_recipients(is_read);

COMMENT ON TABLE notification_recipients IS 'Track notification delivery and read status per member';

-- ----------------------------------------------------------------------------
-- 25. EVENTS
-- Purpose: Store church-wide and branch events
-- ----------------------------------------------------------------------------
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_title VARCHAR(200) NOT NULL,
    event_theme VARCHAR(300),
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    
    -- Scheduling
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    
    -- Location
    venue VARCHAR(300),
    address TEXT,
    city VARCHAR(100),
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_link VARCHAR(500),
    
    -- Scope (NULL = church-wide, otherwise branch-specific)
    branch_id INTEGER,
    region_id INTEGER,
    
    -- Registration settings
    requires_registration BOOLEAN DEFAULT FALSE,
    registration_deadline DATE,
    max_attendees INTEGER,
    
    -- Organizer info
    coordinator_id INTEGER,
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_events_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_events_region
        FOREIGN KEY (region_id)
        REFERENCES regions(region_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_events_coordinator
        FOREIGN KEY (coordinator_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT chk_events_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_events_times CHECK (
        start_date != end_date OR 
        end_time IS NULL OR 
        start_time IS NULL OR 
        end_time >= start_time
    ),
    CONSTRAINT chk_events_type CHECK (event_type IN ('Conference', 'Retreat', 'Seminar', 'Workshop', 'Concert', 'Outreach', 'Celebration', 'Meeting', 'Other')),
    CONSTRAINT chk_events_status CHECK (status IN ('Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled', 'Postponed')),
    CONSTRAINT chk_events_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_date),
    CONSTRAINT chk_events_max_attendees CHECK (max_attendees IS NULL OR max_attendees > 0),
    CONSTRAINT chk_events_scope CHECK (
        (branch_id IS NULL AND region_id IS NULL) OR  -- Church-wide
        (branch_id IS NOT NULL AND region_id IS NULL) OR  -- Branch-specific
        (branch_id IS NULL AND region_id IS NOT NULL)  -- Region-specific
    )
);

-- Trigger for updated_at
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_events_branch_id ON events(branch_id);
CREATE INDEX idx_events_region_id ON events(region_id);
CREATE INDEX idx_events_coordinator_id ON events(coordinator_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_requires_registration ON events(requires_registration);

COMMENT ON TABLE events IS 'Store church-wide and branch events with scheduling and registration settings';

-- ----------------------------------------------------------------------------
-- 26. EVENT_ORGANIZERS
-- Purpose: Store organizing team members for events
-- ----------------------------------------------------------------------------
CREATE TABLE event_organizers (
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    organizer_role VARCHAR(100),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary Key
    PRIMARY KEY (event_id, member_id),
    
    -- Foreign Keys
    CONSTRAINT fk_event_organizers_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_organizers_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX idx_event_organizers_member_id ON event_organizers(member_id);

COMMENT ON TABLE event_organizers IS 'Store organizing team members for events';

-- ----------------------------------------------------------------------------
-- 27. EVENT_NOTES
-- Purpose: Store messages and notes logged by event organizers
-- ----------------------------------------------------------------------------
CREATE TABLE event_notes (
    note_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    note_title VARCHAR(200),
    note_content TEXT NOT NULL,
    note_type VARCHAR(30) DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_event_notes_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_notes_author
        FOREIGN KEY (author_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_event_notes_type CHECK (note_type IN ('General', 'Task', 'Decision', 'Issue', 'Update', 'Reminder'))
);

-- Trigger for updated_at
CREATE TRIGGER event_notes_updated_at
    BEFORE UPDATE ON event_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_event_notes_event_id ON event_notes(event_id);
CREATE INDEX idx_event_notes_author_id ON event_notes(author_id);
CREATE INDEX idx_event_notes_note_type ON event_notes(note_type);
CREATE INDEX idx_event_notes_is_pinned ON event_notes(is_pinned);
CREATE INDEX idx_event_notes_created_at ON event_notes(created_at);

COMMENT ON TABLE event_notes IS 'Store messages and notes logged by event organizers for collaboration';

-- ----------------------------------------------------------------------------
-- 28. EVENT_REGISTRATIONS
-- Purpose: Store member registrations for events requiring sign-up
-- ----------------------------------------------------------------------------
CREATE TABLE event_registrations (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_event_registrations_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_registrations_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    
    -- Check Constraints
    CONSTRAINT chk_event_registrations_status CHECK (registration_status IN ('Registered', 'Waitlisted', 'Confirmed', 'Cancelled', 'No-Show')),
    CONSTRAINT chk_event_registrations_guest_count CHECK (guest_count >= 0),
    
    -- Unique Constraints (one registration per member per event)
    CONSTRAINT uq_event_registrations UNIQUE (event_id, member_id)
);

-- Trigger for updated_at
CREATE TRIGGER event_registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_member_id ON event_registrations(member_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX idx_event_registrations_registration_date ON event_registrations(registration_date);

COMMENT ON TABLE event_registrations IS 'Store member registrations for events requiring sign-up with attendance tracking';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
