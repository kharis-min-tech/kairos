# Kairos - Church Administration System

## Project Overview
Kairos is a PostgreSQL-based church administration system designed to manage multiple branches across regions. It tracks members, roles, leadership, departments, fellowships, outreach programs, service attendance, donations, notifications, and events.

## Database Architecture

### Core Entities & Relationships
The system is built around a multi-tenant branch architecture:
- **REGIONS** → **BRANCHES** (geographic hierarchy; branches must belong to a region)
- **BRANCHES** serve as the primary organizational unit for all church activities
  - Branch types: `'Main'`, `'Satellite'`, `'Cell'`, `'Campus'`, `'Online'`
- **MEMBERS** are associated with a home branch but can participate in activities across branches
- **DONATIONS** track member giving with purpose categories
- **NOTIFICATIONS** broadcast messages to targeted audiences (all, branch, department, fellowship, role)

### Key Organizational Concepts

**Leadership Structure** (from `branch_leadership` table):
- Each branch has a **Main Pastor** and **Elders** (historical records tracked by start/end dates)
- Only one current Main Pastor per branch (enforced by partial unique index on `role='Main Pastor' AND is_current=TRUE`)
- Members cannot hold the same role in the same branch simultaneously

**Multi-Role Assignments** (via `member_roles` table):
- Members can hold multiple roles across different branches
- Roles are global definitions; assignments are branch-specific
- Tracks role history via `assigned_date` and `end_date`; use `is_active=TRUE` to find current assignments

**Group Structures**:
- **FELLOWSHIPS**: Small groups within branches (have leader/co-leader, meeting schedules)
- **DEPARTMENTS**: Global definitions (Choir, Ushers, etc.) instantiated per branch via `branch_departments`
- **OUTREACH_PROGRAMS**: Branch evangelism events that track individual conversions

### Attendance & Participation
Three parallel attendance systems track different activities:
1. **Services** (`services` + `service_attendance`): Weekly worship, supports virtual/first-time flags
2. **Fellowship Meetings** (`fellowship_meetings` + `fellowship_meeting_attendance`)
3. **Department Meetings** (`department_meetings` + `meeting_attendance`)

Status values: `'Present'`, `'Absent'`, `'Excused'`, `'Late'` (services also support `'Virtual'`)

### Outreach & Conversion Tracking
- **OUTREACH_PROGRAMS** → **SOULS** → **FOLLOW_UPS** (soul conversion funnel)
- Souls track status: `'New'` → `'Following Up'` → `'Interested'` → `'Converted'` or `'Not Interested'`
- Can link converted souls to member records via `converted_to_member_id`
- Follow-ups record contact method and outcome for accountability

### Donations & Giving
- **DONATIONS** table tracks all member contributions
- Purpose categories: `'Offering'`, `'Building Fund'`, `'Other'`
- When purpose is `'Other'`, `description` field is required (enforced by CHECK constraint)
- Supports multiple payment methods: `'Cash'`, `'Check'`, `'Bank Transfer'`, `'Mobile Money'`, `'Card'`, `'Online'`, `'Other'`
- Optional anonymity flag for donor privacy
- `recorded_by` tracks staff who processed the donation

### Notifications & Announcements
- **NOTIFICATIONS** table for broadcasting messages with flexible targeting
- **Target scopes**:
  - `'All'` - entire church
  - `'Branch'` - specific branch members
  - `'Region'` - all members in branches within a region
  - `'Department'` - department members
  - `'Fellowship'` - fellowship members
  - `'Role'` - members holding a specific role (from `roles` table)
  - `'Leadership'` - members in leadership positions (`'Main Pastor'` or `'Elder'` from `branch_leadership`)
- Types: `'Announcement'`, `'Reminder'`, `'Alert'`, `'Event'`, `'General'`
- Priority levels: `'Low'`, `'Normal'`, `'High'`, `'Urgent'`
- Supports scheduling (`scheduled_for`) and expiration (`expires_at`)
- **NOTIFICATION_RECIPIENTS** tracks read/dismissed status per member

