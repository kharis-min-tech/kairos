-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 04_indexes.sql
-- Purpose: Performance indexes for query optimization
-- ============================================================================
-- Execution Order: 4 (After constraints)
-- Dependencies: 02_tables.sql, 03_constraints.sql
-- Note: Primary key and unique constraint indexes are created automatically
-- ============================================================================

-- ============================================================================
-- STANDARD INDEXES
-- ============================================================================

-- LANGUAGES indexes
CREATE INDEX idx_languages_is_active ON languages(is_active);

-- BRANCHES indexes
CREATE INDEX idx_branches_region_id ON branches(region_id);
CREATE INDEX idx_branches_language_id ON branches(language_id);

-- MEMBERS indexes
CREATE INDEX idx_members_home_branch_id ON members(home_branch_id);
CREATE INDEX idx_members_is_active ON members(is_active);
CREATE INDEX idx_members_name ON members(last_name, first_name);

-- BRANCH_LEADERSHIP indexes
CREATE INDEX idx_branch_leadership_branch_id ON branch_leadership(branch_id);
CREATE INDEX idx_branch_leadership_member_id ON branch_leadership(member_id);
CREATE INDEX idx_branch_leadership_is_current ON branch_leadership(is_current);

-- ROLES indexes
CREATE INDEX idx_roles_is_active ON roles(is_active);

-- MEMBER_ROLES indexes
CREATE INDEX idx_member_roles_member_id ON member_roles(member_id);
CREATE INDEX idx_member_roles_role_id ON member_roles(role_id);
CREATE INDEX idx_member_roles_branch_id ON member_roles(branch_id);
CREATE INDEX idx_member_roles_is_active ON member_roles(is_active);

-- FELLOWSHIPS indexes
CREATE INDEX idx_fellowships_branch_id ON fellowships(branch_id);
CREATE INDEX idx_fellowships_leader_id ON fellowships(leader_id);
CREATE INDEX idx_fellowships_is_active ON fellowships(is_active);

-- FELLOWSHIP_MEMBERS indexes
CREATE INDEX idx_fellowship_members_fellowship_id ON fellowship_members(fellowship_id);
CREATE INDEX idx_fellowship_members_member_id ON fellowship_members(member_id);
CREATE INDEX idx_fellowship_members_is_active ON fellowship_members(is_active);

-- FELLOWSHIP_MEETINGS indexes
CREATE INDEX idx_fellowship_meetings_fellowship_id ON fellowship_meetings(fellowship_id);
CREATE INDEX idx_fellowship_meetings_meeting_date ON fellowship_meetings(meeting_date);

-- FELLOWSHIP_MEETING_ATTENDANCE indexes
CREATE INDEX idx_fellowship_meeting_attendance_meeting_id ON fellowship_meeting_attendance(meeting_id);
CREATE INDEX idx_fellowship_meeting_attendance_member_id ON fellowship_meeting_attendance(member_id);
CREATE INDEX idx_fellowship_meeting_attendance_status ON fellowship_meeting_attendance(attendance_status);

-- OUTREACH_PROGRAMS indexes
CREATE INDEX idx_outreach_programs_branch_id ON outreach_programs(branch_id);
CREATE INDEX idx_outreach_programs_coordinator_id ON outreach_programs(coordinator_id);
CREATE INDEX idx_outreach_programs_program_date ON outreach_programs(program_date);
CREATE INDEX idx_outreach_programs_is_completed ON outreach_programs(is_completed);

-- SOULS indexes
CREATE INDEX idx_souls_outreach_id ON souls(outreach_id);
CREATE INDEX idx_souls_assigned_member_id ON souls(assigned_member_id);
CREATE INDEX idx_souls_converted_to_member_id ON souls(converted_to_member_id);
CREATE INDEX idx_souls_status ON souls(status);
CREATE INDEX idx_souls_phone ON souls(phone);
CREATE INDEX idx_souls_email ON souls(email);

-- FOLLOW_UPS indexes
CREATE INDEX idx_follow_ups_soul_id ON follow_ups(soul_id);
CREATE INDEX idx_follow_ups_member_id ON follow_ups(member_id);
CREATE INDEX idx_follow_ups_follow_up_date ON follow_ups(follow_up_date);
CREATE INDEX idx_follow_ups_contact_status ON follow_ups(contact_status);
CREATE INDEX idx_follow_ups_next_follow_up_date ON follow_ups(next_follow_up_date);

-- OUTREACH_PARTICIPANTS indexes
CREATE INDEX idx_outreach_participants_outreach_id ON outreach_participants(outreach_id);
CREATE INDEX idx_outreach_participants_member_id ON outreach_participants(member_id);

