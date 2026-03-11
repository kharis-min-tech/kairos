# Power BI Database Schema Organization Guide

## Overview
This guide explains the database schema organization for the Kairos Church Administration System, specifically designed to support Power BI reporting, analytics, and ETL processes.

## Schema Architecture

### Schema Purpose & Ownership

| Schema | Purpose | Owner Role | Description |
|--------|---------|------------|-------------|
| **app** | Production Operational | `app_owner` | Production version of church administration system (operational data) |
| **dev** | Development/Testing | `dev_owner` | Development and testing environment, mirrors app schema structure |
| **staging** | ETL Landing Zone | `staging_owner` | Temporary area for raw data ingestion before transformation |
| **dw** | Data Warehouse | `dw_owner` | Cleaned, transformed, and historized data for analytics |
| **marts** | Data Marts | `marts_owner` | Business-specific aggregations and views optimized for Power BI |
| **etl** | ETL Infrastructure | `etl_owner` | ETL logging, metadata, error tracking, and data lineage |

## User Roles & Permissions

### Schema Owner Roles
Each schema has a dedicated owner with full control:

- **app_owner**: Full control over app schema (production operational data)
- **staging_owner**: Full control over staging schema (ETL landing zone)
- **dw_owner**: Full control over dw schema (data warehouse)
- **marts_owner**: Full control over marts schema (data marts)
- **etl_owner**: Full control over etl schema (logging and metadata)
- **dev_owner**: Full control over dev schema (development environment)

### Application Roles

#### 1. powerbi_ro (Power BI Service Account)
**Purpose**: Read-only access for Power BI reporting and analytics

**Permissions**:
- ✅ SELECT on all tables/views in: `dev`, `app`, `dw`, `marts`, `etl`
- ✅ USAGE on schemas: `dev`, `app`, `dw`, `marts`, `etl`
- ❌ No write permissions
- ❌ No access to `staging` schema (transient data)

**Use Cases**:
- Power BI dataset refresh
- Direct Query mode connections
- Data analysis and reporting
- ETL monitoring dashboards (via etl schema access)

#### 2. etl_rw (ETL/Data Pipeline Service Account)
**Purpose**: Execute ETL processes, read from source, write to warehouse

**Permissions**:
- ✅ SELECT on: `dev`, `app` (source systems)
- ✅ ALL PRIVILEGES on: `staging`, `dw`, `marts`, `etl` (write targets)
- ✅ Can create, update, delete in target schemas
- ✅ Can execute stored procedures for data transformation

**Use Cases**:
- Extract data from app/dev schemas
- Load raw data into staging
- Transform and load into dw
- Create/update data marts
- Write ETL logs and metadata

#### 3. app_ro (Application Read-Only)
**Purpose**: Read-only access for applications querying operational data

**Permissions**:
- ✅ SELECT on all tables/views in `app`
- ❌ No write permissions
- ❌ No access to other schemas

**Use Cases**:
- Web application read queries
- API backend data retrieval
- Reporting services (non-Power BI)

## Migration from DEV to APP Schema

### Current State
Currently, all operational data is in the **dev** schema. This is suitable for development but should be migrated to **app** for production.

### Migration Strategy

**Option 1: Schema Copy (Recommended for Production)**
```sql
-- 1. Create all tables in app schema (duplicate structure from dev)
-- Run migrations 01-07 with 'app' instead of 'dev' in search path

-- 2. Copy existing data
INSERT INTO app.regions SELECT * FROM dev.regions;
INSERT INTO app.branches SELECT * FROM dev.branches;
-- ... repeat for all tables

-- 3. Update application connection strings to use 'app' schema

-- 4. Keep dev schema for testing/development
```

**Option 2: Schema Rename (For new deployments)**
```sql
-- Only if dev schema has no dependencies
ALTER SCHEMA dev RENAME TO app;
CREATE SCHEMA dev; -- Create fresh dev schema
```

**Option 3: Dual Schema Operation (Transition Period)**
- Keep dev schema active for ongoing development
- Use dev schema as source for ETL to populate app
- Gradually migrate production traffic to app schema

## ETL & Marts Schemas

The `etl` and `marts` schemas are created **empty** by this setup script. The Power BI / ETL team is responsible for creating their own tables, views, and materialized views in these schemas using the respective owner roles (`etl_owner`, `marts_owner`) or the `etl_rw` service account.

### Suggested ETL Tables (to be created by the ETL team)
- **Job execution log** - Track ETL runs with status, timing, and row counts
- **Data quality checks** - Record validation results per job
- **CDC watermarks** - High watermarks for incremental extraction
- **Error log** - Detailed error tracking with resolution management

