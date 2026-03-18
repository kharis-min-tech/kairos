-- ============================================================================
-- Church Administration System - PostgreSQL Database Schema
-- File: 07_seed_data.sql
-- Purpose: Generate realistic dummy data for testing and development
-- ============================================================================
-- Execution Order: 7 (After schema creation)
-- Dependencies: 01-06 (Complete schema must exist)
-- Note: This script is IDEMPOTENT - safe to run multiple times
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

-- Function to generate random phone number with country code
CREATE OR REPLACE FUNCTION random_phone(country_code TEXT DEFAULT '+44')
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN country_code || lpad(floor(random() * 1000000000)::TEXT, 9, '0');
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
-- 1. LANGUAGES (5 languages)
-- Using ON CONFLICT to skip if already exists
-- ============================================================================
INSERT INTO dev.languages (language_name, language_code, is_active) VALUES
('English', 'en', TRUE),
('Twi', 'tw', TRUE),
('French', 'fr', TRUE),
('Krio', 'kri', TRUE),
('Ga', 'gaa', TRUE)
ON CONFLICT (language_name) DO NOTHING;

-- ============================================================================
-- 2. REGIONS (3 regions - UK, Ghana, Sierra Leone)
-- ============================================================================
INSERT INTO dev.regions (region_name, country) VALUES
    ('United Kingdom', 'United Kingdom'),
    ('Greater Accra', 'Ghana'),
    ('Western Area', 'Sierra Leone')
ON CONFLICT (region_name) DO NOTHING;

-- ============================================================================
-- 3. BRANCHES (5 branches across UK, Ghana, Sierra Leone)
-- ============================================================================
-- Insert branches directly with specific details for each location
INSERT INTO dev.branches (branch_name, region_id, language_id, branch_type, address, city, postal_code, phone, email, established_date, is_active)
SELECT * FROM (VALUES
    -- UK Main Branch - London (Headquarters)
    ('Kharis London Central', 
     (SELECT region_id FROM dev.regions WHERE region_name = 'United Kingdom'),
     (SELECT language_id FROM dev.languages WHERE language_code = 'en'),
     'Main', '142 Kingsway', 'London', 'WC2B 6NH', '+442071234567', 'london@kharischurch.org', '2008-03-15'::DATE, TRUE),
    
    -- UK Branch - Birmingham
    ('Kharis Birmingham', 
     (SELECT region_id FROM dev.regions WHERE region_name = 'United Kingdom'),
     (SELECT language_id FROM dev.languages WHERE language_code = 'en'),
     'Satellite', '78 Corporation Street', 'Birmingham', 'B2 4RN', '+441212345678', 'birmingham@kharischurch.org', '2012-09-01'::DATE, TRUE),
    
    -- UK Branch - Bristol
    ('Kharis Bristol', 
     (SELECT region_id FROM dev.regions WHERE region_name = 'United Kingdom'),
     (SELECT language_id FROM dev.languages WHERE language_code = 'en'),
     'Satellite', '25 Park Street', 'Bristol', 'BS1 5NH', '+441173456789', 'bristol@kharischurch.org', '2015-06-20'::DATE, TRUE),
    
    -- Ghana Branch - Accra
    ('Kharis Accra', 
     (SELECT region_id FROM dev.regions WHERE region_name = 'Greater Accra'),
     (SELECT language_id FROM dev.languages WHERE language_code = 'tw'),
     'Satellite', '45 Independence Avenue', 'Accra', 'GA-123-4567', '+233302123456', 'accra@kharischurch.org', '2014-01-10'::DATE, TRUE),
    
    -- Sierra Leone Branch - Freetown
    ('Kharis Freetown', 
     (SELECT region_id FROM dev.regions WHERE region_name = 'Western Area'),
     (SELECT language_id FROM dev.languages WHERE language_code = 'kri'),
     'Satellite', '12 Siaka Stevens Street', 'Freetown', 'SL-FT-001', '+23276123456', 'freetown@kharischurch.org', '2018-11-25'::DATE, TRUE)
) AS v(branch_name, region_id, language_id, branch_type, address, city, postal_code, phone, email, established_date, is_active)
WHERE NOT EXISTS (SELECT 1 FROM dev.branches WHERE email = v.email);

