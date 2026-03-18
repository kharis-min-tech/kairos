# Kairos Reporting Views Summary

This document provides a comprehensive listing of all reporting views available in the Kairos Church Administration System. These views are designed to support decision-making at all levels of church management.

## How to Use

1. **Install Views**: Run the SQL file against your PostgreSQL database:
   ```bash
   psql -d kairos -f reporting_views.sql
   ```

2. **Query Views**: Use standard SELECT statements:
   ```sql
   SELECT * FROM vw_branch_overview WHERE is_active = TRUE;
   ```

3. **Filter and Sort**: All views support standard SQL filtering and sorting.

---

## View Categories

| Category | Views Count | Description |
|----------|-------------|-------------|
| Organizational Structure | 3 | Regional and branch hierarchy reports |
| Membership | 6 | Member demographics, engagement, and profiles |
| Leadership | 3 | Current and historical leadership tracking |
| Attendance | 5 | Service, fellowship, and department attendance |
| Departments | 2 | Department rosters and growth trends |
| Fellowships | 3 | Fellowship rosters, growth, and schedules |
| Outreach & Evangelism | 5 | Soul conversion tracking and follow-up activities |
| Financial | 6 | Donation analytics and giving patterns |
| Events | 5 | Event management and attendance analysis |
| Communication | 3 | Notification delivery and engagement |
| Roles & Assignments | 2 | Role distribution and assignment history |
| Dashboard | 3 | High-level summaries for dashboards |

---

## Section 1: Organizational Structure Reports

### vw_regional_summary
**Purpose**: Overview of each region with branch counts and member totals.

| Column | Description |
|--------|-------------|
| region_id | Unique region identifier |
| region_name | Name of the region |
| country | Country where region is located |
| total_branches | Total number of branches in region |
| active_branches | Number of active branches |
| total_members | Total members across all branches |
| active_members | Currently active members |
| earliest_branch_established | Date of oldest branch |
| latest_branch_established | Date of newest branch |

**Use Cases**: Regional planning, resource allocation, expansion tracking.

---

### vw_branch_overview
**Purpose**: Complete branch information with leadership and member counts.

| Column | Description |
|--------|-------------|
| branch_id | Unique branch identifier |
| branch_name | Name of the branch |
| branch_type | Type (Main, Satellite, Cell, Campus, Online) |
| region_name | Parent region name |
| country | Country location |
| city, address, phone, email | Contact information |
| established_date | When branch was established |
| is_active | Whether branch is currently active |
| main_pastor | Current main pastor's name |
| pastor_phone, pastor_email | Pastor contact details |
| active_member_count | Number of active members |
| fellowship_count | Number of active fellowships |
| department_count | Number of active departments |
| services_last_30_days | Services held in past 30 days |

**Use Cases**: Branch management dashboard, contact directory, capacity planning.

---

### vw_branches_by_type
**Purpose**: Branch distribution by type for each region.

| Column | Description |
|--------|-------------|
| region_name | Region name |
| branch_type | Type of branch |
| branch_count | Total branches of this type |
| active_count | Active branches of this type |
| branch_names | Comma-separated list of branch names |

**Use Cases**: Church structure analysis, growth strategy planning.

---

## Section 2: Membership Reports

### vw_member_demographics
**Purpose**: Member demographics breakdown by gender, age groups, and branch.

| Column | Description |
|--------|-------------|
| branch_id, branch_name | Branch identifiers |
| region_name | Parent region |
| total_members | All members (active and inactive) |
| active_members | Currently active members |
| male_members, female_members | Gender breakdown |
| youth_under_18 | Members under 18 years old |
| young_adults_18_35 | Members aged 18-35 |
| adults_36_55 | Members aged 36-55 |
| seniors_over_55 | Members over 55 |
| age_unknown | Members without birth date |

**Use Cases**: Ministry planning, age-specific programming, gender balance analysis.

---

### vw_new_members_trend
**Purpose**: New member registrations by month for trend analysis.

