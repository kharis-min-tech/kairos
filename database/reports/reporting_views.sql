-- ============================================================================
-- Church Administration System - Reporting Views
-- Generated: February 2026
-- ============================================================================
-- 
-- This file contains all reporting views for the Kairos Church Administration
-- System. These views provide comprehensive analytics and reporting capabilities
-- for church management, leadership, and member engagement tracking.
--
-- Usage: Run this file against your PostgreSQL database to create all views
--   psql -d your_database -f reporting_views.sql
--
-- Note: Views are created with CREATE OR REPLACE to allow re-running
-- ============================================================================

-- Set the schema (adjust if using a different schema)
SET search_path TO dev, public;

-- ============================================================================
-- SECTION 1: ORGANIZATIONAL STRUCTURE REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_regional_summary
-- Purpose: Overview of each region with branch counts and member totals
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_regional_summary AS
SELECT 
    r.region_id,
    r.region_name,
    r.country,
    COUNT(DISTINCT b.branch_id) AS total_branches,
    COUNT(DISTINCT CASE WHEN b.is_active = TRUE THEN b.branch_id END) AS active_branches,
    COUNT(DISTINCT m.member_id) AS total_members,
    COUNT(DISTINCT CASE WHEN m.is_active = TRUE THEN m.member_id END) AS active_members,
    MIN(b.established_date) AS earliest_branch_established,
    MAX(b.established_date) AS latest_branch_established
FROM regions r
LEFT JOIN branches b ON r.region_id = b.region_id
LEFT JOIN members m ON b.branch_id = m.home_branch_id
GROUP BY r.region_id, r.region_name, r.country
ORDER BY r.region_name;

-- ----------------------------------------------------------------------------
-- View: vw_branch_overview
-- Purpose: Complete branch information with leadership and member counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_branch_overview AS
SELECT 
    b.branch_id,
    b.branch_name,
    b.branch_type,
    r.region_name,
    r.country,
    b.city,
    b.address,
    b.phone,
    b.email,
    b.established_date,
    b.is_active,
    CONCAT(pastor.first_name, ' ', pastor.last_name) AS main_pastor,
    pastor.phone AS pastor_phone,
    pastor.email AS pastor_email,
    (SELECT COUNT(*) FROM members m WHERE m.home_branch_id = b.branch_id AND m.is_active = TRUE) AS active_member_count,
    (SELECT COUNT(*) FROM fellowships f WHERE f.branch_id = b.branch_id AND f.is_active = TRUE) AS fellowship_count,
    (SELECT COUNT(*) FROM branch_departments bd WHERE bd.branch_id = b.branch_id AND bd.is_active = TRUE) AS department_count,
    (SELECT COUNT(*) FROM services s WHERE s.branch_id = b.branch_id 
        AND s.service_date >= CURRENT_DATE - INTERVAL '30 days') AS services_last_30_days
FROM branches b
JOIN regions r ON b.region_id = r.region_id
LEFT JOIN branch_leadership bl ON b.branch_id = bl.branch_id 
    AND bl.role = 'Main Pastor' AND bl.is_current = TRUE
LEFT JOIN members pastor ON bl.member_id = pastor.member_id
ORDER BY r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_branches_by_type
-- Purpose: Branch distribution by type for each region
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_branches_by_type AS
SELECT 
    r.region_name,
    b.branch_type,
    COUNT(*) AS branch_count,
    COUNT(CASE WHEN b.is_active = TRUE THEN 1 END) AS active_count,
    STRING_AGG(b.branch_name, ', ' ORDER BY b.branch_name) AS branch_names
FROM branches b
JOIN regions r ON b.region_id = r.region_id
GROUP BY r.region_name, b.branch_type
ORDER BY r.region_name, b.branch_type;

-- ============================================================================
-- SECTION 2: MEMBERSHIP REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_member_demographics
-- Purpose: Member demographics breakdown by gender, age groups, and branch
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_member_demographics AS
SELECT 
    b.branch_id,
    b.branch_name,
    r.region_name,
    COUNT(*) AS total_members,
    COUNT(CASE WHEN m.is_active = TRUE THEN 1 END) AS active_members,
    COUNT(CASE WHEN m.gender = 'Male' AND m.is_active = TRUE THEN 1 END) AS male_members,
    COUNT(CASE WHEN m.gender = 'Female' AND m.is_active = TRUE THEN 1 END) AS female_members,
    COUNT(CASE WHEN m.date_of_birth IS NOT NULL 
        AND EXTRACT(YEAR FROM AGE(m.date_of_birth)) < 18 AND m.is_active = TRUE THEN 1 END) AS youth_under_18,
    COUNT(CASE WHEN m.date_of_birth IS NOT NULL 
        AND EXTRACT(YEAR FROM AGE(m.date_of_birth)) BETWEEN 18 AND 35 AND m.is_active = TRUE THEN 1 END) AS young_adults_18_35,
    COUNT(CASE WHEN m.date_of_birth IS NOT NULL 
        AND EXTRACT(YEAR FROM AGE(m.date_of_birth)) BETWEEN 36 AND 55 AND m.is_active = TRUE THEN 1 END) AS adults_36_55,
    COUNT(CASE WHEN m.date_of_birth IS NOT NULL 
        AND EXTRACT(YEAR FROM AGE(m.date_of_birth)) > 55 AND m.is_active = TRUE THEN 1 END) AS seniors_over_55,
    COUNT(CASE WHEN m.date_of_birth IS NULL AND m.is_active = TRUE THEN 1 END) AS age_unknown
FROM branches b
JOIN regions r ON b.region_id = r.region_id
LEFT JOIN members m ON b.branch_id = m.home_branch_id
WHERE b.is_active = TRUE
GROUP BY b.branch_id, b.branch_name, r.region_name
ORDER BY r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_new_members_trend
-- Purpose: New member registrations by month for trend analysis
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_new_members_trend AS
SELECT 
    DATE_TRUNC('month', m.membership_date) AS membership_month,
    r.region_name,
    b.branch_name,
    COUNT(*) AS new_members,
    COUNT(CASE WHEN m.gender = 'Male' THEN 1 END) AS male_count,
    COUNT(CASE WHEN m.gender = 'Female' THEN 1 END) AS female_count
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
WHERE m.is_active = TRUE
GROUP BY DATE_TRUNC('month', m.membership_date), r.region_name, b.branch_name
ORDER BY membership_month DESC, r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_inactive_members
-- Purpose: List of inactive members with their last activity date
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_inactive_members AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.phone,
    m.email,
    b.branch_name,
    m.membership_date,
    m.updated_at AS last_updated,
    (SELECT MAX(sa.recorded_at) FROM service_attendance sa WHERE sa.member_id = m.member_id) AS last_service_attendance,
    (SELECT MAX(fma.recorded_at) FROM fellowship_meeting_attendance fma WHERE fma.member_id = m.member_id) AS last_fellowship_attendance,
    (SELECT MAX(d.donation_date) FROM donations d WHERE d.member_id = m.member_id) AS last_donation_date
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
WHERE m.is_active = FALSE
ORDER BY m.updated_at DESC;