-- ============================================================================
-- 4. MEMBERS (550 members - diverse names reflecting UK, Ghana, Sierra Leone)
-- ============================================================================
DO $$
DECLARE
    -- British names
    uk_first_names_male TEXT[] := ARRAY['James', 'Oliver', 'William', 'George', 'Thomas', 'Henry', 'Charles', 'Edward', 'Benjamin', 'Alexander',
                                         'Daniel', 'Matthew', 'Joseph', 'David', 'Michael', 'Andrew', 'Richard', 'Christopher', 'Jonathan', 'Samuel',
                                         'Patrick', 'Simon', 'Timothy', 'Stephen', 'Nicholas', 'Anthony', 'Marcus', 'Adrian', 'Phillip', 'Nigel'];
    uk_first_names_female TEXT[] := ARRAY['Emma', 'Charlotte', 'Sophie', 'Olivia', 'Emily', 'Grace', 'Elizabeth', 'Victoria', 'Catherine', 'Sarah',
                                           'Hannah', 'Rebecca', 'Rachel', 'Laura', 'Jessica', 'Lucy', 'Anna', 'Megan', 'Chloe', 'Amy',
                                           'Gemma', 'Natalie', 'Joanne', 'Helen', 'Claire', 'Nicola', 'Karen', 'Michelle', 'Louise', 'Christine'];
    uk_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Taylor', 'Davies', 'Wilson', 'Evans', 'Thomas', 'Roberts',
                                   'Walker', 'Wright', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Lewis', 'Harris',
                                   'Clarke', 'Patel', 'Jackson', 'Wood', 'Turner', 'Martin', 'Cooper', 'Hill', 'Ward', 'Morris'];
    
    -- Ghanaian names
    gh_first_names_male TEXT[] := ARRAY['Kwame', 'Kofi', 'Kojo', 'Kwesi', 'Yaw', 'Kwabena', 'Kwaku', 'Emmanuel', 'Daniel', 'Samuel',
                                          'Isaac', 'Joseph', 'David', 'Michael', 'Peter', 'Paul', 'John', 'Stephen', 'Philip', 'Benjamin',
                                          'Joshua', 'Caleb', 'Nathan', 'Elijah', 'Moses', 'Aaron', 'Solomon', 'Timothy', 'Mark', 'Francis'];
    gh_first_names_female TEXT[] := ARRAY['Ama', 'Akua', 'Afia', 'Yaa', 'Abena', 'Akosua', 'Adwoa', 'Grace', 'Mary', 'Ruth',
                                            'Esther', 'Sarah', 'Rebecca', 'Hannah', 'Mercy', 'Patience', 'Joy', 'Faith', 'Hope', 'Charity',
                                            'Beatrice', 'Catherine', 'Dorothy', 'Elizabeth', 'Florence', 'Gloria', 'Helen', 'Irene', 'Janet', 'Priscilla'];
    gh_last_names TEXT[] := ARRAY['Mensah', 'Asante', 'Owusu', 'Boateng', 'Osei', 'Appiah', 'Adjei', 'Agyeman', 'Amponsah', 'Amoako',
                                   'Darko', 'Frimpong', 'Gyamfi', 'Kyei', 'Manu', 'Nkrumah', 'Ofori', 'Poku', 'Sarpong', 'Tetteh',
                                   'Adu', 'Bonsu', 'Danso', 'Edusei', 'Fordjour', 'Gyan', 'Henaku', 'Inkoom', 'Kusi', 'Quansah'];
    
    -- Sierra Leonean names
    sl_first_names_male TEXT[] := ARRAY['Mohamed', 'Ibrahim', 'Abdul', 'Alhaji', 'Foday', 'Sorie', 'Alpha', 'Brima', 'Lansana', 'Sheku',
                                          'Francis', 'Joseph', 'Samuel', 'David', 'John', 'Patrick', 'Emmanuel', 'Daniel', 'Thomas', 'Peter',
                                          'Augustine', 'Victor', 'Charles', 'Andrew', 'James', 'Paul', 'Michael', 'Sylvester', 'Alfred', 'George'];
    sl_first_names_female TEXT[] := ARRAY['Fatmata', 'Mariama', 'Aminata', 'Isatu', 'Hawa', 'Kadiatu', 'Adama', 'Zainab', 'Sia', 'Kumba',
                                            'Mary', 'Grace', 'Ruth', 'Elizabeth', 'Esther', 'Martha', 'Agnes', 'Victoria', 'Patricia', 'Josephine',
                                            'Alice', 'Dorothy', 'Janet', 'Rebecca', 'Hannah', 'Sarah', 'Margaret', 'Catherine', 'Lucy', 'Florence'];
    sl_last_names TEXT[] := ARRAY['Kamara', 'Sesay', 'Koroma', 'Bangura', 'Conteh', 'Turay', 'Mansaray', 'Jalloh', 'Kargbo', 'Bah',
                                   'Williams', 'Johnson', 'Cole', 'Thomas', 'Davies', 'Fofanah', 'Gbla', 'Kallon', 'Kanu', 'Massaquoi',
                                   'Momoh', 'Sannoh', 'Sheriff', 'Tarawally', 'Yansaneh', 'Lebbie', 'Nyallay', 'Rogers', 'Stevens', 'Wright'];
    
    -- Cities by country for address generation
    uk_cities TEXT[] := ARRAY['London', 'Birmingham', 'Bristol', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 'Nottingham', 'Leicester', 'Coventry'];
    gh_cities TEXT[] := ARRAY['Accra', 'Tema', 'Madina', 'Kasoa', 'Achimota', 'Dansoman', 'Teshie', 'Labadi', 'Spintex', 'East Legon'];
    sl_cities TEXT[] := ARRAY['Freetown', 'Waterloo', 'Wellington', 'Kissy', 'Lumley', 'Aberdeen', 'Goderich', 'Murray Town', 'Congo Town', 'Cline Town'];
    
    i INTEGER;
    v_first_name TEXT;
    v_last_name TEXT;
    v_gender TEXT;
    v_branch_id INTEGER;
    v_branch_city TEXT;
    v_country TEXT;
    v_city TEXT;
    v_phone_code TEXT;
    v_postal_prefix TEXT;
    v_branch_count INTEGER;
    generated_email TEXT;
    existing_member_count INTEGER;
    rand_val DOUBLE PRECISION;
