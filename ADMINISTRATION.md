# Church Administration System - Database Design Documentation

## Entity Relationship Diagram (ERD) Overview

This document describes the database schema for a Church Administration System designed for PostgreSQL.

---

## Database Schema Summary

### Core Entities

1. **Regions** - Geographic areas where branches are located
2. **Branches** - Individual church locations
3. **Members** - Church members
4. **Roles** - Church roles (e.g., Choir, Usher)
5. **Fellowships** - Small groups/fellowships
6. **Departments** - Ministry departments
7. **Outreach Programs** - Evangelism events
8. **Services** - Weekly worship services

---

## Detailed Table Specifications

### 1. REGIONS

**Purpose:** Store geographical regions where branches are located

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| region_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| region_name | VARCHAR(100) | NOT NULL, UNIQUE | Name of the region |
| country | VARCHAR(100) | NOT NULL | Country name |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Indexes:**

- Primary Key on `region_id`
- Unique index on `region_name`

---

### 2. BRANCHES

**Purpose:** Store church branch information across different regions

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| branch_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_name | VARCHAR(150) | NOT NULL | Name of the branch |
| region_id | INTEGER | NOT NULL, FK → regions | Associated region |
| branch_type | VARCHAR(50) | NOT NULL, DEFAULT 'Main' | Type of branch |
| address | TEXT | | Physical address |
| city | VARCHAR(100) | | City name |
| postal_code | VARCHAR(20) | | Postal/ZIP code |
| phone | VARCHAR(20) | | Contact phone |
| email | VARCHAR(100) | | Contact email |
| established_date | DATE | | Date branch was established |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `region_id` → `regions.region_id` (ON DELETE RESTRICT)

**Check Constraints:**

- `branch_type` IN ('Main', 'Satellite', 'Cell', 'Campus', 'Online')

**Unique Constraints:**

- `(branch_name, region_id)` - Ensures unique branch names within a region
- `email` - Unique branch email
- `phone` - Unique branch phone

**Indexes:**

- Primary Key on `branch_id`
- Foreign key index on `region_id`

---

### 3. MEMBERS

**Purpose:** Store church member information

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| member_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| first_name | VARCHAR(100) | NOT NULL | Member's first name |
| last_name | VARCHAR(100) | NOT NULL | Member's last name |
| middle_name | VARCHAR(100) | | Member's middle name |
| date_of_birth | DATE | | Birth date |
| gender | VARCHAR(10) | CHECK (Male/Female) | Gender |
| email | VARCHAR(100) | UNIQUE | Email address |
| phone | VARCHAR(20) | | Phone number |
| address | TEXT | | Physical address |
| city | VARCHAR(100) | | City name |
| postal_code | VARCHAR(20) | | Postal/ZIP code |
| home_branch_id | INTEGER | NOT NULL, FK → branches | Home branch |
| membership_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date joined church |
| is_active | BOOLEAN | DEFAULT TRUE | Active membership status |
| photo_url | VARCHAR(255) | | URL to member photo |
| emergency_contact_name | VARCHAR(150) | | Emergency contact name |
| emergency_contact_phone | VARCHAR(20) | | Emergency contact phone |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `home_branch_id` → `branches.branch_id` (ON DELETE RESTRICT)

**Check Constraints:**

- `gender` IN ('Male', 'Female')
- `membership_date <= CURRENT_DATE`

**Indexes:**
- Primary Key on `member_id`
- Unique index on `email`
- Index on `home_branch_id`
- Index on `is_active`
- Index on `(last_name, first_name)`
- Partial unique index on `phone` (where active)

---

### 4. BRANCH_LEADERSHIP
**Purpose:** Store pastor and elder assignments for each branch

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| leadership_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_id | INTEGER | NOT NULL, FK → branches | Associated branch |
| member_id | INTEGER | NOT NULL, FK → members | Leader member |
| role | VARCHAR(50) | NOT NULL, CHECK | Leadership role |
| start_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Role start date |
| end_date | DATE | | Role end date (NULL if current) |
| is_current | BOOLEAN | DEFAULT TRUE | Currently active |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE RESTRICT)

**Check Constraints:**

- `role` IN ('Main Pastor', 'Elder')
- `end_date >= start_date` (if end_date is not NULL)

**Unique Constraints:**

- `(branch_id, role, is_current)` - Ensures only one current leader per role
- `(branch_id, member_id, role, start_date)`
- Partial unique index ensures only one current Main Pastor per branch
- Partial unique index ensures only one current role per member per branch

**Indexes:**

- Primary Key on `leadership_id`
- Index on `branch_id`
- Index on `member_id`
- Index on `is_current`

---

### 5. ROLES

**Purpose:** Store church role definitions (e.g., Choir Member, Usher, Teacher)

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| role_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| role_name | VARCHAR(100) | NOT NULL, UNIQUE | Name of the role |
| description | TEXT | | Role description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Indexes:**

- Primary Key on `role_id`
- Unique index on `role_name`
- Index on `is_active`

---

### 6. MEMBER_ROLES
**Purpose:** Store member role assignments (many-to-many relationship with history)

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| member_role_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| role_id | INTEGER | NOT NULL, FK → roles | Role reference |
| branch_id | INTEGER | NOT NULL, FK → branches | Branch reference |
| assigned_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Assignment date |
| end_date | DATE | | End date |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Primary Key:** `member_role_id`