-- ----------------------------------------------------------------------------
-- View: vw_member_engagement_score
-- Purpose: Calculate engagement score based on attendance, giving, and participation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_member_engagement_score AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    COALESCE(service_stats.attendance_count, 0) AS services_attended_90_days,
    COALESCE(fellowship_stats.attendance_count, 0) AS fellowship_meetings_90_days,
    COALESCE(department_stats.attendance_count, 0) AS department_meetings_90_days,
    COALESCE(donation_stats.donation_count, 0) AS donations_90_days,
    COALESCE(donation_stats.total_amount, 0) AS total_giving_90_days,
    (SELECT COUNT(*) FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) AS active_roles,
    (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.member_id = m.member_id AND fm.is_active = TRUE) AS fellowship_memberships,
    -- Engagement score calculation (weighted)
    (
        COALESCE(service_stats.attendance_count, 0) * 3 +
        COALESCE(fellowship_stats.attendance_count, 0) * 2 +
        COALESCE(department_stats.attendance_count, 0) * 2 +
        COALESCE(donation_stats.donation_count, 0) * 2 +
        (SELECT COUNT(*) FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) * 1 +
        (SELECT COUNT(*) FROM fellowship_members fm WHERE fm.member_id = m.member_id AND fm.is_active = TRUE) * 1
    ) AS engagement_score
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
LEFT JOIN (
    SELECT sa.member_id, COUNT(*) AS attendance_count
    FROM service_attendance sa
    JOIN services s ON sa.service_id = s.service_id
    WHERE sa.attendance_status IN ('Present', 'Virtual')
        AND s.service_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY sa.member_id
) service_stats ON m.member_id = service_stats.member_id
LEFT JOIN (
    SELECT fma.member_id, COUNT(*) AS attendance_count
    FROM fellowship_meeting_attendance fma
    JOIN fellowship_meetings fm ON fma.meeting_id = fm.meeting_id
    WHERE fma.attendance_status = 'Present'
        AND fm.meeting_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY fma.member_id
) fellowship_stats ON m.member_id = fellowship_stats.member_id
LEFT JOIN (
    SELECT ma.member_id, COUNT(*) AS attendance_count
    FROM meeting_attendance ma
    JOIN department_meetings dm ON ma.meeting_id = dm.meeting_id
    WHERE ma.attendance_status = 'Present'
        AND dm.meeting_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ma.member_id
) department_stats ON m.member_id = department_stats.member_id
LEFT JOIN (
    SELECT d.member_id, COUNT(*) AS donation_count, SUM(d.amount) AS total_amount
    FROM donations d
    WHERE d.donation_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY d.member_id
) donation_stats ON m.member_id = donation_stats.member_id
WHERE m.is_active = TRUE
ORDER BY engagement_score DESC;

-- ----------------------------------------------------------------------------
-- View: vw_members_missing_services
-- Purpose: Active members who haven't attended services recently
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_members_missing_services AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.phone,
    m.email,
    b.branch_name,
    m.membership_date,
    (SELECT MAX(s.service_date) FROM service_attendance sa 
     JOIN services s ON sa.service_id = s.service_id 
     WHERE sa.member_id = m.member_id AND sa.attendance_status IN ('Present', 'Virtual')) AS last_attended_date,
    COALESCE(
        CURRENT_DATE - (SELECT MAX(s.service_date)::DATE FROM service_attendance sa 
        JOIN services s ON sa.service_id = s.service_id 
        WHERE sa.member_id = m.member_id AND sa.attendance_status IN ('Present', 'Virtual')),
        CURRENT_DATE - m.membership_date
    ) AS days_since_last_attendance
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
WHERE m.is_active = TRUE
    AND m.member_id NOT IN (
        SELECT DISTINCT sa.member_id
        FROM service_attendance sa
        JOIN services s ON sa.service_id = s.service_id
        WHERE s.service_date >= CURRENT_DATE - INTERVAL '30 days'
            AND sa.attendance_status IN ('Present', 'Virtual')
    )
ORDER BY days_since_last_attendance DESC;

-- ----------------------------------------------------------------------------
-- View: vw_member_complete_profile
-- Purpose: Complete member profile with all associations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_member_complete_profile AS
SELECT 
    m.member_id,
    m.first_name,
    m.last_name,
    m.middle_name,
    m.date_of_birth,
    EXTRACT(YEAR FROM AGE(m.date_of_birth)) AS age,
    m.gender,
    m.email,
    m.phone,
    m.address,
    m.city,
    m.postal_code,
    b.branch_name AS home_branch,
    r.region_name,
    m.membership_date,
    m.is_active,
    m.photo_url,
    m.emergency_contact_name,
    m.emergency_contact_phone,
    -- Leadership position
    (SELECT STRING_AGG(CONCAT(bl.role, ' at ', br.branch_name), ', ')
     FROM branch_leadership bl
     JOIN branches br ON bl.branch_id = br.branch_id
     WHERE bl.member_id = m.member_id AND bl.is_current = TRUE) AS leadership_positions,
    -- Roles
    (SELECT STRING_AGG(DISTINCT ro.role_name, ', ')
     FROM member_roles mr
     JOIN roles ro ON mr.role_id = ro.role_id
     WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) AS active_roles,
    -- Fellowships
    (SELECT STRING_AGG(DISTINCT f.fellowship_name, ', ')
     FROM fellowship_members fm
     JOIN fellowships f ON fm.fellowship_id = f.fellowship_id
     WHERE fm.member_id = m.member_id AND fm.is_active = TRUE) AS fellowships,
    -- Departments
    (SELECT STRING_AGG(DISTINCT d.department_name, ', ')
     FROM department_members dm
     JOIN branch_departments bd ON dm.branch_department_id = bd.branch_department_id
     JOIN departments d ON bd.department_id = d.department_id
     WHERE dm.member_id = m.member_id AND dm.is_active = TRUE) AS departments
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
ORDER BY m.last_name, m.first_name;

-- ============================================================================
-- SECTION 3: LEADERSHIP REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_current_leadership
-- Purpose: All current leadership positions across branches
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_current_leadership AS
SELECT 
    bl.leadership_id,
    r.region_name,
    b.branch_name,
    b.branch_type,
    bl.role AS leadership_role,
    CONCAT(m.first_name, ' ', m.last_name) AS leader_name,
    m.phone,
    m.email,
    bl.start_date,
    EXTRACT(YEAR FROM AGE(bl.start_date)) AS years_in_position,
    m.membership_date,
    m.is_active AS member_is_active
FROM branch_leadership bl
JOIN branches b ON bl.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
JOIN members m ON bl.member_id = m.member_id
WHERE bl.is_current = TRUE
ORDER BY r.region_name, b.branch_name, bl.role;

-- ----------------------------------------------------------------------------
-- View: vw_leadership_history
-- Purpose: Complete leadership history for succession planning
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_leadership_history AS
SELECT 
    b.branch_name,
    r.region_name,
    bl.role AS leadership_role,
    CONCAT(m.first_name, ' ', m.last_name) AS leader_name,
    bl.start_date,
    bl.end_date,
    CASE 
        WHEN bl.end_date IS NULL THEN 'Current'
        ELSE 'Former'
    END AS status,
    CASE 
        WHEN bl.end_date IS NULL THEN AGE(bl.start_date)
        ELSE AGE(bl.end_date, bl.start_date)
    END AS tenure_duration
FROM branch_leadership bl
JOIN branches b ON bl.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
JOIN members m ON bl.member_id = m.member_id
ORDER BY b.branch_name, bl.role, bl.start_date DESC;

-- ----------------------------------------------------------------------------
-- View: vw_multi_role_members
-- Purpose: Members holding multiple roles or leadership positions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_multi_role_members AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.phone,
    m.email,
    b.branch_name AS home_branch,
    (SELECT COUNT(DISTINCT mr.branch_id) FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) AS branches_serving,
    (SELECT COUNT(*) FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) AS total_roles,
    (SELECT COUNT(*) FROM branch_leadership bl WHERE bl.member_id = m.member_id AND bl.is_current = TRUE) AS leadership_positions,
    (SELECT STRING_AGG(DISTINCT r.role_name, ', ') FROM member_roles mr 
     JOIN roles r ON mr.role_id = r.role_id WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) AS role_names,
    (SELECT STRING_AGG(DISTINCT CONCAT(bl.role, ' at ', br.branch_name), ', ') 
     FROM branch_leadership bl JOIN branches br ON bl.branch_id = br.branch_id 
     WHERE bl.member_id = m.member_id AND bl.is_current = TRUE) AS leadership_details
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
WHERE m.is_active = TRUE
    AND (
        (SELECT COUNT(*) FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.is_active = TRUE) > 1
        OR (SELECT COUNT(*) FROM branch_leadership bl WHERE bl.member_id = m.member_id AND bl.is_current = TRUE) > 0
    )
ORDER BY total_roles DESC, leadership_positions DESC;