BEGIN
    -- Check if we already have members
    SELECT COUNT(*) INTO existing_member_count FROM dev.members;
    
    -- Only generate if we have fewer than 100 members
    IF existing_member_count < 100 THEN
        -- Get branch count
        SELECT COUNT(*) INTO v_branch_count FROM dev.branches;
        
        IF v_branch_count > 0 THEN
            FOR i IN 1..550 LOOP
                -- Select random branch and get its city/country
                SELECT b.branch_id, b.city, r.country 
                INTO v_branch_id, v_branch_city, v_country
                FROM dev.branches b
                JOIN dev.regions r ON b.region_id = r.region_id
                ORDER BY random() 
                LIMIT 1;
                
                -- Randomly select gender
                rand_val := random();
                
                -- Select names based on country
                IF v_country = 'United Kingdom' THEN
                    v_phone_code := '+44';
                    v_postal_prefix := 'UK-';
                    v_city := uk_cities[floor(random() * 10 + 1)];
                    IF rand_val > 0.5 THEN
                        v_gender := 'Male';
                        v_first_name := uk_first_names_male[floor(random() * 30 + 1)];
                    ELSE
                        v_gender := 'Female';
                        v_first_name := uk_first_names_female[floor(random() * 30 + 1)];
                    END IF;
                    v_last_name := uk_last_names[floor(random() * 30 + 1)];
                    
                ELSIF v_country = 'Ghana' THEN
                    v_phone_code := '+233';
                    v_postal_prefix := 'GH-';
                    v_city := gh_cities[floor(random() * 10 + 1)];
                    IF rand_val > 0.5 THEN
                        v_gender := 'Male';
                        v_first_name := gh_first_names_male[floor(random() * 30 + 1)];
                    ELSE
                        v_gender := 'Female';
                        v_first_name := gh_first_names_female[floor(random() * 30 + 1)];
                    END IF;
                    v_last_name := gh_last_names[floor(random() * 30 + 1)];
                    
                ELSE -- Sierra Leone
                    v_phone_code := '+232';
                    v_postal_prefix := 'SL-';
                    v_city := sl_cities[floor(random() * 10 + 1)];
                    IF rand_val > 0.5 THEN
                        v_gender := 'Male';
                        v_first_name := sl_first_names_male[floor(random() * 30 + 1)];
                    ELSE
                        v_gender := 'Female';
                        v_first_name := sl_first_names_female[floor(random() * 30 + 1)];
                    END IF;
                    v_last_name := sl_last_names[floor(random() * 30 + 1)];
                END IF;
                
                -- Generate unique email
                generated_email := random_email(v_first_name, v_last_name);
                
                -- Insert member if email doesn't exist
                INSERT INTO dev.members (
                    first_name, last_name, middle_name, date_of_birth, gender, 
                    email, phone, address, city, postal_code, home_branch_id, 
                    membership_date, is_active, photo_url, 
                    emergency_contact_name, emergency_contact_phone
                )
                SELECT
                    v_first_name,
                    v_last_name,
                    CASE WHEN random() > 0.7 THEN 
                        CASE v_country 
                            WHEN 'United Kingdom' THEN uk_last_names[floor(random() * 30 + 1)]
                            WHEN 'Ghana' THEN gh_last_names[floor(random() * 30 + 1)]
                            ELSE sl_last_names[floor(random() * 30 + 1)]
                        END
                    ELSE NULL END,
                    random_date('1960-01-01'::DATE, '2005-12-31'::DATE),
                    v_gender,
                    generated_email,
                    random_phone(v_phone_code),
                    floor(random() * 500 + 1)::TEXT || ' Street ' || floor(random() * 100 + 1)::TEXT,
                    v_city,
                    v_postal_prefix || lpad(floor(random() * 10000)::TEXT, 4, '0'),
                    v_branch_id,
                    random_date('2015-01-01'::DATE, '2025-12-31'::DATE),
                    CASE WHEN random() > 0.05 THEN TRUE ELSE FALSE END,
                    NULL,
                    CASE WHEN random() > 0.3 THEN v_first_name || ' ' || v_last_name || ' Sr.' ELSE NULL END,
                    CASE WHEN random() > 0.3 THEN random_phone(v_phone_code) ELSE NULL END
                WHERE NOT EXISTS (SELECT 1 FROM dev.members WHERE email = generated_email);
            END LOOP;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. ROLES (15 roles)
