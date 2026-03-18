# Database Schema Initialization Guide

## Overview

The Kairos Church Administration System database schema has been modularized into separate SQL files for better maintainability, version control, and dependency management. Each file serves a specific purpose and must be executed in a specific order.

## File Structure

```
database/
├── schema.sql                    # Original monolithic schema (deprecated - for reference only)
└── migrations/
    ├── 01_functions.sql          # Utility functions
    ├── 02_tables.sql             # Table definitions
    ├── 03_constraints.sql        # Foreign keys, check constraints, unique constraints
    ├── 04_indexes.sql            # Performance indexes
    ├── 05_triggers.sql           # Automated column update triggers
    └── 06_comments.sql           # Table documentation comments
```

## Execution Order

**CRITICAL:** Scripts must be executed in numerical order to respect dependencies.

### Order and Dependencies

| Order | Script | Purpose | Dependencies |
|-------|--------|---------|--------------|
| 1 | `01_functions.sql` | Creates utility functions | None |
| 2 | `02_tables.sql` | Creates all tables with primary keys | `01_functions.sql` |
| 3 | `03_constraints.sql` | Adds foreign keys, check constraints, unique constraints | `02_tables.sql` |
| 4 | `04_indexes.sql` | Creates performance indexes | `02_tables.sql`, `03_constraints.sql` |
| 5 | `05_triggers.sql` | Creates update triggers | `01_functions.sql`, `02_tables.sql` |
| 6 | `06_comments.sql` | Adds table documentation | `02_tables.sql` || 7 | `07_seed_data.sql` | **Generates test data (OPTIONAL)** | All above (01-06) |

**Note**: File 7 (`07_seed_data.sql`) is optional and generates realistic dummy data for testing and development. **DO NOT run in production!**
## Initial Database Setup

### Prerequisites

- PostgreSQL 12 or higher installed
- Database user with CREATE, ALTER, and COMMENT privileges
- Terminal or SQL client access to PostgreSQL

### Step-by-Step Instructions

#### Method 1: Using psql Command Line

```bash
# 1. Create the database
createdb kairos

# 2. Navigate to the migrations directory
cd database/migrations

# 3. Execute scripts in order
psql -d kairos -f 01_functions.sql
psql -d kairos -f 02_tables.sql
psql -d kairos -f 03_constraints.sql
psql -d kairos -f 04_indexes.sql
psql -d kairos -f 05_triggers.sql
psql -d kairos -f 06_comments.sql

# 3b. OPTIONAL: Populate with test data (for development/testing only)
psql -d kairos -f 07_seed_data.sql

# 4. Verify installation
psql -d kairos -c "\dt dev.*"  # List all tables in dev schema
psql -d kairos -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'dev';"
```

#### Method 2: Using Single Command (Automated)

Create a shell script for automated execution:

```bash
#!/bin/bash
# File: database/migrations/init_schema.sh

set -e  # Exit on any error

DB_NAME="kairos"
SCRIPTS_DIR="$(dirname "$0")"

echo "Initializing Kairos database schema..."
echo "Database: $DB_NAME"
echo ""

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Creating database $DB_NAME..."
    createdb "$DB_NAME"
fi

# Execute scripts in order
for script in 01_functions.sql 02_tables.sql 03_constraints.sql 04_indexes.sql 05_triggers.sql 06_comments.sql; do
    echo "Executing $script..."
    psql -d "$DB_NAME" -f "$SCRIPTS_DIR/$script"
    if [ $? -eq 0 ]; then
        echo "✓ $script completed successfully"
    else
        echo "✗ Error executing $script"
        exit 1
    fi
    echo ""
done

echo "Schema initialization complete!"
echo ""
echo "Verification:"
psql -d "$DB_NAME" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'dev';"
```

Make it executable and run:

```bash
chmod +x database/migrations/init_schema.sh
./database/migrations/init_schema.sh
```

**To populate with test data after schema creation:**

```bash
chmod +x database/migrations/seed_data.sh
./database/migrations/seed_data.sh kairos
```

The `seed_data.sh` script will:
- Verify database and schema exist
- Check for existing data (with confirmation)
- Generate 550+ members across 5 branches
- Create complete church structure with leadership, departments, fellowships
- Generate 6 months of service history with attendance records
- Add donations, events, outreach programs, and notifications
- Display summary statistics

