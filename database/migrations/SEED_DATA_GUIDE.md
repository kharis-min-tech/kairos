# Seed Data Generation Guide

## Overview

The seed data script (`07_seed_data.sql`) generates realistic dummy data for testing and development purposes. This allows you to quickly set up a fully populated database for testing applications, APIs, or exploring the system.

## ⚠️ Important Warning

**DO NOT RUN THIS IN PRODUCTION!**

This script is designed for:
- Development environments
- Testing environments
- Demonstration/training purposes
- Local development instances

## What Data is Generated?

### Summary Statistics

The script generates the following data:

| Entity | Approximate Count |
|--------|-------------------|
| Regions | 5 |
| Branches | 8 (5 main + 3 satellite) |
| Members | 550+ |
| Active Members | 520+ (95% active rate) |
| Main Pastors | 5 (one per main branch) |
| Elders | 10 (two per main branch) |
| Roles | 15 |
| Member Roles | 330+ assignments |
| Departments | 10 |
| Branch Departments | 50 (10 per main branch) |
| Department Members | 300-500 |
| Fellowships | 15 (3 per main branch) |
| Fellowship Members | 300+ |
| Services | 260+ (6 months history) |
| Service Attendance | 18,000+ records |
| Outreach Programs | 10 |
| Souls | 150-300 |
| Follow-ups | 200-600 |
| Donations | 5,000 |
| Notifications | 20 |
| Events | 5 |
| Event Registrations | 250-500 |

### Detailed Breakdown

#### Geographic Structure
- **5 Regions**: Greater Accra, Ashanti, Western, Eastern, Central
- **5 Main Branches**: One per region with full member base
- **3 Additional Branches**: Satellite, Campus, and Cell branches

#### Members (550+)
- Distributed across branches (110 per main branch)
- Realistic Ghanaian names (first and last names)
- Mix of male and female (approximately 50/50)
- Ages ranging from 18-75 years
- 95% active membership rate
- Complete contact information (phone, email, address)
- Emergency contacts included

#### Leadership Structure
- **5 Main Pastors**: One per main branch
- **10 Elders**: Two per main branch
- All leadership assignments marked as current

#### Roles & Departments
- **15 Church Roles**: Choir, Usher, Teacher, Youth Leader, etc.
- **10 Departments**: Choir, Technical, Youth, Children, Evangelism, etc.
- Each department instantiated in all 5 main branches
- 5-10 members assigned to each department
- Lead and deputy members for each department

#### Fellowships
- **3 per main branch**: Men's, Women's, Youth
- 15-25 members per fellowship
- Leaders and co-leaders assigned
- Regular meeting schedules

#### Services & Attendance
- **6 months of history**
- Sunday services (weekly) and Midweek services (weekly)
- ~130 services per branch
- 75% average attendance rate
- Mix of Present, Virtual, and Absent statuses

#### Outreach & Evangelism
- **2 outreach programs per branch**
- 10-30 souls reached per program
- Follow-up records for each soul
- Various statuses: New, Following Up, Interested, Converted

#### Financial Records
- **~5,000 donation records**
- Average of 10 donations per active member
- Realistic amounts (50-550 GHS)
- Mix of Offering and Building Fund purposes
- Various payment methods
- 10% anonymous donations

#### Events & Communications
- **5 major events** (conferences, conventions, celebrations)
- 50-100 registrations per event
- **20 notifications** sent to various target groups
- Mix of announcements, reminders, and alerts

## How to Use

### Prerequisites

1. Database must exist
2. Schema must be initialized (run `init_schema.sh` first)

### Method 1: Using the Automated Script (Recommended)

```bash
cd database/migrations
./seed_data.sh kairos
```

The script will:
1. Verify database exists
2. Check schema is complete
3. Warn if data already exists
4. Request confirmation before proceeding
5. Generate all seed data in a transaction
6. Display summary statistics

### Method 2: Direct SQL Execution

```bash
psql -d kairos -f 07_seed_data.sql
```

**Note**: This method provides less feedback but executes faster.

### Method 3: From SQL Client

Connect to your database and execute the contents of `07_seed_data.sql`.

## Technical Details

### Data Generation Techniques

The script uses several PostgreSQL features:

1. **Helper Functions**:
   - `random_date()`: Generate random dates within a range
   - `random_phone()`: Generate realistic phone numbers
   - `random_email()`: Generate email addresses from names

2. **Random Data Generation**:
   - Arrays of realistic Ghanaian names
   - `random()` function for variation
   - `generate_series()` for bulk record creation

3. **Lateral Joins**:
   - Efficiently link members to branches
   - Ensure referential integrity during generation

4. **Transaction Safety**:
   - Entire script wrapped in BEGIN/COMMIT
   - Rolls back completely if any error occurs

### Customization

You can customize the data generation by modifying:

