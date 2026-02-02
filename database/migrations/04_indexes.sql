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
CREATE INDEX IF NOT EXISTS idx_languages_is_active ON dev.languages(is_active);

-- BRANCHES indexes
CREATE INDEX IF NOT EXISTS idx_branches_region_id ON dev.branches(region_id);
CREATE INDEX IF NOT EXISTS idx_branches_language_id ON dev.branches(language_id);

-- MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_members_home_branch_id ON dev.members(home_branch_id);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON dev.members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_name ON dev.members(last_name, first_name);

-- BRANCH_LEADERSHIP indexes
CREATE INDEX IF NOT EXISTS idx_branch_leadership_branch_id ON dev.branch_leadership(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_leadership_member_id ON dev.branch_leadership(member_id);
CREATE INDEX IF NOT EXISTS idx_branch_leadership_is_current ON dev.branch_leadership(is_current);

-- ############################################################################
-- MINISTRY SCHEMA INDEXES
-- ############################################################################

-- ROLES indexes
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON dev.roles(is_active);

-- MEMBER_ROLES indexes
CREATE INDEX IF NOT EXISTS idx_member_roles_member_id ON dev.member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON dev.member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_branch_id ON dev.member_roles(branch_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_is_active ON dev.member_roles(is_active);

-- FELLOWSHIPS indexes
CREATE INDEX IF NOT EXISTS idx_fellowships_branch_id ON dev.fellowships(branch_id);
CREATE INDEX IF NOT EXISTS idx_fellowships_leader_id ON dev.fellowships(leader_id);
CREATE INDEX IF NOT EXISTS idx_fellowships_is_active ON dev.fellowships(is_active);

-- FELLOWSHIP_MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_members_fellowship_id ON dev.fellowship_members(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_members_member_id ON dev.fellowship_members(member_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_members_is_active ON dev.fellowship_members(is_active);

-- FELLOWSHIP_MEETINGS indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_meetings_fellowship_id ON dev.fellowship_meetings(fellowship_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meetings_meeting_date ON dev.fellowship_meetings(meeting_date);

-- FELLOWSHIP_MEETING_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_meeting_id ON dev.fellowship_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_member_id ON dev.fellowship_meeting_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_meeting_attendance_status ON dev.fellowship_meeting_attendance(attendance_status);

-- DEPARTMENTS indexes (no additional indexes needed - just PK)

-- BRANCH_DEPARTMENTS indexes
CREATE INDEX IF NOT EXISTS idx_branch_departments_branch_id ON dev.branch_departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_department_id ON dev.branch_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_lead_member_id ON dev.branch_departments(lead_member_id);
CREATE INDEX IF NOT EXISTS idx_branch_departments_is_active ON dev.branch_departments(is_active);

-- DEPARTMENT_MEMBERS indexes
CREATE INDEX IF NOT EXISTS idx_department_members_branch_department_id ON dev.department_members(branch_department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_member_id ON dev.department_members(member_id);
CREATE INDEX IF NOT EXISTS idx_department_members_is_active ON dev.department_members(is_active);

-- DEPARTMENT_MEETINGS indexes
CREATE INDEX IF NOT EXISTS idx_department_meetings_branch_department_id ON dev.department_meetings(branch_department_id);
CREATE INDEX IF NOT EXISTS idx_department_meetings_meeting_date ON dev.department_meetings(meeting_date);

-- MEETING_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id ON dev.meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member_id ON dev.meeting_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_status ON dev.meeting_attendance(attendance_status);

-- SERVICES indexes
CREATE INDEX IF NOT EXISTS idx_services_branch_id ON dev.services(branch_id);
CREATE INDEX IF NOT EXISTS idx_services_service_date ON dev.services(service_date);
CREATE INDEX IF NOT EXISTS idx_services_service_type ON dev.services(service_type);

-- SERVICE_ATTENDANCE indexes
CREATE INDEX IF NOT EXISTS idx_service_attendance_service_id ON dev.service_attendance(service_id);
CREATE INDEX IF NOT EXISTS idx_service_attendance_member_id ON dev.service_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_service_attendance_status ON dev.service_attendance(attendance_status);

-- ############################################################################
-- OUTREACH SCHEMA INDEXES
-- ############################################################################

-- OUTREACH_PROGRAMS indexes
CREATE INDEX IF NOT EXISTS idx_outreach_programs_branch_id ON dev.outreach_programs(branch_id);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_coordinator_id ON dev.outreach_programs(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_program_date ON dev.outreach_programs(program_date);
CREATE INDEX IF NOT EXISTS idx_outreach_programs_is_completed ON dev.outreach_programs(is_completed);

-- OUTREACH_PARTICIPANTS indexes
CREATE INDEX IF NOT EXISTS idx_outreach_participants_outreach_id ON dev.outreach_participants(outreach_id);
CREATE INDEX IF NOT EXISTS idx_outreach_participants_member_id ON dev.outreach_participants(member_id);

-- SOULS indexes
CREATE INDEX IF NOT EXISTS idx_souls_outreach_id ON dev.souls(outreach_id);
CREATE INDEX IF NOT EXISTS idx_souls_assigned_member_id ON dev.souls(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_souls_converted_to_member_id ON dev.souls(converted_to_member_id);
CREATE INDEX IF NOT EXISTS idx_souls_status ON dev.souls(status);
CREATE INDEX IF NOT EXISTS idx_souls_phone ON dev.souls(phone);
CREATE INDEX IF NOT EXISTS idx_souls_email ON dev.souls(email);

-- FOLLOW_UPS indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_soul_id ON dev.follow_ups(soul_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_member_id ON dev.follow_ups(member_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON dev.follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact_status ON dev.follow_ups(contact_status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_follow_up_date ON dev.follow_ups(next_follow_up_date);

-- ############################################################################
-- FINANCE SCHEMA INDEXES
-- ############################################################################

-- DONATIONS indexes
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON dev.donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_branch_id ON dev.donations(branch_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON dev.donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_purpose ON dev.donations(donation_purpose);

-- ############################################################################
-- COMMS SCHEMA INDEXES
-- ############################################################################

-- NOTIFICATIONS indexes
CREATE INDEX IF NOT EXISTS idx_notifications_sent_by ON dev.notifications(sent_by);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON dev.notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_target_scope ON dev.notifications(target_scope);
CREATE INDEX IF NOT EXISTS idx_notifications_target_branch_id ON dev.notifications(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_region_id ON dev.notifications(target_region_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_department_id ON dev.notifications(target_department_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_fellowship_id ON dev.notifications(target_fellowship_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role_id ON dev.notifications(target_role_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_leadership_role ON dev.notifications(target_leadership_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON dev.notifications(is_active);

-- NOTIFICATION_RECIPIENTS indexes
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id ON dev.notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_member_id ON dev.notification_recipients(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_is_read ON dev.notification_recipients(is_read);

-- EVENTS indexes
CREATE INDEX IF NOT EXISTS idx_events_branch_id ON dev.events(branch_id);
CREATE INDEX IF NOT EXISTS idx_events_region_id ON dev.events(region_id);
CREATE INDEX IF NOT EXISTS idx_events_coordinator_id ON dev.events(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON dev.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON dev.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON dev.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON dev.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON dev.events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_requires_registration ON dev.events(requires_registration);

-- EVENT_ORGANIZERS indexes
CREATE INDEX IF NOT EXISTS idx_event_organizers_event_id ON dev.event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_member_id ON dev.event_organizers(member_id);

-- EVENT_NOTES indexes
CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON dev.event_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_author_id ON dev.event_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_note_type ON dev.event_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_event_notes_is_pinned ON dev.event_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_event_notes_created_at ON dev.event_notes(created_at);

-- EVENT_REGISTRATIONS indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON dev.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON dev.event_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON dev.event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_registration_date ON dev.event_registrations(registration_date);

-- ============================================================================
-- PARTIAL INDEXES (for specific query optimization)
-- ============================================================================

-- Partial unique index: only one current Main Pastor per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_leadership_current_pastor 
    ON dev.branch_leadership(branch_id) 
    WHERE role = 'Main Pastor' AND is_current = TRUE;

-- Partial unique index: only one current role per member per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_leadership_current_member_role 
    ON dev.branch_leadership(branch_id, member_id, role) 
    WHERE is_current = TRUE;

-- Partial unique index on phone where active
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone_active 
    ON dev.members(phone) 
    WHERE phone IS NOT NULL AND is_active = TRUE;

-- Partial unique index: one active department instance per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_departments_active 
    ON dev.branch_departments(branch_id, department_id) 
    WHERE is_active = TRUE;

-- Partial unique indexes for souls phone and email within same outreach
CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_phone_outreach 
    ON dev.souls(phone, outreach_id) 
    WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_email_outreach 
    ON dev.souls(email, outreach_id) 
    WHERE email IS NOT NULL;

-- ============================================================================
-- END OF INDEXES
-- ============================================================================
