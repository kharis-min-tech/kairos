-- ============================================================================
-- Church Administration System - Power BI Schema Organization
-- File: 08_powerbi_schemas_setup.sql
-- Purpose: Create schemas and users for Power BI reporting and ETL processes
-- ============================================================================
-- Execution Order: 8 (After all dev schema objects are created)
-- Dependencies: 01-07 migration files
-- Note: This script is IDEMPOTENT - safe to run multiple times
-- ============================================================================
-- Schema Architecture:
--   app         - Production operational data (replaces dev in production)
--   dev         - Development/testing environment (already exists)
--   staging     - Temporary landing zone for ETL data ingestion
--   dw          - Data warehouse (cleaned, historical, slowly changing dimensions)
--   marts       - Business-specific data marts for Power BI reporting
--   etl         - ETL process logging, metadata, and auditing
-- ============================================================================

-- ############################################################################
-- PART 1: CREATE SCHEMAS
-- ############################################################################

-- App schema: Production operational data
-- All current dev.* tables will be duplicated here for production use
CREATE SCHEMA IF NOT EXISTS app;
COMMENT ON SCHEMA app IS 'Production operational database for Church Administration System';

-- Dev schema already exists from 01_functions.sql
-- COMMENT added for clarity
COMMENT ON SCHEMA dev IS 'Development/testing environment - mirrors app schema structure';

-- Staging schema: Temporary data landing zone
-- Used by ETL to stage raw data before transformation
CREATE SCHEMA IF NOT EXISTS staging;
COMMENT ON SCHEMA staging IS 'Temporary staging area for ETL data ingestion and initial validation';

-- DW schema: Data Warehouse
-- Contains historical data, slowly changing dimensions, fact tables
CREATE SCHEMA IF NOT EXISTS dw;
COMMENT ON SCHEMA dw IS 'Data warehouse - cleaned, transformed, and historized data for analytics';

-- Marts schema: Data Marts
-- Business-specific aggregations, views, and materialized views for Power BI
CREATE SCHEMA IF NOT EXISTS marts;
COMMENT ON SCHEMA marts IS 'Data marts - business-specific views and aggregations optimized for Power BI reporting';

-- ETL schema: ETL Logging and Metadata
-- Tracks ETL execution history, errors, data lineage
CREATE SCHEMA IF NOT EXISTS etl;
COMMENT ON SCHEMA etl IS 'ETL process logging, metadata, error tracking, and data lineage';

-- ############################################################################
-- PART 2: CREATE ROLES AND USERS
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 2.1 Schema Owner Roles (Full control over respective schemas)
-- ----------------------------------------------------------------------------

CREATE ROLE app_owner WITH LOGIN PASSWORD 'appowner2026!';
COMMENT ON ROLE app_owner IS 'Owner of app schema - full control over production operational data';

CREATE ROLE staging_owner WITH LOGIN PASSWORD 'stagingowner2026!';
COMMENT ON ROLE staging_owner IS 'Owner of staging schema - manages ETL landing zone';

CREATE ROLE dw_owner WITH LOGIN PASSWORD 'dwowner2026!';
COMMENT ON ROLE dw_owner IS 'Owner of dw schema - manages data warehouse';

CREATE ROLE marts_owner WITH LOGIN PASSWORD 'martsowner2026!';
COMMENT ON ROLE marts_owner IS 'Owner of marts schema - manages data marts for reporting';

CREATE ROLE etl_owner WITH LOGIN PASSWORD 'etlowner2026!';
COMMENT ON ROLE etl_owner IS 'Owner of etl schema - manages ETL logging and metadata';

-- Note: dev schema owner should already exist (typically postgres or a dev_owner role)
-- If needed, create dev_owner:
-- CREATE ROLE dev_owner WITH LOGIN PASSWORD 'devowner2026!';
-- GRANT ALL PRIVILEGES ON SCHEMA dev TO dev_owner;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev TO dev_owner;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dev TO dev_owner;
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA dev TO dev_owner;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON TABLES TO dev_owner;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON SEQUENCES TO dev_owner;

-- ----------------------------------------------------------------------------
-- 2.2 Application Roles (Specific access patterns)
-- ----------------------------------------------------------------------------

-- Power BI User: Read-only access for reporting and analytics
CREATE ROLE powerbi_ro WITH LOGIN PASSWORD 'powerbiro2026!';
COMMENT ON ROLE powerbi_ro IS 'Read-only access for Power BI reporting - can query dev, dw, and marts schemas';

-- ETL Process User: Read from source, write to staging/dw/marts/etl
CREATE ROLE etl_rw WITH LOGIN PASSWORD 'etlrw2026!';
COMMENT ON ROLE etl_rw IS 'ETL process user - reads from app/dev, writes to staging/dw/marts/etl';

-- App Read-Only: For applications that need read-only access to operational data
CREATE ROLE app_ro WITH LOGIN PASSWORD 'appro2026!';
COMMENT ON ROLE app_ro IS 'Read-only access to app schema for applications';

-- ############################################################################
-- PART 3: GRANT SCHEMA OWNERSHIP
-- ############################################################################

