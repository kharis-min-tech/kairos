-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 03_constraints.sql
-- Purpose: Foreign keys, check constraints, and unique constraints
-- ============================================================================
-- Execution Order: 3 (After tables)
-- Dependencies: 02_tables.sql
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- Helper function to add constraint if it doesn't exist
-- Updated to support schema-qualified table names
CREATE OR REPLACE FUNCTION add_constraint_if_not_exists(
    p_schema_name TEXT,
    p_table_name TEXT,
    p_constraint_name TEXT,
    p_constraint_sql TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = p_schema_name 
        AND table_name = p_table_name 
        AND constraint_name = p_constraint_name
    ) THEN
        EXECUTE p_constraint_sql;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- ############################################################################
-- CORE SCHEMA CONSTRAINTS
-- ############################################################################

-- BRANCHES foreign keys
SELECT add_constraint_if_not_exists('core', 'branches', 'fk_branches_region',
    'ALTER TABLE core.branches ADD CONSTRAINT fk_branches_region FOREIGN KEY (region_id) REFERENCES core.regions(region_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('core', 'branches', 'fk_branches_language',
    'ALTER TABLE core.branches ADD CONSTRAINT fk_branches_language FOREIGN KEY (language_id) REFERENCES core.languages(language_id) ON DELETE SET NULL');

-- MEMBERS foreign keys
SELECT add_constraint_if_not_exists('core', 'members', 'fk_members_home_branch',
    'ALTER TABLE core.members ADD CONSTRAINT fk_members_home_branch FOREIGN KEY (home_branch_id) REFERENCES core.branches(branch_id) ON DELETE RESTRICT');

-- BRANCH_LEADERSHIP foreign keys
SELECT add_constraint_if_not_exists('core', 'branch_leadership', 'fk_branch_leadership_branch',
    'ALTER TABLE core.branch_leadership ADD CONSTRAINT fk_branch_leadership_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('core', 'branch_leadership', 'fk_branch_leadership_member',
    'ALTER TABLE core.branch_leadership ADD CONSTRAINT fk_branch_leadership_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE RESTRICT');

-- ############################################################################
-- MINISTRY SCHEMA CONSTRAINTS
-- ############################################################################

-- MEMBER_ROLES foreign keys
SELECT add_constraint_if_not_exists('ministry', 'member_roles', 'fk_member_roles_member',
    'ALTER TABLE ministry.member_roles ADD CONSTRAINT fk_member_roles_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'member_roles', 'fk_member_roles_role',
    'ALTER TABLE ministry.member_roles ADD CONSTRAINT fk_member_roles_role FOREIGN KEY (role_id) REFERENCES ministry.roles(role_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('ministry', 'member_roles', 'fk_member_roles_branch',
    'ALTER TABLE ministry.member_roles ADD CONSTRAINT fk_member_roles_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');

-- FELLOWSHIPS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'fellowships', 'fk_fellowships_branch',
    'ALTER TABLE ministry.fellowships ADD CONSTRAINT fk_fellowships_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'fellowships', 'fk_fellowships_leader',
    'ALTER TABLE ministry.fellowships ADD CONSTRAINT fk_fellowships_leader FOREIGN KEY (leader_id) REFERENCES core.members(member_id) ON DELETE SET NULL');