| Column | Description |
|--------|-------------|
| membership_month | Month/year of membership |
| region_name, branch_name | Location details |
| new_members | Count of new members |
| male_count, female_count | Gender breakdown |

**Use Cases**: Growth tracking, seasonal patterns, evangelism effectiveness.

---

### vw_inactive_members
**Purpose**: List of inactive members with their last activity date.

| Column | Description |
|--------|-------------|
| member_id | Unique member identifier |
| member_name | Full name |
| phone, email | Contact information |
| branch_name | Home branch |
| membership_date | Original join date |
| last_updated | When record was last updated |
| last_service_attendance | Last service attended |
| last_fellowship_attendance | Last fellowship meeting attended |
| last_donation_date | Most recent donation |

**Use Cases**: Member recovery outreach, data cleanup, engagement campaigns.

---

### vw_member_engagement_score
**Purpose**: Calculate engagement score based on attendance, giving, and participation.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| branch_name | Home branch |
| services_attended_90_days | Service attendance in past 90 days |
| fellowship_meetings_90_days | Fellowship attendance in past 90 days |
| department_meetings_90_days | Department meeting attendance |
| donations_90_days | Number of donations |
| total_giving_90_days | Total donation amount |
| active_roles | Number of active role assignments |
| fellowship_memberships | Number of fellowship memberships |
| engagement_score | Weighted composite score |

**Use Cases**: Identify highly engaged members, leadership candidates, at-risk members.

---

### vw_members_missing_services
**Purpose**: Active members who haven't attended services recently.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| phone, email | Contact information |
| branch_name | Home branch |
| membership_date | Join date |
| last_attended_date | Most recent service attendance |
| days_since_last_attendance | Days since last attended |

**Use Cases**: Pastoral care follow-up, engagement recovery, retention strategies.

---

### vw_member_complete_profile
**Purpose**: Complete member profile with all associations.

| Column | Description |
|--------|-------------|
| All member fields | Personal information |
| age | Calculated age |
| home_branch, region_name | Location |
| leadership_positions | Current leadership roles |
| active_roles | All active ministry roles |
| fellowships | Fellowship memberships |
| departments | Department memberships |

**Use Cases**: Member directory, profile views, comprehensive member reports.

---

## Section 3: Leadership Reports

### vw_current_leadership
**Purpose**: All current leadership positions across branches.

| Column | Description |
|--------|-------------|
| leadership_id | Unique identifier |
| region_name, branch_name | Location |
| branch_type | Type of branch |
| leadership_role | Main Pastor or Elder |
| leader_name | Leader's full name |
| phone, email | Contact information |
| start_date | When position started |
| years_in_position | Tenure in current role |
| membership_date | When leader joined church |
| member_is_active | Leader's active status |

**Use Cases**: Leadership directory, succession planning, pastoral support.

---

### vw_leadership_history
**Purpose**: Complete leadership history for succession planning.

| Column | Description |
|--------|-------------|
| branch_name, region_name | Location |
| leadership_role | Position held |
| leader_name | Leader's name |
| start_date, end_date | Tenure dates |
| status | Current or Former |
| tenure_duration | Length of service |

**Use Cases**: Historical analysis, succession patterns, leadership development.

---

### vw_multi_role_members
**Purpose**: Members holding multiple roles or leadership positions.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| phone, email | Contact information |
| home_branch | Home branch |
| branches_serving | Number of branches serving |
| total_roles | Total active roles |
| leadership_positions | Number of leadership roles |
| role_names | List of role names |
| leadership_details | Leadership position details |

**Use Cases**: Workload analysis, burnout prevention, volunteer management.

---

## Section 4: Attendance Reports

### vw_service_attendance_summary
**Purpose**: Service attendance statistics by branch and service type.

| Column | Description |
|--------|-------------|
| service_id | Unique service identifier |
| branch_name, region_name | Location |
| service_date | Date and time of service |
| service_type | Type of service |
| service_title | Title of service |
| preacher_name | Who preached |
| expected_attendance | Expected headcount |
| total_recorded | Total attendance records |
| present_count | Members present in-person |
| virtual_count | Members attending virtually |
| absent_count | Members marked absent |
| first_time_visitors | First-time attendees |
| attendance_rate_percent | Percentage present/virtual |