-- ============================================================================
-- SECTION 4: ATTENDANCE REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_service_attendance_summary
-- Purpose: Service attendance statistics by branch and service type
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_service_attendance_summary AS
SELECT 
    s.service_id,
    b.branch_name,
    r.region_name,
    s.service_date,
    s.service_type,
    s.service_title,
    CONCAT(preacher.first_name, ' ', preacher.last_name) AS preacher_name,
    s.expected_attendance,
    COUNT(sa.member_id) AS total_recorded,
    COUNT(CASE WHEN sa.attendance_status = 'Present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN sa.attendance_status = 'Virtual' THEN 1 END) AS virtual_count,
    COUNT(CASE WHEN sa.attendance_status = 'Absent' THEN 1 END) AS absent_count,
    COUNT(CASE WHEN sa.is_first_time_visitor = TRUE THEN 1 END) AS first_time_visitors,
    ROUND(
        100.0 * COUNT(CASE WHEN sa.attendance_status IN ('Present', 'Virtual') THEN 1 END) / 
        NULLIF(COUNT(sa.member_id), 0), 2
    ) AS attendance_rate_percent
FROM services s
JOIN branches b ON s.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
LEFT JOIN members preacher ON s.preacher_id = preacher.member_id
LEFT JOIN service_attendance sa ON s.service_id = sa.service_id
GROUP BY s.service_id, b.branch_name, r.region_name, s.service_date, s.service_type, 
         s.service_title, preacher.first_name, preacher.last_name, s.expected_attendance
ORDER BY s.service_date DESC, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_service_attendance_trend
-- Purpose: Service attendance trends over time by branch
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_service_attendance_trend AS
SELECT 
    DATE_TRUNC('week', s.service_date) AS week_start,
    b.branch_name,
    s.service_type,
    COUNT(DISTINCT s.service_id) AS service_count,
    SUM(CASE WHEN sa.attendance_status = 'Present' THEN 1 ELSE 0 END) AS total_present,
    SUM(CASE WHEN sa.attendance_status = 'Virtual' THEN 1 ELSE 0 END) AS total_virtual,
    AVG(CASE WHEN sa.attendance_status IN ('Present', 'Virtual') THEN 1 ELSE 0 END) * 100 AS avg_attendance_rate,
    SUM(CASE WHEN sa.is_first_time_visitor = TRUE THEN 1 ELSE 0 END) AS first_time_visitors
FROM services s
JOIN branches b ON s.branch_id = b.branch_id
LEFT JOIN service_attendance sa ON s.service_id = sa.service_id
GROUP BY DATE_TRUNC('week', s.service_date), b.branch_name, s.service_type
ORDER BY week_start DESC, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_fellowship_attendance_summary
-- Purpose: Fellowship meeting attendance statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_fellowship_attendance_summary AS
SELECT 
    f.fellowship_id,
    f.fellowship_name,
    b.branch_name,
    CONCAT(leader.first_name, ' ', leader.last_name) AS leader_name,
    COUNT(DISTINCT fm_meeting.meeting_id) AS total_meetings_90_days,
    (SELECT COUNT(*) FROM fellowship_members fm_mem WHERE fm_mem.fellowship_id = f.fellowship_id AND fm_mem.is_active = TRUE) AS active_members,
    ROUND(AVG(meeting_stats.present_count), 1) AS avg_attendance,
    ROUND(AVG(meeting_stats.attendance_rate), 2) AS avg_attendance_rate
FROM fellowships f
JOIN branches b ON f.branch_id = b.branch_id
LEFT JOIN members leader ON f.leader_id = leader.member_id
LEFT JOIN fellowship_meetings fm_meeting ON f.fellowship_id = fm_meeting.fellowship_id 
    AND fm_meeting.meeting_date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN (
    SELECT 
        fma.meeting_id,
        COUNT(CASE WHEN fma.attendance_status = 'Present' THEN 1 END) AS present_count,
        100.0 * COUNT(CASE WHEN fma.attendance_status = 'Present' THEN 1 END) / NULLIF(COUNT(*), 0) AS attendance_rate
    FROM fellowship_meeting_attendance fma
    GROUP BY fma.meeting_id
) meeting_stats ON fm_meeting.meeting_id = meeting_stats.meeting_id
WHERE f.is_active = TRUE
GROUP BY f.fellowship_id, f.fellowship_name, b.branch_name, leader.first_name, leader.last_name
ORDER BY b.branch_name, f.fellowship_name;

-- ----------------------------------------------------------------------------
-- View: vw_department_attendance_summary
-- Purpose: Department meeting attendance statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_department_attendance_summary AS
SELECT 
    d.department_name,
    b.branch_name,
    CONCAT(lead.first_name, ' ', lead.last_name) AS department_lead,
    (SELECT COUNT(*) FROM department_members dm WHERE dm.branch_department_id = bd.branch_department_id AND dm.is_active = TRUE) AS active_members,
    COUNT(DISTINCT dept_m.meeting_id) AS total_meetings_90_days,
    ROUND(AVG(meeting_stats.present_count), 1) AS avg_attendance,
    ROUND(AVG(meeting_stats.attendance_rate), 2) AS avg_attendance_rate
FROM branch_departments bd
JOIN departments d ON bd.department_id = d.department_id
JOIN branches b ON bd.branch_id = b.branch_id
JOIN members lead ON bd.lead_member_id = lead.member_id
LEFT JOIN department_meetings dept_m ON bd.branch_department_id = dept_m.branch_department_id 
    AND dept_m.meeting_date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN (
    SELECT 
        ma.meeting_id,
        COUNT(CASE WHEN ma.attendance_status = 'Present' THEN 1 END) AS present_count,
        100.0 * COUNT(CASE WHEN ma.attendance_status = 'Present' THEN 1 END) / NULLIF(COUNT(*), 0) AS attendance_rate
    FROM meeting_attendance ma
    GROUP BY ma.meeting_id
) meeting_stats ON dept_m.meeting_id = meeting_stats.meeting_id
WHERE bd.is_active = TRUE
GROUP BY d.department_name, b.branch_name, lead.first_name, lead.last_name, bd.branch_department_id
ORDER BY b.branch_name, d.department_name;

-- ----------------------------------------------------------------------------
-- View: vw_member_attendance_history
-- Purpose: Individual member attendance across all meeting types
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_member_attendance_history AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    'Service' AS meeting_type,
    s.service_date AS meeting_date,
    s.service_type AS meeting_description,
    sa.attendance_status,
    sa.is_first_time_visitor,
    sa.recorded_at
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN service_attendance sa ON m.member_id = sa.member_id
JOIN services s ON sa.service_id = s.service_id
WHERE m.is_active = TRUE

UNION ALL

SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    'Fellowship' AS meeting_type,
    fm.meeting_date,
    f.fellowship_name AS meeting_description,
    fma.attendance_status,
    FALSE AS is_first_time_visitor,
    fma.recorded_at
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN fellowship_meeting_attendance fma ON m.member_id = fma.member_id
JOIN fellowship_meetings fm ON fma.meeting_id = fm.meeting_id
JOIN fellowships f ON fm.fellowship_id = f.fellowship_id
WHERE m.is_active = TRUE

UNION ALL

SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    'Department' AS meeting_type,
    dm.meeting_date,
    d.department_name AS meeting_description,
    ma.attendance_status,
    FALSE AS is_first_time_visitor,
    ma.recorded_at
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN meeting_attendance ma ON m.member_id = ma.member_id
JOIN department_meetings dm ON ma.meeting_id = dm.meeting_id
JOIN branch_departments bd ON dm.branch_department_id = bd.branch_department_id
JOIN departments d ON bd.department_id = d.department_id
WHERE m.is_active = TRUE

ORDER BY member_id, meeting_date DESC;

-- ============================================================================
-- SECTION 5: DEPARTMENT REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_department_roster
-- Purpose: Complete department roster with leadership for each branch
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_department_roster AS
SELECT 
    d.department_id,
    d.department_name,
    d.description AS department_description,
    b.branch_name,
    r.region_name,
    bd.is_active AS department_active,
    bd.start_date AS department_start_date,
    CONCAT(lead.first_name, ' ', lead.last_name) AS department_lead,
    lead.phone AS lead_phone,
    lead.email AS lead_email,
    CONCAT(deputy.first_name, ' ', deputy.last_name) AS department_deputy,
    (SELECT COUNT(*) FROM department_members dm 
     WHERE dm.branch_department_id = bd.branch_department_id AND dm.is_active = TRUE) AS member_count,
    (SELECT STRING_AGG(CONCAT(mem.first_name, ' ', mem.last_name), ', ' ORDER BY mem.last_name)
     FROM department_members dm
     JOIN members mem ON dm.member_id = mem.member_id
     WHERE dm.branch_department_id = bd.branch_department_id AND dm.is_active = TRUE) AS member_names
FROM departments d
LEFT JOIN branch_departments bd ON d.department_id = bd.department_id
LEFT JOIN branches b ON bd.branch_id = b.branch_id
LEFT JOIN regions r ON b.region_id = r.region_id
LEFT JOIN members lead ON bd.lead_member_id = lead.member_id
LEFT JOIN members deputy ON bd.deputy_member_id = deputy.member_id
WHERE d.is_active = TRUE
ORDER BY r.region_name, b.branch_name, d.department_name;

-- ----------------------------------------------------------------------------
-- View: vw_department_growth
-- Purpose: Department membership growth trends
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_department_growth AS
SELECT 
    DATE_TRUNC('month', dm.join_date) AS join_month,
    d.department_name,
    b.branch_name,
    COUNT(*) AS new_members,
    SUM(COUNT(*)) OVER (PARTITION BY bd.branch_department_id ORDER BY DATE_TRUNC('month', dm.join_date)) AS cumulative_members
FROM department_members dm
JOIN branch_departments bd ON dm.branch_department_id = bd.branch_department_id
JOIN departments d ON bd.department_id = d.department_id
JOIN branches b ON bd.branch_id = b.branch_id
WHERE dm.is_active = TRUE
GROUP BY DATE_TRUNC('month', dm.join_date), d.department_name, b.branch_name, bd.branch_department_id
ORDER BY join_month DESC, b.branch_name, d.department_name;

-- ============================================================================
-- SECTION 6: FELLOWSHIP REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_fellowship_roster
-- Purpose: Complete fellowship roster with leadership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_fellowship_roster AS
SELECT 
    f.fellowship_id,
    f.fellowship_name,
    f.description AS fellowship_description,
    f.meeting_schedule,
    b.branch_name,
    r.region_name,
    f.is_active,
    CONCAT(leader.first_name, ' ', leader.last_name) AS leader_name,
    leader.phone AS leader_phone,
    leader.email AS leader_email,
    CONCAT(co_leader.first_name, ' ', co_leader.last_name) AS co_leader_name,
    (SELECT COUNT(*) FROM fellowship_members fm 
     WHERE fm.fellowship_id = f.fellowship_id AND fm.is_active = TRUE) AS member_count,
    (SELECT STRING_AGG(CONCAT(mem.first_name, ' ', mem.last_name), ', ' ORDER BY mem.last_name)
     FROM fellowship_members fm
     JOIN members mem ON fm.member_id = mem.member_id
     WHERE fm.fellowship_id = f.fellowship_id AND fm.is_active = TRUE) AS member_names
FROM fellowships f
JOIN branches b ON f.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
LEFT JOIN members leader ON f.leader_id = leader.member_id
LEFT JOIN members co_leader ON f.co_leader_id = co_leader.member_id
WHERE f.is_active = TRUE
ORDER BY r.region_name, b.branch_name, f.fellowship_name;

-- ----------------------------------------------------------------------------
-- View: vw_fellowship_growth
-- Purpose: Fellowship membership growth trends
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_fellowship_growth AS
SELECT 
    DATE_TRUNC('month', fm.join_date) AS join_month,
    f.fellowship_name,
    b.branch_name,
    COUNT(*) AS new_members,
    SUM(COUNT(*)) OVER (PARTITION BY f.fellowship_id ORDER BY DATE_TRUNC('month', fm.join_date)) AS cumulative_members
FROM fellowship_members fm
JOIN fellowships f ON fm.fellowship_id = f.fellowship_id
JOIN branches b ON f.branch_id = b.branch_id
WHERE fm.is_active = TRUE
GROUP BY DATE_TRUNC('month', fm.join_date), f.fellowship_name, b.branch_name, f.fellowship_id
ORDER BY join_month DESC, b.branch_name, f.fellowship_name;

-- ----------------------------------------------------------------------------
-- View: vw_fellowship_meeting_schedule
-- Purpose: Upcoming fellowship meetings with details
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_fellowship_meeting_schedule AS
SELECT 
    fm.meeting_id,
    f.fellowship_name,
    b.branch_name,
    fm.meeting_date,
    fm.meeting_title,
    fm.meeting_topic,
    fm.location,
    fm.duration_minutes,
    CONCAT(creator.first_name, ' ', creator.last_name) AS created_by,
    (SELECT COUNT(*) FROM fellowship_members fmem 
     WHERE fmem.fellowship_id = f.fellowship_id AND fmem.is_active = TRUE) AS expected_attendees
FROM fellowship_meetings fm
JOIN fellowships f ON fm.fellowship_id = f.fellowship_id
JOIN branches b ON f.branch_id = b.branch_id
LEFT JOIN members creator ON fm.created_by = creator.member_id
WHERE fm.meeting_date >= CURRENT_DATE
ORDER BY fm.meeting_date, f.fellowship_name;

-- ============================================================================
-- SECTION 7: OUTREACH & EVANGELISM REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_outreach_program_summary
-- Purpose: Outreach program effectiveness metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_outreach_program_summary AS
SELECT 
    op.outreach_id,
    op.program_name,
    b.branch_name,
    r.region_name,
    op.program_date,
    op.location,
    op.city,
    CONCAT(coord.first_name, ' ', coord.last_name) AS coordinator_name,
    op.is_completed,
    (SELECT COUNT(*) FROM outreach_participants part WHERE part.outreach_id = op.outreach_id) AS participant_count,
    (SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id) AS souls_reached,
    (SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id AND s.status = 'Converted') AS souls_converted,
    (SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id AND s.status = 'Following Up') AS souls_following_up,
    (SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id AND s.status = 'Interested') AS souls_interested,
    ROUND(
        100.0 * (SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id AND s.status = 'Converted') /
        NULLIF((SELECT COUNT(*) FROM souls s WHERE s.outreach_id = op.outreach_id), 0), 2
    ) AS conversion_rate_percent,
    op.notes
FROM outreach_programs op
JOIN branches b ON op.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
LEFT JOIN members coord ON op.coordinator_id = coord.member_id
ORDER BY op.program_date DESC;

-- ----------------------------------------------------------------------------
-- View: vw_soul_conversion_funnel
-- Purpose: Track souls through the conversion pipeline
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_soul_conversion_funnel AS
SELECT 
    op.program_name,
    b.branch_name,
    op.program_date,
    s.status AS soul_status,
    COUNT(*) AS soul_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY op.outreach_id), 2) AS percentage_of_total