SELECT add_constraint_if_not_exists('ministry', 'fellowships', 'fk_fellowships_co_leader',
    'ALTER TABLE ministry.fellowships ADD CONSTRAINT fk_fellowships_co_leader FOREIGN KEY (co_leader_id) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- FELLOWSHIP_MEMBERS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'fellowship_members', 'fk_fellowship_members_fellowship',
    'ALTER TABLE ministry.fellowship_members ADD CONSTRAINT fk_fellowship_members_fellowship FOREIGN KEY (fellowship_id) REFERENCES ministry.fellowships(fellowship_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_members', 'fk_fellowship_members_member',
    'ALTER TABLE ministry.fellowship_members ADD CONSTRAINT fk_fellowship_members_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- FELLOWSHIP_MEETINGS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meetings', 'fk_fellowship_meetings_fellowship',
    'ALTER TABLE ministry.fellowship_meetings ADD CONSTRAINT fk_fellowship_meetings_fellowship FOREIGN KEY (fellowship_id) REFERENCES ministry.fellowships(fellowship_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meetings', 'fk_fellowship_meetings_created_by',
    'ALTER TABLE ministry.fellowship_meetings ADD CONSTRAINT fk_fellowship_meetings_created_by FOREIGN KEY (created_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- FELLOWSHIP_MEETING_ATTENDANCE foreign keys
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meeting_attendance', 'fk_fellowship_meeting_attendance_meeting',
    'ALTER TABLE ministry.fellowship_meeting_attendance ADD CONSTRAINT fk_fellowship_meeting_attendance_meeting FOREIGN KEY (meeting_id) REFERENCES ministry.fellowship_meetings(meeting_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meeting_attendance', 'fk_fellowship_meeting_attendance_member',
    'ALTER TABLE ministry.fellowship_meeting_attendance ADD CONSTRAINT fk_fellowship_meeting_attendance_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meeting_attendance', 'fk_fellowship_meeting_attendance_recorded_by',
    'ALTER TABLE ministry.fellowship_meeting_attendance ADD CONSTRAINT fk_fellowship_meeting_attendance_recorded_by FOREIGN KEY (recorded_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- BRANCH_DEPARTMENTS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'fk_branch_departments_branch',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT fk_branch_departments_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'fk_branch_departments_department',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT fk_branch_departments_department FOREIGN KEY (department_id) REFERENCES ministry.departments(department_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'fk_branch_departments_lead',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT fk_branch_departments_lead FOREIGN KEY (lead_member_id) REFERENCES core.members(member_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'fk_branch_departments_deputy',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT fk_branch_departments_deputy FOREIGN KEY (deputy_member_id) REFERENCES core.members(member_id) ON DELETE RESTRICT');

-- DEPARTMENT_MEMBERS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'department_members', 'fk_department_members_branch_department',
    'ALTER TABLE ministry.department_members ADD CONSTRAINT fk_department_members_branch_department FOREIGN KEY (branch_department_id) REFERENCES ministry.branch_departments(branch_department_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'department_members', 'fk_department_members_member',
    'ALTER TABLE ministry.department_members ADD CONSTRAINT fk_department_members_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- DEPARTMENT_MEETINGS foreign keys