**Use Cases**: Weekly reports, preacher effectiveness, capacity planning.

---

### vw_service_attendance_trend
**Purpose**: Service attendance trends over time by branch.

| Column | Description |
|--------|-------------|
| week_start | Beginning of week |
| branch_name | Branch name |
| service_type | Type of service |
| service_count | Number of services held |
| total_present | Total in-person attendance |
| total_virtual | Total virtual attendance |
| avg_attendance_rate | Average attendance rate |
| first_time_visitors | Number of first-timers |

**Use Cases**: Growth trends, seasonal patterns, virtual vs in-person analysis.

---

### vw_fellowship_attendance_summary
**Purpose**: Fellowship meeting attendance statistics.

| Column | Description |
|--------|-------------|
| fellowship_id, fellowship_name | Fellowship identifiers |
| branch_name | Parent branch |
| leader_name | Fellowship leader |
| total_meetings_90_days | Meetings in past 90 days |
| active_members | Current active members |
| avg_attendance | Average attendance per meeting |
| avg_attendance_rate | Average attendance percentage |

**Use Cases**: Fellowship health assessment, leader evaluation, group vitality.

---

### vw_department_attendance_summary
**Purpose**: Department meeting attendance statistics.

| Column | Description |
|--------|-------------|
| department_name | Department name |
| branch_name | Branch location |
| department_lead | Lead member name |
| active_members | Current active members |
| total_meetings_90_days | Meetings in past 90 days |
| avg_attendance | Average attendance |
| avg_attendance_rate | Average attendance percentage |

**Use Cases**: Department performance, ministry effectiveness, resource allocation.

---

### vw_member_attendance_history
**Purpose**: Individual member attendance across all meeting types.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| branch_name | Home branch |
| meeting_type | Service, Fellowship, or Department |
| meeting_date | Date of meeting |
| meeting_description | Details (service type, group name) |
| attendance_status | Present, Absent, Virtual, etc. |
| is_first_time_visitor | First-time flag (services only) |
| recorded_at | When attendance was recorded |

**Use Cases**: Member attendance reports, pastoral conversations, engagement tracking.

---

## Section 5: Department Reports

### vw_department_roster
**Purpose**: Complete department roster with leadership for each branch.

| Column | Description |
|--------|-------------|
| department_id | Department master record ID |
| department_name | Name of department |
| department_description | Description |
| branch_name, region_name | Location |
| department_active | Whether active at this branch |
| department_start_date | When established at branch |
| department_lead | Lead member name |
| lead_phone, lead_email | Lead contact info |
| department_deputy | Deputy member name |
| member_count | Number of members |
| member_names | Comma-separated member list |

**Use Cases**: Department directories, leadership contacts, staffing analysis.

---

### vw_department_growth
**Purpose**: Department membership growth trends.

| Column | Description |
|--------|-------------|
| join_month | Month of joining |
| department_name | Department name |
| branch_name | Branch location |
| new_members | Members joined that month |
| cumulative_members | Running total of members |

**Use Cases**: Growth analysis, recruitment effectiveness, seasonal patterns.

---

## Section 6: Fellowship Reports

### vw_fellowship_roster
**Purpose**: Complete fellowship roster with leadership.

| Column | Description |
|--------|-------------|
| fellowship_id | Unique identifier |
| fellowship_name | Name of fellowship |
| fellowship_description | Description |
| meeting_schedule | Regular meeting schedule |
| branch_name, region_name | Location |
| is_active | Active status |
| leader_name | Leader's name |
| leader_phone, leader_email | Leader contact info |
| co_leader_name | Co-leader name |
| member_count | Number of members |
| member_names | Comma-separated member list |

**Use Cases**: Fellowship directories, small group management, leader contacts.

---