FROM souls s
JOIN outreach_programs op ON s.outreach_id = op.outreach_id
JOIN branches b ON op.branch_id = b.branch_id
GROUP BY op.program_name, b.branch_name, op.program_date, op.outreach_id, s.status
ORDER BY op.program_date DESC, 
    CASE s.status 
        WHEN 'New' THEN 1 
        WHEN 'Following Up' THEN 2 
        WHEN 'Interested' THEN 3 
        WHEN 'Converted' THEN 4 
        WHEN 'Not Interested' THEN 5 
        WHEN 'Lost Contact' THEN 6 
    END;

-- ----------------------------------------------------------------------------
-- View: vw_souls_requiring_followup
-- Purpose: List of souls that need follow-up attention
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_souls_requiring_followup AS
SELECT 
    s.soul_id,
    CONCAT(s.first_name, ' ', s.last_name) AS soul_name,
    s.phone,
    s.email,
    s.gender,
    s.age_range,
    s.status,
    op.program_name,
    op.program_date,
    b.branch_name,
    CONCAT(assigned.first_name, ' ', assigned.last_name) AS assigned_to,
    assigned.phone AS assigned_member_phone,
    (SELECT MAX(fu.follow_up_date) FROM follow_ups fu WHERE fu.soul_id = s.soul_id) AS last_followup_date,
    (SELECT fu.contact_status FROM follow_ups fu WHERE fu.soul_id = s.soul_id 
     ORDER BY fu.follow_up_date DESC LIMIT 1) AS last_followup_status,
    (SELECT MIN(fu.next_follow_up_date) FROM follow_ups fu 
     WHERE fu.soul_id = s.soul_id AND fu.next_follow_up_date >= CURRENT_DATE) AS next_followup_scheduled,
    CURRENT_DATE - COALESCE(
        (SELECT MAX(fu.follow_up_date)::DATE FROM follow_ups fu WHERE fu.soul_id = s.soul_id),
        op.program_date
    ) AS days_since_last_contact