**Foreign Keys:**

- `member_id` → `members.member_id` (ON DELETE CASCADE)
- `role_id` → `roles.role_id` (ON DELETE RESTRICT)
- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)

**Check Constraints:**

- `end_date >= assigned_date`

**Unique Constraints:**

- `(member_id, role_id, branch_id, assigned_date)` - Prevents duplicate assignments on same date

**Indexes:**

- Primary Key on `member_role_id`
- Index on `member_id`
- Index on `role_id`
- Index on `branch_id`
- Index on `is_active`

---

### 7. FELLOWSHIPS

**Purpose:** Store fellowship group information

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| fellowship_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| fellowship_name | VARCHAR(150) | NOT NULL | Name of the fellowship |
| branch_id | INTEGER | NOT NULL, FK → branches | Associated branch |
| description | TEXT | | Description |
| leader_id | INTEGER | FK → members | Fellowship leader |
| co_leader_id | INTEGER | FK → members | Fellowship co-leader |
| meeting_schedule | VARCHAR(200) | | Meeting schedule info |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `leader_id` → `members.member_id` (ON DELETE SET NULL)
- `co_leader_id` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `leader_id != co_leader_id`

**Unique Constraints:**

- `(fellowship_name, branch_id)`

**Indexes:**

- Primary Key on `fellowship_id`
- Index on `branch_id`
- Index on `leader_id`
- Index on `is_active`

---

### 8. FELLOWSHIP_MEMBERS

**Purpose:** Store member assignments to fellowships (many-to-many relationship with history)

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| fellowship_member_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| fellowship_id | INTEGER | NOT NULL, FK → fellowships | Fellowship reference |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| join_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Join date |
| leave_date | DATE | | Leave date |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| notes | TEXT | | Notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Primary Key:** `fellowship_member_id`

**Foreign Keys:**

- `fellowship_id` → `fellowships.fellowship_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Check Constraints:**
- `leave_date >= join_date`

**Unique Constraints:**
- `(fellowship_id, member_id, join_date)` - Prevents duplicate joins on same date

**Indexes:**
- Primary Key on `fellowship_member_id`
- Index on `fellowship_id`
- Index on `member_id`
- Index on `is_active`

---

### 9. FELLOWSHIP_MEETINGS

**Purpose:** Store fellowship meeting information

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| meeting_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| fellowship_id | INTEGER | NOT NULL, FK → fellowships | Fellowship reference |
| meeting_date | TIMESTAMP | NOT NULL | Meeting date/time |
| meeting_title | VARCHAR(200) | | Title |
| meeting_topic | VARCHAR(200) | | Topic |
| meeting_notes | TEXT | | Notes |
| location | VARCHAR(200) | | Location |
| duration_minutes | INTEGER | | Duration |
| created_by | INTEGER | FK → members | Creator |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `fellowship_id` → `fellowships.fellowship_id` (ON DELETE CASCADE)
- `created_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**
- `duration_minutes > 0`

**Unique Constraints:**
- `(fellowship_id, meeting_date)`

**Indexes:**
- Primary Key on `meeting_id`
- Index on `fellowship_id`
- Index on `meeting_date`

---

### 10. FELLOWSHIP_MEETING_ATTENDANCE

**Purpose:** Store attendance records for fellowship meetings

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| meeting_id | INTEGER | NOT NULL, FK → fellowship_meetings | Meeting reference |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| attendance_status | VARCHAR(20) | NOT NULL, DEFAULT 'Present' | Status |
| arrival_time | TIMESTAMP | | Arrival time |
| notes | TEXT | | Notes |
| recorded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record time |
| recorded_by | INTEGER | FK → members | Recorder |

**Primary Key:** `(meeting_id, member_id)`

**Foreign Keys:**

- `meeting_id` → `fellowship_meetings.meeting_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)
- `recorded_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `attendance_status` IN ('Present', 'Absent', 'Excused', 'Late')

**Indexes:**

- Primary Key on `(meeting_id, member_id)`
- Index on `meeting_id`
- Index on `member_id`
- Index on `attendance_status`

---

### 11. DEPARTMENTS

**Purpose:** Store department definitions (common across all branches)

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| department_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| department_name | VARCHAR(100) | NOT NULL, UNIQUE | Department name |
| description | TEXT | | Department description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Unique Constraints:**

- `department_name` - Ensures unique department names

**Indexes:**

- Primary Key on `department_id`
- Unique index on `department_name`

---

### 12. OUTREACH_PROGRAMS

**Purpose:** Store outreach program information and activities

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| outreach_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_id | INTEGER | NOT NULL, FK → branches | Branch reference |
| program_name | VARCHAR(200) | NOT NULL | Program name |
| program_date | DATE | NOT NULL | Date |
| location | VARCHAR(300) | NOT NULL | Location |
| address | TEXT | | Address |
| city | VARCHAR(100) | | City |
| description | TEXT | | Description |
| coordinator_id | INTEGER | FK → members | Coordinator |
| total_souls_reached | INTEGER | DEFAULT 0 | Count of souls |
| notes | TEXT | | Notes |
| is_completed | BOOLEAN | DEFAULT FALSE | Completion status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `coordinator_id` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `total_souls_reached >= 0`