### vw_fellowship_growth
**Purpose**: Fellowship membership growth trends.

| Column | Description |
|--------|-------------|
| join_month | Month of joining |
| fellowship_name | Fellowship name |
| branch_name | Branch location |
| new_members | Members joined that month |
| cumulative_members | Running total |

**Use Cases**: Growth tracking, multiplication planning, health assessment.

---

### vw_fellowship_meeting_schedule
**Purpose**: Upcoming fellowship meetings with details.

| Column | Description |
|--------|-------------|
| meeting_id | Unique meeting identifier |
| fellowship_name | Fellowship name |
| branch_name | Branch location |
| meeting_date | Scheduled date/time |
| meeting_title | Title of meeting |
| meeting_topic | Topic to be discussed |
| location | Meeting location |
| duration_minutes | Expected duration |
| created_by | Who scheduled the meeting |
| expected_attendees | Expected headcount |

**Use Cases**: Calendar planning, resource booking, communication.

---

## Section 7: Outreach & Evangelism Reports

### vw_outreach_program_summary
**Purpose**: Outreach program effectiveness metrics.

| Column | Description |
|--------|-------------|
| outreach_id | Program identifier |
| program_name | Name of program |
| branch_name, region_name | Location |
| program_date | Date of outreach |
| location, city | Event location |
| coordinator_name | Program coordinator |
| is_completed | Completion status |
| participant_count | Number of church participants |
| souls_reached | Total souls contacted |
| souls_converted | Souls that converted |
| souls_following_up | Souls in follow-up |
| souls_interested | Interested souls |
| conversion_rate_percent | Percentage converted |
| notes | Program notes |

**Use Cases**: Outreach effectiveness, ROI analysis, program comparison.

---

### vw_soul_conversion_funnel
**Purpose**: Track souls through the conversion pipeline.

| Column | Description |
|--------|-------------|
| program_name | Outreach program name |
| branch_name | Branch location |
| program_date | Date of outreach |
| soul_status | Current status of souls |
| soul_count | Count at this status |
| percentage_of_total | Percentage of all souls |

**Use Cases**: Funnel analysis, bottleneck identification, follow-up prioritization.

---

### vw_souls_requiring_followup
**Purpose**: List of souls that need follow-up attention.

| Column | Description |
|--------|-------------|
| soul_id | Soul identifier |
| soul_name | Full name |
| phone, email | Contact information |
| gender, age_range | Demographics |
| status | Current status |
| program_name, program_date | Source outreach |
| branch_name | Branch responsible |
| assigned_to | Assigned member name |
| assigned_member_phone | Contact for assigned member |
| last_followup_date | Most recent follow-up |
| last_followup_status | Result of last contact |
| next_followup_scheduled | Next scheduled follow-up |
| days_since_last_contact | Days since last contact |

**Use Cases**: Follow-up prioritization, accountability, workload distribution.

---

### vw_followup_activity_report
**Purpose**: Follow-up activities and outcomes analysis.

| Column | Description |
|--------|-------------|
| followup_member | Member conducting follow-ups |
| branch_name | Member's branch |
| contact_method | Method of contact |
| contact_status | Outcome of contact |
| contact_count | Number of contacts |
| avg_duration_minutes | Average call duration |
| successful_contacts | Successful contact count |
| interested_outcomes | Contacts showing interest |

**Use Cases**: Team performance, method effectiveness, training needs.

---

### vw_outreach_participant_contribution
**Purpose**: Member participation and contribution in outreach programs.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| branch_name | Home branch |
| outreach_programs_participated | Programs participated in |
| total_followups_conducted | Follow-ups performed |
| successful_followups | Successful follow-ups |
| souls_converted | Souls converted through efforts |

**Use Cases**: Volunteer recognition, evangelism training, capacity building.

---

## Section 8: Financial Reports

### vw_donation_summary_by_period
**Purpose**: Donation totals grouped by year and month.