-- Grant ownership and usage to schema owners
GRANT ALL PRIVILEGES ON SCHEMA app TO app_owner;
GRANT ALL PRIVILEGES ON SCHEMA staging TO staging_owner;
GRANT ALL PRIVILEGES ON SCHEMA dw TO dw_owner;
GRANT ALL PRIVILEGES ON SCHEMA marts TO marts_owner;
GRANT ALL PRIVILEGES ON SCHEMA etl TO etl_owner;

-- ############################################################################
-- PART 4: CONFIGURE DEFAULT PRIVILEGES
-- ############################################################################
-- Ensures future objects inherit correct permissions

-- ----------------------------------------------------------------------------
-- 4.1 App Schema
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO powerbi_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO app_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE ON SEQUENCES TO app_owner;

-- ----------------------------------------------------------------------------
-- 4.2 Staging Schema
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON TABLES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON SEQUENCES TO etl_rw;
-- Staging is temporary - no direct Power BI access

-- ----------------------------------------------------------------------------
-- 4.3 DW Schema
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA dw GRANT SELECT ON TABLES TO powerbi_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA dw GRANT ALL ON TABLES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA dw GRANT ALL ON SEQUENCES TO etl_rw;

-- ----------------------------------------------------------------------------
-- 4.4 Marts Schema
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA marts GRANT SELECT ON TABLES TO powerbi_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA marts GRANT ALL ON TABLES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA marts GRANT ALL ON SEQUENCES TO etl_rw;

-- ----------------------------------------------------------------------------
-- 4.5 ETL Schema
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT ALL ON TABLES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT ALL ON SEQUENCES TO etl_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl GRANT SELECT ON TABLES TO powerbi_ro;
-- Power BI can read ETL logs for monitoring dashboards

-- ----------------------------------------------------------------------------
-- 4.6 Dev Schema (existing)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA dev TO powerbi_ro;
GRANT USAGE ON SCHEMA dev TO etl_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO powerbi_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO etl_rw;

-- For future objects in dev
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT SELECT ON TABLES TO powerbi_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT SELECT ON TABLES TO etl_rw;

-- ############################################################################
-- PART 5: GRANT SCHEMA USAGE
-- ############################################################################

-- Power BI User
GRANT USAGE ON SCHEMA dev TO powerbi_ro;
GRANT USAGE ON SCHEMA app TO powerbi_ro;
GRANT USAGE ON SCHEMA dw TO powerbi_ro;
GRANT USAGE ON SCHEMA marts TO powerbi_ro;
GRANT USAGE ON SCHEMA etl TO powerbi_ro;

-- ETL Process User
GRANT USAGE ON SCHEMA dev TO etl_rw;
GRANT USAGE ON SCHEMA app TO etl_rw;
GRANT USAGE ON SCHEMA staging TO etl_rw;
GRANT USAGE ON SCHEMA dw TO etl_rw;
GRANT USAGE ON SCHEMA marts TO etl_rw;
GRANT USAGE ON SCHEMA etl TO etl_rw;

-- App Read-Only User
GRANT USAGE ON SCHEMA app TO app_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro;

-- ############################################################################
-- PART 6: GRANT PERMISSIONS ON EXISTING OBJECTS IN DEV SCHEMA
-- ############################################################################
-- Since dev schema already has tables/views, grant permissions explicitly

-- For Power BI
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO powerbi_ro;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA dev TO powerbi_ro; -- For auditing

-- For ETL Process
GRANT SELECT ON ALL TABLES IN SCHEMA dev TO etl_rw;

-- ############################################################################
-- NOTE: etl and marts schemas are created empty.
-- The Power BI / ETL team will create their own tables, views, and
-- materialized views in these schemas using the owner roles above.
-- ############################################################################

-- ############################################################################
-- PART 10: SECURITY BEST PRACTICES
-- ############################################################################

-- Revoke public access from all schemas (security hardening)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA dev FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA staging FROM PUBLIC;
REVOKE ALL ON SCHEMA dw FROM PUBLIC;
REVOKE ALL ON SCHEMA marts FROM PUBLIC;
REVOKE ALL ON SCHEMA etl FROM PUBLIC;

-- Enable row-level security on sensitive tables (example)
-- Uncomment and configure based on requirements:
-- ALTER TABLE app.members ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY members_branch_isolation ON app.members
--     FOR SELECT TO powerbi_ro
--     USING (home_branch_id IN (SELECT branch_id FROM app.user_branch_access WHERE user_name = CURRENT_USER));

-- ############################################################################
-- VERIFICATION QUERIES
-- ############################################################################

-- Check created schemas
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('app', 'dev', 'staging', 'dw', 'marts', 'etl');

-- Check created roles
-- SELECT rolname FROM pg_roles WHERE rolname IN ('app_owner', 'staging_owner', 'dw_owner', 'marts_owner', 'etl_owner', 'powerbi_ro', 'etl_rw', 'app_ro');

-- Check permissions for powerbi_ro
-- SELECT n.nspname, c.relname, c.relkind, has_table_privilege('powerbi_ro', c.oid, 'SELECT') AS has_select
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname IN ('dev', 'app', 'dw', 'marts', 'etl') AND c.relkind IN ('r', 'v');

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