-- BRANCH_DEPARTMENTS indexes
CREATE INDEX idx_branch_departments_branch_id ON branch_departments(branch_id);
CREATE INDEX idx_branch_departments_department_id ON branch_departments(department_id);
CREATE INDEX idx_branch_departments_lead_member_id ON branch_departments(lead_member_id);
CREATE INDEX idx_branch_departments_is_active ON branch_departments(is_active);

-- DEPARTMENT_MEMBERS indexes
CREATE INDEX idx_department_members_branch_department_id ON department_members(branch_department_id);
CREATE INDEX idx_department_members_member_id ON department_members(member_id);
CREATE INDEX idx_department_members_is_active ON department_members(is_active);

-- DEPARTMENT_MEETINGS indexes
CREATE INDEX idx_department_meetings_branch_department_id ON department_meetings(branch_department_id);
CREATE INDEX idx_department_meetings_meeting_date ON department_meetings(meeting_date);

-- MEETING_ATTENDANCE indexes
CREATE INDEX idx_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_member_id ON meeting_attendance(member_id);
CREATE INDEX idx_meeting_attendance_status ON meeting_attendance(attendance_status);

-- SERVICES indexes
CREATE INDEX idx_services_branch_id ON services(branch_id);
CREATE INDEX idx_services_service_date ON services(service_date);
CREATE INDEX idx_services_service_type ON services(service_type);

-- SERVICE_ATTENDANCE indexes
CREATE INDEX idx_service_attendance_service_id ON service_attendance(service_id);
CREATE INDEX idx_service_attendance_member_id ON service_attendance(member_id);
CREATE INDEX idx_service_attendance_status ON service_attendance(attendance_status);

-- DONATIONS indexes
CREATE INDEX idx_donations_member_id ON donations(member_id);
CREATE INDEX idx_donations_branch_id ON donations(branch_id);
CREATE INDEX idx_donations_donation_date ON donations(donation_date);
CREATE INDEX idx_donations_purpose ON donations(donation_purpose);

-- NOTIFICATIONS indexes
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

-- NOTIFICATION_RECIPIENTS indexes
CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_member_id ON notification_recipients(member_id);
CREATE INDEX idx_notification_recipients_is_read ON notification_recipients(is_read);

-- EVENTS indexes
CREATE INDEX idx_events_branch_id ON events(branch_id);
CREATE INDEX idx_events_region_id ON events(region_id);
CREATE INDEX idx_events_coordinator_id ON events(coordinator_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_requires_registration ON events(requires_registration);

-- EVENT_ORGANIZERS indexes
CREATE INDEX idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX idx_event_organizers_member_id ON event_organizers(member_id);

-- EVENT_NOTES indexes
CREATE INDEX idx_event_notes_event_id ON event_notes(event_id);
CREATE INDEX idx_event_notes_author_id ON event_notes(author_id);
CREATE INDEX idx_event_notes_note_type ON event_notes(note_type);
CREATE INDEX idx_event_notes_is_pinned ON event_notes(is_pinned);
CREATE INDEX idx_event_notes_created_at ON event_notes(created_at);

-- EVENT_REGISTRATIONS indexes
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_member_id ON event_registrations(member_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX idx_event_registrations_registration_date ON event_registrations(registration_date);

-- ============================================================================
-- PARTIAL INDEXES (Conditional indexes for specific queries)
-- ============================================================================

-- Partial unique index on phone where active
CREATE UNIQUE INDEX idx_members_phone_active 
    ON members(phone) 
    WHERE phone IS NOT NULL AND is_active = TRUE;

-- Partial unique index: only one current Main Pastor per branch
CREATE UNIQUE INDEX idx_branch_leadership_current_pastor 
    ON branch_leadership(branch_id) 
    WHERE role = 'Main Pastor' AND is_current = TRUE;

-- Partial unique index: only one current role per member per branch
CREATE UNIQUE INDEX idx_branch_leadership_current_member_role 
    ON branch_leadership(branch_id, member_id, role) 
    WHERE is_current = TRUE;

-- Partial unique indexes for phone and email within same outreach
CREATE UNIQUE INDEX idx_souls_phone_outreach 
    ON souls(phone, outreach_id) 
    WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX idx_souls_email_outreach 
    ON souls(email, outreach_id) 
    WHERE email IS NOT NULL;

-- Partial unique index: one active department instance per branch
CREATE UNIQUE INDEX idx_branch_departments_active 
    ON branch_departments(branch_id, department_id) 
    WHERE is_active = TRUE;

-- ============================================================================
-- END OF INDEXES
-- ============================================================================
