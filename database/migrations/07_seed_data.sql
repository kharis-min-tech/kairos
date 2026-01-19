-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 07_seed_data.sql
-- Purpose: Generate realistic dummy data for testing and development
-- ============================================================================
-- Execution Order: 7 (After schema creation)
-- Dependencies: 01-06 (Complete schema must exist)
-- ============================================================================
-- WARNING: This script generates test data and should NOT be run in production
-- ============================================================================

-- Enable necessary extensions for data generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set seed for reproducible random data (optional - comment out for true randomness)
SELECT setseed(0.5);

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS FOR DATA GENERATION
-- ============================================================================

-- Function to generate random date within range
CREATE OR REPLACE FUNCTION random_date(start_date DATE, end_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN start_date + (random() * (end_date - start_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to generate random phone number
CREATE OR REPLACE FUNCTION random_phone()
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN '+233' || lpad(floor(random() * 1000000000)::TEXT, 9, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate random email
CREATE OR REPLACE FUNCTION random_email(first_name TEXT, last_name TEXT, domain TEXT DEFAULT 'churchmail.com')
RETURNS VARCHAR(100) AS $$
BEGIN
    RETURN lower(first_name || '.' || last_name || floor(random() * 1000)::TEXT || '@' || domain);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. LANGUAGES (4 languages)
-- ============================================================================
INSERT INTO languages (language_name, language_code, is_active) VALUES
('English', 'en', TRUE),
('Twi', 'tw', TRUE),
('French', 'fr', TRUE),
('Igbo', 'ig', TRUE);

-- ============================================================================
-- 2. REGIONS (5 regions)
-- ============================================================================
INSERT INTO regions (region_name, country) VALUES
('Greater Accra Region', 'Ghana'),
('Ashanti Region', 'Ghana'),
('Western Region', 'Ghana'),
('Eastern Region', 'Ghana'),
('Central Region', 'Ghana');

-- ============================================================================
-- 3. BRANCHES (5 branches, one per region, plus some additional)
-- ============================================================================
INSERT INTO branches (branch_name, region_id, language_id, branch_type, address, city, postal_code, phone, email, established_date, is_active)
SELECT 
    'Kairos ' || r.region_name || ' Main Branch',
    r.region_id,
    (ARRAY[1, 2, 1, 2, 1])[r.region_id], -- Assign English or Twi based on region
    'Main',
    floor(random() * 100 + 1)::TEXT || ' ' || (ARRAY['Church Street', 'Faith Avenue', 'Hope Road', 'Grace Lane', 'Mission Drive'])[floor(random() * 5 + 1)],
    (ARRAY['Accra', 'Kumasi', 'Takoradi', 'Koforidua', 'Cape Coast'])[r.region_id],
    'GA-' || lpad(floor(random() * 10000)::TEXT, 4, '0'),
    random_phone(),
    'branch' || r.region_id || '@kairoshurch.org',
    random_date('2010-01-01'::DATE, '2020-12-31'::DATE),
    TRUE
FROM regions r;

-- Add 3 more satellite branches
INSERT INTO branches (branch_name, region_id, language_id, branch_type, address, city, postal_code, phone, email, established_date, is_active)
VALUES
('Kairos Tema Satellite', 1, 1, 'Satellite', '45 Community 9', 'Tema', 'GA-1234', random_phone(), 'tema@kairoshurch.org', '2018-06-15', TRUE),
('Kairos Osu Campus', 1, 3, 'Campus', '12 Oxford Street', 'Accra', 'GA-5678', random_phone(), 'osu@kairoshurch.org', '2019-03-20', TRUE),
('Kairos Kumasi Cell', 2, 4, 'Cell', '8 Adum Road', 'Kumasi', 'AK-9012', random_phone(), 'kumasi.cell@kairoshurch.org', '2020-09-10', TRUE);

-- ============================================================================
-- 4. MEMBERS (550 members - 100+ per main branch + additional)
-- ============================================================================

-- Arrays for generating realistic names
DO $$
DECLARE
    first_names_male TEXT[] := ARRAY['Kwame', 'Kofi', 'Kojo', 'Kwesi', 'Yaw', 'Kwabena', 'Kwaku', 'Emmanuel', 'Daniel', 'Samuel', 
                                      'Isaac', 'Joseph', 'David', 'Michael', 'Peter', 'Paul', 'John', 'James', 'Stephen', 'Philip',
                                      'Benjamin', 'Joshua', 'Caleb', 'Nathan', 'Elijah', 'Moses', 'Aaron', 'Solomon', 'Timothy', 'Mark'];
    first_names_female TEXT[] := ARRAY['Akosua', 'Adwoa', 'Abenaa', 'Akua', 'Yaa', 'Afua', 'Ama', 'Abena', 'Grace', 'Mercy',
                                        'Faith', 'Hope', 'Charity', 'Mary', 'Elizabeth', 'Sarah', 'Rebecca', 'Ruth', 'Esther', 'Deborah',
                                        'Hannah', 'Naomi', 'Rachel', 'Lydia', 'Priscilla', 'Martha', 'Anna', 'Eve', 'Judith', 'Miriam'];
    last_names TEXT[] := ARRAY['Mensah', 'Owusu', 'Boateng', 'Osei', 'Asante', 'Appiah', 'Adjei', 'Frimpong', 'Yeboah', 'Agyei',
                                'Darko', 'Amoako', 'Opoku', 'Acheampong', 'Ntim', 'Agyeman', 'Ofori', 'Wiredu', 'Ansah', 'Gyamfi',
                                'Bonsu', 'Sarpong', 'Afriyie', 'Akoto', 'Antwi', 'Kyei', 'Donkor', 'Amankwah', 'Manu', 'Fordjour'];
    cities TEXT[] := ARRAY['Accra', 'Kumasi', 'Takoradi', 'Koforidua', 'Cape Coast'];
    i INTEGER;
    current_branch_id INTEGER;
    members_per_branch INTEGER := 110;
    first_name TEXT;
    last_name TEXT;
    gender TEXT;
BEGIN
    -- Create members for each of the first 5 branches
    FOR current_branch_id IN 1..5 LOOP
        FOR i IN 1..members_per_branch LOOP
            -- Randomly select gender
            gender := (ARRAY['Male', 'Female'])[floor(random() * 2 + 1)];
            
            -- Select appropriate first name based on gender
            IF gender = 'Male' THEN
                first_name := first_names_male[floor(random() * array_length(first_names_male, 1) + 1)];
            ELSE
                first_name := first_names_female[floor(random() * array_length(first_names_female, 1) + 1)];
            END IF;
            
            last_name := last_names[floor(random() * array_length(last_names, 1) + 1)];
            
            INSERT INTO members (
                first_name, last_name, middle_name, date_of_birth, gender, 
                email, phone, address, city, postal_code,
                home_branch_id, membership_date, is_active,
                emergency_contact_name, emergency_contact_phone
            ) VALUES (
                first_name,
                last_name,
                (ARRAY['Kwame', 'Kofi', 'Ama', 'Akua', NULL, NULL])[floor(random() * 6 + 1)],
                random_date('1950-01-01'::DATE, '2005-12-31'::DATE),
                gender,
                random_email(first_name, last_name),
                random_phone(),
                floor(random() * 500 + 1)::TEXT || ' ' || (ARRAY['High Street', 'Main Road', 'Palm Avenue', 'Ridge Road', 'Ring Road'])[floor(random() * 5 + 1)],
                cities[current_branch_id],
                'P' || lpad(floor(random() * 10000)::TEXT, 4, '0'),
                current_branch_id,
                random_date('2015-01-01'::DATE, '2025-12-31'::DATE),
                random() > 0.05, -- 95% active
                first_names_male[floor(random() * array_length(first_names_male, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)],
                random_phone()
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 5. ROLES (15 roles)
-- ============================================================================
INSERT INTO roles (role_name, description, is_active) VALUES
('Choir Member', 'Member of the church choir', TRUE),
('Usher', 'Church usher responsible for seating and assistance', TRUE),
('Sunday School Teacher', 'Teaches Sunday school classes', TRUE),
('Youth Leader', 'Leads youth ministry activities', TRUE),
('Worship Leader', 'Leads worship during services', TRUE),
('Deacon', 'Serves in various church ministries', TRUE),
('Deaconess', 'Serves in various church ministries', TRUE),
('Prayer Team', 'Member of intercessory prayer team', TRUE),
('Media Team', 'Handles audio/visual and media', TRUE),
('Hospitality Team', 'Welcomes and serves visitors', TRUE),
('Evangelism Team', 'Engaged in outreach activities', TRUE),
('Counselor', 'Provides spiritual counseling', TRUE),
('Treasurer', 'Handles church finances', TRUE),
('Secretary', 'Church administrative duties', TRUE),
('Children Ministry', 'Works with children programs', TRUE);

-- ============================================================================
-- 6. BRANCH_LEADERSHIP (5 main pastors, 10 elders)
-- ============================================================================

-- Assign main pastors (first active member of each main branch)
INSERT INTO branch_leadership (branch_id, member_id, role, start_date, end_date, is_current)
SELECT 
    b.branch_id,
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY member_id LIMIT 1),
    'Main Pastor',
    random_date('2015-01-01'::DATE, '2020-12-31'::DATE),
    NULL,
    TRUE
FROM branches b
WHERE b.branch_id <= 5;

-- Assign 2 elders per main branch
INSERT INTO branch_leadership (branch_id, member_id, role, start_date, end_date, is_current)
SELECT 
    b.branch_id,
    m.member_id,
    'Elder',
    random_date('2016-01-01'::DATE, '2021-12-31'::DATE),
    NULL,
    TRUE
FROM branches b
CROSS JOIN LATERAL (
    SELECT member_id 
    FROM members 
    WHERE home_branch_id = b.branch_id 
        AND is_active = TRUE 
        AND member_id NOT IN (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id)
    ORDER BY random()
    LIMIT 2
) m
WHERE b.branch_id <= 5;

-- ============================================================================
-- 7. MEMBER_ROLES (Assign roles to members)
-- ============================================================================

-- Assign random roles to 60% of active members
INSERT INTO member_roles (member_id, role_id, branch_id, assigned_date, is_active)
SELECT 
    m.member_id,
    (SELECT role_id FROM roles WHERE is_active = TRUE ORDER BY random() LIMIT 1),
    m.home_branch_id,
    random_date('2016-01-01'::DATE, '2024-12-31'::DATE),
    TRUE
FROM members m
WHERE m.is_active = TRUE AND random() > 0.4
LIMIT 330;

-- ============================================================================
-- 8. DEPARTMENTS (10 departments)
-- ============================================================================
INSERT INTO departments (department_name, description, is_active) VALUES
('Choir', 'Church choir department', TRUE),
('Ushering', 'Ushering and protocol department', TRUE),
('Technical', 'Audio, visual, and technical support', TRUE),
('Hospitality', 'Guest relations and hospitality', TRUE),
('Youth Ministry', 'Youth programs and activities', TRUE),
('Children Ministry', 'Children programs and Sunday school', TRUE),
('Evangelism', 'Outreach and evangelism department', TRUE),
('Prayer Ministry', 'Intercessory prayer and prayer meetings', TRUE),
('Welfare', 'Member welfare and support', TRUE),
('Administration', 'Church administration and operations', TRUE);

-- ============================================================================
-- 9. BRANCH_DEPARTMENTS (Instantiate departments in branches)
-- ============================================================================

-- Create department instances for each main branch
INSERT INTO branch_departments (branch_id, department_id, lead_member_id, deputy_member_id, start_date, is_active)
SELECT 
    b.branch_id,
    d.department_id,
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE AND member_id NOT IN (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id) ORDER BY random() LIMIT 1),
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE AND member_id NOT IN (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id) ORDER BY random() LIMIT 1 OFFSET 1),
    random_date('2016-01-01'::DATE, '2022-12-31'::DATE),
    TRUE
FROM branches b
CROSS JOIN departments d
WHERE b.branch_id <= 5;

-- ============================================================================
-- 10. DEPARTMENT_MEMBERS (Assign members to departments)
-- ============================================================================

-- Assign 5-10 members to each department instance
INSERT INTO department_members (branch_department_id, member_id, join_date, is_active)
SELECT 
    bd.branch_department_id,
    m.member_id,
    random_date('2017-01-01'::DATE, '2024-12-31'::DATE),
    TRUE
FROM branch_departments bd
CROSS JOIN LATERAL (
    SELECT member_id 
    FROM members 
    WHERE home_branch_id = bd.branch_id 
        AND is_active = TRUE
        AND member_id NOT IN (SELECT member_id FROM branch_leadership WHERE branch_id = bd.branch_id)
    ORDER BY random()
    LIMIT floor(random() * 6 + 5)::INTEGER
) m;

-- ============================================================================
-- 11. FELLOWSHIPS (3 fellowships per main branch)
-- ============================================================================

INSERT INTO fellowships (fellowship_name, branch_id, description, leader_id, co_leader_id, meeting_schedule, is_active)
SELECT 
    (ARRAY['Men', 'Women', 'Youth'])[n] || ' Fellowship - ' || b.branch_name,
    b.branch_id,
    'Fellowship for ' || (ARRAY['men', 'women', 'youth'])[n] || ' in ' || b.branch_name,
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1 OFFSET (n-1)*2),
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1 OFFSET (n-1)*2+1),
    (ARRAY['Every Saturday 5pm', 'Every Sunday after service', 'Every Friday 6pm'])[n],
    TRUE
FROM branches b
CROSS JOIN generate_series(1, 3) n
WHERE b.branch_id <= 5;

-- ============================================================================
-- 12. FELLOWSHIP_MEMBERS (Assign members to fellowships)
-- ============================================================================

-- Assign 15-25 members per fellowship
INSERT INTO fellowship_members (fellowship_id, member_id, join_date, is_active)
SELECT 
    f.fellowship_id,
    m.member_id,
    random_date('2017-01-01'::DATE, '2024-12-31'::DATE),
    TRUE
FROM fellowships f
CROSS JOIN LATERAL (
    SELECT member_id 
    FROM members 
    WHERE home_branch_id = f.branch_id 
        AND is_active = TRUE
    ORDER BY random()
    LIMIT floor(random() * 11 + 15)::INTEGER
) m;

-- ============================================================================
-- 13. SERVICES (Weekly services for past 6 months)
-- ============================================================================

-- Generate Sunday services for each branch
INSERT INTO services (branch_id, service_date, service_type, service_title, preacher_id, topic, expected_attendance)
SELECT 
    b.branch_id,
    date_series + '10:00:00'::TIME,
    'Sunday Service',
    'Sunday Worship Service',
    (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id AND role = 'Main Pastor' AND is_current = TRUE),
    (ARRAY['Faith and Works', 'The Power of Prayer', 'Walking in Love', 'Gods Grace', 'The Holy Spirit', 'Christian Living', 'Spiritual Warfare', 'Gods Promises'])[floor(random() * 8 + 1)],
    floor(random() * 100 + 150)
FROM branches b
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE,
    INTERVAL '7 days'
) date_series
WHERE b.branch_id <= 5;