**Unique Constraints:**

- `(branch_id, program_name, program_date, location)`

**Indexes:**

- Primary Key on `outreach_id`
- Index on `branch_id`
- Index on `coordinator_id`
- Index on `program_date`
- Index on `is_completed`

---

### 13. SOULS

**Purpose:** Store information about new individuals reached through outreach

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| soul_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| outreach_id | INTEGER | NOT NULL, FK → outreach_programs | Outreach reference |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| phone | VARCHAR(20) | | Phone |
| email | VARCHAR(100) | | Email |
| address | TEXT | | Address |
| city | VARCHAR(100) | | City |
| gender | VARCHAR(10) | | Gender |
| age_range | VARCHAR(20) | | Age range |
| assigned_member_id | INTEGER | FK → members | Assigned follow-up member |
| converted_to_member_id | INTEGER | FK → members | Linked member ID if converted |
| status | VARCHAR(30) | DEFAULT 'New' | Status |
| notes | TEXT | | Notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `outreach_id` → `outreach_programs.outreach_id` (ON DELETE CASCADE)
- `assigned_member_id` → `members.member_id` (ON DELETE SET NULL)
- `converted_to_member_id` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**
- `gender` IN ('Male', 'Female')
- `status` IN ('New', 'Following Up', 'Interested', 'Not Interested', 'Converted', 'Lost Contact')

**Unique Constraints:**

- `(phone, outreach_id)`
- `(email, outreach_id)`
- Partial unique index on `phone` (where not null)
- Partial unique index on `email` (where not null)

**Indexes:**

- Primary Key on `soul_id`
- Index on `outreach_id`
- Index on `assigned_member_id`
- Index on `converted_to_member_id`
- Index on `status`
- Index on `phone`
- Index on `email`

---

### 14. FOLLOW_UPS

**Purpose:** Store follow-up activities for souls

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| follow_up_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| soul_id | INTEGER | NOT NULL, FK → souls | Soul reference |
| member_id | INTEGER | NOT NULL, FK → members | Member performing follow-up |
| follow_up_date | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Date/Time |
| contact_method | VARCHAR(30) | | Method |
| contact_status | VARCHAR(30) | NOT NULL | Outcome |
| duration_minutes | INTEGER | | Duration |
| notes | TEXT | | Notes |
| next_follow_up_date | DATE | | Next scheduled date |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `soul_id` → `souls.soul_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Check Constraints:**

- `contact_method` IN ('Phone Call', 'Text Message', 'Email', 'WhatsApp', 'In-Person Visit', 'Other')
- `contact_status` IN ('Successful', 'No Answer', 'Wrong Number', 'Call Back Later', 'Not Interested', 'Interested')
- `duration_minutes > 0`

**Indexes:**
- Primary Key on `follow_up_id`
- Index on `soul_id`
- Index on `member_id`
- Index on `follow_up_date`
- Index on `contact_status`
- Index on `next_follow_up_date`

---

### 15. OUTREACH_PARTICIPANTS

**Purpose:** Store member participation in outreach programs

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| outreach_id | INTEGER | NOT NULL, FK → outreach_programs | Outreach reference |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| role | VARCHAR(50) | | Role in outreach |
| notes | TEXT | | Notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Primary Key:** `(outreach_id, member_id)`

**Foreign Keys:**

- `outreach_id` → `outreach_programs.outreach_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Indexes:**

- Primary Key on `(outreach_id, member_id)`
- Index on `outreach_id`
- Index on `member_id`

---

### 16. BRANCH_DEPARTMENTS

**Purpose:** Link departments to specific branches with leadership assignments

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| branch_department_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_id | INTEGER | NOT NULL, FK → branches | Associated branch |
| department_id | INTEGER | NOT NULL, FK → departments | Department type |
| lead_member_id | INTEGER | NOT NULL, FK → members | Department lead |
| deputy_member_id | INTEGER | FK → members | Department deputy (optional) |
| start_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Department start date |
| end_date | DATE | | Department end date |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `department_id` → `departments.department_id` (ON DELETE RESTRICT)
- `lead_member_id` → `members.member_id` (ON DELETE RESTRICT)
- `deputy_member_id` → `members.member_id` (ON DELETE RESTRICT)

**Check Constraints:**

- `end_date >= start_date` (if end_date is not NULL)
- `lead_member_id != deputy_member_id` - Lead and deputy must be different

**Unique Constraints:**
- `(branch_id, department_id, is_active)` - One active department instance per branch

**Indexes:**
- Primary Key on `branch_department_id`
- Index on `branch_id`
- Index on `department_id`
- Index on `lead_member_id`
- Index on `is_active`

---

### 17. DEPARTMENT_MEMBERS

**Purpose:** Store member assignments to departments (many-to-many relationship with history)

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| department_member_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_department_id | INTEGER | NOT NULL, FK → branch_departments | Department instance |
| member_id | INTEGER | NOT NULL, FK → members | Member |
| join_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date member joined dept |
| leave_date | DATE | | Date member left dept |
| is_active | BOOLEAN | DEFAULT TRUE | Active membership |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Primary Key:** `department_member_id`

