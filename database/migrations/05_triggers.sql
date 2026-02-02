-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 05_triggers.sql
-- Purpose: Trigger definitions for automated column updates
-- ============================================================================
-- Execution Order: 5 (After indexes)
-- Dependencies: 01_functions.sql, 02_tables.sql
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- All triggers use the public.update_updated_at_column() function to maintain
-- the updated_at timestamp whenever a record is modified

-- ############################################################################
-- CORE SCHEMA TRIGGERS
-- ############################################################################

-- LANGUAGES trigger
DROP TRIGGER IF EXISTS languages_updated_at ON core.languages;
CREATE TRIGGER languages_updated_at
    BEFORE UPDATE ON core.languages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- REGIONS trigger
DROP TRIGGER IF EXISTS regions_updated_at ON core.regions;
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE ON core.regions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCHES trigger
DROP TRIGGER IF EXISTS branches_updated_at ON core.branches;
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON core.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBERS trigger
DROP TRIGGER IF EXISTS members_updated_at ON core.members;
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON core.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCH_LEADERSHIP trigger
DROP TRIGGER IF EXISTS branch_leadership_updated_at ON core.branch_leadership;
CREATE TRIGGER branch_leadership_updated_at
    BEFORE UPDATE ON core.branch_leadership
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- MINISTRY SCHEMA TRIGGERS
-- ############################################################################

-- ROLES trigger
DROP TRIGGER IF EXISTS roles_updated_at ON ministry.roles;
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON ministry.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER_ROLES trigger
DROP TRIGGER IF EXISTS member_roles_updated_at ON ministry.member_roles;
CREATE TRIGGER member_roles_updated_at
    BEFORE UPDATE ON ministry.member_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIPS trigger
DROP TRIGGER IF EXISTS fellowships_updated_at ON ministry.fellowships;
CREATE TRIGGER fellowships_updated_at
    BEFORE UPDATE ON ministry.fellowships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIP_MEMBERS trigger
DROP TRIGGER IF EXISTS fellowship_members_updated_at ON ministry.fellowship_members;
CREATE TRIGGER fellowship_members_updated_at
    BEFORE UPDATE ON ministry.fellowship_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIP_MEETINGS trigger
DROP TRIGGER IF EXISTS fellowship_meetings_updated_at ON ministry.fellowship_meetings;
CREATE TRIGGER fellowship_meetings_updated_at
    BEFORE UPDATE ON ministry.fellowship_meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENTS trigger
DROP TRIGGER IF EXISTS departments_updated_at ON ministry.departments;
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON ministry.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCH_DEPARTMENTS trigger
DROP TRIGGER IF EXISTS branch_departments_updated_at ON ministry.branch_departments;
CREATE TRIGGER branch_departments_updated_at
    BEFORE UPDATE ON ministry.branch_departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENT_MEMBERS trigger
DROP TRIGGER IF EXISTS department_members_updated_at ON ministry.department_members;
CREATE TRIGGER department_members_updated_at
    BEFORE UPDATE ON ministry.department_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENT_MEETINGS trigger
DROP TRIGGER IF EXISTS department_meetings_updated_at ON ministry.department_meetings;
CREATE TRIGGER department_meetings_updated_at
    BEFORE UPDATE ON ministry.department_meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- SERVICES trigger
DROP TRIGGER IF EXISTS services_updated_at ON ministry.services;
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON ministry.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- OUTREACH SCHEMA TRIGGERS
-- ############################################################################

-- OUTREACH_PROGRAMS trigger
DROP TRIGGER IF EXISTS outreach_programs_updated_at ON outreach.outreach_programs;
CREATE TRIGGER outreach_programs_updated_at
    BEFORE UPDATE ON outreach.outreach_programs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- SOULS trigger
DROP TRIGGER IF EXISTS souls_updated_at ON outreach.souls;
CREATE TRIGGER souls_updated_at
    BEFORE UPDATE ON outreach.souls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FOLLOW_UPS trigger
DROP TRIGGER IF EXISTS follow_ups_updated_at ON outreach.follow_ups;
CREATE TRIGGER follow_ups_updated_at
    BEFORE UPDATE ON outreach.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- FINANCE SCHEMA TRIGGERS
-- ############################################################################

-- DONATIONS trigger
DROP TRIGGER IF EXISTS donations_updated_at ON finance.donations;
CREATE TRIGGER donations_updated_at
    BEFORE UPDATE ON finance.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- COMMS SCHEMA TRIGGERS
-- ############################################################################

-- NOTIFICATIONS trigger
DROP TRIGGER IF EXISTS notifications_updated_at ON comms.notifications;
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON comms.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENTS trigger
DROP TRIGGER IF EXISTS events_updated_at ON comms.events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON comms.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENT_NOTES trigger
DROP TRIGGER IF EXISTS event_notes_updated_at ON comms.event_notes;
CREATE TRIGGER event_notes_updated_at
    BEFORE UPDATE ON comms.event_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENT_REGISTRATIONS trigger
DROP TRIGGER IF EXISTS event_registrations_updated_at ON comms.event_registrations;
CREATE TRIGGER event_registrations_updated_at
    BEFORE UPDATE ON comms.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- END OF TRIGGERS
-- ============================================================================