**⚠️ WARNING**: Only use seed data in development/testing environments!

#### Method 3: Using a SQL Client (pgAdmin, DBeaver, etc.)

1. Connect to your PostgreSQL server
2. Create a new database named `kairos`
3. Open each script file in numerical order
4. Execute each script completely before moving to the next
5. Verify no errors occurred

## Verification

After executing all scripts, verify the installation:

```sql
-- Check table count (should be 29)
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'dev';

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'dev' 
ORDER BY table_name;

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';

-- Check trigger count
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'dev';

-- Check foreign key constraints
SELECT COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_schema = 'dev'
  AND constraint_type = 'FOREIGN KEY';

-- Check indexes
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'dev';
```

Expected results:
- Tables: 29
- Functions: 1 (update_updated_at_column)
- Triggers: 23
- Foreign Keys: 70+
- Indexes: 100+

## Troubleshooting

### Common Issues

#### 1. Script Executed Out of Order

**Error:** `relation "table_name" does not exist`

**Solution:** Drop the database and restart from script 01:
```bash
dropdb kairos
createdb kairos
# Execute scripts in correct order
```

#### 2. Permission Errors

**Error:** `permission denied for schema public`

**Solution:** Grant necessary privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE kairos TO your_username;
GRANT ALL PRIVILEGES ON SCHEMA dev TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev TO your_username;
```

#### 3. Function Not Found

**Error:** `function update_updated_at_column() does not exist`

**Solution:** Execute `01_functions.sql` first before other scripts.

#### 4. Constraint Violations

**Error:** `violates foreign key constraint`

**Solution:** Ensure `02_tables.sql` completed successfully before running `03_constraints.sql`.

## Schema Updates and Migrations

### Adding New Tables

1. Add table definition to `02_tables.sql`
2. Add constraints to `03_constraints.sql`
3. Add indexes to `04_indexes.sql`
4. Add trigger to `05_triggers.sql` (if needed)
5. Add comment to `06_comments.sql`

### Modifying Existing Tables

Create new migration files with timestamps:
```
database/migrations/
└── updates/
    ├── 2026-01-18_add_member_status.sql
    ├── 2026-01-20_modify_donations_table.sql
    └── README.md
```

Document changes in the updates directory with:
- Purpose of change
- Tables affected
- Migration up script
- Migration down script (rollback)

## Backup and Restore

### Creating a Backup

```bash
# Full database backup
pg_dump -d kairos -F c -f kairos_backup_$(date +%Y%m%d).dump

# Schema-only backup
pg_dump -d kairos -s -f kairos_schema_$(date +%Y%m%d).sql

# Data-only backup
pg_dump -d kairos -a -f kairos_data_$(date +%Y%m%d).sql
```

### Restoring from Backup

```bash
# Restore from custom format
pg_restore -d kairos -c kairos_backup_20260118.dump

# Restore from SQL file
psql -d kairos -f kairos_schema_20260118.sql
```

## Best Practices

1. **Always backup before schema changes**
2. **Test migrations on a development database first**
3. **Use version control (Git) for all schema files**
4. **Document all schema changes in commit messages**
5. **Keep the original schema.sql for reference**
6. **Execute scripts in a transaction when possible:**
   ```bash
   psql -d kairos -v ON_ERROR_STOP=1 -f script.sql
   ```

## Production Deployment Checklist

- [ ] Backup production database
- [ ] Test schema changes in development environment
- [ ] Review all migration scripts for syntax errors
- [ ] Schedule maintenance window
- [ ] Execute scripts in correct order
- [ ] Verify schema with test queries
- [ ] Run application smoke tests
- [ ] Monitor logs for errors
- [ ] Keep backup for 30 days minimum

## Support and Documentation

For detailed information about the database structure:
- See [ADMINISTRATION.md](../../ADMINISTRATION.md) - Complete entity documentation
- See [ERD_OVERVIEW.md](../../ERD_OVERVIEW.md) - Entity relationship diagrams
- See [.github/copilot-instructions.md](../../.github/copilot-instructions.md) - Development guidelines

## Schema Version

**Current Version:** 1.0.0  
**Last Updated:** January 18, 2026  
**Database:** PostgreSQL 12+  
**Tables:** 29  
**Total Script Files:** 6