**Foreign Keys:**

- `branch_department_id` → `branch_departments.branch_department_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Check Constraints:**
- `leave_date >= join_date`

**Unique Constraints:**
- `(branch_department_id, member_id, join_date)` - Prevents duplicate joins on same date

**Indexes:**
- Primary Key on `department_member_id`
- Index on `branch_department_id`
- Index on `member_id`
- Index on `is_active`

---

### 18. DEPARTMENT_MEETINGS

**Purpose:** Store department meeting information

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| meeting_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_department_id | INTEGER | NOT NULL, FK → branch_departments | Department instance |
| meeting_date | TIMESTAMP | NOT NULL | Meeting date and time |
| meeting_title | VARCHAR(200) | | Meeting title |
| meeting_notes | TEXT | | Meeting notes/minutes |
| location | VARCHAR(200) | | Meeting location |
| duration_minutes | INTEGER | CHECK > 0 | Meeting duration |
| created_by | INTEGER | FK → members | Member who created record |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_department_id` → `branch_departments.branch_department_id` (ON DELETE CASCADE)
- `created_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `duration_minutes > 0`

**Unique Constraints:**

- `(branch_department_id, meeting_date)`

**Indexes:**

- Primary Key on `meeting_id`
- Index on `branch_department_id`
- Index on `meeting_date`

---

### 19. MEETING_ATTENDANCE

**Purpose:** Store attendance records for department meetings

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| meeting_id | INTEGER | NOT NULL, FK → department_meetings | Meeting reference |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| attendance_status | VARCHAR(20) | NOT NULL, CHECK | Attendance status |
| arrival_time | TIMESTAMP | | Actual arrival time |
| notes | TEXT | | Additional notes |
| recorded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When record was created |
| recorded_by | INTEGER | FK → members | Who recorded attendance |

**Primary Key:** `(meeting_id, member_id)`

**Foreign Keys:**
- `meeting_id` → `department_meetings.meeting_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)
- `recorded_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**
- `attendance_status` IN ('Present', 'Absent', 'Excused', 'Late')

**Indexes:**
- Primary Key on `(meeting_id, member_id)`
- Index on `meeting_id`
- Index on `member_id`
- Index on `attendance_status`

---

### 20. SERVICES

**Purpose:** Store weekly service information for each branch

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| service_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| branch_id | INTEGER | NOT NULL, FK → branches | Branch holding service |
| service_date | TIMESTAMP | NOT NULL | Service date and time |
| service_type | VARCHAR(50) | NOT NULL, CHECK | Type of service |
| service_title | VARCHAR(200) | | Service title/theme |
| preacher_id | INTEGER | FK → members | Preacher for service |
| topic | VARCHAR(200) | | Sermon topic |
| notes | TEXT | | Service notes |
| expected_attendance | INTEGER | CHECK >= 0 | Expected attendance count |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `preacher_id` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `service_type` IN ('Sunday Service', 'Midweek Service', 'Special Service', 'Prayer Meeting', 'Other')
- `expected_attendance >= 0`

**Unique Constraints:**

- `(branch_id, service_date, service_type)`

**Indexes:**

- Primary Key on `service_id`
- Index on `branch_id`
- Index on `service_date`
- Index on `service_type`

---

### 21. SERVICE_ATTENDANCE

**Purpose:** Store attendance records for services

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| service_id | INTEGER | NOT NULL, FK → services | Service reference |
| member_id | INTEGER | NOT NULL, FK → members | Member reference |
| attendance_status | VARCHAR(20) | NOT NULL, CHECK | Attendance status |
| arrival_time | TIMESTAMP | | Actual arrival time |
| is_first_time_visitor | BOOLEAN | DEFAULT FALSE | First time visitor flag |
| notes | TEXT | | Additional notes |
| recorded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When record was created |
| recorded_by | INTEGER | FK → members | Who recorded attendance |

**Primary Key:** `(service_id, member_id)`

**Foreign Keys:**

- `service_id` → `services.service_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)
- `recorded_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `attendance_status` IN ('Present', 'Absent', 'Virtual')

**Indexes:**

- Primary Key on `(service_id, member_id)`
- Index on `service_id`
- Index on `member_id`
- Index on `attendance_status`

---

### 22. DONATIONS

**Purpose:** Store member donation/giving records with purpose tracking

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| donation_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| member_id | INTEGER | NOT NULL, FK → members | Donating member |
| branch_id | INTEGER | NOT NULL, FK → branches | Branch receiving donation |
| donation_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date of donation |
| amount | DECIMAL(12,2) | NOT NULL, CHECK > 0 | Donation amount |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| donation_purpose | VARCHAR(30) | NOT NULL, CHECK | Purpose category |
| description | TEXT | | Required when purpose is 'Other' |
| payment_method | VARCHAR(30) | CHECK | Payment method used |
| reference_number | VARCHAR(100) | | Transaction reference |
| is_anonymous | BOOLEAN | DEFAULT FALSE | Hide donor identity |
| notes | TEXT | | Additional notes |
| recorded_by | INTEGER | FK → members | Staff who recorded |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `member_id` → `members.member_id` (ON DELETE RESTRICT)
- `branch_id` → `branches.branch_id` (ON DELETE RESTRICT)
- `recorded_by` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `amount > 0`
- `donation_purpose` IN ('Offering', 'Building Fund', 'Other')
- `payment_method` IN ('Cash', 'Check', 'Bank Transfer', 'Mobile Money', 'Card', 'Online', 'Other')
- When `donation_purpose = 'Other'`, `description` must be NOT NULL and non-empty

**Indexes:**

- Primary Key on `donation_id`
- Index on `member_id`
- Index on `branch_id`
- Index on `donation_date`
- Index on `donation_purpose`

---

### 23. NOTIFICATIONS

**Purpose:** Store notifications and announcements broadcast to members

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| notification_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Full message content |
| notification_type | VARCHAR(30) | NOT NULL, CHECK | Type of notification |
| priority | VARCHAR(20) | DEFAULT 'Normal', CHECK | Priority level |
| target_scope | VARCHAR(30) | NOT NULL, CHECK | Audience scope |
| target_branch_id | INTEGER | FK → branches | Target branch (if scope=Branch) |
| target_region_id | INTEGER | FK → regions | Target region (if scope=Region) |
| target_department_id | INTEGER | FK → departments | Target department (if scope=Department) |
| target_fellowship_id | INTEGER | FK → fellowships | Target fellowship (if scope=Fellowship) |
| target_role_id | INTEGER | FK → roles | Target role holders (if scope=Role) |
| target_leadership_role | VARCHAR(50) | CHECK | Target leadership position (if scope=Leadership) |
| sent_by | INTEGER | NOT NULL, FK → members | Sender member |
| sent_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When sent |
| scheduled_for | TIMESTAMP | | Future delivery time |
| expires_at | TIMESTAMP | | Expiration time |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `sent_by` → `members.member_id` (ON DELETE RESTRICT)
- `target_branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `target_region_id` → `regions.region_id` (ON DELETE CASCADE)
- `target_department_id` → `departments.department_id` (ON DELETE CASCADE)
- `target_fellowship_id` → `fellowships.fellowship_id` (ON DELETE CASCADE)
- `target_role_id` → `roles.role_id` (ON DELETE CASCADE)