### Suggested Data Mart Tables (to be created by the Power BI team)
- **Member analytics** - Pre-aggregated member statistics by branch/region
- **Attendance analytics** - Service and fellowship attendance trends
- **Donation analytics** - Giving patterns and summaries
- **Data catalog view** - Inventory of all accessible schema objects
- **ETL monitoring view** - Job execution health and success rates

## Power BI Connection Configuration

### Connection String Examples

#### Using Power BI Desktop (Direct Query)
```
Server: your-postgres-server.com
Database: kairos_db
Schema: dev  (or app for production)
User: powerbi_ro
Password: [secure password]
```

#### Using Power BI Service (Scheduled Refresh)
1. Install On-Premises Data Gateway on server with PostgreSQL access
2. Configure data source in Power BI Service:
   - Data Source Type: PostgreSQL
   - Server: your-postgres-server.com
   - Database: kairos_db
   - Authentication: Database
   - Username: powerbi_ro
   - Password: [secure password]
3. Set search_path in Advanced Options:
   ```
   SET search_path TO dev, marts, dw, public;
   ```

### Recommended Query Patterns

#### Option 1: Fully Qualified Names (Recommended)
```sql
SELECT * FROM dev.members WHERE is_active = TRUE;
SELECT * FROM marts.member_analytics WHERE analytics_date >= CURRENT_DATE - 30;
```

#### Option 2: Set Search Path
```sql
SET search_path TO dev, marts, dw, public;
SELECT * FROM members; -- Resolves to dev.members
```

## Security Best Practices

### 1. Password Management
- ✅ Change default passwords immediately after setup
- ✅ Use strong passwords (minimum 16 characters, mixed case, numbers, symbols)
- ✅ Store passwords in secure credential manager (Azure Key Vault, AWS Secrets Manager)
- ✅ Rotate passwords quarterly
- ❌ Never hardcode passwords in Power BI reports or scripts

### 2. Connection Security
- ✅ Use SSL/TLS encryption for database connections (require `sslmode=require`)
- ✅ Whitelist Power BI Service IP ranges in firewall
- ✅ Use Azure Private Link or VPN for cloud deployments
- ❌ Don't expose PostgreSQL port directly to internet

### 3. Row-Level Security (if needed)
If branch-level data isolation is required, enable Row-Level Security:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE app.members ENABLE ROW LEVEL SECURITY;

-- Create policy to filter by user's branch access
CREATE POLICY members_branch_access ON app.members
    FOR SELECT TO powerbi_ro
    USING (
        home_branch_id IN (
            SELECT branch_id 
            FROM app.user_branch_access 
            WHERE user_name = CURRENT_USER
        )
    );
```

**Power BI Integration**:
- Use Power BI RLS in combination with database RLS
- Map Power BI users to branch access rights
- Test RLS policies before deployment

### 4. Audit Logging
Enable PostgreSQL audit logging for compliance:

```sql
-- Enable pgAudit extension (if available)
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Log all queries from powerbi_ro
ALTER ROLE powerbi_ro SET pgaudit.log = 'READ';
```

### 5. Principle of Least Privilege
- ✅ Power BI user only has SELECT (read-only)
- ✅ ETL user can't modify app schema (production data)
- ✅ Schema owners separated by responsibility
- ❌ Don't grant superuser privileges to application accounts

## Setup Instructions

### 1. Execute Schema Setup Script
```bash
cd /Users/kobby/Documents/projects/git/kairos/database/migrations
psql -U postgres -d kairos_db -f 08_powerbi_schemas_setup.sql
```

### 2. Verify Schema Creation
```sql
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('app', 'dev', 'staging', 'dw', 'marts', 'etl');
```

Expected output: 6 rows (all schemas)

### 3. Verify Role Creation
```sql
SELECT rolname, rolcanlogin 
FROM pg_roles 
WHERE rolname IN (
    'app_owner', 'staging_owner', 'dw_owner', 'marts_owner', 'etl_owner',
    'powerbi_ro', 'etl_rw', 'app_ro'
);
```

Expected output: 8 rows (all roles)

### 4. Verify Power BI User Permissions
```sql
-- Check schema access
SELECT nspname AS schema_name,
       has_schema_privilege('powerbi_ro', nspname, 'USAGE') AS has_usage
FROM pg_namespace
WHERE nspname IN ('dev', 'app', 'dw', 'marts', 'etl');

-- Check table access in dev schema
SELECT tablename,
       has_table_privilege('powerbi_ro', 'dev.' || tablename, 'SELECT') AS has_select
FROM pg_tables
WHERE schemaname = 'dev'
LIMIT 10;
```

### 5. Change Default Passwords
```sql
ALTER ROLE app_owner WITH PASSWORD 'your-secure-password-here';
ALTER ROLE powerbi_ro WITH PASSWORD 'your-secure-password-here';
ALTER ROLE etl_rw WITH PASSWORD 'your-secure-password-here';
-- Repeat for all roles
```

### 6. Test Power BI Connection
```bash
# Test connection as powerbi_ro
psql -U powerbi_ro -d kairos_db -h localhost

