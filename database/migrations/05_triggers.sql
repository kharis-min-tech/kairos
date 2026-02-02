-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 05_triggers.sql
-- Purpose: Trigger definitions for automated column updates
-- ============================================================================
-- Execution Order: 5 (After indexes)
-- Dependencies: 01_functions.sql, 02_tables.sql
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- All triggers use the update_updated_at_column() function to maintain
-- the updated_at timestamp whenever a record is modified

-- LANGUAGES trigger
DROP TRIGGER IF EXISTS languages_updated_at ON languages;
CREATE TRIGGER languages_updated_at
    BEFORE UPDATE ON languages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- REGIONS trigger
DROP TRIGGER IF EXISTS regions_updated_at ON regions;
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCHES trigger
DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MEMBERS trigger
DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCH_LEADERSHIP trigger
DROP TRIGGER IF EXISTS branch_leadership_updated_at ON branch_leadership;
CREATE TRIGGER branch_leadership_updated_at
    BEFORE UPDATE ON branch_leadership
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROLES trigger
DROP TRIGGER IF EXISTS roles_updated_at ON roles;
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MEMBER_ROLES trigger
DROP TRIGGER IF EXISTS member_roles_updated_at ON member_roles;
CREATE TRIGGER member_roles_updated_at
    BEFORE UPDATE ON member_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIPS trigger
DROP TRIGGER IF EXISTS fellowships_updated_at ON fellowships;
CREATE TRIGGER fellowships_updated_at
    BEFORE UPDATE ON fellowships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIP_MEMBERS trigger
DROP TRIGGER IF EXISTS fellowship_members_updated_at ON fellowship_members;
CREATE TRIGGER fellowship_members_updated_at
    BEFORE UPDATE ON fellowship_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIP_MEETINGS trigger
DROP TRIGGER IF EXISTS fellowship_meetings_updated_at ON fellowship_meetings;
CREATE TRIGGER fellowship_meetings_updated_at
    BEFORE UPDATE ON fellowship_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENTS trigger
DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- OUTREACH_PROGRAMS trigger
DROP TRIGGER IF EXISTS outreach_programs_updated_at ON outreach_programs;
CREATE TRIGGER outreach_programs_updated_at
    BEFORE UPDATE ON outreach_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SOULS trigger
DROP TRIGGER IF EXISTS souls_updated_at ON souls;
CREATE TRIGGER souls_updated_at
    BEFORE UPDATE ON souls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FOLLOW_UPS trigger
DROP TRIGGER IF EXISTS follow_ups_updated_at ON follow_ups;
CREATE TRIGGER follow_ups_updated_at
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCH_DEPARTMENTS trigger
DROP TRIGGER IF EXISTS branch_departments_updated_at ON branch_departments;
CREATE TRIGGER branch_departments_updated_at
    BEFORE UPDATE ON branch_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENT_MEMBERS trigger
DROP TRIGGER IF EXISTS department_members_updated_at ON department_members;
CREATE TRIGGER department_members_updated_at
    BEFORE UPDATE ON department_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENT_MEETINGS trigger
DROP TRIGGER IF EXISTS department_meetings_updated_at ON department_meetings;
CREATE TRIGGER department_meetings_updated_at
    BEFORE UPDATE ON department_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SERVICES trigger
DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DONATIONS trigger
DROP TRIGGER IF EXISTS donations_updated_at ON donations;
CREATE TRIGGER donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- NOTIFICATIONS trigger
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENTS trigger
DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENT_NOTES trigger
DROP TRIGGER IF EXISTS event_notes_updated_at ON event_notes;
CREATE TRIGGER event_notes_updated_at
    BEFORE UPDATE ON event_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENT_REGISTRATIONS trigger
DROP TRIGGER IF EXISTS event_registrations_updated_at ON event_registrations;
CREATE TRIGGER event_registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF TRIGGERS
-- ============================================================================