**Check Constraints:**

- `notification_type` IN ('Announcement', 'Reminder', 'Alert', 'Event', 'General')
- `priority` IN ('Low', 'Normal', 'High', 'Urgent')
- `target_scope` IN ('All', 'Branch', 'Region', 'Department', 'Fellowship', 'Role', 'Leadership')
- `target_leadership_role` IN ('Main Pastor', 'Elder') when provided
- Target consistency: scope must match the corresponding target field

**Indexes:**

- Primary Key on `notification_id`
- Index on `sent_by`
- Index on `sent_at`
- Index on `target_scope`
- Index on each target_*_id column and target_leadership_role
- Index on `is_active`

---

### 24. NOTIFICATION_RECIPIENTS

**Purpose:** Track notification delivery and read status per member

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| notification_id | INTEGER | NOT NULL, FK → notifications | Notification reference |
| member_id | INTEGER | NOT NULL, FK → members | Recipient member |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| read_at | TIMESTAMP | | When read |
| is_dismissed | BOOLEAN | DEFAULT FALSE | Dismissed status |
| dismissed_at | TIMESTAMP | | When dismissed |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Primary Key:** `(notification_id, member_id)`

**Foreign Keys:**

- `notification_id` → `notifications.notification_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Indexes:**

- Primary Key on `(notification_id, member_id)`
- Index on `notification_id`
- Index on `member_id`
- Index on `is_read`

---

### 25. EVENTS

**Purpose:** Store church-wide and branch events with scheduling and registration settings

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| event_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| event_title | VARCHAR(200) | NOT NULL | Event title |
| event_theme | VARCHAR(300) | | Event theme/tagline |
| description | TEXT | | Full description |
| event_type | VARCHAR(50) | NOT NULL, CHECK | Type of event |
| start_date | DATE | NOT NULL | Event start date |
| end_date | DATE | NOT NULL | Event end date |
| start_time | TIME | | Daily start time |
| end_time | TIME | | Daily end time |
| venue | VARCHAR(300) | | Venue name |
| address | TEXT | | Venue address |
| city | VARCHAR(100) | | City |
| is_virtual | BOOLEAN | DEFAULT FALSE | Virtual event flag |
| virtual_link | VARCHAR(500) | | Link for virtual attendance |
| branch_id | INTEGER | FK → branches | Branch-specific event (NULL = church-wide) |
| region_id | INTEGER | FK → regions | Region-specific event |
| requires_registration | BOOLEAN | DEFAULT FALSE | Requires sign-up |
| registration_deadline | DATE | | Registration cutoff |
| max_attendees | INTEGER | CHECK > 0 | Capacity limit |
| coordinator_id | INTEGER | FK → members | Event coordinator |
| status | VARCHAR(30) | NOT NULL, DEFAULT 'Draft' | Event status |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `branch_id` → `branches.branch_id` (ON DELETE CASCADE)
- `region_id` → `regions.region_id` (ON DELETE CASCADE)
- `coordinator_id` → `members.member_id` (ON DELETE SET NULL)

**Check Constraints:**

- `end_date >= start_date`
- `end_time >= start_time` (for same-day events)
- `event_type` IN ('Conference', 'Retreat', 'Seminar', 'Workshop', 'Concert', 'Outreach', 'Celebration', 'Meeting', 'Other')
- `status` IN ('Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled', 'Postponed')
- `registration_deadline <= start_date`
- `max_attendees > 0`
- Scope: church-wide (both NULL), branch-specific, or region-specific (not both)

**Indexes:**

- Primary Key on `event_id`
- Index on `branch_id`, `region_id`, `coordinator_id`
- Index on `start_date`, `end_date`
- Index on `status`, `event_type`, `is_active`
- Index on `requires_registration`

---

### 26. EVENT_ORGANIZERS

**Purpose:** Store organizing team members for events

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| event_id | INTEGER | NOT NULL, FK → events | Event reference |
| member_id | INTEGER | NOT NULL, FK → members | Organizer member |
| organizer_role | VARCHAR(100) | | Role in organizing (e.g., "Logistics", "Publicity") |
| assigned_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | When assigned |
| notes | TEXT | | Notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Primary Key:** `(event_id, member_id)`

**Foreign Keys:**

- `event_id` → `events.event_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Indexes:**