-- ============================================================================
INSERT INTO dev.roles (role_name, description, is_active) VALUES
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
    ('Children Ministry', 'Works with children programs', TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- 6. BRANCH_LEADERSHIP (5 main pastors, 10 elders)
-- Only insert if no current leadership exists for the branch
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    v_member_id INTEGER;
    v_elder_count INTEGER;
BEGIN
    -- Assign Main Pastors for each branch (only if no current pastor exists)
    FOR r IN SELECT branch_id FROM dev.branches WHERE is_active = TRUE LOOP
        -- Check if branch already has a current main pastor
        IF NOT EXISTS (
            SELECT 1 FROM dev.branch_leadership 
            WHERE branch_id = r.branch_id AND role = 'Main Pastor' AND is_current = TRUE
        ) THEN
            -- Get a random active member from this branch who isn't already a leader
            SELECT m.member_id INTO v_member_id
            FROM dev.members m
            WHERE m.home_branch_id = r.branch_id 
                AND m.is_active = TRUE
                AND m.gender = 'Male'
                AND NOT EXISTS (
                    SELECT 1 FROM dev.branch_leadership bl 
                    WHERE bl.member_id = m.member_id AND bl.is_current = TRUE
                )
            ORDER BY random()
            LIMIT 1;
            
            IF v_member_id IS NOT NULL THEN
                INSERT INTO dev.branch_leadership (branch_id, member_id, role, start_date, is_current)
                VALUES (r.branch_id, v_member_id, 'Main Pastor', random_date('2018-01-01'::DATE, '2023-12-31'::DATE), TRUE);
            END IF;
        END IF;
        
        -- Add 2 elders per branch (only if branch has fewer than 2 current elders)
        SELECT COUNT(*) INTO v_elder_count 
        FROM dev.branch_leadership 
        WHERE branch_id = r.branch_id AND role = 'Elder' AND is_current = TRUE;
        
        WHILE v_elder_count < 2 LOOP
            SELECT m.member_id INTO v_member_id
            FROM dev.members m
            WHERE m.home_branch_id = r.branch_id 
                AND m.is_active = TRUE
                AND NOT EXISTS (
                    SELECT 1 FROM dev.branch_leadership bl 
                    WHERE bl.member_id = m.member_id AND bl.is_current = TRUE
                )
            ORDER BY random()
            LIMIT 1;
            
            IF v_member_id IS NOT NULL THEN
                INSERT INTO dev.branch_leadership (branch_id, member_id, role, start_date, is_current)
                VALUES (r.branch_id, v_member_id, 'Elder', random_date('2019-01-01'::DATE, '2024-06-30'::DATE), TRUE);
                v_elder_count := v_elder_count + 1;
            ELSE
                EXIT; -- No more available members
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- 7. MEMBER_ROLES (Assign roles to ~60% of members)
-- Only assign if member doesn't already have an active role
-- ============================================================================
INSERT INTO dev.member_roles (member_id, role_id, branch_id, assigned_date, is_active)
SELECT 
    m.member_id,
    r.role_id,
    m.home_branch_id,
    random_date('2020-01-01'::DATE, '2025-06-30'::DATE),
    TRUE
FROM dev.members m
CROSS JOIN LATERAL (
    SELECT role_id FROM dev.roles WHERE is_active = TRUE ORDER BY random() LIMIT 1
) r
WHERE m.is_active = TRUE 
    AND random() > 0.4
    AND NOT EXISTS (SELECT 1 FROM dev.member_roles WHERE member_id = m.member_id AND is_active = TRUE)
LIMIT 330;

-- ============================================================================
-- 8. DEPARTMENTS (10 departments)
-- ============================================================================
INSERT INTO dev.departments (department_name, description, is_active) VALUES
    ('Choir', 'Church choir department', TRUE),
    ('Ushering', 'Ushering and protocol department', TRUE),
    ('Technical', 'Audio, visual, and technical support', TRUE),
    ('Hospitality', 'Guest relations and hospitality', TRUE),
    ('Youth Ministry', 'Youth programs and activities', TRUE),
    ('Children Ministry', 'Children programs and Sunday school', TRUE),
    ('Evangelism', 'Outreach and evangelism department', TRUE),
    ('Prayer Ministry', 'Intercessory prayer and prayer meetings', TRUE),
    ('Welfare', 'Member welfare and support', TRUE),
    ('Administration', 'Church administration and operations', TRUE)
ON CONFLICT (department_name) DO NOTHING;

-- ============================================================================
-- 9. BRANCH_DEPARTMENTS (Instantiate departments in branches)
-- Only create if not already exists
-- ============================================================================
INSERT INTO dev.branch_departments (branch_id, department_id, lead_member_id, deputy_member_id, start_date, is_active)
SELECT 
    b.branch_id,
    d.department_id,
    (SELECT member_id FROM dev.members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1),
    (SELECT member_id FROM dev.members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1 OFFSET 1),
    random_date('2020-01-01'::DATE, '2024-01-01'::DATE),
    TRUE
FROM dev.branches b
CROSS JOIN dev.departments d
WHERE b.is_active = TRUE AND d.is_active = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM dev.branch_departments bd 
        WHERE bd.branch_id = b.branch_id AND bd.department_id = d.department_id AND bd.is_active = TRUE
    );