| Column | Description |
|--------|-------------|
| donation_month | Month of donations |
| year, month | Year and month numbers |
| branch_name, region_name | Location |
| currency | Currency used |
| donation_count | Number of donations |
| total_amount | Sum of all donations |
| avg_donation | Average donation amount |
| min_donation, max_donation | Range of donations |
| unique_donors | Number of unique donors |

**Use Cases**: Financial reporting, budget planning, giving trends.

---

### vw_donation_by_purpose
**Purpose**: Donation breakdown by purpose category.

| Column | Description |
|--------|-------------|
| year | Year of donations |
| branch_name, region_name | Location |
| donation_purpose | Purpose (Offering, Building Fund, Other) |
| currency | Currency used |
| donation_count | Number of donations |
| total_amount | Sum of donations |
| percentage_of_branch_total | % of branch's total giving |

**Use Cases**: Fund allocation, campaign tracking, purpose analysis.

---

### vw_top_donors
**Purpose**: Top donors by branch (anonymity aware).

| Column | Description |
|--------|-------------|
| donor_name | Name (or "Anonymous Donor") |
| donor_phone, donor_email | Contact if not anonymous |
| branch_name | Branch donated to |
| year | Year of donations |
| donation_count | Number of donations |
| total_amount | Total given |
| currency | Currency used |
| purposes_supported | Purposes donated to |

**Use Cases**: Stewardship, donor appreciation, major gift cultivation.

---

### vw_donation_trend
**Purpose**: Donation trends over time for forecasting.

| Column | Description |
|--------|-------------|
| week_start | Beginning of week |
| region_name, branch_name | Location |
| currency | Currency used |
| donation_purpose | Donation purpose |
| donation_count | Number of donations |
| total_amount | Total amount |
| unique_donors | Number of unique donors |
| previous_week_amount | Prior week total |
| week_over_week_change_percent | WoW change percentage |

**Use Cases**: Trend analysis, forecasting, seasonal patterns.

---

### vw_giving_pattern_by_member
**Purpose**: Individual member giving patterns.

| Column | Description |
|--------|-------------|
| member_id | Member identifier |
| member_name | Name (or "Confidential" if any anonymous) |
| branch_name | Home branch |
| first_donation, last_donation | Giving history range |
| total_donations | Lifetime donation count |
| lifetime_giving | Lifetime total amount |
| avg_donation | Average donation |
| donations_last_year | Last 365 days count |
| giving_last_year | Last 365 days amount |
| donations_last_90_days | Last 90 days count |
| giving_last_90_days | Last 90 days amount |
| purposes_supported | All purposes donated to |
| payment_methods_used | Payment methods used |

**Use Cases**: Donor profiles, giving analysis, stewardship conversations.

---

### vw_payment_method_analysis
**Purpose**: Donation distribution by payment method.

| Column | Description |
|--------|-------------|
| payment_method | Method used |
| branch_name | Branch location |
| year | Year of donations |
| transaction_count | Number of transactions |
| total_amount | Total amount |
| currency | Currency used |
| avg_transaction | Average transaction |
| percentage_of_transactions | % of branch transactions |

**Use Cases**: Payment infrastructure planning, digital giving adoption.

---

## Section 9: Event Reports

### vw_upcoming_events
**Purpose**: All upcoming and ongoing events with registration status.

| Column | Description |
|--------|-------------|
| event_id | Event identifier |
| event_title, event_theme | Event details |
| event_type | Type of event |
| description | Event description |
| start_date, end_date | Event dates |
| start_time, end_time | Event times |
| venue, city | Location |
| is_virtual, virtual_link | Virtual event details |
| event_scope | Church-wide, region, or branch |
| status | Current event status |
| requires_registration | Registration required flag |
| registration_deadline | Deadline to register |
| max_attendees | Capacity limit |
| coordinator_name, coordinator_phone | Coordinator contact |
| registered_count | Current registrations |
| spots_remaining | Available spots |
| waitlist_count | Members on waitlist |

**Use Cases**: Event calendar, registration management, capacity planning.

---