### Events & Registration
- **EVENTS** table for church-wide, regional, or branch-specific events
- **Scope hierarchy**: NULL branch/region = church-wide, set branch_id = branch-specific, set region_id = regional
- Event types: `'Conference'`, `'Retreat'`, `'Seminar'`, `'Workshop'`, `'Concert'`, `'Outreach'`, `'Celebration'`, `'Meeting'`, `'Other'`
- Status flow: `'Draft'` → `'Published'` → `'Ongoing'` → `'Completed'` (or `'Cancelled'`/`'Postponed'`)
- Supports virtual events with `is_virtual` flag and `virtual_link`
- Optional registration with deadline and capacity limits (`max_attendees`)
- **EVENT_ORGANIZERS**: Junction table linking events to organizing team members with roles
- **EVENT_NOTES**: Collaboration notes for organizers with types: `'General'`, `'Task'`, `'Decision'`, `'Issue'`, `'Update'`, `'Reminder'`
- **EVENT_REGISTRATIONS**: Member sign-ups with status: `'Registered'`, `'Waitlisted'`, `'Confirmed'`, `'Cancelled'`, `'No-Show'`
- Tracks attendance via `attended` boolean and `check_in_time`

## Schema Patterns & Conventions

**Timestamp Automation**:
- Every table has `created_at` (DEFAULT CURRENT_TIMESTAMP) and `updated_at` (updated by trigger)
- Trigger function `update_updated_at_column()` maintains timestamps on all UPDATE operations

**Soft Deletes via Status Flags**:
- Use `is_active` boolean (not hard deletes) for Members, Roles, Branches, etc.
- Partial unique indexes ensure business logic (e.g., only one active department per branch)
- Example: `idx_members_phone_active` - phone uniqueness only applies to active members

**Composite Keys for Many-to-Many**:
- Junction tables use SERIAL PKs for history tracking (allows member to leave and rejoin)
- `member_roles`, `fellowship_members`, `department_members` have surrogate PKs + unique constraints
- Attendance tables use true composite keys: `(meeting_id, member_id)` - one record per event
- Unique constraints include date: `(member_id, role_id, branch_id, assigned_date)` to allow rejoins

**Foreign Key Constraints**:
- Most cascade (`ON DELETE CASCADE`), but restrict on roles/departments to prevent orphaned definitions
- Cascade leadership deletions when branch is deleted
- Use `SET NULL` for optional references (co-leaders, created_by fields)

**Check Constraints for Enums**:
- Use CHECK constraints instead of lookup tables for fixed values: `gender IN ('Male', 'Female')`
- Service types, contact methods, and attendance statuses defined this way
- See schema for exact values to reference in code

## Development Workflow

**Schema Modifications**:
1. Update or create table in `database/schema.sql` (follows section structure: utilities → core tables → utilities)
2. Add corresponding documentation to `ADMINISTRATION.md`
3. Schema is idempotent; use `OR REPLACE` for functions and `IF NOT EXISTS` patterns where appropriate

**Adding New Entities**:
- Include triggers for `updated_at` if tracking changes
- Add comprehensive COMMENT ON TABLE statements
- Create necessary indexes (FK columns, `is_active`, frequently queried fields)
- Document in the ADMINISTRATION.md Entity Relationship section

**Querying Patterns**:
- Always filter by `is_active=TRUE` for soft-deleted records unless specifically researching history
- Join through context tables (branch_id, fellowship_id) in multi-tenant queries
- Use `end_date IS NULL` to identify current assignments (leadership, roles)
- For current leaders, reference `is_current=TRUE` column

## Common Queries (Examples)

### Basic Lookup Queries

**Get all active members of a branch**:
```sql
SELECT * FROM dev.members WHERE home_branch_id=$1 AND is_active=TRUE;
```

**Get current main pastor of a branch**:
```sql
SELECT m.* FROM dev.branch_leadership bl
JOIN dev.members m ON bl.member_id = m.member_id
WHERE bl.branch_id=$1 AND bl.role='Main Pastor' AND bl.is_current=TRUE;
```

**Get all current roles a member holds**:
```sql
SELECT r.role_name, mr.branch_id FROM dev.member_roles mr
JOIN dev.roles r ON mr.role_id = r.role_id
WHERE mr.member_id=$1 AND mr.is_active=TRUE;
```

**Get fellowship attendance for a specific meeting**:
```sql
SELECT m.*, fma.attendance_status 
FROM dev.fellowship_meeting_attendance fma
JOIN dev.members m ON fma.member_id = m.member_id
WHERE fma.meeting_id=$1;
```