-- Generate midweek services
INSERT INTO services (branch_id, service_date, service_type, service_title, preacher_id, topic, expected_attendance)
SELECT 
    b.branch_id,
    date_series + '18:30:00'::TIME,
    'Midweek Service',
    'Midweek Bible Study',
    (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id AND role IN ('Main Pastor', 'Elder') AND is_current = TRUE ORDER BY random() LIMIT 1),
    (ARRAY['Book of Romans', 'Acts of the Apostles', 'Gospel of John', 'Psalms Study', 'Proverbs Wisdom', 'Prophetic Books', 'New Testament Letters'])[floor(random() * 7 + 1)],
    floor(random() * 50 + 80)
FROM branches b
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '6 months',
    CURRENT_DATE,
    INTERVAL '7 days'
) date_series
WHERE b.branch_id <= 5;

-- ============================================================================
-- 14. SERVICE_ATTENDANCE (70-85% attendance rate)
-- ============================================================================

-- Generate attendance records
INSERT INTO service_attendance (service_id, member_id, attendance_status, is_first_time_visitor)
SELECT 
    s.service_id,
    m.member_id,
    (ARRAY['Present', 'Present', 'Present', 'Present', 'Virtual', 'Absent'])[floor(random() * 6 + 1)],
    FALSE
FROM services s
CROSS JOIN LATERAL (
    SELECT member_id 
    FROM members 
    WHERE home_branch_id = s.branch_id 
        AND is_active = TRUE
        AND random() > 0.25  -- 75% attendance rate
) m;