- Primary Key on `(event_id, member_id)`
- Index on `event_id`
- Index on `member_id`

---

### 27. EVENT_NOTES

**Purpose:** Store messages and notes logged by event organizers for collaboration

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| note_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| event_id | INTEGER | NOT NULL, FK → events | Event reference |
| author_id | INTEGER | NOT NULL, FK → members | Note author |
| note_title | VARCHAR(200) | | Note title |
| note_content | TEXT | NOT NULL | Note content |
| note_type | VARCHAR(30) | DEFAULT 'General', CHECK | Type of note |
| is_pinned | BOOLEAN | DEFAULT FALSE | Pin to top |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `event_id` → `events.event_id` (ON DELETE CASCADE)
- `author_id` → `members.member_id` (ON DELETE CASCADE)

**Check Constraints:**

- `note_type` IN ('General', 'Task', 'Decision', 'Issue', 'Update', 'Reminder')

**Indexes:**

- Primary Key on `note_id`
- Index on `event_id`
- Index on `author_id`
- Index on `note_type`
- Index on `is_pinned`
- Index on `created_at`

---

### 28. EVENT_REGISTRATIONS

**Purpose:** Store member registrations for events requiring sign-up with attendance tracking

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| registration_id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| event_id | INTEGER | NOT NULL, FK → events | Event reference |
| member_id | INTEGER | NOT NULL, FK → members | Registering member |
| registration_date | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | When registered |
| registration_status | VARCHAR(30) | NOT NULL, DEFAULT 'Registered' | Registration status |
| guest_count | INTEGER | DEFAULT 0, CHECK >= 0 | Number of guests |
| notes | TEXT | | Notes |
| attended | BOOLEAN | | Whether member attended |
| check_in_time | TIMESTAMP | | Check-in timestamp |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record update timestamp |

**Foreign Keys:**

- `event_id` → `events.event_id` (ON DELETE CASCADE)
- `member_id` → `members.member_id` (ON DELETE CASCADE)

**Check Constraints:**

- `registration_status` IN ('Registered', 'Waitlisted', 'Confirmed', 'Cancelled', 'No-Show')
- `guest_count >= 0`

**Unique Constraints:**

- `(event_id, member_id)` - One registration per member per event

**Indexes:**

- Primary Key on `registration_id`
- Index on `event_id`
- Index on `member_id`
- Index on `registration_status`
- Index on `registration_date`

---

## Entity Relationships

### Relationship Diagram (Text Format)

