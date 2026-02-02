-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 01_functions.sql
-- Purpose: Create schemas and utility functions used across the database
-- ============================================================================
-- Execution Order: 1 (Must be run first)
-- Dependencies: None
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- SCHEMA DEFINITIONS
-- ============================================================================
-- Schema organization:
--   core     - Core entities: languages, regions, branches, members, leadership
--   ministry - Ministry operations: roles, departments, fellowships, services
--   outreach - Evangelism: outreach programs, souls, follow-ups
--   finance  - Financial: donations
--   comms    - Communications: notifications, events
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ministry;
CREATE SCHEMA IF NOT EXISTS outreach;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS comms;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
-- This function is used by triggers on all tables to maintain audit trail
-- Placed in public schema for accessibility from all schemas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at timestamp when a row is modified';

-- ============================================================================
-- SCHEMA DOCUMENTATION
-- ============================================================================

COMMENT ON SCHEMA core IS 'Core entities: languages, regions, branches, members, branch_leadership';
COMMENT ON SCHEMA ministry IS 'Ministry operations: roles, member_roles, departments, fellowships, services and attendance';
COMMENT ON SCHEMA outreach IS 'Evangelism tracking: outreach_programs, outreach_participants, souls, follow_ups';
COMMENT ON SCHEMA finance IS 'Financial records: donations';
COMMENT ON SCHEMA comms IS 'Communications: notifications, events and registrations';

-- ============================================================================
-- END OF FUNCTIONS
-- ============================================================================
