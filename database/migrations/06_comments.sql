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

COMMENT ON TABLE core.languages IS 'Store languages used in church services and communications';

COMMENT ON TABLE core.regions IS 'Store geographical regions where branches are located';

COMMENT ON TABLE core.branches IS 'Store church branch information across different regions';

COMMENT ON TABLE core.members IS 'Store church member information';

COMMENT ON TABLE core.branch_leadership IS 'Store pastor and elder assignments for each branch';

-- ############################################################################
-- MINISTRY SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE ministry.roles IS 'Store church role definitions (e.g., Choir Member, Usher, Teacher)';

COMMENT ON TABLE ministry.member_roles IS 'Store member role assignments (many-to-many relationship)';

COMMENT ON TABLE ministry.fellowships IS 'Store fellowship group information';

COMMENT ON TABLE ministry.fellowship_members IS 'Store member assignments to fellowships (many-to-many relationship)';

COMMENT ON TABLE ministry.fellowship_meetings IS 'Store fellowship meeting information';

COMMENT ON TABLE ministry.fellowship_meeting_attendance IS 'Store attendance records for fellowship meetings';

COMMENT ON TABLE ministry.departments IS 'Store department definitions (common across all branches)';

COMMENT ON TABLE ministry.branch_departments IS 'Link departments to specific branches with leadership assignments';

COMMENT ON TABLE ministry.department_members IS 'Store member assignments to departments (many-to-many relationship)';

COMMENT ON TABLE ministry.department_meetings IS 'Store department meeting information';

COMMENT ON TABLE ministry.meeting_attendance IS 'Store attendance records for department meetings';

COMMENT ON TABLE ministry.services IS 'Store weekly service information for each branch';

COMMENT ON TABLE ministry.service_attendance IS 'Store attendance records for services';

-- ############################################################################
-- OUTREACH SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE outreach.outreach_programs IS 'Store outreach program information and activities';

COMMENT ON TABLE outreach.outreach_participants IS 'Store member participation in outreach programs';

COMMENT ON TABLE outreach.souls IS 'Store information about new individuals reached through outreach';

COMMENT ON TABLE outreach.follow_ups IS 'Store follow-up activities for souls';

-- ############################################################################
-- FINANCE SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE finance.donations IS 'Store member donation/giving records with purpose tracking';

-- ############################################################################
-- COMMS SCHEMA COMMENTS
-- ############################################################################

COMMENT ON TABLE comms.notifications IS 'Store notifications and announcements broadcast to members with targeting options';

COMMENT ON TABLE comms.notification_recipients IS 'Track notification delivery and read status per member';

COMMENT ON TABLE comms.events IS 'Store church-wide and branch events with scheduling and registration settings';

COMMENT ON TABLE comms.event_organizers IS 'Store organizing team members for events';

COMMENT ON TABLE comms.event_notes IS 'Store messages and notes logged by event organizers for collaboration';

COMMENT ON TABLE comms.event_registrations IS 'Store member registrations for events requiring sign-up with attendance tracking';

-- ============================================================================
-- END OF COMMENTS
-- ============================================================================
