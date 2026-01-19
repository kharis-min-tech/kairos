-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 03_constraints.sql
-- Purpose: Foreign keys, check constraints, and unique constraints
-- ============================================================================
-- Execution Order: 3 (After tables)
-- Dependencies: 02_tables.sql
-- ============================================================================

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- BRANCHES foreign keys
ALTER TABLE branches
    ADD CONSTRAINT fk_branches_region
        FOREIGN KEY (region_id)
        REFERENCES regions(region_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_branches_language
        FOREIGN KEY (language_id)
        REFERENCES languages(language_id)
        ON DELETE SET NULL;

-- MEMBERS foreign keys
ALTER TABLE members
    ADD CONSTRAINT fk_members_home_branch
        FOREIGN KEY (home_branch_id)
        REFERENCES branches(branch_id)
        ON DELETE RESTRICT;

-- BRANCH_LEADERSHIP foreign keys
ALTER TABLE branch_leadership
    ADD CONSTRAINT fk_branch_leadership_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_branch_leadership_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT;

-- MEMBER_ROLES foreign keys
ALTER TABLE member_roles
    ADD CONSTRAINT fk_member_roles_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_member_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_member_roles_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE;

-- FELLOWSHIPS foreign keys
ALTER TABLE fellowships
    ADD CONSTRAINT fk_fellowships_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_fellowships_leader
        FOREIGN KEY (leader_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_fellowships_co_leader
        FOREIGN KEY (co_leader_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- FELLOWSHIP_MEMBERS foreign keys
ALTER TABLE fellowship_members
    ADD CONSTRAINT fk_fellowship_members_fellowship
        FOREIGN KEY (fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_fellowship_members_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- FELLOWSHIP_MEETINGS foreign keys
ALTER TABLE fellowship_meetings
    ADD CONSTRAINT fk_fellowship_meetings_fellowship
        FOREIGN KEY (fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_fellowship_meetings_created_by
        FOREIGN KEY (created_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- FELLOWSHIP_MEETING_ATTENDANCE foreign keys
ALTER TABLE fellowship_meeting_attendance
    ADD CONSTRAINT fk_fellowship_meeting_attendance_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES fellowship_meetings(meeting_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_fellowship_meeting_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_fellowship_meeting_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- OUTREACH_PROGRAMS foreign keys
ALTER TABLE outreach_programs
    ADD CONSTRAINT fk_outreach_programs_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_outreach_programs_coordinator
        FOREIGN KEY (coordinator_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- SOULS foreign keys
ALTER TABLE souls
    ADD CONSTRAINT fk_souls_outreach
        FOREIGN KEY (outreach_id)
        REFERENCES outreach_programs(outreach_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_souls_assigned_member
        FOREIGN KEY (assigned_member_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL,
    ADD CONSTRAINT fk_souls_converted_to_member
        FOREIGN KEY (converted_to_member_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- FOLLOW_UPS foreign keys
ALTER TABLE follow_ups
    ADD CONSTRAINT fk_follow_ups_soul
        FOREIGN KEY (soul_id)
        REFERENCES souls(soul_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_follow_ups_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- OUTREACH_PARTICIPANTS foreign keys
ALTER TABLE outreach_participants
    ADD CONSTRAINT fk_outreach_participants_outreach
        FOREIGN KEY (outreach_id)
        REFERENCES outreach_programs(outreach_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_outreach_participants_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- BRANCH_DEPARTMENTS foreign keys
ALTER TABLE branch_departments
    ADD CONSTRAINT fk_branch_departments_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_branch_departments_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_branch_departments_lead
        FOREIGN KEY (lead_member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_branch_departments_deputy
        FOREIGN KEY (deputy_member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT;

-- DEPARTMENT_MEMBERS foreign keys
ALTER TABLE department_members
    ADD CONSTRAINT fk_department_members_branch_department
        FOREIGN KEY (branch_department_id)
        REFERENCES branch_departments(branch_department_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_department_members_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- DEPARTMENT_MEETINGS foreign keys
ALTER TABLE department_meetings
    ADD CONSTRAINT fk_department_meetings_branch_department
        FOREIGN KEY (branch_department_id)
        REFERENCES branch_departments(branch_department_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_department_meetings_created_by
        FOREIGN KEY (created_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- MEETING_ATTENDANCE foreign keys
ALTER TABLE meeting_attendance
    ADD CONSTRAINT fk_meeting_attendance_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES department_meetings(meeting_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_meeting_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_meeting_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- SERVICES foreign keys
ALTER TABLE services
    ADD CONSTRAINT fk_services_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_services_preacher
        FOREIGN KEY (preacher_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- SERVICE_ATTENDANCE foreign keys
ALTER TABLE service_attendance
    ADD CONSTRAINT fk_service_attendance_service
        FOREIGN KEY (service_id)
        REFERENCES services(service_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_service_attendance_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_service_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- DONATIONS foreign keys
ALTER TABLE donations
    ADD CONSTRAINT fk_donations_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_donations_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_donations_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- NOTIFICATIONS foreign keys
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_sent_by
        FOREIGN KEY (sent_by)
        REFERENCES members(member_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_notifications_branch
        FOREIGN KEY (target_branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_region
        FOREIGN KEY (target_region_id)
        REFERENCES regions(region_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_department
        FOREIGN KEY (target_department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_fellowship
        FOREIGN KEY (target_fellowship_id)
        REFERENCES fellowships(fellowship_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_role
        FOREIGN KEY (target_role_id)
        REFERENCES roles(role_id)
        ON DELETE CASCADE;

-- NOTIFICATION_RECIPIENTS foreign keys
ALTER TABLE notification_recipients
    ADD CONSTRAINT fk_notification_recipients_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications(notification_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_notification_recipients_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- EVENTS foreign keys
ALTER TABLE events
    ADD CONSTRAINT fk_events_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(branch_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_events_region
        FOREIGN KEY (region_id)
        REFERENCES regions(region_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_events_coordinator
        FOREIGN KEY (coordinator_id)
        REFERENCES members(member_id)
        ON DELETE SET NULL;

-- EVENT_ORGANIZERS foreign keys
ALTER TABLE event_organizers
    ADD CONSTRAINT fk_event_organizers_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_event_organizers_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- EVENT_NOTES foreign keys
ALTER TABLE event_notes
    ADD CONSTRAINT fk_event_notes_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_event_notes_author
        FOREIGN KEY (author_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- EVENT_REGISTRATIONS foreign keys
ALTER TABLE event_registrations
    ADD CONSTRAINT fk_event_registrations_event
        FOREIGN KEY (event_id)
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    ADD CONSTRAINT fk_event_registrations_member
        FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE;

-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

-- REGIONS check constraints
ALTER TABLE regions
    ADD CONSTRAINT uq_regions_name UNIQUE (region_name);

-- BRANCHES check constraints
ALTER TABLE branches
    ADD CONSTRAINT chk_branches_type CHECK (branch_type IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online')),
    ADD CONSTRAINT uq_branches_name_region UNIQUE (branch_name, region_id),
    ADD CONSTRAINT uq_branches_email UNIQUE (email),
    ADD CONSTRAINT uq_branches_phone UNIQUE (phone);

-- MEMBERS check constraints
ALTER TABLE members
    ADD CONSTRAINT chk_members_gender CHECK (gender IN ('Male', 'Female')),
    ADD CONSTRAINT chk_members_membership_date CHECK (membership_date <= CURRENT_DATE),
    ADD CONSTRAINT uq_members_email UNIQUE (email);

-- BRANCH_LEADERSHIP check constraints
ALTER TABLE branch_leadership
    ADD CONSTRAINT chk_branch_leadership_role CHECK (role IN ('Main Pastor', 'Elder')),
    ADD CONSTRAINT chk_branch_leadership_dates CHECK (end_date IS NULL OR end_date >= start_date),
    ADD CONSTRAINT uq_branch_leadership_assignment UNIQUE (branch_id, member_id, role, start_date);

-- ROLES check constraints
ALTER TABLE roles
    ADD CONSTRAINT uq_roles_name UNIQUE (role_name);

-- MEMBER_ROLES check constraints
ALTER TABLE member_roles
    ADD CONSTRAINT chk_member_roles_dates CHECK (end_date IS NULL OR end_date >= assigned_date),
    ADD CONSTRAINT uq_member_roles_assignment UNIQUE (member_id, role_id, branch_id, assigned_date);

-- FELLOWSHIPS check constraints
ALTER TABLE fellowships
    ADD CONSTRAINT chk_fellowships_leaders_different CHECK (leader_id IS NULL OR co_leader_id IS NULL OR leader_id != co_leader_id),
    ADD CONSTRAINT uq_fellowships_name_branch UNIQUE (fellowship_name, branch_id);

-- FELLOWSHIP_MEMBERS check constraints
ALTER TABLE fellowship_members
    ADD CONSTRAINT chk_fellowship_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date),
    ADD CONSTRAINT uq_fellowship_members_assignment UNIQUE (fellowship_id, member_id, join_date);

-- FELLOWSHIP_MEETINGS check constraints
ALTER TABLE fellowship_meetings
    ADD CONSTRAINT chk_fellowship_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    ADD CONSTRAINT uq_fellowship_meetings_date UNIQUE (fellowship_id, meeting_date);

-- FELLOWSHIP_MEETING_ATTENDANCE check constraints
ALTER TABLE fellowship_meeting_attendance
    ADD CONSTRAINT chk_fellowship_meeting_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late'));

-- DEPARTMENTS check constraints
ALTER TABLE departments
    ADD CONSTRAINT uq_departments_name UNIQUE (department_name);

-- OUTREACH_PROGRAMS check constraints
ALTER TABLE outreach_programs
    ADD CONSTRAINT chk_outreach_programs_souls CHECK (total_souls_reached >= 0),
    ADD CONSTRAINT uq_outreach_programs_unique UNIQUE (branch_id, program_name, program_date, location);

-- SOULS check constraints
ALTER TABLE souls
    ADD CONSTRAINT chk_souls_gender CHECK (gender IS NULL OR gender IN ('Male', 'Female')),
    ADD CONSTRAINT chk_souls_status 
        CHECK (status IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact'));

-- FOLLOW_UPS check constraints
ALTER TABLE follow_ups
    ADD CONSTRAINT chk_follow_ups_contact_method 
        CHECK (contact_method IS NULL OR contact_method IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')),
    ADD CONSTRAINT chk_follow_ups_contact_status 
        CHECK (contact_status IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')),
    ADD CONSTRAINT chk_follow_ups_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0);

-- BRANCH_DEPARTMENTS check constraints
ALTER TABLE branch_departments
    ADD CONSTRAINT chk_branch_departments_dates CHECK (end_date IS NULL OR end_date >= start_date),
    ADD CONSTRAINT chk_branch_departments_leaders_different 
        CHECK (deputy_member_id IS NULL OR lead_member_id != deputy_member_id);

-- DEPARTMENT_MEMBERS check constraints
ALTER TABLE department_members
    ADD CONSTRAINT chk_department_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date),
    ADD CONSTRAINT uq_department_members_assignment UNIQUE (branch_department_id, member_id, join_date);

-- DEPARTMENT_MEETINGS check constraints
ALTER TABLE department_meetings
    ADD CONSTRAINT chk_department_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    ADD CONSTRAINT uq_department_meetings_date UNIQUE (branch_department_id, meeting_date);

-- MEETING_ATTENDANCE check constraints
ALTER TABLE meeting_attendance
    ADD CONSTRAINT chk_meeting_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Excused', 'Late'));

-- SERVICES check constraints
ALTER TABLE services
    ADD CONSTRAINT chk_services_type 
        CHECK (service_type IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')),
    ADD CONSTRAINT chk_services_expected_attendance CHECK (expected_attendance IS NULL OR expected_attendance >= 0),
    ADD CONSTRAINT uq_services_unique UNIQUE (branch_id, service_date, service_type);

-- SERVICE_ATTENDANCE check constraints
ALTER TABLE service_attendance
    ADD CONSTRAINT chk_service_attendance_status 
        CHECK (attendance_status IN ('Present', 'Absent', 'Virtual'));

-- DONATIONS check constraints
ALTER TABLE donations
    ADD CONSTRAINT chk_donations_amount CHECK (amount > 0),
    ADD CONSTRAINT chk_donations_purpose CHECK (donation_purpose IN ('Offering', 'Building Fund', 'Other')),
    ADD CONSTRAINT chk_donations_payment_method CHECK (payment_method IS NULL OR payment_method IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')),
    ADD CONSTRAINT chk_donations_description CHECK (
        (donation_purpose != 'Other') OR 
        (donation_purpose = 'Other' AND description IS NOT NULL AND description != '')
    );

-- NOTIFICATIONS check constraints
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type CHECK (notification_type IN ('Announcement', 'Reminder', 'Alert', 'Event', 'General')),
    ADD CONSTRAINT chk_notifications_priority CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    ADD CONSTRAINT chk_notifications_scope CHECK (target_scope IN ('All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership')),
    ADD CONSTRAINT chk_notifications_leadership_role CHECK (target_leadership_role IS NULL OR target_leadership_role IN ('Main Pastor', 'Elder')),
    ADD CONSTRAINT chk_notifications_target_consistency CHECK (
        (target_scope = 'All' AND target_branch_id IS NULL AND target_region_id IS NULL AND target_department_id IS NULL AND target_fellowship_id IS NULL AND target_role_id IS NULL AND target_leadership_role IS NULL) OR
        (target_scope = 'Branch' AND target_branch_id IS NOT NULL) OR
        (target_scope = 'Region' AND target_region_id IS NOT NULL) OR
        (target_scope = 'Department' AND target_department_id IS NOT NULL) OR
        (target_scope = 'Fellowship' AND target_fellowship_id IS NOT NULL) OR
        (target_scope = 'Role' AND target_role_id IS NOT NULL) OR
        (target_scope = 'Leadership' AND target_leadership_role IS NOT NULL)
    );

-- EVENTS check constraints
ALTER TABLE events
    ADD CONSTRAINT chk_events_dates CHECK (end_date >= start_date),
    ADD CONSTRAINT chk_events_times CHECK (
        start_date != end_date OR 
        end_time IS NULL OR 
        start_time IS NULL OR 
        end_time >= start_time
    ),
    ADD CONSTRAINT chk_events_type CHECK (event_type IN ('Conference', 'Retreat', 'Seminar', 'Workshop', 'Concert', 'Outreach', 'Celebration', 'Meeting', 'Other')),
    ADD CONSTRAINT chk_events_status CHECK (status IN ('Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled', 'Postponed')),
    ADD CONSTRAINT chk_events_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_date),
    ADD CONSTRAINT chk_events_max_attendees CHECK (max_attendees IS NULL OR max_attendees > 0),
    ADD CONSTRAINT chk_events_scope CHECK (
        (branch_id IS NULL AND region_id IS NULL) OR
        (branch_id IS NOT NULL AND region_id IS NULL) OR
        (branch_id IS NULL AND region_id IS NOT NULL)
    );

-- EVENT_NOTES check constraints
ALTER TABLE event_notes
    ADD CONSTRAINT chk_event_notes_type CHECK (note_type IN ('General', 'Task', 'Decision', 'Issue', 'Update', 'Reminder'));

-- EVENT_REGISTRATIONS check constraints
ALTER TABLE event_registrations
    ADD CONSTRAINT chk_event_registrations_status CHECK (registration_status IN ('Registered', 'Waitlisted', 'Confirmed', 'Cancelled', 'No-Show')),
    ADD CONSTRAINT chk_event_registrations_guest_count CHECK (guest_count >= 0),
    ADD CONSTRAINT uq_event_registrations UNIQUE (event_id, member_id);

-- ============================================================================
-- END OF CONSTRAINTS
-- ============================================================================
