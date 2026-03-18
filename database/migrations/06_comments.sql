-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 06_comments.sql
-- Purpose: Documentation comments for tables and columns
-- ============================================================================
-- Execution Order: 6 (Last - optional but recommended)
-- Dependencies: 02_tables.sql
-- Note: This script is IDEMPOTENT - COMMENT ON naturally replaces existing comments
-- ============================================================================

-- ############################################################################
-- CORE SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE dev.languages IS 'Store languages used in church services and communications';

COMMENT ON TABLE dev.regions IS 'Store geographical regions where branches are located';

COMMENT ON TABLE dev.branches IS 'Store church branch information across different regions';

COMMENT ON TABLE dev.members IS 'Store church member information';

COMMENT ON TABLE dev.branch_leadership IS 'Store pastor and elder assignments for each branch';

-- ############################################################################
-- MINISTRY SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE dev.roles IS 'Store church role definitions (e.g., Choir Member, Usher, Teacher)';

COMMENT ON TABLE dev.member_roles IS 'Store member role assignments (many-to-many relationship)';

COMMENT ON TABLE dev.fellowships IS 'Store fellowship group information';

COMMENT ON TABLE dev.fellowship_members IS 'Store member assignments to fellowships (many-to-many relationship)';

COMMENT ON TABLE dev.fellowship_meetings IS 'Store fellowship meeting information';

COMMENT ON TABLE dev.fellowship_meeting_attendance IS 'Store attendance records for fellowship meetings';

COMMENT ON TABLE dev.departments IS 'Store department definitions (common across all branches)';

COMMENT ON TABLE dev.branch_departments IS 'Link departments to specific branches with leadership assignments';

COMMENT ON TABLE dev.department_members IS 'Store member assignments to departments (many-to-many relationship)';

COMMENT ON TABLE dev.department_meetings IS 'Store department meeting information';

COMMENT ON TABLE dev.meeting_attendance IS 'Store attendance records for department meetings';

COMMENT ON TABLE dev.services IS 'Store weekly service information for each branch';

COMMENT ON TABLE dev.service_attendance IS 'Store attendance records for services';

-- ############################################################################
-- OUTREACH SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE dev.outreach_programs IS 'Store outreach program information and activities';

COMMENT ON TABLE dev.outreach_participants IS 'Store member participation in outreach programs';

COMMENT ON TABLE dev.souls IS 'Store information about new individuals reached through outreach';

COMMENT ON TABLE dev.follow_ups IS 'Store follow-up activities for souls';

-- ############################################################################
-- FINANCE SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE dev.donations IS 'Store member donation/giving records with purpose tracking';

-- ############################################################################
-- COMMS SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE dev.notifications IS 'Store notifications and announcements broadcast to members with targeting options';

COMMENT ON TABLE dev.notification_recipients IS 'Track notification delivery and read status per member';

COMMENT ON TABLE dev.events IS 'Store church-wide and branch events with scheduling and registration settings';

COMMENT ON TABLE dev.event_organizers IS 'Store organizing team members for events';

COMMENT ON TABLE dev.event_notes IS 'Store messages and notes logged by event organizers for collaboration';

COMMENT ON TABLE dev.event_registrations IS 'Store member registrations for events requiring sign-up with attendance tracking';

-- ============================================================================
-- END OF COMMENTS
-- ============================================================================