-- ============================================================================
-- 15. OUTREACH_PROGRAMS (2 per branch in past year)
-- ============================================================================

INSERT INTO outreach_programs (branch_id, program_name, program_date, location, address, city, description, coordinator_id, total_souls_reached, is_completed)
SELECT 
    b.branch_id,
    (ARRAY['Community Outreach', 'School Evangelism', 'Market Crusade', 'Street Preaching'])[floor(random() * 4 + 1)] || ' - ' || to_char(random_date('2024-01-01'::DATE, '2025-12-31'::DATE), 'Mon YYYY'),
    random_date('2024-01-01'::DATE, '2025-12-31'::DATE),
    (ARRAY['Community Center', 'School Grounds', 'Market Square', 'Town Center'])[floor(random() * 4 + 1)],
    floor(random() * 100 + 1)::TEXT || ' Community Street',
    (ARRAY['Accra', 'Kumasi', 'Takoradi', 'Koforidua', 'Cape Coast'])[b.branch_id],
    'Gospel outreach program to reach the community',
    (SELECT member_id FROM members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1),
    floor(random() * 50 + 20),
    random() > 0.3
FROM branches b
CROSS JOIN generate_series(1, 2) n
WHERE b.branch_id <= 5;

-- ============================================================================
-- 16. SOULS (10-30 per outreach program)
-- ============================================================================