FROM souls s
JOIN outreach_programs op ON s.outreach_id = op.outreach_id
JOIN branches b ON op.branch_id = b.branch_id
LEFT JOIN members assigned ON s.assigned_member_id = assigned.member_id
WHERE s.status IN ('New', 'Following Up', 'Interested')
ORDER BY days_since_last_contact DESC;

-- ----------------------------------------------------------------------------
-- View: vw_followup_activity_report
-- Purpose: Follow-up activities and outcomes analysis
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_followup_activity_report AS
SELECT 
    CONCAT(m.first_name, ' ', m.last_name) AS followup_member,
    b.branch_name,
    fu.contact_method,
    fu.contact_status,
    COUNT(*) AS contact_count,
    ROUND(AVG(fu.duration_minutes), 1) AS avg_duration_minutes,
    COUNT(CASE WHEN fu.contact_status = 'Successful' THEN 1 END) AS successful_contacts,
    COUNT(CASE WHEN fu.contact_status = 'Interested' THEN 1 END) AS interested_outcomes
FROM follow_ups fu
JOIN members m ON fu.member_id = m.member_id
JOIN branches b ON m.home_branch_id = b.branch_id
GROUP BY m.member_id, m.first_name, m.last_name, b.branch_name, fu.contact_method, fu.contact_status
ORDER BY m.last_name, m.first_name, fu.contact_method;

-- ----------------------------------------------------------------------------
-- View: vw_outreach_participant_contribution
-- Purpose: Member participation and contribution in outreach programs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_outreach_participant_contribution AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    COUNT(DISTINCT part.outreach_id) AS outreach_programs_participated,
    (SELECT COUNT(*) FROM follow_ups fu WHERE fu.member_id = m.member_id) AS total_followups_conducted,
    (SELECT COUNT(*) FROM follow_ups fu WHERE fu.member_id = m.member_id AND fu.contact_status = 'Successful') AS successful_followups,
    (SELECT COUNT(*) FROM souls s WHERE s.assigned_member_id = m.member_id AND s.status = 'Converted') AS souls_converted
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
LEFT JOIN outreach_participants part ON m.member_id = part.member_id
WHERE m.is_active = TRUE
    AND (part.outreach_id IS NOT NULL 
         OR EXISTS (SELECT 1 FROM follow_ups fu WHERE fu.member_id = m.member_id))
GROUP BY m.member_id, m.first_name, m.last_name, b.branch_name
ORDER BY outreach_programs_participated DESC, total_followups_conducted DESC;

-- ============================================================================
-- SECTION 8: FINANCIAL REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_donation_summary_by_period
-- Purpose: Donation totals grouped by year and month
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_donation_summary_by_period AS
SELECT 
    DATE_TRUNC('month', d.donation_date) AS donation_month,
    EXTRACT(YEAR FROM d.donation_date) AS year,
    EXTRACT(MONTH FROM d.donation_date) AS month,
    b.branch_name,
    r.region_name,
    d.currency,
    COUNT(*) AS donation_count,
    SUM(d.amount) AS total_amount,
    AVG(d.amount) AS avg_donation,
    MIN(d.amount) AS min_donation,
    MAX(d.amount) AS max_donation,
    COUNT(DISTINCT d.member_id) AS unique_donors
FROM donations d
JOIN branches b ON d.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
GROUP BY DATE_TRUNC('month', d.donation_date), EXTRACT(YEAR FROM d.donation_date), 
         EXTRACT(MONTH FROM d.donation_date), b.branch_name, r.region_name, d.currency
ORDER BY donation_month DESC, r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_donation_by_purpose
-- Purpose: Donation breakdown by purpose category
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_donation_by_purpose AS
SELECT 
    EXTRACT(YEAR FROM d.donation_date) AS year,
    b.branch_name,
    r.region_name,
    d.donation_purpose,
    d.currency,
    COUNT(*) AS donation_count,
    SUM(d.amount) AS total_amount,
    ROUND(100.0 * SUM(d.amount) / SUM(SUM(d.amount)) OVER (
        PARTITION BY EXTRACT(YEAR FROM d.donation_date), b.branch_id
    ), 2) AS percentage_of_branch_total
FROM donations d
JOIN branches b ON d.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
GROUP BY EXTRACT(YEAR FROM d.donation_date), b.branch_name, b.branch_id, r.region_name, 
         d.donation_purpose, d.currency
ORDER BY year DESC, r.region_name, b.branch_name, d.donation_purpose;

-- ----------------------------------------------------------------------------
-- View: vw_top_donors
-- Purpose: Top donors by branch (anonymity aware)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_top_donors AS
SELECT 
    CASE WHEN d.is_anonymous THEN 'Anonymous Donor' 
         ELSE CONCAT(m.first_name, ' ', m.last_name) 
    END AS donor_name,
    CASE WHEN d.is_anonymous THEN NULL ELSE m.phone END AS donor_phone,
    CASE WHEN d.is_anonymous THEN NULL ELSE m.email END AS donor_email,
    b.branch_name,
    EXTRACT(YEAR FROM d.donation_date) AS year,
    COUNT(*) AS donation_count,
    SUM(d.amount) AS total_amount,
    d.currency,
    STRING_AGG(DISTINCT d.donation_purpose, ', ') AS purposes_supported
FROM donations d
JOIN members m ON d.member_id = m.member_id
JOIN branches b ON d.branch_id = b.branch_id
GROUP BY 
    CASE WHEN d.is_anonymous THEN 'Anonymous Donor' ELSE CONCAT(m.first_name, ' ', m.last_name) END,
    CASE WHEN d.is_anonymous THEN NULL ELSE m.phone END,
    CASE WHEN d.is_anonymous THEN NULL ELSE m.email END,
    b.branch_name, EXTRACT(YEAR FROM d.donation_date), d.is_anonymous, d.currency
ORDER BY year DESC, total_amount DESC;

-- ----------------------------------------------------------------------------
-- View: vw_donation_trend
-- Purpose: Donation trends over time for forecasting
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_donation_trend AS
SELECT 
    DATE_TRUNC('week', d.donation_date) AS week_start,
    r.region_name,
    b.branch_name,
    d.currency,
    d.donation_purpose,
    COUNT(*) AS donation_count,
    SUM(d.amount) AS total_amount,
    COUNT(DISTINCT d.member_id) AS unique_donors,
    LAG(SUM(d.amount)) OVER (
        PARTITION BY b.branch_id, d.donation_purpose, d.currency 
        ORDER BY DATE_TRUNC('week', d.donation_date)
    ) AS previous_week_amount,
    ROUND(
        100.0 * (SUM(d.amount) - LAG(SUM(d.amount)) OVER (
            PARTITION BY b.branch_id, d.donation_purpose, d.currency 
            ORDER BY DATE_TRUNC('week', d.donation_date)
        )) / NULLIF(LAG(SUM(d.amount)) OVER (
            PARTITION BY b.branch_id, d.donation_purpose, d.currency 
            ORDER BY DATE_TRUNC('week', d.donation_date)
        ), 0), 2
    ) AS week_over_week_change_percent