SELECT add_constraint_if_not_exists('ministry', 'department_meetings', 'fk_department_meetings_branch_department',
    'ALTER TABLE ministry.department_meetings ADD CONSTRAINT fk_department_meetings_branch_department FOREIGN KEY (branch_department_id) REFERENCES ministry.branch_departments(branch_department_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'department_meetings', 'fk_department_meetings_created_by',
    'ALTER TABLE ministry.department_meetings ADD CONSTRAINT fk_department_meetings_created_by FOREIGN KEY (created_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- MEETING_ATTENDANCE foreign keys
SELECT add_constraint_if_not_exists('ministry', 'meeting_attendance', 'fk_meeting_attendance_meeting',
    'ALTER TABLE ministry.meeting_attendance ADD CONSTRAINT fk_meeting_attendance_meeting FOREIGN KEY (meeting_id) REFERENCES ministry.department_meetings(meeting_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'meeting_attendance', 'fk_meeting_attendance_member',
    'ALTER TABLE ministry.meeting_attendance ADD CONSTRAINT fk_meeting_attendance_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'meeting_attendance', 'fk_meeting_attendance_recorded_by',
    'ALTER TABLE ministry.meeting_attendance ADD CONSTRAINT fk_meeting_attendance_recorded_by FOREIGN KEY (recorded_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- SERVICES foreign keys
SELECT add_constraint_if_not_exists('ministry', 'services', 'fk_services_branch',
    'ALTER TABLE ministry.services ADD CONSTRAINT fk_services_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'services', 'fk_services_preacher',
    'ALTER TABLE ministry.services ADD CONSTRAINT fk_services_preacher FOREIGN KEY (preacher_id) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- SERVICE_ATTENDANCE foreign keys
SELECT add_constraint_if_not_exists('ministry', 'service_attendance', 'fk_service_attendance_service',
    'ALTER TABLE ministry.service_attendance ADD CONSTRAINT fk_service_attendance_service FOREIGN KEY (service_id) REFERENCES ministry.services(service_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'service_attendance', 'fk_service_attendance_member',
    'ALTER TABLE ministry.service_attendance ADD CONSTRAINT fk_service_attendance_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('ministry', 'service_attendance', 'fk_service_attendance_recorded_by',
    'ALTER TABLE ministry.service_attendance ADD CONSTRAINT fk_service_attendance_recorded_by FOREIGN KEY (recorded_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- ############################################################################
-- OUTREACH SCHEMA CONSTRAINTS
-- ############################################################################

-- OUTREACH_PROGRAMS foreign keys
SELECT add_constraint_if_not_exists('outreach', 'outreach_programs', 'fk_outreach_programs_branch',
    'ALTER TABLE outreach.outreach_programs ADD CONSTRAINT fk_outreach_programs_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('outreach', 'outreach_programs', 'fk_outreach_programs_coordinator',
    'ALTER TABLE outreach.outreach_programs ADD CONSTRAINT fk_outreach_programs_coordinator FOREIGN KEY (coordinator_id) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- OUTREACH_PARTICIPANTS foreign keys
SELECT add_constraint_if_not_exists('outreach', 'outreach_participants', 'fk_outreach_participants_outreach',
    'ALTER TABLE outreach.outreach_participants ADD CONSTRAINT fk_outreach_participants_outreach FOREIGN KEY (outreach_id) REFERENCES outreach.outreach_programs(outreach_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('outreach', 'outreach_participants', 'fk_outreach_participants_member',
    'ALTER TABLE outreach.outreach_participants ADD CONSTRAINT fk_outreach_participants_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- SOULS foreign keys
SELECT add_constraint_if_not_exists('outreach', 'souls', 'fk_souls_outreach',
    'ALTER TABLE outreach.souls ADD CONSTRAINT fk_souls_outreach FOREIGN KEY (outreach_id) REFERENCES outreach.outreach_programs(outreach_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('outreach', 'souls', 'fk_souls_assigned_member',
    'ALTER TABLE outreach.souls ADD CONSTRAINT fk_souls_assigned_member FOREIGN KEY (assigned_member_id) REFERENCES core.members(member_id) ON DELETE SET NULL');
SELECT add_constraint_if_not_exists('outreach', 'souls', 'fk_souls_converted_to_member',
    'ALTER TABLE outreach.souls ADD CONSTRAINT fk_souls_converted_to_member FOREIGN KEY (converted_to_member_id) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- FOLLOW_UPS foreign keys
SELECT add_constraint_if_not_exists('outreach', 'follow_ups', 'fk_follow_ups_soul',
    'ALTER TABLE outreach.follow_ups ADD CONSTRAINT fk_follow_ups_soul FOREIGN KEY (soul_id) REFERENCES outreach.souls(soul_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('outreach', 'follow_ups', 'fk_follow_ups_member',
    'ALTER TABLE outreach.follow_ups ADD CONSTRAINT fk_follow_ups_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- ############################################################################
-- FINANCE SCHEMA CONSTRAINTS
-- ############################################################################

-- DONATIONS foreign keys
SELECT add_constraint_if_not_exists('finance', 'donations', 'fk_donations_member',
    'ALTER TABLE finance.donations ADD CONSTRAINT fk_donations_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('finance', 'donations', 'fk_donations_branch',
    'ALTER TABLE finance.donations ADD CONSTRAINT fk_donations_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('finance', 'donations', 'fk_donations_recorded_by',
    'ALTER TABLE finance.donations ADD CONSTRAINT fk_donations_recorded_by FOREIGN KEY (recorded_by) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- ############################################################################
-- COMMS SCHEMA CONSTRAINTS
-- ############################################################################

-- NOTIFICATIONS foreign keys
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_sent_by',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_sent_by FOREIGN KEY (sent_by) REFERENCES core.members(member_id) ON DELETE RESTRICT');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_branch',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_branch FOREIGN KEY (target_branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_region',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_region FOREIGN KEY (target_region_id) REFERENCES core.regions(region_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_department',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_department FOREIGN KEY (target_department_id) REFERENCES ministry.departments(department_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_fellowship',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_fellowship FOREIGN KEY (target_fellowship_id) REFERENCES ministry.fellowships(fellowship_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'fk_notifications_role',
    'ALTER TABLE comms.notifications ADD CONSTRAINT fk_notifications_role FOREIGN KEY (target_role_id) REFERENCES ministry.roles(role_id) ON DELETE CASCADE');

-- NOTIFICATION_RECIPIENTS foreign keys
SELECT add_constraint_if_not_exists('comms', 'notification_recipients', 'fk_notification_recipients_notification',
    'ALTER TABLE comms.notification_recipients ADD CONSTRAINT fk_notification_recipients_notification FOREIGN KEY (notification_id) REFERENCES comms.notifications(notification_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'notification_recipients', 'fk_notification_recipients_member',
    'ALTER TABLE comms.notification_recipients ADD CONSTRAINT fk_notification_recipients_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- EVENTS foreign keys
SELECT add_constraint_if_not_exists('comms', 'events', 'fk_events_branch',
    'ALTER TABLE comms.events ADD CONSTRAINT fk_events_branch FOREIGN KEY (branch_id) REFERENCES core.branches(branch_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'events', 'fk_events_region',
    'ALTER TABLE comms.events ADD CONSTRAINT fk_events_region FOREIGN KEY (region_id) REFERENCES core.regions(region_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'events', 'fk_events_coordinator',
    'ALTER TABLE comms.events ADD CONSTRAINT fk_events_coordinator FOREIGN KEY (coordinator_id) REFERENCES core.members(member_id) ON DELETE SET NULL');

-- EVENT_ORGANIZERS foreign keys
SELECT add_constraint_if_not_exists('comms', 'event_organizers', 'fk_event_organizers_event',
    'ALTER TABLE comms.event_organizers ADD CONSTRAINT fk_event_organizers_event FOREIGN KEY (event_id) REFERENCES comms.events(event_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'event_organizers', 'fk_event_organizers_member',
    'ALTER TABLE comms.event_organizers ADD CONSTRAINT fk_event_organizers_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- EVENT_NOTES foreign keys
SELECT add_constraint_if_not_exists('comms', 'event_notes', 'fk_event_notes_event',
    'ALTER TABLE comms.event_notes ADD CONSTRAINT fk_event_notes_event FOREIGN KEY (event_id) REFERENCES comms.events(event_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'event_notes', 'fk_event_notes_author',
    'ALTER TABLE comms.event_notes ADD CONSTRAINT fk_event_notes_author FOREIGN KEY (author_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- EVENT_REGISTRATIONS foreign keys
SELECT add_constraint_if_not_exists('comms', 'event_registrations', 'fk_event_registrations_event',
    'ALTER TABLE comms.event_registrations ADD CONSTRAINT fk_event_registrations_event FOREIGN KEY (event_id) REFERENCES comms.events(event_id) ON DELETE CASCADE');
SELECT add_constraint_if_not_exists('comms', 'event_registrations', 'fk_event_registrations_member',
    'ALTER TABLE comms.event_registrations ADD CONSTRAINT fk_event_registrations_member FOREIGN KEY (member_id) REFERENCES core.members(member_id) ON DELETE CASCADE');

-- ============================================================================
-- CHECK AND UNIQUE CONSTRAINTS
-- ============================================================================

-- ############################################################################
-- CORE SCHEMA CHECK/UNIQUE CONSTRAINTS
-- ############################################################################

-- REGIONS constraints
SELECT add_constraint_if_not_exists('core', 'regions', 'uq_regions_name',
    'ALTER TABLE core.regions ADD CONSTRAINT uq_regions_name UNIQUE (region_name)');

-- BRANCHES constraints
SELECT add_constraint_if_not_exists('core', 'branches', 'chk_branches_type',
    'ALTER TABLE core.branches ADD CONSTRAINT chk_branches_type CHECK (branch_type IN (''Main'', ''Satellite'', ''Cell'', ''Campus'', ''Online''))');
SELECT add_constraint_if_not_exists('core', 'branches', 'uq_branches_name_region',
    'ALTER TABLE core.branches ADD CONSTRAINT uq_branches_name_region UNIQUE (branch_name, region_id)');
SELECT add_constraint_if_not_exists('core', 'branches', 'uq_branches_email',
    'ALTER TABLE core.branches ADD CONSTRAINT uq_branches_email UNIQUE (email)');
SELECT add_constraint_if_not_exists('core', 'branches', 'uq_branches_phone',
    'ALTER TABLE core.branches ADD CONSTRAINT uq_branches_phone UNIQUE (phone)');

-- MEMBERS constraints
SELECT add_constraint_if_not_exists('core', 'members', 'chk_members_gender',
    'ALTER TABLE core.members ADD CONSTRAINT chk_members_gender CHECK (gender IN (''Male'', ''Female''))');
SELECT add_constraint_if_not_exists('core', 'members', 'chk_members_membership_date',
    'ALTER TABLE core.members ADD CONSTRAINT chk_members_membership_date CHECK (membership_date <= CURRENT_DATE)');
SELECT add_constraint_if_not_exists('core', 'members', 'uq_members_email',
    'ALTER TABLE core.members ADD CONSTRAINT uq_members_email UNIQUE (email)');

-- BRANCH_LEADERSHIP constraints
SELECT add_constraint_if_not_exists('core', 'branch_leadership', 'chk_branch_leadership_role',
    'ALTER TABLE core.branch_leadership ADD CONSTRAINT chk_branch_leadership_role CHECK (role IN (''Main Pastor'', ''Elder''))');
SELECT add_constraint_if_not_exists('core', 'branch_leadership', 'chk_branch_leadership_dates',
    'ALTER TABLE core.branch_leadership ADD CONSTRAINT chk_branch_leadership_dates CHECK (end_date IS NULL OR end_date >= start_date)');
SELECT add_constraint_if_not_exists('core', 'branch_leadership', 'uq_branch_leadership_assignment',
    'ALTER TABLE core.branch_leadership ADD CONSTRAINT uq_branch_leadership_assignment UNIQUE (branch_id, member_id, role, start_date)');

-- ############################################################################
-- MINISTRY SCHEMA CHECK/UNIQUE CONSTRAINTS
-- ############################################################################

-- ROLES constraints
SELECT add_constraint_if_not_exists('ministry', 'roles', 'uq_roles_name',
    'ALTER TABLE ministry.roles ADD CONSTRAINT uq_roles_name UNIQUE (role_name)');

-- MEMBER_ROLES constraints
SELECT add_constraint_if_not_exists('ministry', 'member_roles', 'chk_member_roles_dates',
    'ALTER TABLE ministry.member_roles ADD CONSTRAINT chk_member_roles_dates CHECK (end_date IS NULL OR end_date >= assigned_date)');
SELECT add_constraint_if_not_exists('ministry', 'member_roles', 'uq_member_roles_assignment',
    'ALTER TABLE ministry.member_roles ADD CONSTRAINT uq_member_roles_assignment UNIQUE (member_id, role_id, branch_id, assigned_date)');

-- FELLOWSHIPS constraints
SELECT add_constraint_if_not_exists('ministry', 'fellowships', 'chk_fellowships_leaders_different',
    'ALTER TABLE ministry.fellowships ADD CONSTRAINT chk_fellowships_leaders_different CHECK (leader_id IS NULL OR co_leader_id IS NULL OR leader_id != co_leader_id)');
SELECT add_constraint_if_not_exists('ministry', 'fellowships', 'uq_fellowships_name_branch',
    'ALTER TABLE ministry.fellowships ADD CONSTRAINT uq_fellowships_name_branch UNIQUE (fellowship_name, branch_id)');

-- FELLOWSHIP_MEMBERS constraints
SELECT add_constraint_if_not_exists('ministry', 'fellowship_members', 'chk_fellowship_members_dates',
    'ALTER TABLE ministry.fellowship_members ADD CONSTRAINT chk_fellowship_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date)');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_members', 'uq_fellowship_members_assignment',
    'ALTER TABLE ministry.fellowship_members ADD CONSTRAINT uq_fellowship_members_assignment UNIQUE (fellowship_id, member_id, join_date)');

-- FELLOWSHIP_MEETINGS constraints
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meetings', 'chk_fellowship_meetings_duration',
    'ALTER TABLE ministry.fellowship_meetings ADD CONSTRAINT chk_fellowship_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)');
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meetings', 'uq_fellowship_meetings_date',
    'ALTER TABLE ministry.fellowship_meetings ADD CONSTRAINT uq_fellowship_meetings_date UNIQUE (fellowship_id, meeting_date)');

-- FELLOWSHIP_MEETING_ATTENDANCE constraints
SELECT add_constraint_if_not_exists('ministry', 'fellowship_meeting_attendance', 'chk_fellowship_meeting_attendance_status',
    'ALTER TABLE ministry.fellowship_meeting_attendance ADD CONSTRAINT chk_fellowship_meeting_attendance_status CHECK (attendance_status IN (''Present'', ''Absent'', ''Excused'', ''Late''))');

-- DEPARTMENTS constraints
SELECT add_constraint_if_not_exists('ministry', 'departments', 'uq_departments_name',
    'ALTER TABLE ministry.departments ADD CONSTRAINT uq_departments_name UNIQUE (department_name)');

-- BRANCH_DEPARTMENTS constraints
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'chk_branch_departments_dates',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT chk_branch_departments_dates CHECK (end_date IS NULL OR end_date >= start_date)');
SELECT add_constraint_if_not_exists('ministry', 'branch_departments', 'chk_branch_departments_leaders_different',
    'ALTER TABLE ministry.branch_departments ADD CONSTRAINT chk_branch_departments_leaders_different CHECK (deputy_member_id IS NULL OR lead_member_id != deputy_member_id)');

-- DEPARTMENT_MEMBERS constraints
SELECT add_constraint_if_not_exists('ministry', 'department_members', 'chk_department_members_dates',
    'ALTER TABLE ministry.department_members ADD CONSTRAINT chk_department_members_dates CHECK (leave_date IS NULL OR leave_date >= join_date)');
SELECT add_constraint_if_not_exists('ministry', 'department_members', 'uq_department_members_assignment',
    'ALTER TABLE ministry.department_members ADD CONSTRAINT uq_department_members_assignment UNIQUE (branch_department_id, member_id, join_date)');

-- DEPARTMENT_MEETINGS constraints
SELECT add_constraint_if_not_exists('ministry', 'department_meetings', 'chk_department_meetings_duration',
    'ALTER TABLE ministry.department_meetings ADD CONSTRAINT chk_department_meetings_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)');
SELECT add_constraint_if_not_exists('ministry', 'department_meetings', 'uq_department_meetings_date',
    'ALTER TABLE ministry.department_meetings ADD CONSTRAINT uq_department_meetings_date UNIQUE (branch_department_id, meeting_date)');

-- MEETING_ATTENDANCE constraints
SELECT add_constraint_if_not_exists('ministry', 'meeting_attendance', 'chk_meeting_attendance_status',
    'ALTER TABLE ministry.meeting_attendance ADD CONSTRAINT chk_meeting_attendance_status CHECK (attendance_status IN (''Present'', ''Absent'', ''Excused'', ''Late''))');

-- SERVICES constraints
SELECT add_constraint_if_not_exists('ministry', 'services', 'chk_services_type',
    'ALTER TABLE ministry.services ADD CONSTRAINT chk_services_type CHECK (service_type IN (''Sunday Service'', ''Midweek Service'', ''Special Service'', ''Prayer Meeting'', ''Other''))');
SELECT add_constraint_if_not_exists('ministry', 'services', 'chk_services_expected_attendance',
    'ALTER TABLE ministry.services ADD CONSTRAINT chk_services_expected_attendance CHECK (expected_attendance IS NULL OR expected_attendance >= 0)');
SELECT add_constraint_if_not_exists('ministry', 'services', 'uq_services_unique',
    'ALTER TABLE ministry.services ADD CONSTRAINT uq_services_unique UNIQUE (branch_id, service_date, service_type)');

-- SERVICE_ATTENDANCE constraints
SELECT add_constraint_if_not_exists('ministry', 'service_attendance', 'chk_service_attendance_status',
    'ALTER TABLE ministry.service_attendance ADD CONSTRAINT chk_service_attendance_status CHECK (attendance_status IN (''Present'', ''Absent'', ''Virtual''))');

-- ############################################################################
-- OUTREACH SCHEMA CHECK/UNIQUE CONSTRAINTS
-- ############################################################################

-- OUTREACH_PROGRAMS constraints
SELECT add_constraint_if_not_exists('outreach', 'outreach_programs', 'chk_outreach_programs_souls',
    'ALTER TABLE outreach.outreach_programs ADD CONSTRAINT chk_outreach_programs_souls CHECK (total_souls_reached >= 0)');
SELECT add_constraint_if_not_exists('outreach', 'outreach_programs', 'uq_outreach_programs_unique',
    'ALTER TABLE outreach.outreach_programs ADD CONSTRAINT uq_outreach_programs_unique UNIQUE (branch_id, program_name, program_date, location)');

-- SOULS constraints
SELECT add_constraint_if_not_exists('outreach', 'souls', 'chk_souls_gender',
    'ALTER TABLE outreach.souls ADD CONSTRAINT chk_souls_gender CHECK (gender IS NULL OR gender IN (''Male'', ''Female''))');
SELECT add_constraint_if_not_exists('outreach', 'souls', 'chk_souls_status',
    'ALTER TABLE outreach.souls ADD CONSTRAINT chk_souls_status CHECK (status IN (''New'', ''Following Up'', ''Interested'', ''Not Interested'', ''Converted'', ''Lost Contact''))');

-- FOLLOW_UPS constraints
SELECT add_constraint_if_not_exists('outreach', 'follow_ups', 'chk_follow_ups_contact_method',
    'ALTER TABLE outreach.follow_ups ADD CONSTRAINT chk_follow_ups_contact_method CHECK (contact_method IS NULL OR contact_method IN (''Phone Call'', ''Text Message'', ''Email'', ''WhatsApp'', ''In-Person Visit'', ''Other''))');
SELECT add_constraint_if_not_exists('outreach', 'follow_ups', 'chk_follow_ups_contact_status',
    'ALTER TABLE outreach.follow_ups ADD CONSTRAINT chk_follow_ups_contact_status CHECK (contact_status IN (''Successful'', ''No Answer'', ''Wrong Number'', ''Call Back Later'', ''Not Interested'', ''Interested''))');
SELECT add_constraint_if_not_exists('outreach', 'follow_ups', 'chk_follow_ups_duration',
    'ALTER TABLE outreach.follow_ups ADD CONSTRAINT chk_follow_ups_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)');

-- ############################################################################
-- FINANCE SCHEMA CHECK/UNIQUE CONSTRAINTS
-- ############################################################################

-- DONATIONS constraints
SELECT add_constraint_if_not_exists('finance', 'donations', 'chk_donations_amount',
    'ALTER TABLE finance.donations ADD CONSTRAINT chk_donations_amount CHECK (amount > 0)');
SELECT add_constraint_if_not_exists('finance', 'donations', 'chk_donations_purpose',
    'ALTER TABLE finance.donations ADD CONSTRAINT chk_donations_purpose CHECK (donation_purpose IN (''Offering'', ''Building Fund'', ''Other''))');
SELECT add_constraint_if_not_exists('finance', 'donations', 'chk_donations_payment_method',
    'ALTER TABLE finance.donations ADD CONSTRAINT chk_donations_payment_method CHECK (payment_method IS NULL OR payment_method IN (''Cash'', ''Check'', ''Bank Transfer'', ''Mobile Money'', ''Card'', ''Online'', ''Other''))');
SELECT add_constraint_if_not_exists('finance', 'donations', 'chk_donations_description',
    'ALTER TABLE finance.donations ADD CONSTRAINT chk_donations_description CHECK ((donation_purpose != ''Other'') OR (donation_purpose = ''Other'' AND description IS NOT NULL AND description != ''''))');

-- ############################################################################
-- COMMS SCHEMA CHECK/UNIQUE CONSTRAINTS
-- ############################################################################

-- NOTIFICATIONS constraints
SELECT add_constraint_if_not_exists('comms', 'notifications', 'chk_notifications_type',
    'ALTER TABLE comms.notifications ADD CONSTRAINT chk_notifications_type CHECK (notification_type IN (''Announcement'', ''Reminder'', ''Alert'', ''Event'', ''General''))');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'chk_notifications_priority',
    'ALTER TABLE comms.notifications ADD CONSTRAINT chk_notifications_priority CHECK (priority IN (''Low'', ''Normal'', ''High'', ''Urgent''))');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'chk_notifications_scope',
    'ALTER TABLE comms.notifications ADD CONSTRAINT chk_notifications_scope CHECK (target_scope IN (''All'', ''Branch'', ''Region'', ''Department'', ''Fellowship'', ''Role'', ''Leadership''))');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'chk_notifications_leadership_role',
    'ALTER TABLE comms.notifications ADD CONSTRAINT chk_notifications_leadership_role CHECK (target_leadership_role IS NULL OR target_leadership_role IN (''Main Pastor'', ''Elder''))');
SELECT add_constraint_if_not_exists('comms', 'notifications', 'chk_notifications_target_consistency',
    'ALTER TABLE comms.notifications ADD CONSTRAINT chk_notifications_target_consistency CHECK (
        (target_scope = ''All'' AND target_branch_id IS NULL AND target_region_id IS NULL AND target_department_id IS NULL AND target_fellowship_id IS NULL AND target_role_id IS NULL AND target_leadership_role IS NULL) OR
        (target_scope = ''Branch'' AND target_branch_id IS NOT NULL) OR
        (target_scope = ''Region'' AND target_region_id IS NOT NULL) OR
        (target_scope = ''Department'' AND target_department_id IS NOT NULL) OR
        (target_scope = ''Fellowship'' AND target_fellowship_id IS NOT NULL) OR
        (target_scope = ''Role'' AND target_role_id IS NOT NULL) OR
        (target_scope = ''Leadership'' AND target_leadership_role IS NOT NULL)
    )');

-- EVENTS constraints
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_dates',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_dates CHECK (end_date >= start_date)');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_times',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_times CHECK (start_date != end_date OR end_time IS NULL OR start_time IS NULL OR end_time >= start_time)');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_type',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_type CHECK (event_type IN (''Conference'', ''Retreat'', ''Seminar'', ''Workshop'', ''Concert'', ''Outreach'', ''Celebration'', ''Meeting'', ''Other''))');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_status',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_status CHECK (status IN (''Draft'', ''Published'', ''Ongoing'', ''Completed'', ''Cancelled'', ''Postponed''))');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_registration_deadline',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= start_date)');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_max_attendees',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_max_attendees CHECK (max_attendees IS NULL OR max_attendees > 0)');
SELECT add_constraint_if_not_exists('comms', 'events', 'chk_events_scope',
    'ALTER TABLE comms.events ADD CONSTRAINT chk_events_scope CHECK ((branch_id IS NULL AND region_id IS NULL) OR (branch_id IS NOT NULL AND region_id IS NULL) OR (branch_id IS NULL AND region_id IS NOT NULL))');

-- EVENT_NOTES constraints
SELECT add_constraint_if_not_exists('comms', 'event_notes', 'chk_event_notes_type',
    'ALTER TABLE comms.event_notes ADD CONSTRAINT chk_event_notes_type CHECK (note_type IN (''General'', ''Task'', ''Decision'', ''Issue'', ''Update'', ''Reminder''))');

-- EVENT_REGISTRATIONS constraints
SELECT add_constraint_if_not_exists('comms', 'event_registrations', 'chk_event_registrations_status',
    'ALTER TABLE comms.event_registrations ADD CONSTRAINT chk_event_registrations_status CHECK (registration_status IN (''Registered'', ''Waitlisted'', ''Confirmed'', ''Cancelled'', ''No-Show''))');
SELECT add_constraint_if_not_exists('comms', 'event_registrations', 'chk_event_registrations_guest_count',
    'ALTER TABLE comms.event_registrations ADD CONSTRAINT chk_event_registrations_guest_count CHECK (guest_count >= 0)');
SELECT add_constraint_if_not_exists('comms', 'event_registrations', 'uq_event_registrations',
    'ALTER TABLE comms.event_registrations ADD CONSTRAINT uq_event_registrations UNIQUE (event_id, member_id)');

-- ============================================================================
-- END OF CONSTRAINTS
-- ============================================================================