# Run test query
\c kairos_db
SELECT * FROM dev.members LIMIT 5;
```

## Monitoring & Troubleshooting

### Check Power BI Query Performance
```sql
-- Enable query logging in postgresql.conf
-- log_statement = 'all'
-- log_duration = on
-- log_min_duration_statement = 1000  (log queries > 1 second)

-- Then review logs for slow queries from powerbi_ro
```

### Check Schema Sizes
```sql
SELECT 
    schemaname,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::BIGINT) AS total_size
FROM pg_tables
WHERE schemaname IN ('dev', 'app', 'staging', 'dw', 'marts', 'etl')
GROUP BY schemaname
ORDER BY SUM(pg_total_relation_size(schemaname||'.'||tablename)) DESC;
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                               │
└─────────────────────────────────────────────────────────────────┘

   [Church Operations]
          ↓
    ┌──────────┐
    │   DEV    │  ← Development/Testing
    │ (Source) │
    └────┬─────┘
         │
         │ (Power BI reads directly for testing)
         │
         ↓
    ┌──────────┐
    │   APP    │  ← Production Operational Database
    │ (Source) │     (Future: replace dev as primary)
    └────┬─────┘
         │
         │ [ETL Process - etl_rw user]
         │ • Extract (SELECT)
         │
         ↓
    ┌──────────┐
    │ STAGING  │  ← Temporary landing zone
    │          │     Raw data ingestion
    └────┬─────┘     Validation & cleansing
         │
         │ [Transform & Load]
         │
         ↓
    ┌──────────┐
    │    DW    │  ← Data Warehouse
    │          │     Historical data
    └────┬─────┘     Slowly changing dimensions
         │           Fact tables
         │
         │ [Aggregate & Optimize]
         │
         ↓
    ┌──────────┐
    │  MARTS   │  ← Data Marts (Power BI optimized)
    │          │     Pre-aggregated metrics
    └────┬─────┘     Business views
         │
         │ [Power BI - powerbi_ro]
         │ • Reports
         │ • Dashboards
         ↓
    [Business Users]

    ┌──────────┐
    │   ETL    │  ← ETL Logging & Metadata (empty)
    │          │     Created by ETL team
    └──────────┘     Job logs, quality checks, watermarks
         ↑
         │ [Monitoring via Power BI]
         │
```

## Common Issues & Solutions

### Issue: Power BI can't connect
**Solutions**:
1. Check password: `psql -U powerbi_ro -d kairos_db`
2. Verify user exists: `SELECT * FROM pg_roles WHERE rolname = 'powerbi_ro';`
3. Check firewall/network access
4. Verify SSL requirements: `\conninfo` in psql

### Issue: "Permission denied" when querying table
**Solutions**:
1. Check schema USAGE: `SELECT has_schema_privilege('powerbi_ro', 'dev', 'USAGE');`
2. Check table SELECT: `SELECT has_table_privilege('powerbi_ro', 'dev.members', 'SELECT');`
3. Re-run grants section from setup script

### Issue: Power BI queries are slow
**Solutions**:
1. Use marts schema (pre-aggregated) instead of joining dev tables
2. Add indexes on frequently queried columns
3. Use Direct Query only for real-time data; otherwise Import mode
4. Monitor slow queries: `SELECT * FROM pg_stat_statements WHERE userid = (SELECT oid FROM pg_roles WHERE rolname = 'powerbi_ro') ORDER BY total_exec_time DESC;`

### Issue: ETL job failed
**Solutions**:
1. Check ETL team's logging tables in the `etl` schema
2. Verify `etl_rw` user permissions on target schema
3. Check database logs: `tail -f /var/log/postgresql/postgresql-*.log`
4. Confirm the `etl_rw` role has USAGE on source and target schemas

## Next Steps

1. **Change all default passwords** in the setup script
2. **Execute the setup script**: `psql -U postgres -d kairos_db -f 08_powerbi_schemas_setup.sql`
3. **Verify permissions** using verification queries
4. **Test Power BI connection** with powerbi_ro
5. **Decide on dev → app migration strategy**
6. **Build initial data marts** based on reporting requirements
7. **ETL team creates tables** in `etl` and `staging` schemas as needed
8. **Power BI team creates tables/views** in `marts` schema as needed
9. **Implement ETL processes** to populate staging → dw → marts
10. **Configure Power BI datasets** using `dev` (initially) or `marts` schema

## Contact & Support
For questions about schema design, permissions, or Power BI integration, consult the Kairos development team or database administrator.