### Advanced Query Patterns

**Cross-branch member participation** (e.g., which members serve in multiple branches):
```sql
SELECT m.member_id, m.first_name, m.last_name, COUNT(DISTINCT mr.branch_id) as branch_count
FROM dev.members m
JOIN dev.member_roles mr ON m.member_id = mr.member_id
WHERE mr.is_active = TRUE
GROUP BY m.member_id, m.first_name, m.last_name
HAVING COUNT(DISTINCT mr.branch_id) > 1;
```

**Regional member distribution with branch pastors**:
```sql
SELECT r.region_name, b.branch_name, CONCAT(m.first_name, ' ', m.last_name) as pastor_name, COUNT(mem.member_id) as member_count
FROM dev.regions r
JOIN dev.branches b ON r.region_id = b.region_id
LEFT JOIN dev.branch_leadership bl ON b.branch_id = bl.branch_id AND bl.role='Main Pastor' AND bl.is_current=TRUE
LEFT JOIN dev.members m ON bl.member_id = m.member_id
LEFT JOIN dev.members mem ON b.branch_id = mem.home_branch_id AND mem.is_active=TRUE
WHERE b.is_active = TRUE
GROUP BY r.region_name, b.branch_name, m.member_id, m.first_name, m.last_name;
```

**Service attendance analytics** (percent present over date range):
```sql
SELECT s.service_id, s.service_date, s.service_type,
  COUNT(CASE WHEN sa.attendance_status = 'Present' THEN 1 END)::FLOAT / 
  NULLIF(COUNT(*), 0) * 100 as attendance_percent
FROM dev.services s
LEFT JOIN dev.service_attendance sa ON s.service_id = sa.service_id
WHERE s.branch_id = $1 AND s.service_date BETWEEN $2 AND $3
GROUP BY s.service_id, s.service_date, s.service_type
ORDER BY s.service_date DESC;
```

**Outreach conversion funnel** (track souls through pipeline):
```sql
SELECT 
  COALESCE(status, 'Total') as status,
  COUNT(*) as soul_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM dev.souls
WHERE outreach_id = $1
GROUP BY ROLLUP(status)
ORDER BY soul_count DESC;
```

**Active members missing from recent services** (engagement tracking):
```sql
SELECT m.member_id, m.first_name, m.last_name
FROM dev.members m
WHERE m.home_branch_id = $1 AND m.is_active = TRUE
  AND m.member_id NOT IN (
    SELECT DISTINCT sa.member_id
    FROM dev.service_attendance sa
    JOIN dev.services s ON sa.service_id = s.service_id
    WHERE s.branch_id = $1 AND s.service_date >= (CURRENT_DATE - INTERVAL '30 days')
  )
ORDER BY m.last_name, m.first_name;
```

**Follow-up outcomes summary** (evangelism effectiveness):
```sql
SELECT 
  fu.contact_method,
  fu.contact_status,
  COUNT(*) as count,
  ROUND(AVG(fu.duration_minutes), 1) as avg_duration_minutes
FROM dev.follow_ups fu
JOIN dev.souls s ON fu.soul_id = s.soul_id
WHERE s.outreach_id = $1
GROUP BY fu.contact_method, fu.contact_status
ORDER BY count DESC;
```

### Integration & API Patterns

**Hierarchical branch with leadership structure** (for dashboard/UI rendering):
```sql
SELECT 
  b.branch_id, b.branch_name, b.email, b.phone,
  m_pastor.member_id as pastor_id, CONCAT(m_pastor.first_name, ' ', m_pastor.last_name) as pastor_name,
  COUNT(DISTINCT mem.member_id) as total_members,
  COUNT(DISTINCT f.fellowship_id) as total_fellowships
FROM dev.branches b
LEFT JOIN dev.branch_leadership bl ON b.branch_id = bl.branch_id AND bl.role='Main Pastor' AND bl.is_current=TRUE
LEFT JOIN dev.members m_pastor ON bl.member_id = m_pastor.member_id
LEFT JOIN dev.members mem ON b.branch_id = mem.home_branch_id AND mem.is_active=TRUE
LEFT JOIN dev.fellowships f ON b.branch_id = f.branch_id AND f.is_active=TRUE
WHERE b.region_id = $1 AND b.is_active = TRUE
GROUP BY b.branch_id, b.branch_name, b.email, b.phone, m_pastor.member_id, m_pastor.first_name, m_pastor.last_name;
```

