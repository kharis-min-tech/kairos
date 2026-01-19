-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 05_triggers.sql
-- Purpose: Trigger definitions for automated column updates
-- ============================================================================
-- Execution Order: 5 (After indexes)
-- Dependencies: 01_functions.sql, 02_tables.sql
-- ============================================================================

-- All triggers use the update_updated_at_column() function to maintain
-- the updated_at timestamp whenever a record is modified

-- LANGUAGES trigger
CREATE TRIGGER languages_updated_at
    BEFORE UPDATE ON languages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- REGIONS trigger
CREATE TRIGGER regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCHES trigger
CREATE TRIGGER branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MEMBERS trigger
CREATE TRIGGER members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCH_LEADERSHIP trigger
CREATE TRIGGER branch_leadership_updated_at
    BEFORE UPDATE ON branch_leadership
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROLES trigger
CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MEMBER_ROLES trigger
CREATE TRIGGER member_roles_updated_at
    BEFORE UPDATE ON member_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIPS trigger
CREATE TRIGGER fellowships_updated_at
    BEFORE UPDATE ON fellowships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIP_MEMBERS trigger
CREATE TRIGGER fellowship_members_updated_at
    BEFORE UPDATE ON fellowship_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FELLOWSHIP_MEETINGS trigger
CREATE TRIGGER fellowship_meetings_updated_at
    BEFORE UPDATE ON fellowship_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENTS trigger
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- OUTREACH_PROGRAMS trigger
CREATE TRIGGER outreach_programs_updated_at
    BEFORE UPDATE ON outreach_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SOULS trigger
CREATE TRIGGER souls_updated_at
    BEFORE UPDATE ON souls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FOLLOW_UPS trigger
CREATE TRIGGER follow_ups_updated_at
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- BRANCH_DEPARTMENTS trigger
CREATE TRIGGER branch_departments_updated_at
    BEFORE UPDATE ON branch_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENT_MEMBERS trigger
CREATE TRIGGER department_members_updated_at
    BEFORE UPDATE ON department_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DEPARTMENT_MEETINGS trigger
CREATE TRIGGER department_meetings_updated_at
    BEFORE UPDATE ON department_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SERVICES trigger
CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DONATIONS trigger
CREATE TRIGGER donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- NOTIFICATIONS trigger
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENTS trigger
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENT_NOTES trigger
CREATE TRIGGER event_notes_updated_at
    BEFORE UPDATE ON event_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- EVENT_REGISTRATIONS trigger
CREATE TRIGGER event_registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF TRIGGERS
-- ============================================================================