-- ============================================================================
-- 10. DEPARTMENT_MEMBERS (Assign members to departments)
-- ============================================================================
INSERT INTO dev.department_members (branch_department_id, member_id, join_date, is_active)
SELECT 
    bd.branch_department_id,
    m.member_id,
    random_date('2021-01-01'::DATE, '2025-01-01'::DATE),
    TRUE
FROM dev.branch_departments bd
JOIN dev.members m ON m.home_branch_id = bd.branch_id AND m.is_active = TRUE
WHERE random() > 0.7
    AND NOT EXISTS (
        SELECT 1 FROM dev.department_members dm 
        WHERE dm.branch_department_id = bd.branch_department_id AND dm.member_id = m.member_id
    )
LIMIT 500;

-- ============================================================================
-- 11. FELLOWSHIPS (3-5 per branch)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    fellowship_names TEXT[] := ARRAY['Men''s Fellowship', 'Women''s Fellowship', 'Youth Fellowship', 
                                      'Couples Fellowship', 'Singles Fellowship', 'Young Adults Fellowship',
                                      'Senior Citizens Fellowship', 'Professional Fellowship'];
    i INTEGER;
    v_leader_id INTEGER;
    v_co_leader_id INTEGER;
    fellowship_count INTEGER;
BEGIN
    FOR r IN SELECT branch_id FROM dev.branches WHERE is_active = TRUE LOOP
        -- Check how many fellowships already exist for this branch
        SELECT COUNT(*) INTO fellowship_count FROM dev.fellowships WHERE branch_id = r.branch_id;
        
        -- Add fellowships only if fewer than 3 exist
        IF fellowship_count < 3 THEN
            FOR i IN 1..floor(random() * 3 + 3)::INTEGER LOOP
                -- Get random leader
                SELECT member_id INTO v_leader_id
                FROM dev.members 
                WHERE home_branch_id = r.branch_id AND is_active = TRUE
                ORDER BY random() LIMIT 1;
                
                -- Get random co-leader (different from leader)
                SELECT member_id INTO v_co_leader_id
                FROM dev.members 
                WHERE home_branch_id = r.branch_id AND is_active = TRUE AND member_id != v_leader_id
                ORDER BY random() LIMIT 1;
                
                INSERT INTO dev.fellowships (fellowship_name, branch_id, description, leader_id, co_leader_id, meeting_schedule, is_active)
                SELECT
                    fellowship_names[((i - 1) % 8) + 1],
                    r.branch_id,
                    'Fellowship for spiritual growth and community',
                    v_leader_id,
                    v_co_leader_id,
                    CASE floor(random() * 4)::INTEGER
                        WHEN 0 THEN 'Every Sunday after service'
                        WHEN 1 THEN 'Every Wednesday at 6 PM'
                        WHEN 2 THEN 'First Saturday of each month'
                        ELSE 'Every Friday at 7 PM'
                    END,
                    TRUE
                WHERE NOT EXISTS (
                    SELECT 1 FROM dev.fellowships f 
                    WHERE f.branch_id = r.branch_id AND f.fellowship_name = fellowship_names[((i - 1) % 8) + 1]
                );
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 12. FELLOWSHIP_MEMBERS (Assign members to fellowships)
-- ============================================================================
INSERT INTO dev.fellowship_members (fellowship_id, member_id, join_date, is_active)
SELECT 
    f.fellowship_id,
    m.member_id,
    random_date('2021-01-01'::DATE, '2025-01-01'::DATE),
    TRUE
FROM dev.fellowships f
JOIN dev.members m ON m.home_branch_id = f.branch_id AND m.is_active = TRUE
WHERE random() > 0.6
    AND NOT EXISTS (
        SELECT 1 FROM dev.fellowship_members fm 
        WHERE fm.fellowship_id = f.fellowship_id AND fm.member_id = m.member_id
    )
LIMIT 400;

-- ============================================================================
-- 13. SERVICES (Create services for the past 12 months)
-- ============================================================================
INSERT INTO dev.services (branch_id, service_date, service_type, service_title, preacher_id, topic, expected_attendance)
SELECT 
    b.branch_id,
    (CURRENT_DATE - (s.week_offset * 7))::DATE + TIME '09:00:00',
    CASE s.service_num
        WHEN 1 THEN 'Sunday Service'
        ELSE 'Midweek Service'
    END,
    CASE s.service_num
        WHEN 1 THEN 'Sunday Worship Service'
        ELSE 'Midweek Bible Study'
    END,
    (SELECT member_id FROM dev.branch_leadership WHERE branch_id = b.branch_id AND role = 'Main Pastor' AND is_current = TRUE LIMIT 1),
    CASE floor(random() * 10)::INTEGER
        WHEN 0 THEN 'Walking in Faith'
        WHEN 1 THEN 'The Power of Prayer'
        WHEN 2 THEN 'Living by Grace'
        WHEN 3 THEN 'Building Strong Families'
        WHEN 4 THEN 'Serving with Joy'
        WHEN 5 THEN 'The Love of God'
        WHEN 6 THEN 'Growing in Christ'
        WHEN 7 THEN 'Kingdom Living'
        WHEN 8 THEN 'Spiritual Warfare'
        ELSE 'The Faithful Life'
    END,
    floor(random() * 200 + 50)::INTEGER