**Department roster with leadership** (for ministry team pages):
```sql
SELECT 
  d.department_name,
  m_lead.member_id as lead_id, CONCAT(m_lead.first_name, ' ', m_lead.last_name) as lead_name,
  m_deputy.member_id as deputy_id, CONCAT(m_deputy.first_name, ' ', m_deputy.last_name) as deputy_name,
  STRING_AGG(CONCAT(mem.first_name, ' ', mem.last_name), ', ' ORDER BY mem.last_name) as members
FROM dev.branch_departments bd
JOIN dev.departments d ON bd.department_id = d.department_id
JOIN dev.members m_lead ON bd.lead_member_id = m_lead.member_id
LEFT JOIN dev.members m_deputy ON bd.deputy_member_id = m_deputy.member_id
LEFT JOIN dev.department_members dm ON bd.branch_department_id = dm.branch_department_id AND dm.is_active=TRUE
LEFT JOIN dev.members mem ON dm.member_id = mem.member_id
WHERE bd.branch_id = $1 AND bd.is_active = TRUE
GROUP BY bd.branch_department_id, d.department_name, m_lead.member_id, m_lead.first_name, m_lead.last_name, m_deputy.member_id, m_deputy.first_name, m_deputy.last_name;
```

**Member profile with all associations** (for member detail view):
```sql
SELECT m.*,
  b.branch_name as home_branch,
  JSON_BUILD_OBJECT(
    'roles', (
      SELECT JSON_AGG(JSON_BUILD_OBJECT('role_name', r.role_name, 'branch_id', mr.branch_id))
      FROM dev.member_roles mr
      JOIN dev.roles r ON mr.role_id = r.role_id
      WHERE mr.member_id = m.member_id AND mr.is_active = TRUE
    ),
    'fellowships', (
      SELECT JSON_AGG(JSON_BUILD_OBJECT('fellowship_name', f.fellowship_name, 'fellowship_id', f.fellowship_id))
      FROM dev.fellowship_members fm
      JOIN dev.fellowships f ON fm.fellowship_id = f.fellowship_id
      WHERE fm.member_id = m.member_id AND fm.is_active = TRUE
    ),
    'leadership', (
      SELECT JSON_AGG(JSON_BUILD_OBJECT('role', bl.role, 'branch_id', bl.branch_id, 'is_current', bl.is_current))
      FROM dev.branch_leadership bl
      WHERE bl.member_id = m.member_id AND bl.is_current = TRUE
    )
  ) as associations
FROM dev.members m
JOIN dev.branches b ON m.home_branch_id = b.branch_id
WHERE m.member_id = $1 AND m.is_active = TRUE;
```

### Donations Queries

**Get member donation history**:
```sql
SELECT d.donation_date, d.amount, d.currency, d.donation_purpose, d.description
FROM dev.donations d
WHERE d.member_id = $1
ORDER BY d.donation_date DESC;
```

**Get total donations by purpose for a branch (yearly)**:
```sql
SELECT donation_purpose, SUM(amount) as total, COUNT(*) as count
FROM dev.donations
WHERE branch_id = $1 AND EXTRACT(YEAR FROM donation_date) = $2
GROUP BY donation_purpose
ORDER BY total DESC;
```

**Get top donors for a branch (anonymity-aware)**:
```sql
SELECT 
  CASE WHEN d.is_anonymous THEN 'Anonymous' ELSE CONCAT(m.first_name, ' ', m.last_name) END as donor_name,
  SUM(d.amount) as total_amount,
  COUNT(*) as donation_count
FROM dev.donations d
JOIN dev.members m ON d.member_id = m.member_id
WHERE d.branch_id = $1 AND d.donation_date BETWEEN $2 AND $3
GROUP BY d.member_id, d.is_anonymous, m.first_name, m.last_name
ORDER BY total_amount DESC
LIMIT 10;
```

### Notifications Queries

**Send notification to all members of a branch**:
```sql
INSERT INTO dev.notifications (title, message, notification_type, priority, target_scope, target_branch_id, sent_by)
VALUES ($1, $2, 'Announcement', 'Normal', 'Branch', $3, $4)
RETURNING notification_id;
```