### vw_event_registration_status
**Purpose**: Detailed registration status for each event.

| Column | Description |
|--------|-------------|
| event_id | Event identifier |
| event_title | Event name |
| start_date, end_date | Event dates |
| max_attendees | Capacity limit |
| registration_status | Status category |
| count | Number in this status |
| percentage | % of total registrations |

**Use Cases**: Registration tracking, capacity management, waitlist handling.

---

### vw_event_attendance_analysis
**Purpose**: Event attendance outcomes and analysis.

| Column | Description |
|--------|-------------|
| event_id | Event identifier |
| event_title | Event name |
| event_type | Type of event |
| start_date, end_date | Event dates |
| event_scope | Scope of event |
| max_attendees | Capacity |
| total_registered | Total who registered |
| total_attended | Total who attended |
| total_guests | Additional guests |
| no_shows | Registered but didn't attend |
| cancelled | Cancelled registrations |
| attendance_rate_percent | Attendance rate |

**Use Cases**: Event success evaluation, planning improvements, capacity learning.

---

### vw_event_organizer_workload
**Purpose**: Event organizer assignments and workload.

| Column | Description |
|--------|-------------|
| member_id, organizer_name | Organizer identifiers |
| branch_name | Home branch |
| total_events_organized | All-time event count |
| active_events | Currently active events |
| completed_events | Completed events |
| roles_held | Organizer role types |
| current_events | List of current events |

**Use Cases**: Workload distribution, volunteer management, recognition.

---

### vw_event_type_statistics
**Purpose**: Event statistics by type for planning insights.

| Column | Description |
|--------|-------------|
| event_type | Type of event |
| year | Year of events |
| total_events | Number of events held |
| completed_events | Successfully completed |
| cancelled_events | Cancelled events |
| avg_attendance | Average attendance |
| total_attendees | Total attendees |
| avg_duration_days | Average event duration |

**Use Cases**: Event portfolio analysis, resource planning, success metrics.

---

## Section 10: Communication Reports

### vw_notification_summary
**Purpose**: Notification delivery and engagement summary.

| Column | Description |
|--------|-------------|
| notification_id | Notification identifier |
| title | Notification title |
| notification_type | Type (Announcement, Alert, etc.) |
| priority | Priority level |
| target_scope | Targeting scope |
| target_details | Specific target (branch, role, etc.) |
| sent_by | Sender name |
| sent_at | When sent |
| expires_at | Expiration date |
| is_active | Active status |
| recipients_count | Total recipients |
| read_count | Number who read |
| read_rate_percent | Percentage read |
| dismissed_count | Number who dismissed |

**Use Cases**: Communication effectiveness, audience reach, engagement tracking.

---

### vw_notification_engagement_trend
**Purpose**: Notification engagement trends over time.

| Column | Description |
|--------|-------------|
| week_sent | Week notifications sent |
| notification_type | Type of notification |
| priority | Priority level |
| notifications_sent | Number sent |
| total_recipients | Total audience |
| total_reads | Total reads |
| avg_read_rate | Average read rate |
| avg_hours_to_first_read | Time to first read |

**Use Cases**: Communication timing, type effectiveness, engagement patterns.

---

### vw_member_notification_engagement
**Purpose**: Individual member notification engagement patterns.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| branch_name | Home branch |
| notifications_received | Total received |
| notifications_read | Total read |
| read_rate_percent | Read rate |
| notifications_dismissed | Total dismissed |
| avg_hours_to_read | Average read time |

**Use Cases**: Member engagement, communication preferences, outreach timing.

---

## Section 11: Roles & Assignment Reports

### vw_role_distribution
**Purpose**: Role assignments distribution across branches.

| Column | Description |
|--------|-------------|
| role_id | Role identifier |
| role_name | Name of role |
| role_description | Role description |
| role_active | Whether role is active |
| branch_name, region_name | Location |
| assigned_members | Count of assigned members |
| member_names | List of assigned members |

**Use Cases**: Staffing analysis, volunteer distribution, role coverage.

---

