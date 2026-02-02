-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 04_indexes.sql
-- Purpose: Performance indexes for query optimization
-- ============================================================================
-- Execution Order: 4 (After constraints)
-- Dependencies: 02_tables.sql, 03_constraints.sql
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- Note: Primary key and unique constraint indexes are created automatically
-- ============================================================================

-- ############################################################################
-- CORE SCHEMA INDEXES
-- ############################################################################

-- LANGUAGES indexes
CREATE INDEX IF NOT EXISTS idx_languages_is_active ON core.languages(is_active);

-- BRANCHES indexes
CREATE INDEX IF NOT EXISTS idx_branches_region_id ON core.branches(region_id);
CREATE INDEX IF NOT EXISTS idx_branches_language_id ON core.branches(language_id);

-- MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_members_home_branch_id ON core.members(home_branch_id);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON core.members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_name ON core.members(last_name, first_name);

-- BRANCH_LEADERSHIP indexes
CREATE INDEX IF NOT EXISTS idx_branch_leadership_branch_id ON core.branch_leadership(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_leadership_member_id ON core.branch_leadership(member_id);
CREATE INDEX IF NOT EXISTS idx_branch_leadership_is_current ON core.branch_leadership(is_current);

-- ############################################################################
-- MINISTRY SCHEMA INDEXES
-- ############################################################################

-- ROLES indexes
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON ministry.roles(is_active);

-- MEMBER_ROLES indexes
CREATE INDEX IF NOT EXISTS idx_member_roles_member_id ON ministry.member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON ministry.member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_branch_id ON ministry.member_roles(branch_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_is_active ON ministry.member_roles(is_active);

-- FELLOWSHIPS indexes
CREATE INDEX IF NOT EXISTS idx_fellowships_branch_id ON ministry.fellowships(branch_id);
CREATE INDEX IF NOT EXISTS idx_fellowships_leader_id ON ministry.fellowships(leader_id);
CREATE INDEX IF NOT EXISTS idx_fellowships_is_active ON ministry.fellowships(is_active);

-- FELLOWSHIP_MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_members_fellowship_id ON ministry.fellowship_members(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_members_member_id ON ministry.fellowship_members(member_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_members_is_active ON ministry.fellowship_members(is_active);

-- FELLOWSHIP_MEETINGS indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_meetings_fellowship_id ON ministry.fellowship_meetings(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meetings_meeting_date ON ministry.fellowship_meetings(meeting_date);

-- FELLOWSHIP_MEETING_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_meeting_id ON ministry.fellowship_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_member_id ON ministry.fellowship_meeting_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_status ON ministry.fellowship_meeting_attendance(attendance_status);

-- DEPARTMENTS indexes (no additional indexes needed - just PK)

-- BRANCH_DEPARTMENTS indexes
CREATE INDEX IF NOT EXISTS idx_branch_departments_branch_id ON ministry.branch_departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_department_id ON ministry.branch_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_lead_member_id ON ministry.branch_departments(lead_member_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_is_active ON ministry.branch_departments(is_active);

-- DEPARTMENT_MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_department_members_branch_department_id ON ministry.department_members(branch_department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_member_id ON ministry.department_members(member_id);
CREATE INDEX IF NOT EXISTS idx_department_members_is_active ON ministry.department_members(is_active);

-- DEPARTMENT_MEETINGS indexes
CREATE INDEX IF NOT EXISTS idx_department_meetings_branch_department_id ON ministry.department_meetings(branch_department_id);
CREATE INDEX IF NOT EXISTS idx_department_meetings_meeting_date ON ministry.department_meetings(meeting_date);

-- MEETING_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id ON ministry.meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member_id ON ministry.meeting_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_status ON ministry.meeting_attendance(attendance_status);

-- SERVICES indexes
CREATE INDEX IF NOT EXISTS idx_services_branch_id ON ministry.services(branch_id);
CREATE INDEX IF NOT EXISTS idx_services_service_date ON ministry.services(service_date);
CREATE INDEX IF NOT EXISTS idx_services_service_type ON ministry.services(service_type);

-- SERVICE_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_service_attendance_service_id ON ministry.service_attendance(service_id);
CREATE INDEX IF NOT EXISTS idx_service_attendance_member_id ON ministry.service_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_service_attendance_status ON ministry.service_attendance(attendance_status);

-- ############################################################################
-- OUTREACH SCHEMA INDEXES
-- ############################################################################

-- OUTREACH_PROGRAMS indexes
CREATE INDEX IF NOT EXISTS idx_outreach_programs_branch_id ON outreach.outreach_programs(branch_id);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_coordinator_id ON outreach.outreach_programs(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_program_date ON outreach.outreach_programs(program_date);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_is_completed ON outreach.outreach_programs(is_completed);

-- OUTREACH_PARTICIPANTS indexes
CREATE INDEX IF NOT EXISTS idx_outreach_participants_outreach_id ON outreach.outreach_participants(outreach_id);
CREATE INDEX IF NOT EXISTS idx_outreach_participants_member_id ON outreach.outreach_participants(member_id);

-- SOULS indexes
CREATE INDEX IF NOT EXISTS idx_souls_outreach_id ON outreach.souls(outreach_id);
CREATE INDEX IF NOT EXISTS idx_souls_assigned_member_id ON outreach.souls(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_souls_converted_to_member_id ON outreach.souls(converted_to_member_id);
CREATE INDEX IF NOT EXISTS idx_souls_status ON outreach.souls(status);
CREATE INDEX IF NOT EXISTS idx_souls_phone ON outreach.souls(phone);
CREATE INDEX IF NOT EXISTS idx_souls_email ON outreach.souls(email);

-- FOLLOW_UPS indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_soul_id ON outreach.follow_ups(soul_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_member_id ON outreach.follow_ups(member_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON outreach.follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact_status ON outreach.follow_ups(contact_status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_follow_up_date ON outreach.follow_ups(next_follow_up_date);

-- ############################################################################
-- FINANCE SCHEMA INDEXES
-- ############################################################################

-- DONATIONS indexes
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON finance.donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_branch_id ON finance.donations(branch_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON finance.donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_purpose ON finance.donations(donation_purpose);

-- ############################################################################
-- COMMS SCHEMA INDEXES
-- ############################################################################

-- NOTIFICATIONS indexes
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON comms.notifications(sent_by);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON comms.notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_target_scope ON comms.notifications(target_scope);
CREATE INDEX IF NOT EXISTS idx_notifications_target_branch_id ON comms.notifications(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_region_id ON comms.notifications(target_region_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_department_id ON comms.notifications(target_department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_fellowship_id ON comms.notifications(target_fellowship_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role_id ON comms.notifications(target_role_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_leadership_role ON comms.notifications(target_leadership_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON comms.notifications(is_active);

-- NOTIFICATION_RECIPIENTS indexes
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id ON comms.notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_member_id ON comms.notification_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_is_read ON comms.notification_recipients(is_read);

-- EVENTS indexes
CREATE INDEX IF NOT EXISTS idx_events_branch_id ON comms.events(branch_id);
CREATE INDEX IF NOT EXISTS idx_events_region_id ON comms.events(region_id);
CREATE INDEX IF NOT EXISTS idx_events_coordinator_id ON comms.events(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON comms.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON comms.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON comms.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON comms.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON comms.events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_requires_registration ON comms.events(requires_registration);

-- EVENT_ORGANIZERS indexes
CREATE INDEX IF NOT EXISTS idx_event_organizers_event_id ON comms.event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_member_id ON comms.event_organizers(member_id);

-- EVENT_NOTES indexes
CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON comms.event_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_author_id ON comms.event_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_note_type ON comms.event_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_event_notes_is_pinned ON comms.event_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_event_notes_created_at ON comms.event_notes(created_at);

-- EVENT_REGISTRATIONS indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON comms.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON comms.event_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON comms.event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_registration_date ON comms.event_registrations(registration_date);

-- ============================================================================
-- PARTIAL INDEXES (for specific query optimization)
-- ============================================================================

-- Partial unique index: only one current Main Pastor per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_leadership_current_pastor 
    ON core.branch_leadership(branch_id) 
    WHERE role = 'Main Pastor' AND is_current = TRUE;

-- Partial unique index: only one current role per member per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_leadership_current_member_role 
    ON core.branch_leadership(branch_id, member_id, role) 
    WHERE is_current = TRUE;

-- Partial unique index on phone where active
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone_active 
    ON core.members(phone) 
    WHERE phone IS NOT NULL AND is_active = TRUE;

-- Partial unique index: one active department instance per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_departments_active 
    ON ministry.branch_departments(branch_id, department_id) 
    WHERE is_active = TRUE;

-- Partial unique indexes for souls phone and email within same outreach
CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_phone_outreach 
    ON outreach.souls(phone, outreach_id) 
    WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_email_outreach 
    ON outreach.souls(email, outreach_id) 
    WHERE email IS NOT NULL;

-- ============================================================================
-- END OF INDEXES
-- ============================================================================