```sql
-- Change number of members per branch (line ~200)
members_per_branch INTEGER := 110;

-- Change date ranges for historical data
random_date('2024-01-01'::DATE, '2025-12-31'::DATE)

-- Change attendance rate (line ~500)
WHERE random() > 0.25  -- 75% attendance rate

-- Change donation amounts (line ~650)
round((random() * 500 + 50)::NUMERIC, 2)
```

## Verification

After running the seed script, verify the data:

```sql
-- Check member counts per branch
SELECT b.branch_name, COUNT(m.member_id) as member_count
FROM branches b
LEFT JOIN members m ON b.branch_id = m.home_branch_id
GROUP BY b.branch_name
ORDER BY member_count DESC;

-- Check leadership assignments
SELECT b.branch_name, m.first_name || ' ' || m.last_name as pastor_name, bl.role
FROM branch_leadership bl
JOIN branches b ON bl.branch_id = b.branch_id
JOIN members m ON bl.member_id = m.member_id
WHERE bl.is_current = TRUE
ORDER BY b.branch_name, bl.role;

-- Check service attendance summary
SELECT COUNT(*) as total_services,
       COUNT(DISTINCT branch_id) as branches_with_services,
       MIN(service_date) as earliest_service,
       MAX(service_date) as latest_service
FROM services;

-- Check donation summary
SELECT donation_purpose, 
       COUNT(*) as transaction_count,
       SUM(amount) as total_amount,
       AVG(amount) as average_amount
FROM donations
GROUP BY donation_purpose;
```

## Troubleshooting

### Issue: "Database does not exist"
**Solution**: Run `init_schema.sh` first to create the database.

### Issue: "Schema is incomplete"
**Solution**: Ensure all schema scripts (01-06) have been executed successfully.

### Issue: "Duplicate key value violates unique constraint"
**Solution**: Database already has data. Either:
- Drop and recreate the database
- Skip seed data generation
- Modify script to avoid conflicts

### Issue: Script runs but no data appears
**Solution**: Check for transaction rollback. Errors may have caused the transaction to abort.

```sql
-- Check for any data
SELECT 
    (SELECT COUNT(*) FROM members) as members,
    (SELECT COUNT(*) FROM branches) as branches,
    (SELECT COUNT(*) FROM services) as services;
```

### Issue: Performance is slow
**Solution**: 
- Generating 5,000+ donation records can take 1-2 minutes
- Consider reducing the LIMIT on the donations INSERT statement
- Ensure database has adequate resources

## Re-running the Script

To regenerate data (useful for testing):

```bash
# Drop and recreate database
dropdb kairos
./init_schema.sh kairos
./seed_data.sh kairos
```

Or selectively clear specific tables:

```sql
-- Clear all data (preserves schema)
TRUNCATE regions, branches, members, roles, departments CASCADE;

-- Then re-run seed script
\i 07_seed_data.sql
```

## Best Practices

1. **Use separate databases**: 
   - Development: `kairos_dev`
   - Testing: `kairos_test`
   - Production: `kairos` (no seed data!)

2. **Version control**: Keep seed scripts updated as schema changes

3. **Documentation**: Document any customizations made to seed data

4. **Testing**: Always test with seed data before deploying schema changes

5. **Cleanup**: Drop test databases when no longer needed

## Integration with Applications

### For API Testing

Seed data provides realistic data for testing API endpoints:

```bash
# Create test database
./init_schema.sh kairos_test
./seed_data.sh kairos_test

# Run API tests against kairos_test
npm test -- --db=kairos_test
```

### For UI Development

Quickly populate a development database:

```bash
# Reset development database
dropdb kairos_dev && createdb kairos_dev
./init_schema.sh kairos_dev
./seed_data.sh kairos_dev

# Start development server
npm run dev
```

### For Demonstrations

Create a demo database with realistic data:

```bash
./init_schema.sh kairos_demo
./seed_data.sh kairos_demo

# Database now ready for demonstrations
```

## Advanced Usage

### Generating Data for Specific Branches

Modify the script to focus on specific branches:

```sql
-- Only generate members for branch_id 1 and 2
FOR current_branch_id IN 1..2 LOOP
    -- ... member generation code
END LOOP;
```

### Adjusting Data Volume

Control the amount of data generated:

```sql
-- Fewer members (50 per branch instead of 110)
members_per_branch INTEGER := 50;

-- Shorter history (1 month instead of 6)
generate_series(
    CURRENT_DATE - INTERVAL '1 month',
    CURRENT_DATE,
    INTERVAL '7 days'
)

-- Fewer donations (limit to 2000 instead of 5000)
LIMIT 2000;
```

## Conclusion

The seed data script provides a quick way to populate your database with realistic test data. Always use it responsibly in non-production environments, and customize it to match your specific testing needs.

For questions or issues, refer to the main README.md or contact the development team.
