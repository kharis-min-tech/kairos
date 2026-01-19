# Seed Data Execution Instructions

## Quick Start

To populate your database with realistic test data after initializing the schema:

```bash
cd database/migrations
./seed_data.sh kairos
```

**⚠️ WARNING: This is for DEVELOPMENT and TESTING only. DO NOT run in production!**

## What Gets Created

### Summary
- **550+ members** across 5 branches (110 per main branch)
- **5 main branches** with full organizational structure
- **5 main pastors** (one per branch)
- **10 elders** (two per main branch)
- **Complete church structure**: departments, fellowships, roles
- **6 months of service history** with attendance records
- **5,000+ donation records**
- **Outreach programs** with souls and follow-ups
- **Events** with registrations
- **Notifications** and communications

### Detailed Breakdown

| Entity | Count | Description |
|--------|-------|-------------|
| Regions | 5 | Greater Accra, Ashanti, Western, Eastern, Central |
| Branches | 8 | 5 main + 3 satellite/campus/cell |
| Members | 550+ | Realistic Ghanaian names, 95% active |
| Main Pastors | 5 | One per main branch |
| Elders | 10 | Two per main branch |
| Roles | 15 | Choir, Usher, Teacher, Youth Leader, etc. |
| Member Roles | 330+ | Role assignments to members |
| Departments | 10 | Choir, Technical, Youth, Children, etc. |
| Branch Departments | 50 | 10 departments × 5 branches |
| Department Members | 300-500 | 5-10 members per department |
| Fellowships | 15 | Men's, Women's, Youth (3 per branch) |
| Fellowship Members | 300+ | 15-25 per fellowship |
| Services | 260+ | Sunday & Midweek (6 months) |
| Service Attendance | 18,000+ | 75% attendance rate |
| Outreach Programs | 10 | 2 per branch |
| Souls | 150-300 | 10-30 per outreach |
| Follow-ups | 200-600 | 1-3 per soul |
| Donations | 5,000 | ~10 per active member |
| Notifications | 20 | Various targets and priorities |
| Events | 5 | Conferences, conventions, celebrations |
| Event Registrations | 250-500 | 50-100 per event |

## Execution Methods

### Method 1: Automated Script (Recommended)

```bash
cd database/migrations
./seed_data.sh kairos
```

Features:
- Pre-flight checks (database exists, schema complete)
- Warns if data already exists
- Confirmation prompts
- Transaction safety (all-or-nothing)
- Summary statistics on completion

### Method 2: Direct SQL

```bash
psql -d kairos -f database/migrations/07_seed_data.sql
```

Faster but less feedback.

### Method 3: From SQL Client

Open `07_seed_data.sql` in pgAdmin, DBeaver, or similar and execute.

## Complete Setup Workflow

### Fresh Installation

```bash
# 1. Initialize schema
cd database/migrations
./init_schema.sh kairos

# 2. Populate with test data
./seed_data.sh kairos

# 3. Verify
psql -d kairos -c "SELECT COUNT(*) FROM members;"
```

### Reset and Regenerate

```bash
# Drop and recreate everything
dropdb kairos
cd database/migrations
./init_schema.sh kairos
./seed_data.sh kairos
```

## Verification Queries

After running seed data, verify with these queries:

```sql
-- Member distribution by branch
SELECT b.branch_name, COUNT(m.member_id) as members
FROM branches b
LEFT JOIN members m ON b.branch_id = m.home_branch_id
GROUP BY b.branch_name
ORDER BY members DESC;

-- Leadership roster
SELECT b.branch_name, 
       m.first_name || ' ' || m.last_name as leader_name,
       bl.role
FROM branch_leadership bl
JOIN branches b ON bl.branch_id = b.branch_id
JOIN members m ON bl.member_id = m.member_id
WHERE bl.is_current = TRUE
ORDER BY b.branch_name, bl.role;

-- Service attendance summary
SELECT 
    COUNT(DISTINCT s.service_id) as total_services,
    COUNT(sa.member_id) as total_attendance_records,
    ROUND(AVG(CASE WHEN sa.attendance_status = 'Present' THEN 1 ELSE 0 END) * 100, 2) as attendance_rate_percent
FROM services s
LEFT JOIN service_attendance sa ON s.service_id = sa.service_id;

-- Financial summary
SELECT 
    donation_purpose,
    COUNT(*) as transactions,
    SUM(amount) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM donations
GROUP BY donation_purpose;

-- Overall summary
SELECT 'Members' as entity, COUNT(*) as count FROM members
UNION ALL SELECT 'Services', COUNT(*) FROM services
UNION ALL SELECT 'Attendance Records', COUNT(*) FROM service_attendance
UNION ALL SELECT 'Donations', COUNT(*) FROM donations
UNION ALL SELECT 'Events', COUNT(*) FROM events
ORDER BY entity;
```