**Send notification to all branch pastors** (cross-branch leadership):
```sql
INSERT INTO dev.notifications (title, message, notification_type, priority, target_scope, target_leadership_role, sent_by)
VALUES ($1, $2, 'Announcement', 'High', 'Leadership', 'Main Pastor', $3)
RETURNING notification_id;
```

**Send notification to all members in a region**:
```sql
INSERT INTO dev.notifications (title, message, notification_type, priority, target_scope, target_region_id, sent_by)
VALUES ($1, $2, 'Announcement', 'Normal', 'Region', $3, $4)
RETURNING notification_id;
```

**Get notifications for a member (based on their associations)**:
```sql
SELECT n.*, nr.is_read, nr.read_at
FROM dev.notifications n
LEFT JOIN dev.notification_recipients nr ON n.notification_id = nr.notification_id AND nr.member_id = $1
WHERE n.is_active = TRUE AND (
    n.target_scope = 'All' OR
    (n.target_scope = 'Branch' AND n.target_branch_id = (SELECT home_branch_id FROM dev.members WHERE member_id = $1)) OR
    (n.target_scope = 'Region' AND n.target_region_id = (
        SELECT b.region_id FROM dev.members m JOIN dev.branches b ON m.home_branch_id = b.branch_id WHERE m.member_id = $1
    )) OR
    (n.target_scope = 'Department' AND n.target_department_id IN (
        SELECT bd.department_id FROM dev.department_members dm
        JOIN dev.branch_departments bd ON dm.branch_department_id = bd.branch_department_id
        WHERE dm.member_id = $1 AND dm.is_active = TRUE
    )) OR
    (n.target_scope = 'Fellowship' AND n.target_fellowship_id IN (
        SELECT fellowship_id FROM dev.fellowship_members WHERE member_id = $1 AND is_active = TRUE
    )) OR
    (n.target_scope = 'Role' AND n.target_role_id IN (
        SELECT role_id FROM dev.member_roles WHERE member_id = $1 AND is_active = TRUE
    )) OR
    (n.target_scope = 'Leadership' AND n.target_leadership_role IN (
        SELECT role FROM dev.branch_leadership WHERE member_id = $1 AND is_current = TRUE
    ))
)
ORDER BY n.sent_at DESC;
```

**Get unread notification count**:
```sql
SELECT COUNT(*) as unread_count
FROM dev.notification_recipients nr
JOIN dev.notifications n ON nr.notification_id = n.notification_id
WHERE nr.member_id = $1 AND nr.is_read = FALSE AND n.is_active = TRUE;
```

**Mark notification as read**:
```sql
UPDATE dev.notification_recipients 
SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
WHERE notification_id = $1 AND member_id = $2;
```

### Events Queries

**Create a church-wide event**:
```sql
INSERT INTO dev.events (event_title, event_theme, description, event_type, start_date, end_date, start_time, end_time, venue, coordinator_id, status)
VALUES ($1, $2, $3, 'Conference', $4, $5, $6, $7, $8, $9, 'Draft')
RETURNING event_id;
```

**Create a branch-specific event**:
```sql
INSERT INTO dev.events (event_title, event_type, start_date, end_date, branch_id, requires_registration, max_attendees, coordinator_id, status)
VALUES ($1, 'Workshop', $2, $3, $4, TRUE, $5, $6, 'Published')
RETURNING event_id;
```

**Get upcoming events for a member** (based on scope):
```sql
SELECT e.*
FROM dev.events e
WHERE e.is_active = TRUE AND e.status IN ('Published', 'Ongoing') AND e.start_date >= CURRENT_DATE
  AND (
    (e.branch_id IS NULL AND e.region_id IS NULL) OR  -- Church-wide
    e.branch_id = (SELECT home_branch_id FROM dev.members WHERE member_id = $1) OR  -- Branch event
    e.region_id = (SELECT b.region_id FROM dev.members m JOIN dev.branches b ON m.home_branch_id = b.branch_id WHERE m.member_id = $1)  -- Region event
  )
ORDER BY e.start_date, e.start_time;
```

**Register member for event**:
```sql
INSERT INTO dev.event_registrations (event_id, member_id, registration_status)
VALUES ($1, $2, 'Registered')
ON CONFLICT (event_id, member_id) DO UPDATE SET registration_status = 'Registered', updated_at = CURRENT_TIMESTAMP
RETURNING registration_id;
```