### vw_role_assignment_history
**Purpose**: Role assignment history for tracking transitions.

| Column | Description |
|--------|-------------|
| member_id, member_name | Member identifiers |
| role_name | Role name |
| branch_name | Branch of assignment |
| assigned_date | When assigned |
| end_date | When ended (if applicable) |
| is_active | Current status |
| assignment_status | Current or Former |
| tenure | Length of service |
| notes | Assignment notes |

**Use Cases**: Historical tracking, tenure analysis, succession planning.

---

## Section 12: Comprehensive Dashboard Views

### vw_church_wide_summary
**Purpose**: High-level church-wide metrics dashboard.

| Column | Description |
|--------|-------------|
| total_regions | Number of regions |
| active_branches | Number of active branches |
| active_members | Number of active members |
| new_members_30_days | New members past month |
| active_fellowships | Number of fellowships |
| active_department_instances | Department instances |
| services_30_days | Services past month |
| service_attendance_30_days | Service attendees past month |
| total_donations_30_days | Donations past month |
| outreach_programs_90_days | Outreach programs past quarter |
| souls_converted_90_days | Conversions past quarter |
| upcoming_events | Events coming up |

**Use Cases**: Executive dashboard, senior leadership reports, quick overview.

---

### vw_branch_dashboard
**Purpose**: Branch-level metrics for branch dashboards.

| Column | Description |
|--------|-------------|
| branch_id, branch_name | Branch identifiers |
| branch_type | Type of branch |
| region_name | Parent region |
| is_active | Active status |
| main_pastor | Current pastor |
| elder_count | Number of elders |
| active_members | Active member count |
| new_members_30_days | New members past month |
| active_fellowships | Fellowship count |
| active_departments | Department count |
| services_30_days | Services past month |
| avg_service_attendance_30_days | Average attendance |
| donations_30_days | Donations past month |
| unique_donors_30_days | Unique donors |
| outreach_programs_90_days | Outreach programs |
| total_souls_converted | All-time conversions |

**Use Cases**: Branch pastor dashboard, regional oversight, branch comparison.

---

### vw_monthly_trends_comparison
**Purpose**: Month-over-month comparison across key metrics.

| Column | Description |
|--------|-------------|
| report_month | Current reporting month |
| new_members_current | New members this month |
| new_members_previous | New members last month |
| new_members_change_pct | % change |
| attendance_current | Attendance this month |
| attendance_previous | Attendance last month |
| attendance_change_pct | % change |
| donations_current | Donations this month |
| donations_previous | Donations last month |
| donations_change_pct | % change |
| conversions_current | Conversions this month |
| conversions_previous | Conversions last month |
| conversions_change_pct | % change |

**Use Cases**: Trend analysis, board reports, performance tracking.

---

## Usage Tips

### Filtering by Date Range
Most views can be filtered by date for specific periods:
```sql
SELECT * FROM vw_service_attendance_summary 
WHERE service_date BETWEEN '2026-01-01' AND '2026-01-31';
```

### Combining Views
Views can be joined for more complex analysis:
```sql
SELECT 
    bd.branch_name,
    bd.active_members,
    COALESCE(SUM(don.total_amount), 0) as monthly_donations
FROM vw_branch_dashboard bd
LEFT JOIN vw_donation_summary_by_period don 
    ON bd.branch_name = don.branch_name 
    AND don.donation_month = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY bd.branch_name, bd.active_members;
```

### Exporting Data
Export view data to CSV for external analysis:
```bash
psql -d your_database -c "COPY (SELECT * FROM vw_member_demographics) TO STDOUT WITH CSV HEADER" > demographics.csv
```

---

## Maintenance Notes

- **Performance**: Large churches should consider adding indexes on frequently filtered columns
- **Schema Changes**: When schema changes, review and update affected views
- **Testing**: Test views against production-like data before deployment
- **Permissions**: Grant SELECT access to appropriate roles:
  ```sql
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_role;
  ```

---

*Generated: February 2026*
*Version: 1.0*