## Key Features of Generated Data

### Realistic Names
- Authentic Ghanaian first and last names
- Gender-appropriate name selection
- Mix of traditional and modern names

### Geographic Distribution
- 5 regions matching Ghana's actual regions
- Realistic city names (Accra, Kumasi, Takoradi, etc.)
- Appropriate postal codes and addresses

### Temporal Data
- Services span past 6 months
- Donations throughout the year
- Realistic membership join dates (2015-2025)
- Age distribution from 18-75 years

### Organizational Structure
- Complete hierarchies (pastors → elders → members)
- Department leadership with leads and deputies
- Fellowship leaders and co-leaders
- Role assignments matching real church structures

### Financial Records
- Realistic donation amounts (50-550 GHS)
- Mix of payment methods (Cash, Mobile Money, Bank Transfer, Card)
- 90% attributed, 10% anonymous
- Various purposes (Offering, Building Fund)

### Engagement Metrics
- 75% service attendance rate
- 95% active membership rate
- 60% of members have role assignments
- Regular outreach and follow-up activities

## Customization

### Adjust Member Count

Edit line ~200 in `07_seed_data.sql`:

```sql
members_per_branch INTEGER := 110;  -- Change to desired number
```

### Adjust Date Ranges

Change historical data range (line ~480):

```sql
generate_series(
    CURRENT_DATE - INTERVAL '6 months',  -- Change to '1 month', '12 months', etc.
    CURRENT_DATE,
    INTERVAL '7 days'
)
```

### Adjust Donation Volume

Change limit on donations INSERT (line ~655):

```sql
LIMIT 5000;  -- Change to desired total
```

### Adjust Attendance Rate

Change attendance probability (line ~525):

```sql
WHERE random() > 0.25  -- 0.25 = 75% attendance, 0.5 = 50%, etc.
```

## Troubleshooting

### "Database does not exist"
Run `init_schema.sh` first to create the database.

### "Schema is incomplete"
Ensure all schema scripts (01-06) executed successfully.

### "Duplicate key violation"
Database already has conflicting data. Either:
- Drop and recreate: `dropdb kairos && createdb kairos`
- Clear tables: `TRUNCATE regions CASCADE;`

### Script runs but no data
Check for errors. Transaction may have rolled back.

```sql
SELECT COUNT(*) FROM members;  -- Should return 550+
```

### Slow execution
- Generating 5,000 donations takes 1-2 minutes
- Normal for first run
- Consider reducing LIMIT in donations section if too slow

## Best Practices

1. **Separate Environments**: Use different database names
   - Development: `kairos_dev`
   - Testing: `kairos_test`
   - Production: `kairos` (NO seed data!)

2. **Regular Refreshes**: Regenerate test data when schema changes

3. **Version Control**: Keep seed script in sync with schema

4. **Documentation**: Note any customizations made

5. **Cleanup**: Drop test databases when done

## Integration Examples

### API Testing

```bash
# Setup test database
./init_schema.sh kairos_test
./seed_data.sh kairos_test

# Run tests
npm test -- --db=kairos_test
```

### UI Development

```bash
# Reset dev database with fresh data
dropdb kairos_dev && createdb kairos_dev
./init_schema.sh kairos_dev
./seed_data.sh kairos_dev

# Start dev server
npm run dev
```

### Demo Database

```bash
# Create presentation-ready database
./init_schema.sh kairos_demo
./seed_data.sh kairos_demo

# Database ready for demonstrations
```

## Data Characteristics

### Members (550+)
- Age range: 18-75 years
- Gender: ~50/50 split
- Complete contact info
- Emergency contacts
- 95% active membership

### Services (260+)
- 26 weeks × 2 services/week × 5 branches
- Sunday services: 10:00 AM
- Midweek services: 6:30 PM
- Rotating topics and preachers

### Donations (5,000)
- Average: ~10 per active member
- Amount range: 50-550 GHS
- Currency: GHS (Ghana Cedis)
- 70% Offering, 30% Building Fund

### Events (5)
- Types: Conference, Convention, Celebration
- 50-100 registrations each
- Future dates in 2025
- Published status

## See Also

- [SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md) - Comprehensive seed data documentation
- [README.md](README.md) - Complete schema setup guide
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick command reference

## Support

For issues or questions about seed data:
1. Check [SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md) for detailed troubleshooting
2. Verify schema is complete: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
3. Check PostgreSQL logs for errors
4. Review transaction rollback messages

---

**Remember**: Seed data is for development and testing only. Never run in production!