**Get event with registration count and capacity**:
```sql
SELECT e.*,
  COUNT(er.registration_id) FILTER (WHERE er.registration_status IN ('Registered', 'Confirmed')) as registered_count,
  e.max_attendees - COUNT(er.registration_id) FILTER (WHERE er.registration_status IN ('Registered', 'Confirmed')) as spots_remaining
FROM dev.events e
LEFT JOIN dev.event_registrations er ON e.event_id = er.event_id
WHERE e.event_id = $1
GROUP BY e.event_id;
```

**Get event organizers with their roles**:
```sql
SELECT m.member_id, CONCAT(m.first_name, ' ', m.last_name) as name, eo.organizer_role
FROM dev.event_organizers eo
JOIN dev.members m ON eo.member_id = m.member_id
WHERE eo.event_id = $1
ORDER BY eo.assigned_date;
```

**Get event notes for organizers** (with pinned first):
```sql
SELECT en.*, CONCAT(m.first_name, ' ', m.last_name) as author_name
FROM dev.event_notes en
JOIN dev.members m ON en.author_id = m.member_id
WHERE en.event_id = $1
ORDER BY en.is_pinned DESC, en.created_at DESC;
```

**Check in attendee at event**:
```sql
UPDATE dev.event_registrations
SET attended = TRUE, check_in_time = CURRENT_TIMESTAMP, registration_status = 'Confirmed'
WHERE event_id = $1 AND member_id = $2;
```

**Event attendance summary**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE registration_status IN ('Registered', 'Confirmed')) as total_registered,
  COUNT(*) FILTER (WHERE attended = TRUE) as total_attended,
  COUNT(*) FILTER (WHERE registration_status = 'No-Show') as no_shows,
  SUM(guest_count) FILTER (WHERE attended = TRUE) as total_guests
