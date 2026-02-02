-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 01_functions.sql
-- Purpose: Utility functions used across the database
-- ============================================================================
-- Execution Order: 1 (Must be run first)
-- Dependencies: None
-- Note: This script is IDEMPOTENT - CREATE OR REPLACE safely updates functions
-- ============================================================================

-- Function to automatically update updated_at timestamp
-- This function is used by triggers on all tables to maintain audit trail
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp when a row is modified';

-- ============================================================================
-- END OF FUNCTIONS
-- ============================================================================
