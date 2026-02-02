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
DROP TRIGGER IF EXISTS languages_updated_at ON dev.languages;
CREATE TRIGGER languages_updated_at
    BEFORE UPDATE ON dev.languages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- REGIONS trigger
DROP TRIGGER IF EXISTS regions_updated_at ON dev.regions;
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE ON dev.regions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCHES trigger
DROP TRIGGER IF EXISTS branches_updated_at ON dev.branches;
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON dev.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBERS trigger
DROP TRIGGER IF EXISTS members_updated_at ON dev.members;
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON dev.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCH_LEADERSHIP trigger
DROP TRIGGER IF EXISTS branch_leadership_updated_at ON dev.branch_leadership;
CREATE TRIGGER branch_leadership_updated_at
    BEFORE UPDATE ON dev.branch_leadership
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- MINISTRY SCHEMA TRIGGERS
-- ############################################################################

-- ROLES trigger
DROP TRIGGER IF EXISTS roles_updated_at ON dev.roles;
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON dev.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER_ROLES trigger
DROP TRIGGER IF EXISTS member_roles_updated_at ON dev.member_roles;
CREATE TRIGGER member_roles_updated_at
    BEFORE UPDATE ON dev.member_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIPS trigger
DROP TRIGGER IF EXISTS fellowships_updated_at ON dev.fellowships;
CREATE TRIGGER fellowships_updated_at
    BEFORE UPDATE ON dev.fellowships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIP_MEMBERS trigger
DROP TRIGGER IF EXISTS fellowship_members_updated_at ON dev.fellowship_members;
CREATE TRIGGER fellowship_members_updated_at
    BEFORE UPDATE ON dev.fellowship_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FELLOWSHIP_MEETINGS trigger
DROP TRIGGER IF EXISTS fellowship_meetings_updated_at ON dev.fellowship_meetings;
CREATE TRIGGER fellowship_meetings_updated_at
    BEFORE UPDATE ON dev.fellowship_meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENTS trigger
DROP TRIGGER IF EXISTS departments_updated_at ON dev.departments;
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON dev.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- BRANCH_DEPARTMENTS trigger
DROP TRIGGER IF EXISTS branch_departments_updated_at ON dev.branch_departments;
CREATE TRIGGER branch_departments_updated_at
    BEFORE UPDATE ON dev.branch_departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENT_MEMBERS trigger
DROP TRIGGER IF EXISTS department_members_updated_at ON dev.department_members;
CREATE TRIGGER department_members_updated_at
    BEFORE UPDATE ON dev.department_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- DEPARTMENT_MEETINGS trigger
DROP TRIGGER IF EXISTS department_meetings_updated_at ON dev.department_meetings;
CREATE TRIGGER department_meetings_updated_at
    BEFORE UPDATE ON dev.department_meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- SERVICES trigger
DROP TRIGGER IF EXISTS services_updated_at ON dev.services;
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON dev.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- OUTREACH SCHEMA TRIGGERS
-- ############################################################################

-- OUTREACH_PROGRAMS trigger
DROP TRIGGER IF EXISTS outreach_programs_updated_at ON dev.outreach_programs;
CREATE TRIGGER outreach_programs_updated_at
    BEFORE UPDATE ON dev.outreach_programs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- SOULS trigger
DROP TRIGGER IF EXISTS souls_updated_at ON dev.souls;
CREATE TRIGGER souls_updated_at
    BEFORE UPDATE ON dev.souls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- FOLLOW_UPS trigger
DROP TRIGGER IF EXISTS follow_ups_updated_at ON dev.follow_ups;
CREATE TRIGGER follow_ups_updated_at
    BEFORE UPDATE ON dev.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- FINANCE SCHEMA TRIGGERS
-- ############################################################################

-- DONATIONS trigger
DROP TRIGGER IF EXISTS donations_updated_at ON dev.donations;
CREATE TRIGGER donations_updated_at
    BEFORE UPDATE ON dev.donations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ############################################################################
-- COMMS SCHEMA TRIGGERS
-- ############################################################################

-- NOTIFICATIONS trigger
DROP TRIGGER IF EXISTS notifications_updated_at ON dev.notifications;
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON dev.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENTS trigger
DROP TRIGGER IF EXISTS events_updated_at ON dev.events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON dev.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENT_NOTES trigger
DROP TRIGGER IF EXISTS event_notes_updated_at ON dev.event_notes;
CREATE TRIGGER event_notes_updated_at
    BEFORE UPDATE ON dev.event_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- EVENT_REGISTRATIONS trigger
DROP TRIGGER IF EXISTS event_registrations_updated_at ON dev.event_registrations;
CREATE TRIGGER event_registrations_updated_at
    BEFORE UPDATE ON dev.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- END OF TRIGGERS
-- ============================================================================