FROM dev.event_registrations
WHERE event_id = $1;
```

## Application-Level Validation Rules

Beyond database constraints, enforce these rules in application code:

### Member Management
- **Phone/Email Uniqueness**: Before creating/updating, check if phone or email already exist in active members
- **Membership Date**: Must not exceed today's date; warn if more than current year
- **Age Calculation**: If `date_of_birth` is provided, warn if age < 1 or > 130 years
- **Emergency Contact**: Require emergency contact if member has dependents in department/fellowship leadership roles

### Leadership Assignment
- **Pastor Transition**: Before creating new Main Pastor, mark existing `is_current=FALSE` and set `end_date=CURRENT_DATE`
- **Leadership Overlap**: Prevent same member holding Main Pastor + Elder roles in same branch simultaneously
- **Role Availability**: Ensure assigned member is active before assigning leadership role
- **Leadership History**: When demoting a leader, validate that at least one leader remains active in branch

### Role Assignment (`member_roles`)
- **Role Existence**: Verify role exists and `is_active=TRUE` before assignment
- **Duplicate Prevention**: Check `(member_id, role_id, branch_id, is_active)` before inserting to prevent active duplicates
- **Branch Consistency**: Member's home_branch_id should align with role assignment (document if cross-branch assignment needed)

### Fellowship Management
- **Fellowship Isolation**: A fellowship belongs to ONE branch; prevent member assignment if not in branch
- **Leader Validation**: Fellowship leader must be active member in the fellowship's branch
- **Leader Assignment**: When assigning leader, automatically add to `fellowship_members` with `join_date=CURRENT_DATE`
- **Duplicate Prevention**: Prevent same member joining same fellowship twice (check `is_active` records)

### Department Assignment
- **Department Instantiation**: Departments are global; each branch instantiates via `branch_departments` with lead member
- **Lead Member Validation**: `lead_member_id` must be active member in same branch
- **Active Department Limit**: Enforce only ONE active instance per `(branch_id, department_id)` pair via query before insert
- **Deputy Validation**: If deputy assigned, must be different from lead AND active member in same branch

### Attendance Recording
- **Service Attendance Status**: Limited to `'Present'`, `'Absent'`, `'Virtual'` (service-specific, unlike meetings)
- **Fellowship/Department Attendance**: Limited to `'Present'`, `'Absent'`, `'Excused'`, `'Late'`
- **Arrival Time Logic**: If `attendance_status='Present'` and `arrival_time` is provided, validate arrival_time ≤ meeting_date
- **Recorder Validation**: `recorded_by` must be active member, preferably leadership of relevant group
- **Duplicate Prevention**: Prevent duplicate attendance records via `(service_id/meeting_id, member_id)` uniqueness

### Outreach & Conversion Pipeline
- **Soul Status Flow**: When marking soul as `'Converted'`, require `converted_to_member_id` to be set
- **Follow-up Validation**: Contact method and status must match expected workflow (e.g., "Text Message" only with "Successful"/"No Answer"/"Call Back Later")
- **Follow-up Assignment**: Ensure `assigned_member_id` on soul is active member before logging follow-up
- **Duplicate Soul Prevention**: Check if phone/email already exist in same outreach before creating new soul (warn, allow override with notes)
- **Conversion Linkage**: If soul converted, optionally auto-create member record from soul data with `is_active=TRUE`

### Cross-Entity Consistency
- **Branch Existence**: All operations must reference active branches; reject operations on inactive branches
- **Cascading Soft Deletes**: When marking entity as `is_active=FALSE`, cascade logic depends on entity:
  - `members`: Orphaned assignments cascade (role, fellowship, leadership)
  - `branches`: All child records become inactive (with explicit warning)
  - `roles`: Prevent deletion if active assignments exist
  - `departments`: Prevent deletion if active instances exist
- **Date Range Validation**: For all entities with `(start_date, end_date)` fields, enforce `end_date >= start_date`

### Donations
- **Purpose-Description Dependency**: If `donation_purpose='Other'`, `description` MUST be provided (database enforces this)
- **Amount Validation**: Amount must be > 0 (database enforces this)
- **Payment Method**: Validate against allowed values: `'Cash'`, `'Check'`, `'Bank Transfer'`, `'Mobile Money'`, `'Card'`, `'Online'`, `'Other'`
- **Branch Consistency**: Donation should typically be to member's home branch (allow override with notes)
- **Anonymity Handling**: When `is_anonymous=TRUE`, exclude donor name from public reports

### Notifications
- **Target Scope Consistency**: Database enforces that scope matches target_*_id field (e.g., scope='Branch' requires target_branch_id)
- **Sender Validation**: `sent_by` must be active member with appropriate permissions
- **Recipient Population**: After creating notification, populate `notification_recipients` for all targeted members
- **Expiration Handling**: Filter out expired notifications (`expires_at < CURRENT_TIMESTAMP`) in queries
- **Scheduling**: If `scheduled_for` is set, don't deliver until that timestamp

### Events & Registration
- **Scope Consistency**: Database enforces mutual exclusivity of branch_id and region_id (can't have both)
- **Date Validation**: `end_date >= start_date` enforced by database; application should validate times when same-day event
- **Registration Deadline**: Must be on or before event start_date (database enforced)
- **Capacity Check**: Before registering, check current count against `max_attendees`; use 'Waitlisted' status if at capacity
- **Coordinator Validation**: `coordinator_id` must be active member
- **Organizer Validation**: Only allow event organizers or coordinator to add notes
- **Status Transitions**: Enforce flow: Draft → Published → Ongoing → Completed; Cancelled/Postponed from any active state
- **Registration Scope**: Only allow registration for 'Published' or 'Ongoing' events before deadline
- **Duplicate Registration**: Database enforces one registration per member per event via unique constraint
- **Check-in Logic**: Set `attended=TRUE` and `check_in_time` only during event date range
- **No-Show Handling**: After event ends, mark unattended registrations as 'No-Show'

## File Structure
- [database/schema.sql](../database/schema.sql) - Complete PostgreSQL schema with triggers and indexes
- [ADMINISTRATION.md](../ADMINISTRATION.md) - Detailed entity definitions, constraints, and relationships

## Key Implementation Notes
- **No application-level ORM assumptions** - schema is designed for raw SQL or simple query builders
- **Referential integrity enforced at database level** - foreign keys with specific cascade behaviors
- **Audit trail via timestamps** - all mutations tracked through `updated_at`
- **Partial indexes for business rules** - leverage PostgreSQL partial indexes for constraints like "one current pastor per branch"
- **Soft deletes over hard deletes** - preserves historical data and audit trail for compliance
- **Business logic split**: Database enforces structure; application enforces workflow rules (status transitions, cascading operations)