FROM donations d
JOIN branches b ON d.branch_id = b.branch_id
JOIN regions r ON b.region_id = r.region_id
GROUP BY DATE_TRUNC('week', d.donation_date), r.region_name, b.branch_name, b.branch_id, 
         d.currency, d.donation_purpose
ORDER BY week_start DESC, r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_giving_pattern_by_member
-- Purpose: Individual member giving patterns
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_giving_pattern_by_member AS
SELECT 
    m.member_id,
    CASE WHEN MAX(d.is_anonymous::INT) = 1 THEN 'Confidential' 
         ELSE CONCAT(m.first_name, ' ', m.last_name) 
    END AS member_name,
    b.branch_name,
    MIN(d.donation_date) AS first_donation,
    MAX(d.donation_date) AS last_donation,
    COUNT(*) AS total_donations,
    SUM(d.amount) AS lifetime_giving,
    AVG(d.amount) AS avg_donation,
    COUNT(*) FILTER (WHERE d.donation_date >= CURRENT_DATE - INTERVAL '365 days') AS donations_last_year,
    SUM(d.amount) FILTER (WHERE d.donation_date >= CURRENT_DATE - INTERVAL '365 days') AS giving_last_year,
    COUNT(*) FILTER (WHERE d.donation_date >= CURRENT_DATE - INTERVAL '90 days') AS donations_last_90_days,
    SUM(d.amount) FILTER (WHERE d.donation_date >= CURRENT_DATE - INTERVAL '90 days') AS giving_last_90_days,
    STRING_AGG(DISTINCT d.donation_purpose, ', ') AS purposes_supported,
    STRING_AGG(DISTINCT d.payment_method, ', ') AS payment_methods_used
FROM members m
JOIN donations d ON m.member_id = d.member_id
JOIN branches b ON m.home_branch_id = b.branch_id
GROUP BY m.member_id, m.first_name, m.last_name, b.branch_name
ORDER BY lifetime_giving DESC;

-- ----------------------------------------------------------------------------
-- View: vw_payment_method_analysis
-- Purpose: Donation distribution by payment method
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_payment_method_analysis AS
SELECT 
    d.payment_method,
    b.branch_name,
    EXTRACT(YEAR FROM d.donation_date) AS year,
    COUNT(*) AS transaction_count,
    SUM(d.amount) AS total_amount,
    d.currency,
    AVG(d.amount) AS avg_transaction,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (
        PARTITION BY b.branch_id, EXTRACT(YEAR FROM d.donation_date)
    ), 2) AS percentage_of_transactions
FROM donations d
JOIN branches b ON d.branch_id = b.branch_id
WHERE d.payment_method IS NOT NULL
GROUP BY d.payment_method, b.branch_name, b.branch_id, EXTRACT(YEAR FROM d.donation_date), d.currency
ORDER BY year DESC, b.branch_name, total_amount DESC;

-- ============================================================================
-- SECTION 9: EVENT REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_upcoming_events
-- Purpose: All upcoming and ongoing events with registration status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_upcoming_events AS
SELECT 
    e.event_id,
    e.event_title,
    e.event_theme,
    e.event_type,
    e.description,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.venue,
    e.city,
    e.is_virtual,
    e.virtual_link,
    CASE 
        WHEN e.branch_id IS NULL AND e.region_id IS NULL THEN 'Church-wide'
        WHEN e.region_id IS NOT NULL THEN r.region_name
        ELSE b.branch_name
    END AS event_scope,
    e.status,
    e.requires_registration,
    e.registration_deadline,
    e.max_attendees,
    CONCAT(coord.first_name, ' ', coord.last_name) AS coordinator_name,
    coord.phone AS coordinator_phone,
    (SELECT COUNT(*) FROM event_registrations er 
     WHERE er.event_id = e.event_id AND er.registration_status IN ('Registered', 'Confirmed')) AS registered_count,
    COALESCE(e.max_attendees - (SELECT COUNT(*) FROM event_registrations er 
     WHERE er.event_id = e.event_id AND er.registration_status IN ('Registered', 'Confirmed')), NULL) AS spots_remaining,
    (SELECT COUNT(*) FROM event_registrations er 
     WHERE er.event_id = e.event_id AND er.registration_status = 'Waitlisted') AS waitlist_count
FROM events e
LEFT JOIN branches b ON e.branch_id = b.branch_id
LEFT JOIN regions r ON e.region_id = r.region_id
LEFT JOIN members coord ON e.coordinator_id = coord.member_id
WHERE e.is_active = TRUE 
    AND e.status IN ('Published', 'Ongoing')
    AND e.end_date >= CURRENT_DATE
ORDER BY e.start_date, e.start_time;

-- ----------------------------------------------------------------------------
-- View: vw_event_registration_status
-- Purpose: Detailed registration status for each event
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_event_registration_status AS
SELECT 
    e.event_id,
    e.event_title,
    e.start_date,
    e.end_date,
    e.max_attendees,
    er.registration_status,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY e.event_id), 0), 2) AS percentage
FROM events e
LEFT JOIN event_registrations er ON e.event_id = er.event_id
WHERE e.is_active = TRUE
GROUP BY e.event_id, e.event_title, e.start_date, e.end_date, e.max_attendees, er.registration_status
ORDER BY e.start_date DESC, er.registration_status;

-- ----------------------------------------------------------------------------
-- View: vw_event_attendance_analysis
-- Purpose: Event attendance outcomes and analysis
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_event_attendance_analysis AS
SELECT 
    e.event_id,
    e.event_title,
    e.event_type,
    e.start_date,
    e.end_date,
    CASE 
        WHEN e.branch_id IS NULL AND e.region_id IS NULL THEN 'Church-wide'
        WHEN e.region_id IS NOT NULL THEN r.region_name
        ELSE b.branch_name
    END AS event_scope,
    e.max_attendees,
    COUNT(er.registration_id) FILTER (WHERE er.registration_status IN ('Registered', 'Confirmed')) AS total_registered,
    COUNT(er.registration_id) FILTER (WHERE er.attended = TRUE) AS total_attended,
    SUM(er.guest_count) FILTER (WHERE er.attended = TRUE) AS total_guests,
    COUNT(er.registration_id) FILTER (WHERE er.registration_status = 'No-Show') AS no_shows,
    COUNT(er.registration_id) FILTER (WHERE er.registration_status = 'Cancelled') AS cancelled,
    ROUND(
        100.0 * COUNT(er.registration_id) FILTER (WHERE er.attended = TRUE) /
        NULLIF(COUNT(er.registration_id) FILTER (WHERE er.registration_status IN ('Registered', 'Confirmed')), 0), 2
    ) AS attendance_rate_percent
FROM events e
LEFT JOIN branches b ON e.branch_id = b.branch_id
LEFT JOIN regions r ON e.region_id = r.region_id
LEFT JOIN event_registrations er ON e.event_id = er.event_id
WHERE e.status IN ('Completed', 'Ongoing')
GROUP BY e.event_id, e.event_title, e.event_type, e.start_date, e.end_date, 
         b.branch_name, r.region_name, e.branch_id, e.region_id, e.max_attendees
ORDER BY e.start_date DESC;

-- ----------------------------------------------------------------------------
-- View: vw_event_organizer_workload
-- Purpose: Event organizer assignments and workload
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_event_organizer_workload AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS organizer_name,
    b.branch_name,
    COUNT(DISTINCT eo.event_id) AS total_events_organized,
    COUNT(DISTINCT eo.event_id) FILTER (
        WHERE e.status IN ('Draft', 'Published', 'Ongoing') AND e.end_date >= CURRENT_DATE
    ) AS active_events,
    COUNT(DISTINCT eo.event_id) FILTER (WHERE e.status = 'Completed') AS completed_events,
    STRING_AGG(DISTINCT eo.organizer_role, ', ') AS roles_held,
    STRING_AGG(e.event_title || ' (' || e.status || ')', ', ' ORDER BY e.start_date) AS current_events
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
JOIN event_organizers eo ON m.member_id = eo.member_id
JOIN events e ON eo.event_id = e.event_id
WHERE m.is_active = TRUE
GROUP BY m.member_id, m.first_name, m.last_name, b.branch_name
ORDER BY active_events DESC, total_events_organized DESC;