```
REGIONS (1) ──────< (N) BRANCHES

BRANCHES (1) ──────< (N) MEMBERS
         (1) ──────< (N) BRANCH_LEADERSHIP
         (1) ──────< (N) MEMBER_ROLES
         (1) ──────< (N) FELLOWSHIPS
         (1) ──────< (N) OUTREACH_PROGRAMS
         (1) ──────< (N) BRANCH_DEPARTMENTS
         (1) ──────< (N) SERVICES

MEMBERS (1) ──────< (N) BRANCH_LEADERSHIP
        (1) ──────< (N) MEMBER_ROLES
        (1) ──────< (N) FELLOWSHIP_MEMBERS
        (1) ──────< (N) FELLOWSHIP_MEETING_ATTENDANCE
        (1) ──────< (N) OUTREACH_PARTICIPANTS
        (1) ──────< (N) FOLLOW_UPS
        (1) ──────< (N) DEPARTMENT_MEMBERS
        (1) ──────< (N) MEETING_ATTENDANCE
        (1) ──────< (N) SERVICE_ATTENDANCE

ROLES (1) ──────< (N) MEMBER_ROLES

FELLOWSHIPS (1) ──────< (N) FELLOWSHIP_MEMBERS
            (1) ──────< (N) FELLOWSHIP_MEETINGS
            (1) ──────> (0..1) MEMBERS [leader_id]
            (1) ──────> (0..1) MEMBERS [co_leader_id]

FELLOWSHIP_MEETINGS (1) ──────< (N) FELLOWSHIP_MEETING_ATTENDANCE

OUTREACH_PROGRAMS (1) ──────< (N) SOULS
                  (1) ──────< (N) OUTREACH_PARTICIPANTS
                  (1) ──────> (0..1) MEMBERS [coordinator_id]

SOULS (1) ──────< (N) FOLLOW_UPS
      (1) ──────> (0..1) MEMBERS [assigned_member_id]
      (1) ──────> (0..1) MEMBERS [converted_to_member_id]

DEPARTMENTS (1) ──────< (N) BRANCH_DEPARTMENTS

BRANCH_DEPARTMENTS (1) ──────< (N) DEPARTMENT_MEMBERS
                   (1) ──────< (N) DEPARTMENT_MEETINGS
                   (1) ──────> (1) MEMBERS [lead_member_id]
                   (1) ──────> (0..1) MEMBERS [deputy_member_id]

DEPARTMENT_MEETINGS (1) ──────< (N) MEETING_ATTENDANCE

SERVICES (1) ──────< (N) SERVICE_ATTENDANCE
         (1) ──────> (0..1) MEMBERS [preacher_id]

MEMBERS (1) ──────< (N) DONATIONS
BRANCHES (1) ──────< (N) DONATIONS

NOTIFICATIONS (1) ──────< (N) NOTIFICATION_RECIPIENTS
              (1) ──────> (1) MEMBERS [sent_by]
              (1) ──────> (0..1) BRANCHES [target_branch_id]
              (1) ──────> (0..1) REGIONS [target_region_id]
              (1) ──────> (0..1) DEPARTMENTS [target_department_id]
              (1) ──────> (0..1) FELLOWSHIPS [target_fellowship_id]
              (1) ──────> (0..1) ROLES [target_role_id]

EVENTS (1) ──────< (N) EVENT_ORGANIZERS
       (1) ──────< (N) EVENT_NOTES
       (1) ──────< (N) EVENT_REGISTRATIONS
       (1) ──────> (0..1) BRANCHES [branch_id]
       (1) ──────> (0..1) REGIONS [region_id]
       (1) ──────> (0..1) MEMBERS [coordinator_id]
```

### Relationship Details

#### One-to-Many Relationships:

1. **REGIONS → BRANCHES**: One region can have many branches
2. **BRANCHES → MEMBERS**: One branch can have many members
3. **BRANCHES → BRANCH_LEADERSHIP**: One branch can have many leaders
4. **BRANCHES → FELLOWSHIPS**: One branch can have many fellowships
5. **BRANCHES → OUTREACH_PROGRAMS**: One branch can have many outreach programs
6. **BRANCHES → BRANCH_DEPARTMENTS**: One branch can have many department instances
7. **BRANCHES → SERVICES**: One branch can hold many services
8. **FELLOWSHIPS → FELLOWSHIP_MEETINGS**: One fellowship can have many meetings
9. **FELLOWSHIP_MEETINGS → FELLOWSHIP_MEETING_ATTENDANCE**: One meeting can have many attendance records
10. **OUTREACH_PROGRAMS → SOULS**: One outreach can reach many souls
11. **SOULS → FOLLOW_UPS**: One soul can have many follow-up records
12. **DEPARTMENTS → BRANCH_DEPARTMENTS**: One department definition can exist in many branches
13. **BRANCH_DEPARTMENTS → DEPARTMENT_MEETINGS**: Each department instance can hold many meetings
14. **DEPARTMENT_MEETINGS → MEETING_ATTENDANCE**: Each meeting can have many attendance records
15. **SERVICES → SERVICE_ATTENDANCE**: Each service can have many attendance records
16. **MEMBERS → DONATIONS**: One member can make many donations
17. **BRANCHES → DONATIONS**: One branch can receive many donations
18. **NOTIFICATIONS → NOTIFICATION_RECIPIENTS**: One notification can have many recipients
19. **EVENTS → EVENT_ORGANIZERS**: One event can have many organizers
20. **EVENTS → EVENT_NOTES**: One event can have many notes
21. **EVENTS → EVENT_REGISTRATIONS**: One event can have many registrations

#### Many-to-Many Relationships:

1. **MEMBERS ↔ ROLES**: Implemented via MEMBER_ROLES junction table
2. **MEMBERS ↔ FELLOWSHIPS**: Implemented via FELLOWSHIP_MEMBERS junction table
3. **MEMBERS ↔ OUTREACH_PROGRAMS**: Implemented via OUTREACH_PARTICIPANTS junction table
4. **MEMBERS ↔ BRANCH_DEPARTMENTS**: Implemented via DEPARTMENT_MEMBERS junction table
5. **NOTIFICATIONS ↔ MEMBERS**: Implemented via NOTIFICATION_RECIPIENTS junction table
6. **EVENTS ↔ MEMBERS (organizers)**: Implemented via EVENT_ORGANIZERS junction table
7. **EVENTS ↔ MEMBERS (registrations)**: Implemented via EVENT_REGISTRATIONS table

#### Self-Referential Relationships:

