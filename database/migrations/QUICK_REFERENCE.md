# Quick Reference - Kairos Database Schema

## File Execution Order

| # | File | Description | Dependencies |
|---|------|-------------|--------------|
| 1 | `01_functions.sql` | Utility functions | None |
| 2 | `02_tables.sql` | All 29 tables | 01 |
| 3 | `03_constraints.sql` | FK, Check, Unique constraints | 02 |
| 4 | `04_indexes.sql` | Performance indexes | 02, 03 |
| 5 | `05_triggers.sql` | Update triggers | 01, 02 |
| 6 | `06_comments.sql` | Documentation | 02 |

## Quick Commands

### Initial Setup
```bash
# Automated (recommended)
./init_schema.sh kairos

# Manual
for f in 0*.sql; do psql -d kairos -f $f; done

# Generate test data (OPTIONAL - development/testing only)
./seed_data.sh kairos
# OR
psql -d kairos -f 07_seed_data.sql
```

### Verification
```bash
# Table count (expected: 29)
psql -d kairos -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List all tables
psql -d kairos -c "\dt"

# Check functions
psql -d kairos -c "\df"

# Check triggers
psql -d kairos -c "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';"
```

### Backup & Restore
```bash
# Backup
pg_dump -d kairos -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d kairos -c backup_20260118.dump
```

### Troubleshooting
```bash
# Drop and recreate
dropdb kairos && createdb kairos

# Execute with error stop
psql -d kairos -v ON_ERROR_STOP=1 -f 02_tables.sql

# Check for errors in specific table
psql -d kairos -c "\d+ table_name"
```

## Key Schema Statistics

- **Tables**: 28
- **Functions**: 1 (update_updated_at_column)
- **Triggers**: 23 (one per table with updated_at)
- **Foreign Keys**: 70+
- **Indexes**: 100+ (including partial indexes)
- **Check Constraints**: 50+
- **Unique Constraints**: 30+

## Important Tables

### Core Hierarchy
```
regions → branches → members
```

### Relationships
- **Members** can have multiple **roles** across **branches**
- **Branches** have **leadership** (Pastor/Elders)
- **Fellowships** belong to **branches** and contain **members**
- **Departments** are global, instantiated per **branch**
- **Outreach programs** track **souls** with **follow-ups**
- **Services** track weekly **attendance**
- **Events** can be church-wide, regional, or branch-specific

## Common Queries

### Get all active members in a branch
```sql
SELECT * FROM members 
WHERE home_branch_id = $1 AND is_active = TRUE;
```

### Get current pastor of a branch
```sql
SELECT m.* FROM branch_leadership bl
JOIN members m ON bl.member_id = m.member_id
WHERE bl.branch_id = $1 
  AND bl.role = 'Main Pastor' 
  AND bl.is_current = TRUE;
```

### Get member's roles
```sql
SELECT r.role_name, mr.branch_id 
FROM member_roles mr
JOIN roles r ON mr.role_id = r.role_id
WHERE mr.member_id = $1 AND mr.is_active = TRUE;
```

### Service attendance for date range
```sql
SELECT s.service_date, COUNT(sa.member_id) as attendees
FROM services s
LEFT JOIN service_attendance sa ON s.service_id = sa.service_id
WHERE s.branch_id = $1 
  AND s.service_date BETWEEN $2 AND $3
GROUP BY s.service_id, s.service_date
ORDER BY s.service_date DESC;
```

## Need Help?

- **Setup Issues**: See [README.md](README.md) - Troubleshooting section
- **Schema Details**: See [ADMINISTRATION.md](../../ADMINISTRATION.md)
- **Entity Relationships**: See [ERD_OVERVIEW.md](../../ERD_OVERVIEW.md)
- **Development**: See [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
