-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 06_comments.sql
-- Purpose: Documentation comments for tables and columns
-- ============================================================================
-- Execution Order: 6 (Last - optional but recommended)
-- Dependencies: 02_tables.sql
-- ============================================================================

-- Table comments provide documentation visible in database metadata

COMMENT ON TABLE languages IS 'Store languages used in church services and communications';

COMMENT ON TABLE regions IS 'Store geographical regions where branches are located';

COMMENT ON TABLE branches IS 'Store church branch information across different regions';

COMMENT ON TABLE members IS 'Store church member information';

COMMENT ON TABLE branch_leadership IS 'Store pastor and elder assignments for each branch';

COMMENT ON TABLE roles IS 'Store church role definitions (e.g., Choir Member, Usher, Teacher)';

COMMENT ON TABLE member_roles IS 'Store member role assignments (many-to-many relationship)';

COMMENT ON TABLE fellowships IS 'Store fellowship group information';

COMMENT ON TABLE fellowship_members IS 'Store member assignments to fellowships (many-to-many relationship)';

COMMENT ON TABLE fellowship_meetings IS 'Store fellowship meeting information';

COMMENT ON TABLE fellowship_meeting_attendance IS 'Store attendance records for fellowship meetings';

COMMENT ON TABLE departments IS 'Store department definitions (common across all branches)';

COMMENT ON TABLE outreach_programs IS 'Store outreach program information and activities';

COMMENT ON TABLE souls IS 'Store information about new individuals reached through outreach';

COMMENT ON TABLE follow_ups IS 'Store follow-up activities for souls';

COMMENT ON TABLE outreach_participants IS 'Store member participation in outreach programs';

COMMENT ON TABLE branch_departments IS 'Link departments to specific branches with leadership assignments';

COMMENT ON TABLE department_members IS 'Store member assignments to departments (many-to-many relationship)';

COMMENT ON TABLE department_meetings IS 'Store department meeting information';

COMMENT ON TABLE meeting_attendance IS 'Store attendance records for department meetings';

COMMENT ON TABLE services IS 'Store weekly service information for each branch';

COMMENT ON TABLE service_attendance IS 'Store attendance records for services';

COMMENT ON TABLE donations IS 'Store member donation/giving records with purpose tracking';

COMMENT ON TABLE notifications IS 'Store notifications and announcements broadcast to members with targeting options';

COMMENT ON TABLE notification_recipients IS 'Track notification delivery and read status per member';

COMMENT ON TABLE events IS 'Store church-wide and branch events with scheduling and registration settings';

COMMENT ON TABLE event_organizers IS 'Store organizing team members for events';

COMMENT ON TABLE event_notes IS 'Store messages and notes logged by event organizers for collaboration';

COMMENT ON TABLE event_registrations IS 'Store member registrations for events requiring sign-up with attendance tracking';

-- ============================================================================
-- END OF COMMENTS
-- ============================================================================
