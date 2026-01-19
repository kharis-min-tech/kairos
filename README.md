# Kairos - Church Administration System

A comprehensive PostgreSQL-based church administration system designed to manage multiple branches across regions. Tracks members, roles, leadership, departments, fellowships, outreach programs, service attendance, donations, notifications, and events.

## Quick Start

### Database Setup

The database schema is modularized for better maintainability and dependency management. See the [Database Migrations README](database/migrations/README.md) for detailed setup instructions.

#### Quick Installation

```bash
# Navigate to the migrations directory
cd database/migrations

# Run the initialization script
./init_schema.sh

# Or manually execute scripts in order:
psql -d kairos -f 01_functions.sql
psql -d kairos -f 02_tables.sql
psql -d kairos -f 03_constraints.sql
psql -d kairos -f 04_indexes.sql
psql -d kairos -f 05_triggers.sql
psql -d kairos -f 06_comments.sql
```

## Documentation

- **[Database Schema Guide](database/migrations/README.md)** - Complete database setup and migration instructions
- **[Administration Guide](ADMINISTRATION.md)** - Detailed entity definitions, constraints, and relationships
- **[ERD Overview](ERD_OVERVIEW.md)** - Entity relationship diagrams and visualizations
- **[Development Guidelines](.github/copilot-instructions.md)** - Project architecture and coding standards

## Database Structure

### File Organization

```
database/
├── schema.sql                    # Original monolithic schema (deprecated - for reference)
└── migrations/
    ├── README.md                 # Complete setup guide
    ├── init_schema.sh            # Automated initialization script
    ├── 01_functions.sql          # Utility functions
    ├── 02_tables.sql             # Table definitions
    ├── 03_constraints.sql        # Foreign keys, check constraints, unique constraints
    ├── 04_indexes.sql            # Performance indexes
    ├── 05_triggers.sql           # Automated column update triggers
    └── 06_comments.sql           # Table documentation comments
```

### Core Entities (28 Tables)

1. **Organizational Structure**: Regions, Branches, Members
2. **Leadership**: Branch Leadership (Pastors & Elders)
3. **Roles & Assignments**: Roles, Member Roles
4. **Fellowships**: Fellowships, Fellowship Members, Meetings, Attendance
5. **Departments**: Departments, Branch Departments, Department Members, Meetings, Attendance
6. **Outreach**: Programs, Souls, Follow-ups, Participants
7. **Services**: Services, Service Attendance
8. **Donations**: Member giving records with purpose tracking
9. **Notifications**: Targeted announcements and recipients
10. **Events**: Church events, organizers, notes, registrations

## Key Features

- **Multi-Branch Architecture**: Support for multiple church branches across regions
- **Flexible Role System**: Members can hold multiple roles across different branches
- **Leadership Tracking**: Historical records of pastors and elders with current/past status
- **Attendance Management**: Track attendance for services, fellowship meetings, and department meetings
- **Outreach Pipeline**: Manage evangelism programs with soul conversion tracking
- **Donation Tracking**: Record member giving with flexible purpose categories
- **Smart Notifications**: Targeted messaging to specific groups (branch, region, department, fellowship, role, leadership)
- **Event Management**: Comprehensive event planning with registration, organizers, and notes
- **Audit Trail**: Automatic timestamp tracking on all tables

## Technology Stack

- **Database**: PostgreSQL 12+
- **Schema Version**: 1.0.0
- **Total Tables**: 28
- **Migration Scripts**: 6

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kairos
   ```

2. **Set up the database**
   ```bash
   cd database/migrations
   ./init_schema.sh kairos
   ```

3. **Verify installation**
   ```bash
   psql -d kairos -c "\dt"  # List all tables
   ```

## Maintenance

### Creating Backups

```bash
# Full database backup
pg_dump -d kairos -F c -f kairos_backup_$(date +%Y%m%d).dump

# Schema-only backup
pg_dump -d kairos -s -f kairos_schema_$(date +%Y%m%d).sql
```

### Schema Updates

When modifying the schema:

1. Update the appropriate migration file(s)
2. Test in a development database
3. Document changes in commit messages
4. Follow the execution order when redeploying

See [Database Migrations README](database/migrations/README.md) for detailed migration guidelines.

## Project Status

**Status**: Active Development  
**Last Updated**: January 18, 2026  
**Database Version**: 1.0.0

## License

[Add your license information here]

## Support

For questions or issues, please refer to:
- [Database Setup Guide](database/migrations/README.md)
- [Entity Documentation](ADMINISTRATION.md)