INSERT INTO souls (outreach_id, first_name, last_name, phone, email, gender, age_range, assigned_member_id, status)
SELECT 
    op.outreach_id,
    (ARRAY['John', 'Mary', 'Peter', 'Sarah', 'James', 'Grace', 'David', 'Ruth', 'Daniel', 'Esther'])[floor(random() * 10 + 1)],
    (ARRAY['Mensah', 'Owusu', 'Boateng', 'Asante', 'Osei', 'Appiah', 'Adjei', 'Yeboah'])[floor(random() * 8 + 1)],
    random_phone(),
    NULL,
    (ARRAY['Male', 'Female'])[floor(random() * 2 + 1)],
    (ARRAY['18-25', '26-35', '36-45', '46-55', '56-65', '65+'])[floor(random() * 6 + 1)],
    (SELECT member_id FROM members WHERE home_branch_id = op.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1),
    (ARRAY['New', 'Following Up', 'Interested', 'Converted', 'Not Interested'])[floor(random() * 5 + 1)]
FROM outreach_programs op
CROSS JOIN generate_series(1, floor(random() * 21 + 10)::INTEGER) n;

-- ============================================================================
-- 17. FOLLOW_UPS (1-3 per soul)
-- ============================================================================

INSERT INTO follow_ups (soul_id, member_id, follow_up_date, contact_method, contact_status, duration_minutes, notes)
SELECT 
    s.soul_id,
    COALESCE(s.assigned_member_id, (SELECT member_id FROM members WHERE is_active = TRUE ORDER BY random() LIMIT 1)),
    CURRENT_TIMESTAMP - (random() * INTERVAL '30 days'),
    (ARRAY['Phone Call', 'WhatsApp', 'In-Person Visit', 'Text Message'])[floor(random() * 4 + 1)],
    (ARRAY['Successful', 'No Answer', 'Call Back Later', 'Interested'])[floor(random() * 4 + 1)],
    floor(random() * 45 + 15),
    'Follow-up conversation regarding church activities and spiritual growth'