FROM dev.branches b
CROSS JOIN (
    SELECT generate_series(0, 51) as week_offset, generate_series(1, 2) as service_num
) s
WHERE b.is_active = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM dev.services srv 
        WHERE srv.branch_id = b.branch_id 
        AND srv.service_date::DATE = (CURRENT_DATE - (s.week_offset * 7))::DATE
        AND srv.service_type = CASE s.service_num WHEN 1 THEN 'Sunday Service' ELSE 'Midweek Service' END
    )
LIMIT 500;

-- ============================================================================
-- 14. SERVICE_ATTENDANCE (Random attendance for services)
-- ============================================================================
INSERT INTO dev.service_attendance (service_id, member_id, attendance_status, is_first_time_visitor)
SELECT 
    s.service_id,
    m.member_id,
    CASE 
        WHEN random() > 0.15 THEN 'Present'
        WHEN random() > 0.5 THEN 'Virtual'
        ELSE 'Absent'
    END,
    CASE WHEN random() > 0.98 THEN TRUE ELSE FALSE END
FROM dev.services s
JOIN dev.members m ON m.home_branch_id = s.branch_id AND m.is_active = TRUE
WHERE random() > 0.3
    AND NOT EXISTS (SELECT 1 FROM dev.service_attendance WHERE service_id = s.service_id AND member_id = m.member_id)
LIMIT 5000;

-- ============================================================================
-- 15. OUTREACH_PROGRAMS (2-3 per branch)
-- ============================================================================
INSERT INTO dev.outreach_programs (branch_id, program_name, program_date, location, address, city, description, coordinator_id, total_souls_reached, is_completed)
SELECT 
    b.branch_id,
    program_names.name,
    random_date('2024-01-01'::DATE, '2025-12-31'::DATE),
    locations.loc,
    floor(random() * 100 + 1)::TEXT || ' Main Street',
    b.city,  -- Use branch city
    'Community outreach and evangelism program',
    (SELECT member_id FROM dev.members WHERE home_branch_id = b.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1),
    floor(random() * 50 + 10)::INTEGER,
    CASE WHEN random() > 0.3 THEN TRUE ELSE FALSE END
FROM dev.branches b
CROSS JOIN (VALUES ('Street Evangelism'), ('Community Outreach'), ('Hospital Visitation'), ('Prison Ministry')) AS program_names(name)
CROSS JOIN (VALUES ('Market Square'), ('Town Centre'), ('Hospital'), ('Community Centre')) AS locations(loc)
WHERE b.is_active = TRUE AND random() > 0.7
    AND NOT EXISTS (
        SELECT 1 FROM dev.outreach_programs op 
        WHERE op.branch_id = b.branch_id AND op.program_name = program_names.name
    )
LIMIT 25;

-- ============================================================================
-- 16. SOULS (People reached through outreach - diverse names by country)
-- ============================================================================
INSERT INTO dev.souls (outreach_id, first_name, last_name, phone, email, city, gender, status, assigned_member_id)
SELECT 
    op.outreach_id,
    -- Select names based on country of the outreach branch
    CASE 
        WHEN r.country = 'United Kingdom' THEN
            CASE WHEN random() > 0.5 THEN 
                (ARRAY['James', 'Oliver', 'William', 'George', 'Thomas', 'Henry', 'David', 'Michael'])[floor(random() * 8 + 1)]
            ELSE 
                (ARRAY['Emma', 'Charlotte', 'Sophie', 'Olivia', 'Emily', 'Grace', 'Elizabeth', 'Victoria'])[floor(random() * 8 + 1)]
            END
        WHEN r.country = 'Ghana' THEN
            CASE WHEN random() > 0.5 THEN 
                (ARRAY['Kwame', 'Kofi', 'Yaw', 'Emmanuel', 'Samuel', 'David', 'Joseph', 'Peter'])[floor(random() * 8 + 1)]
            ELSE 
                (ARRAY['Ama', 'Akua', 'Grace', 'Mary', 'Esther', 'Ruth', 'Sarah', 'Joy'])[floor(random() * 8 + 1)]
            END
        ELSE -- Sierra Leone
            CASE WHEN random() > 0.5 THEN 
                (ARRAY['Mohamed', 'Ibrahim', 'Abdul', 'Francis', 'Samuel', 'Joseph', 'David', 'Emmanuel'])[floor(random() * 8 + 1)]
            ELSE 
                (ARRAY['Fatmata', 'Mariama', 'Aminata', 'Mary', 'Grace', 'Isatu', 'Hawa', 'Elizabeth'])[floor(random() * 8 + 1)]
            END
    END,
    CASE 
        WHEN r.country = 'United Kingdom' THEN
            (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Taylor', 'Davies', 'Wilson', 'Evans'])[floor(random() * 8 + 1)]
        WHEN r.country = 'Ghana' THEN
            (ARRAY['Mensah', 'Asante', 'Owusu', 'Boateng', 'Osei', 'Appiah', 'Adjei', 'Agyeman'])[floor(random() * 8 + 1)]
        ELSE -- Sierra Leone
            (ARRAY['Kamara', 'Sesay', 'Koroma', 'Bangura', 'Conteh', 'Turay', 'Mansaray', 'Jalloh'])[floor(random() * 8 + 1)]
    END,
    random_phone(CASE r.country WHEN 'United Kingdom' THEN '+44' WHEN 'Ghana' THEN '+233' ELSE '+232' END),
    random_email('soul' || floor(random() * 10000)::TEXT, 'contact'),
    op.city,
    CASE WHEN random() > 0.5 THEN 'Male' ELSE 'Female' END,
    (ARRAY['New', 'Following Up', 'Interested', 'Converted'])[floor(random() * 4 + 1)],
    (SELECT member_id FROM dev.members WHERE home_branch_id = op.branch_id AND is_active = TRUE ORDER BY random() LIMIT 1)
FROM dev.outreach_programs op
JOIN dev.branches b ON op.branch_id = b.branch_id
JOIN dev.regions r ON b.region_id = r.region_id
CROSS JOIN generate_series(1, 5) AS s
WHERE NOT EXISTS (SELECT 1 FROM dev.souls WHERE outreach_id = op.outreach_id)
LIMIT 100;

-- ============================================================================
-- 17. FOLLOW_UPS (For souls)
-- ============================================================================
INSERT INTO dev.follow_ups (soul_id, member_id, follow_up_date, contact_method, contact_status, duration_minutes, notes)
SELECT 
    s.soul_id,
    s.assigned_member_id,
    random_date('2024-06-01'::DATE, '2025-12-31'::DATE)::TIMESTAMP,
    (ARRAY['Phone Call', 'Text Message', 'WhatsApp', 'In-Person Visit'])[floor(random() * 4 + 1)],
    (ARRAY['Successful', 'No Answer', 'Call Back Later', 'Interested'])[floor(random() * 4 + 1)],
    floor(random() * 30 + 5)::INTEGER,
    'Follow-up conversation with prospect'
FROM dev.souls s
WHERE s.assigned_member_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM dev.follow_ups WHERE soul_id = s.soul_id)
LIMIT 150;