1. **FELLOWSHIPS → MEMBERS**: Leader and Co-leader
2. **OUTREACH_PROGRAMS → MEMBERS**: Coordinator
3. **SOULS → MEMBERS**: Assigned member and Converted to member
4. **BRANCH_DEPARTMENTS → MEMBERS**: Lead and Deputy
5. **SERVICES → MEMBERS**: Preacher

---

## Key Integrity Constraints

### Referential Integrity:

- All foreign keys use appropriate ON DELETE actions:
  - **RESTRICT**: Prevents deletion if referenced (for critical relationships)
  - **CASCADE**: Automatically deletes dependent records
  - **SET NULL**: Sets FK to NULL when parent is deleted

### Data Integrity:

1. **Unique Constraints**:
   - Only one Main Pastor per branch at a time
   - Only one active department instance per branch
   - Unique email addresses for members
   - Unique region names

2. **Check Constraints**:
   - Date validations (end_date >= start_date)
   - Status enumerations (gender, attendance_status, service_type, role)
   - Logical constraints (lead_member_id != deputy_member_id)
   - Numeric validations (duration_minutes > 0, expected_attendance >= 0)

3. **NOT NULL Constraints**:
   - Applied to essential fields that must always have values
   - Examples: names, dates, foreign keys for required relationships

### Automatic Features:

1. **Timestamps**: All tables have created_at and updated_at
2. **Triggers**: Automatic updated_at updates on record modification
3. **Auto-incrementing IDs**: SERIAL type for entity primary keys (junction tables use composite keys)
4. **Default Values**: Sensible defaults for dates, booleans, and timestamps

---

## Performance Optimization

### Indexing Strategy:

1. **Primary Keys**: Automatic B-tree indexes
2. **Foreign Keys**: Indexes on all FK columns for join performance
3. **Frequently Queried Columns**:
   - Member names, emails
   - Active status flags
   - Date fields for temporal queries
4. **Unique Constraints**: Automatic unique indexes

### Query Optimization Considerations:

- Indexes support efficient lookups, joins, and filtering
- Partial unique indexes for conditional uniqueness
- Covering indexes for common query patterns

---

## Usage Examples

### Sample Queries:

```sql
-- Get all active members in a specific branch
SELECT m.* FROM members m
WHERE m.home_branch_id = 1 AND m.is_active = TRUE;

-- Get current pastor of a branch
SELECT m.first_name, m.last_name FROM branch_leadership bl
JOIN members m ON bl.member_id = m.member_id
WHERE bl.branch_id = 1 AND bl.role = 'Main Pastor' AND bl.is_current = TRUE;

-- Get all departments a member belongs to
SELECT d.department_name, bd.branch_id
FROM department_members dm
JOIN branch_departments bd ON dm.branch_department_id = bd.branch_department_id
JOIN departments d ON bd.department_id = d.department_id
WHERE dm.member_id = 1 AND dm.is_active = TRUE;

-- Get attendance for a specific service
SELECT m.first_name, m.last_name, sa.attendance_status
FROM service_attendance sa
JOIN members m ON sa.member_id = m.member_id
WHERE sa.service_id = 1
ORDER BY m.last_name, m.first_name;

-- Get meeting attendance summary for a department
SELECT dm.meeting_date, COUNT(ma.member_id) as attendees
FROM department_meetings dm
LEFT JOIN meeting_attendance ma ON dm.meeting_id = ma.meeting_id
WHERE dm.branch_department_id = 1
GROUP BY dm.meeting_id, dm.meeting_date
ORDER BY dm.meeting_date DESC;

-- Get member donation history
SELECT d.donation_date, d.amount, d.currency, d.donation_purpose, d.description
FROM donations d
WHERE d.member_id = 1
ORDER BY d.donation_date DESC;

-- Get total donations by purpose for a branch
SELECT donation_purpose, SUM(amount) as total, COUNT(*) as count
FROM donations
WHERE branch_id = 1 AND donation_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY donation_purpose;

-- Get notifications for a specific member (based on their associations)
SELECT n.* FROM notifications n
WHERE n.is_active = TRUE AND (
    n.target_scope = 'All' OR
    (n.target_scope = 'Branch' AND n.target_branch_id = (SELECT home_branch_id FROM members WHERE member_id = 1)) OR
    (n.target_scope = 'Role' AND n.target_role_id IN (SELECT role_id FROM member_roles WHERE member_id = 1 AND is_active = TRUE))
)
ORDER BY n.sent_at DESC;

-- Get unread notification count for a member
SELECT COUNT(*) as unread_count
FROM notification_recipients nr
WHERE nr.member_id = 1 AND nr.is_read = FALSE;
```

---

## Notes and Considerations

1. **Scalability**: The schema supports multiple branches across different regions with flexible department assignments

2. **Flexibility**:
   - Members can belong to multiple departments
   - Historical tracking with start_date/end_date fields
   - Support for both active and inactive records

3. **Audit Trail**:
   - created_at and updated_at timestamps on all tables
   - recorded_by fields for attendance tracking

4. **Data Quality**:
   - Comprehensive check constraints ensure data validity
   - Unique constraints prevent duplicate records
   - NOT NULL constraints enforce required data

5. **Future Enhancements**:
   - Could add tables for: Events, Prayer Requests, etc.
   - Consider adding soft delete functionality (deleted_at column)
   - May need additional tables for member roles/permissions