FROM souls s
CROSS JOIN generate_series(1, floor(random() * 3 + 1)::INTEGER) n;

-- ============================================================================
-- 18. DONATIONS (10 donations per active member on average)
-- ============================================================================

INSERT INTO donations (member_id, branch_id, donation_date, amount, currency, donation_purpose, payment_method, is_anonymous)
SELECT 
    m.member_id,
    m.home_branch_id,
    random_date('2024-01-01'::DATE, '2025-12-31'::DATE),
    round((random() * 500 + 50)::NUMERIC, 2),
    'GHS',
    (ARRAY['Offering', 'Offering', 'Offering', 'Building Fund', 'Building Fund'])[floor(random() * 5 + 1)],
    (ARRAY['Cash', 'Mobile Money', 'Bank Transfer', 'Card'])[floor(random() * 4 + 1)],
    random() > 0.9  -- 10% anonymous
FROM members m
CROSS JOIN generate_series(1, floor(random() * 6 + 8)::INTEGER) n
WHERE m.is_active = TRUE
LIMIT 5000;

-- ============================================================================
-- 19. NOTIFICATIONS (20 notifications)
-- ============================================================================

INSERT INTO notifications (title, message, notification_type, priority, target_scope, target_branch_id, sent_by, sent_at)
SELECT 
    (ARRAY['Upcoming Event', 'Prayer Request', 'Service Update', 'Important Announcement', 'Ministry Opportunity'])[floor(random() * 5 + 1)],
    'This is an important message for all members. Please take note and act accordingly.',
    (ARRAY['Announcement', 'Reminder', 'Alert', 'Event'])[floor(random() * 4 + 1)],
    (ARRAY['Normal', 'Normal', 'Normal', 'High'])[floor(random() * 4 + 1)],
    'Branch',
    b.branch_id,
    (SELECT member_id FROM branch_leadership WHERE branch_id = b.branch_id AND is_current = TRUE LIMIT 1),
    CURRENT_TIMESTAMP - (random() * INTERVAL '60 days')