-- ============================================================================
-- 18. DONATIONS (Financial giving records with country-appropriate currencies)
-- ============================================================================
INSERT INTO dev.donations (member_id, branch_id, donation_date, amount, currency, donation_purpose, payment_method, is_anonymous)
SELECT 
    m.member_id,
    m.home_branch_id,
    random_date('2024-01-01'::DATE, '2025-12-31'::DATE),
    CASE r.country
        WHEN 'United Kingdom' THEN (floor(random() * 200 + 10) * 5)::DECIMAL(12,2)  -- GBP amounts
        WHEN 'Ghana' THEN (floor(random() * 500 + 50) * 10)::DECIMAL(12,2)           -- GHS amounts (larger numbers)
        ELSE (floor(random() * 1000 + 100) * 100)::DECIMAL(12,2)                     -- SLE amounts (much larger)
    END,
    CASE r.country
        WHEN 'United Kingdom' THEN 'GBP'
        WHEN 'Ghana' THEN 'GHS'
        ELSE 'SLE'
    END,
    (ARRAY['Offering', 'Building Fund', 'Offering'])[floor(random() * 3 + 1)],
    CASE r.country
        WHEN 'United Kingdom' THEN (ARRAY['Card', 'Bank Transfer', 'Cash', 'Online'])[floor(random() * 4 + 1)]
        WHEN 'Ghana' THEN (ARRAY['Mobile Money', 'Cash', 'Bank Transfer', 'Card'])[floor(random() * 4 + 1)]
        ELSE (ARRAY['Cash', 'Mobile Money', 'Bank Transfer', 'Cash'])[floor(random() * 4 + 1)]
    END,
    CASE WHEN random() > 0.95 THEN TRUE ELSE FALSE END
FROM dev.members m
JOIN dev.branches b ON m.home_branch_id = b.branch_id
JOIN dev.regions r ON b.region_id = r.region_id
WHERE m.is_active = TRUE AND random() > 0.5
LIMIT 1000;

-- ============================================================================
-- 19. NOTIFICATIONS (Sample announcements)
-- ============================================================================
INSERT INTO dev.notifications (title, message, notification_type, priority, target_scope, sent_by, sent_at)
SELECT 
    titles.title,
    'This is an important announcement for all members. Please take note of the upcoming activities and events.',
    types.type,
    priorities.priority,
    'All',
    (SELECT member_id FROM dev.branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE LIMIT 1),
    random_date('2025-01-01'::DATE, '2025-12-31'::DATE)::TIMESTAMP
FROM (VALUES 
    ('Sunday Service Reminder'),
    ('Upcoming Church Conference'),
    ('Prayer Meeting Notice'),
    ('Youth Program Announcement'),
    ('Thanksgiving Service')
) AS titles(title)
CROSS JOIN (VALUES ('Announcement'), ('Reminder'), ('Event')) AS types(type)
CROSS JOIN (VALUES ('Normal'), ('High')) AS priorities(priority)
WHERE random() > 0.7
LIMIT 15;

