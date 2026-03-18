-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 01_functions.sql
-- Purpose: Create schema and utility functions used across the database
-- ============================================================================
-- Execution Order: 1 (Must be run first)
-- Dependencies: None
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- SCHEMA DEFINITION
-- ============================================================================
-- All database objects are organized under the 'dev' schema
-- This separates application tables from system tables in public schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS dev;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
-- This function is used by triggers on all tables to maintain audit trail
-- Placed in public schema for accessibility from dev schema
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

COMMENT ON SCHEMA dev IS 'Development schema containing all Kharis Church Administration System tables';

-- ============================================================================
-- END OF FUNCTIONS
-- ============================================================================