FROM branches b
CROSS JOIN generate_series(1, 4) n
WHERE b.branch_id <= 5;

-- ============================================================================
-- 20. EVENTS (5 events)
-- ============================================================================

INSERT INTO events (event_title, event_theme, description, event_type, start_date, end_date, start_time, end_time, venue, branch_id, requires_registration, max_attendees, coordinator_id, status)
SELECT 
    (ARRAY['Annual Conference', 'Youth Convention', 'Family Day', 'Harvest Thanksgiving', 'Easter Convention'])[n],
    (ARRAY['Moving Forward in Faith', 'Youth Empowerment', 'Family Unity', 'Gods Provision', 'Resurrection Power'])[n],
    'Special church event for all members and visitors',
    (ARRAY['Conference', 'Convention', 'Celebration', 'Celebration', 'Conference'])[n],
    random_date('2025-01-01'::DATE, '2025-12-31'::DATE),
    random_date('2025-01-01'::DATE, '2025-12-31'::DATE) + INTERVAL '3 days',
    '09:00:00',
    '17:00:00',
    'Church Main Auditorium',
    (n % 5) + 1,
    TRUE,
    500,
    (SELECT member_id FROM branch_leadership WHERE branch_id = (n % 5) + 1 AND is_current = TRUE LIMIT 1),
    'Published'
FROM generate_series(1, 5) n;

-- ============================================================================
-- 21. EVENT_REGISTRATIONS (50-100 per event)
-- ============================================================================

INSERT INTO event_registrations (event_id, member_id, registration_status, guest_count)
SELECT 
    e.event_id,
    m.member_id,
    (ARRAY['Registered', 'Registered', 'Confirmed'])[floor(random() * 3 + 1)],
    floor(random() * 4)
FROM events e
CROSS JOIN LATERAL (
    SELECT member_id 
    FROM members 
    WHERE is_active = TRUE
    ORDER BY random()
    LIMIT floor(random() * 51 + 50)::INTEGER
) m;

-- ============================================================================
-- CLEANUP: Drop helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS random_date(DATE, DATE);
DROP FUNCTION IF EXISTS random_phone();
DROP FUNCTION IF EXISTS random_email(TEXT, TEXT, TEXT);

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display summary statistics
SELECT 'Data Generation Complete!' as status;

SELECT 'Languages' as entity, COUNT(*) as count FROM languages
UNION ALL
SELECT 'Regions', COUNT(*) FROM regions
UNION ALL
SELECT 'Branches', COUNT(*) FROM branches
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Active Members', COUNT(*) FROM members WHERE is_active = TRUE
UNION ALL
SELECT 'Branch Leadership', COUNT(*) FROM branch_leadership
UNION ALL
SELECT 'Main Pastors', COUNT(*) FROM branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE
UNION ALL
SELECT 'Elders', COUNT(*) FROM branch_leadership WHERE role = 'Elder' AND is_current = TRUE
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Member Roles', COUNT(*) FROM member_roles
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Branch Departments', COUNT(*) FROM branch_departments
UNION ALL
SELECT 'Department Members', COUNT(*) FROM department_members
UNION ALL
SELECT 'Fellowships', COUNT(*) FROM fellowships
UNION ALL
SELECT 'Fellowship Members', COUNT(*) FROM fellowship_members
UNION ALL
SELECT 'Services', COUNT(*) FROM services
UNION ALL
SELECT 'Service Attendance', COUNT(*) FROM service_attendance
UNION ALL
SELECT 'Outreach Programs', COUNT(*) FROM outreach_programs
UNION ALL
SELECT 'Souls', COUNT(*) FROM souls
UNION ALL
SELECT 'Follow-ups', COUNT(*) FROM follow_ups
UNION ALL
SELECT 'Donations', COUNT(*) FROM donations
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Event Registrations', COUNT(*) FROM event_registrations;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