-- ============================================================================
-- 20. EVENTS (Church events - hosted at headquarters in London)
-- ============================================================================
INSERT INTO dev.events (event_title, event_theme, description, event_type, start_date, end_date, start_time, end_time, venue, city, requires_registration, max_attendees, coordinator_id, status)
SELECT 
    event_titles.title,
    'Growing Together in Faith',
    'Join us for this exciting church event',
    event_types.type,
    event_start_date,
    event_start_date + INTERVAL '3 days',
    '09:00:00'::TIME,
    '17:00:00'::TIME,
    venues.venue,
    'London',
    CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END,
    floor(random() * 500 + 100)::INTEGER,
    (SELECT member_id FROM dev.branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE LIMIT 1),
    (ARRAY['Published', 'Draft', 'Completed'])[floor(random() * 3 + 1)]
FROM (VALUES 
    ('Annual Church Conference'),
    ('Youth Summit'),
    ('Women''s Retreat'),
    ('Men''s Fellowship Gathering'),
    ('Easter Celebration'),
    ('Christmas Cantata')
) AS event_titles(title)
CROSS JOIN (VALUES ('Conference'), ('Retreat'), ('Celebration'), ('Meeting')) AS event_types(type)
CROSS JOIN (VALUES ('Main Auditorium'), ('Conference Hall'), ('Church Grounds')) AS venues(venue)
CROSS JOIN (SELECT random_date('2025-01-01'::DATE, '2025-12-28'::DATE) AS event_start_date) AS dates
WHERE random() > 0.8
LIMIT 10;

-- ============================================================================
-- 21. EVENT_REGISTRATIONS (Member registrations for events)
-- ============================================================================
INSERT INTO dev.event_registrations (event_id, member_id, registration_status, guest_count)
SELECT 
    e.event_id,
    m.member_id,
    (ARRAY['Registered', 'Confirmed', 'Waitlisted'])[floor(random() * 3 + 1)],
    floor(random() * 3)::INTEGER
FROM dev.events e
CROSS JOIN dev.members m
WHERE e.requires_registration = TRUE 
    AND m.is_active = TRUE 
    AND random() > 0.9
    AND NOT EXISTS (
        SELECT 1 FROM dev.event_registrations er 
        WHERE er.event_id = e.event_id AND er.member_id = m.member_id
    )
LIMIT 200;

-- ============================================================================
-- CLEANUP: Drop helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS random_date(DATE, DATE);
DROP FUNCTION IF EXISTS random_phone();
DROP FUNCTION IF EXISTS random_email(TEXT, TEXT, TEXT);

COMMIT;

-- ============================================================================
-- VERIFICATION: Display counts for all tables
-- ============================================================================
SELECT 'Data Generation Complete!' as status;

SELECT 'Languages' as entity, COUNT(*) as count FROM dev.languages
UNION ALL SELECT 'Regions', COUNT(*) FROM dev.regions
UNION ALL SELECT 'Branches', COUNT(*) FROM dev.branches
UNION ALL SELECT 'Members', COUNT(*) FROM dev.members
UNION ALL SELECT 'Active Members', COUNT(*) FROM dev.members WHERE is_active = TRUE
UNION ALL SELECT 'Branch Leadership', COUNT(*) FROM dev.branch_leadership
UNION ALL SELECT 'Main Pastors', COUNT(*) FROM dev.branch_leadership WHERE role = 'Main Pastor' AND is_current = TRUE
UNION ALL SELECT 'Elders', COUNT(*) FROM dev.branch_leadership WHERE role = 'Elder' AND is_current = TRUE
UNION ALL SELECT 'Roles', COUNT(*) FROM dev.roles
UNION ALL SELECT 'Member Roles', COUNT(*) FROM dev.member_roles
UNION ALL SELECT 'Departments', COUNT(*) FROM dev.departments
UNION ALL SELECT 'Branch Departments', COUNT(*) FROM dev.branch_departments
UNION ALL SELECT 'Department Members', COUNT(*) FROM dev.department_members
UNION ALL SELECT 'Fellowships', COUNT(*) FROM dev.fellowships
UNION ALL SELECT 'Fellowship Members', COUNT(*) FROM dev.fellowship_members
UNION ALL SELECT 'Services', COUNT(*) FROM dev.services
UNION ALL SELECT 'Service Attendance', COUNT(*) FROM dev.service_attendance
UNION ALL SELECT 'Outreach Programs', COUNT(*) FROM dev.outreach_programs
UNION ALL SELECT 'Souls', COUNT(*) FROM dev.souls
UNION ALL SELECT 'Follow-ups', COUNT(*) FROM dev.follow_ups
UNION ALL SELECT 'Donations', COUNT(*) FROM dev.donations
UNION ALL SELECT 'Notifications', COUNT(*) FROM dev.notifications
UNION ALL SELECT 'Events', COUNT(*) FROM dev.events
UNION ALL SELECT 'Event Registrations', COUNT(*) FROM dev.event_registrations
ORDER BY entity;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