-- ----------------------------------------------------------------------------
-- View: vw_event_type_statistics
-- Purpose: Event statistics by type for planning insights
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_event_type_statistics AS
SELECT 
    e.event_type,
    EXTRACT(YEAR FROM e.start_date) AS year,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE e.status = 'Completed') AS completed_events,
    COUNT(*) FILTER (WHERE e.status = 'Cancelled') AS cancelled_events,
    AVG((SELECT COUNT(*) FROM event_registrations er 
         WHERE er.event_id = e.event_id AND er.attended = TRUE)) AS avg_attendance,
    SUM((SELECT COUNT(*) FROM event_registrations er 
         WHERE er.event_id = e.event_id AND er.attended = TRUE)) AS total_attendees,
    ROUND(AVG(e.end_date - e.start_date + 1), 1) AS avg_duration_days
FROM events e
WHERE e.is_active = TRUE
GROUP BY e.event_type, EXTRACT(YEAR FROM e.start_date)
ORDER BY year DESC, total_events DESC;

-- ============================================================================
-- SECTION 10: COMMUNICATION REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_notification_summary
-- Purpose: Notification delivery and engagement summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_notification_summary AS
SELECT 
    n.notification_id,
    n.title,
    n.notification_type,
    n.priority,
    n.target_scope,
    CASE 
        WHEN n.target_scope = 'All' THEN 'All Members'
        WHEN n.target_scope = 'Branch' THEN b.branch_name
        WHEN n.target_scope = 'Region' THEN r.region_name
        WHEN n.target_scope = 'Department' THEN d.department_name
        WHEN n.target_scope = 'Fellowship' THEN f.fellowship_name
        WHEN n.target_scope = 'Role' THEN ro.role_name
        WHEN n.target_scope = 'Leadership' THEN n.target_leadership_role
    END AS target_details,
    CONCAT(sender.first_name, ' ', sender.last_name) AS sent_by,
    n.sent_at,
    n.expires_at,
    n.is_active,
    (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.notification_id) AS recipients_count,
    (SELECT COUNT(*) FROM notification_recipients nr 
     WHERE nr.notification_id = n.notification_id AND nr.is_read = TRUE) AS read_count,
    ROUND(
        100.0 * (SELECT COUNT(*) FROM notification_recipients nr 
                 WHERE nr.notification_id = n.notification_id AND nr.is_read = TRUE) /
        NULLIF((SELECT COUNT(*) FROM notification_recipients nr 
                WHERE nr.notification_id = n.notification_id), 0), 2
    ) AS read_rate_percent,
    (SELECT COUNT(*) FROM notification_recipients nr 
     WHERE nr.notification_id = n.notification_id AND nr.is_dismissed = TRUE) AS dismissed_count
FROM notifications n
LEFT JOIN branches b ON n.target_branch_id = b.branch_id
LEFT JOIN regions r ON n.target_region_id = r.region_id
LEFT JOIN departments d ON n.target_department_id = d.department_id
LEFT JOIN fellowships f ON n.target_fellowship_id = f.fellowship_id
LEFT JOIN roles ro ON n.target_role_id = ro.role_id
JOIN members sender ON n.sent_by = sender.member_id
ORDER BY n.sent_at DESC;

-- ----------------------------------------------------------------------------
-- View: vw_notification_engagement_trend
-- Purpose: Notification engagement trends over time
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_notification_engagement_trend AS
SELECT 
    DATE_TRUNC('week', n.sent_at) AS week_sent,
    n.notification_type,
    n.priority,
    COUNT(*) AS notifications_sent,
    SUM((SELECT COUNT(*) FROM notification_recipients nr 
         WHERE nr.notification_id = n.notification_id)) AS total_recipients,
    SUM((SELECT COUNT(*) FROM notification_recipients nr 
         WHERE nr.notification_id = n.notification_id AND nr.is_read = TRUE)) AS total_reads,
    ROUND(
        100.0 * SUM((SELECT COUNT(*) FROM notification_recipients nr 
                     WHERE nr.notification_id = n.notification_id AND nr.is_read = TRUE)) /
        NULLIF(SUM((SELECT COUNT(*) FROM notification_recipients nr 
                    WHERE nr.notification_id = n.notification_id)), 0), 2
    ) AS avg_read_rate,
    AVG(EXTRACT(EPOCH FROM (
        (SELECT MIN(nr.read_at) FROM notification_recipients nr 
         WHERE nr.notification_id = n.notification_id AND nr.is_read = TRUE) - n.sent_at
    )) / 3600) AS avg_hours_to_first_read
FROM notifications n
WHERE n.is_active = TRUE
GROUP BY DATE_TRUNC('week', n.sent_at), n.notification_type, n.priority
ORDER BY week_sent DESC, n.notification_type;

-- ----------------------------------------------------------------------------
-- View: vw_member_notification_engagement
-- Purpose: Individual member notification engagement patterns
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_member_notification_engagement AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    b.branch_name,
    COUNT(nr.notification_id) AS notifications_received,
    COUNT(nr.notification_id) FILTER (WHERE nr.is_read = TRUE) AS notifications_read,
    ROUND(
        100.0 * COUNT(nr.notification_id) FILTER (WHERE nr.is_read = TRUE) /
        NULLIF(COUNT(nr.notification_id), 0), 2
    ) AS read_rate_percent,
    COUNT(nr.notification_id) FILTER (WHERE nr.is_dismissed = TRUE) AS notifications_dismissed,
    AVG(EXTRACT(EPOCH FROM (nr.read_at - n.sent_at)) / 3600) FILTER (WHERE nr.is_read = TRUE) AS avg_hours_to_read
FROM members m
JOIN branches b ON m.home_branch_id = b.branch_id
LEFT JOIN notification_recipients nr ON m.member_id = nr.member_id
LEFT JOIN notifications n ON nr.notification_id = n.notification_id
WHERE m.is_active = TRUE
GROUP BY m.member_id, m.first_name, m.last_name, b.branch_name
HAVING COUNT(nr.notification_id) > 0
ORDER BY notifications_received DESC;

-- ============================================================================
-- SECTION 11: ROLE & ASSIGNMENT REPORTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_role_distribution
-- Purpose: Role assignments distribution across branches
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_role_distribution AS
SELECT 
    ro.role_id,
    ro.role_name,
    ro.description AS role_description,
    ro.is_active AS role_active,
    b.branch_name,
    r.region_name,
    COUNT(DISTINCT mr.member_id) AS assigned_members,
    STRING_AGG(DISTINCT CONCAT(m.first_name, ' ', m.last_name), ', ' ORDER BY CONCAT(m.first_name, ' ', m.last_name)) AS member_names
FROM roles ro
LEFT JOIN member_roles mr ON ro.role_id = mr.role_id AND mr.is_active = TRUE
LEFT JOIN members m ON mr.member_id = m.member_id AND m.is_active = TRUE
LEFT JOIN branches b ON mr.branch_id = b.branch_id
LEFT JOIN regions r ON b.region_id = r.region_id
WHERE ro.is_active = TRUE
GROUP BY ro.role_id, ro.role_name, ro.description, ro.is_active, b.branch_name, r.region_name
ORDER BY ro.role_name, r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_role_assignment_history
-- Purpose: Role assignment history for tracking transitions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_role_assignment_history AS
SELECT 
    m.member_id,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    ro.role_name,
    b.branch_name,
    mr.assigned_date,
    mr.end_date,
    mr.is_active,
    CASE 
        WHEN mr.end_date IS NULL THEN 'Current'
        ELSE 'Former'
    END AS assignment_status,
    CASE 
        WHEN mr.end_date IS NULL THEN AGE(mr.assigned_date)
        ELSE AGE(mr.end_date, mr.assigned_date)
    END AS tenure,
    mr.notes
FROM member_roles mr
JOIN members m ON mr.member_id = m.member_id
JOIN roles ro ON mr.role_id = ro.role_id
JOIN branches b ON mr.branch_id = b.branch_id
ORDER BY m.last_name, m.first_name, mr.assigned_date DESC;

