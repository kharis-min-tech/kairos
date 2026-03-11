# Power BI Database Schema Organization Guide

## Overview
This guide explains the database schema organization for the Kairos Church Administration System, specifically designed to support Power BI reporting, analytics, and ETL processes.

Currently, all operational data is in the **dev** schema.

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