-- ============================================================================
-- SECTION 12: COMPREHENSIVE DASHBOARD VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: vw_church_wide_summary
-- Purpose: High-level church-wide metrics dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_church_wide_summary AS
SELECT 
    (SELECT COUNT(*) FROM regions) AS total_regions,
    (SELECT COUNT(*) FROM branches WHERE is_active = TRUE) AS active_branches,
    (SELECT COUNT(*) FROM members WHERE is_active = TRUE) AS active_members,
    (SELECT COUNT(*) FROM members WHERE is_active = TRUE 
        AND membership_date >= CURRENT_DATE - INTERVAL '30 days') AS new_members_30_days,
    (SELECT COUNT(*) FROM fellowships WHERE is_active = TRUE) AS active_fellowships,
    (SELECT COUNT(*) FROM branch_departments WHERE is_active = TRUE) AS active_department_instances,
    (SELECT COUNT(DISTINCT service_id) FROM services 
        WHERE service_date >= CURRENT_DATE - INTERVAL '30 days') AS services_30_days,
    (SELECT COUNT(*) FROM service_attendance sa
        JOIN services s ON sa.service_id = s.service_id
        WHERE s.service_date >= CURRENT_DATE - INTERVAL '30 days'
        AND sa.attendance_status IN ('Present', 'Virtual')) AS service_attendance_30_days,
    (SELECT SUM(amount) FROM donations 
        WHERE donation_date >= CURRENT_DATE - INTERVAL '30 days') AS total_donations_30_days,
    (SELECT COUNT(*) FROM outreach_programs 
        WHERE program_date >= CURRENT_DATE - INTERVAL '90 days') AS outreach_programs_90_days,
    (SELECT COUNT(*) FROM souls WHERE status = 'Converted' 
        AND created_at >= CURRENT_DATE - INTERVAL '90 days') AS souls_converted_90_days,
    (SELECT COUNT(*) FROM events 
        WHERE is_active = TRUE AND status IN ('Published', 'Ongoing') 
        AND end_date >= CURRENT_DATE) AS upcoming_events;

-- ----------------------------------------------------------------------------
-- View: vw_branch_dashboard
-- Purpose: Branch-level metrics for branch dashboards
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_branch_dashboard AS
SELECT 
    b.branch_id,
    b.branch_name,
    b.branch_type,
    r.region_name,
    b.is_active,
    -- Leadership
    (SELECT CONCAT(m.first_name, ' ', m.last_name) 
     FROM branch_leadership bl JOIN members m ON bl.member_id = m.member_id
     WHERE bl.branch_id = b.branch_id AND bl.role = 'Main Pastor' AND bl.is_current = TRUE) AS main_pastor,
    (SELECT COUNT(*) FROM branch_leadership bl 
     WHERE bl.branch_id = b.branch_id AND bl.role = 'Elder' AND bl.is_current = TRUE) AS elder_count,
    -- Members
    (SELECT COUNT(*) FROM members m WHERE m.home_branch_id = b.branch_id AND m.is_active = TRUE) AS active_members,
    (SELECT COUNT(*) FROM members m WHERE m.home_branch_id = b.branch_id AND m.is_active = TRUE 
        AND m.membership_date >= CURRENT_DATE - INTERVAL '30 days') AS new_members_30_days,
    -- Groups
    (SELECT COUNT(*) FROM fellowships f WHERE f.branch_id = b.branch_id AND f.is_active = TRUE) AS active_fellowships,
    (SELECT COUNT(*) FROM branch_departments bd WHERE bd.branch_id = b.branch_id AND bd.is_active = TRUE) AS active_departments,
    -- Services
    (SELECT COUNT(*) FROM services s WHERE s.branch_id = b.branch_id 
        AND s.service_date >= CURRENT_DATE - INTERVAL '30 days') AS services_30_days,
    (SELECT AVG(att_count) FROM (
        SELECT COUNT(*) FILTER (WHERE sa.attendance_status IN ('Present', 'Virtual')) AS att_count
        FROM services s
        LEFT JOIN service_attendance sa ON s.service_id = sa.service_id
        WHERE s.branch_id = b.branch_id AND s.service_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY s.service_id
    ) AS sub) AS avg_service_attendance_30_days,
    -- Donations
    (SELECT SUM(d.amount) FROM donations d WHERE d.branch_id = b.branch_id 
        AND d.donation_date >= CURRENT_DATE - INTERVAL '30 days') AS donations_30_days,
    (SELECT COUNT(DISTINCT d.member_id) FROM donations d WHERE d.branch_id = b.branch_id 
        AND d.donation_date >= CURRENT_DATE - INTERVAL '30 days') AS unique_donors_30_days,
    -- Outreach
    (SELECT COUNT(*) FROM outreach_programs op WHERE op.branch_id = b.branch_id 
        AND op.program_date >= CURRENT_DATE - INTERVAL '90 days') AS outreach_programs_90_days,
    (SELECT COUNT(*) FROM souls s JOIN outreach_programs op ON s.outreach_id = op.outreach_id 
        WHERE op.branch_id = b.branch_id AND s.status = 'Converted') AS total_souls_converted
FROM branches b
JOIN regions r ON b.region_id = r.region_id
ORDER BY r.region_name, b.branch_name;

-- ----------------------------------------------------------------------------
-- View: vw_monthly_trends_comparison
-- Purpose: Month-over-month comparison across key metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dev.vw_monthly_trends_comparison AS
WITH monthly_metrics AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE) AS report_month,
        (SELECT COUNT(*) FROM members m WHERE m.is_active = TRUE 
            AND m.membership_date >= DATE_TRUNC('month', CURRENT_DATE)) AS new_members_current,
        (SELECT COUNT(*) FROM members m WHERE m.is_active = TRUE 
            AND m.membership_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND m.membership_date < DATE_TRUNC('month', CURRENT_DATE)) AS new_members_previous,
        (SELECT COUNT(*) FROM service_attendance sa JOIN services s ON sa.service_id = s.service_id
            WHERE s.service_date >= DATE_TRUNC('month', CURRENT_DATE)
            AND sa.attendance_status IN ('Present', 'Virtual')) AS attendance_current,
        (SELECT COUNT(*) FROM service_attendance sa JOIN services s ON sa.service_id = s.service_id
            WHERE s.service_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND s.service_date < DATE_TRUNC('month', CURRENT_DATE)
            AND sa.attendance_status IN ('Present', 'Virtual')) AS attendance_previous,
        (SELECT COALESCE(SUM(amount), 0) FROM donations d 
            WHERE d.donation_date >= DATE_TRUNC('month', CURRENT_DATE)) AS donations_current,
        (SELECT COALESCE(SUM(amount), 0) FROM donations d 
            WHERE d.donation_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND d.donation_date < DATE_TRUNC('month', CURRENT_DATE)) AS donations_previous,
        (SELECT COUNT(*) FROM souls s 
            WHERE s.status = 'Converted' AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS conversions_current,
        (SELECT COUNT(*) FROM souls s 
            WHERE s.status = 'Converted' 
            AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
            AND s.created_at < DATE_TRUNC('month', CURRENT_DATE)) AS conversions_previous
)
SELECT 
    report_month,
    new_members_current,
    new_members_previous,
    ROUND(100.0 * (new_members_current - new_members_previous) / NULLIF(new_members_previous, 0), 2) AS new_members_change_pct,
    attendance_current,
    attendance_previous,
    ROUND(100.0 * (attendance_current - attendance_previous) / NULLIF(attendance_previous, 0), 2) AS attendance_change_pct,
    donations_current,
    donations_previous,
    ROUND(100.0 * (donations_current - donations_previous) / NULLIF(donations_previous, 0), 2) AS donations_change_pct,
    conversions_current,
    conversions_previous,
    ROUND(100.0 * (conversions_current - conversions_previous) / NULLIF(conversions_previous, 0), 2) AS conversions_change_pct
FROM monthly_metrics;

-- ============================================================================
-- END OF REPORTING VIEWS
-- ============================================================================
