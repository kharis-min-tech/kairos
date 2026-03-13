// @ts-nocheck — Seed script uses dynamic array indexing; strict checks not needed here.
// @kairos/api - Comprehensive Database Seed Lambda
// Creates realistic demo data across all 13 modules for stakeholder demos.
// Invoke: aws lambda invoke --function-name kairos-staging-db-seed out.json
// Or pass { "reset": true } to clear and re-seed.

import type { Handler } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import postgres from 'postgres';

const secretsClient = new SecretsManagerClient({});

// ── Helper: date arithmetic ──────────────────────────────────────────────────
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const dateTimeAgo = (days: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const handler: Handler = async (event) => {
  const secretArn = process.env['DATABASE_SECRET_ARN'];
  if (!secretArn) throw new Error('DATABASE_SECRET_ARN is required');

  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );
  const creds = JSON.parse(secret.SecretString!);
  const connectionString = `postgres://${creds.username}:${encodeURIComponent(creds.password)}@${creds.host}:${creds.port}/${creds.dbname}`;

  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 30,
    idle_timeout: 5,
    ssl: 'require',
  });

  try {
    if (event?.reset) {
      console.log('Resetting database...');
      await sql`DELETE FROM notification_recipients`;
      await sql`DELETE FROM notifications`;
      await sql`DELETE FROM form_submissions`;
      await sql`DELETE FROM forms`;
      await sql`DELETE FROM donations`;
      await sql`DELETE FROM follow_ups`;
      await sql`DELETE FROM souls`;
      await sql`DELETE FROM outreach_participants`;
      await sql`DELETE FROM outreach_programs`;
      await sql`DELETE FROM fellowship_meeting_attendance`;
      await sql`DELETE FROM fellowship_meetings`;
      await sql`DELETE FROM fellowship_members`;
      await sql`DELETE FROM fellowships`;
      await sql`DELETE FROM service_attendance`;
      await sql`DELETE FROM services`;
      await sql`DELETE FROM department_members`;
      await sql`DELETE FROM branch_departments`;
      await sql`DELETE FROM departments`;
      await sql`DELETE FROM branch_leadership`;
      await sql`DELETE FROM members`;
      await sql`DELETE FROM branches`;
      await sql`DELETE FROM regions`;
      await sql`DELETE FROM roles`;
      console.log('Database reset complete.');
    }

    console.log('Seeding database with demo data...');

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ROLES
    // ═══════════════════════════════════════════════════════════════════════
    const roleData = [
      { name: 'Admin', desc: 'System administrator with full access' },
      { name: 'Pastor', desc: 'Branch pastor with branch-level access' },
      { name: 'Leader', desc: 'Department or fellowship leader' },
      { name: 'Member', desc: 'Regular church member' },
    ];
    for (const r of roleData) {
      await sql`
        INSERT INTO roles (role_name, description)
        VALUES (${r.name}, ${r.desc})
        ON CONFLICT (role_name) DO NOTHING
      `;
    }
    console.log('Roles seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. REGIONS
    // ═══════════════════════════════════════════════════════════════════════
    const [ukRegion] = await sql`
      INSERT INTO regions (region_name, country)
      VALUES ('United Kingdom', 'United Kingdom')
      ON CONFLICT (region_name) DO UPDATE SET country = 'United Kingdom'
      RETURNING region_id
    `;
    const [ngRegion] = await sql`
      INSERT INTO regions (region_name, country)
      VALUES ('West Africa', 'Nigeria')
      ON CONFLICT (region_name) DO UPDATE SET country = 'Nigeria'
      RETURNING region_id
    `;
    console.log(`Regions: UK=${ukRegion!.region_id}, NG=${ngRegion!.region_id}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. BRANCHES (5 branches across 2 regions)
    // ═══════════════════════════════════════════════════════════════════════
    const branchData = [
      { name: 'London Central', regionId: ukRegion!.region_id, type: 'Main', city: 'London', address: '45 Worship Lane, Southwark', postal: 'SE1 7AB', phone: '+442071234567', email: 'london@kairos.church' },
      { name: 'Manchester North', regionId: ukRegion!.region_id, type: 'Satellite', city: 'Manchester', address: '12 Grace Road, Didsbury', postal: 'M20 6UR', phone: '+441611234567', email: 'manchester@kairos.church' },
      { name: 'Birmingham West', regionId: ukRegion!.region_id, type: 'Satellite', city: 'Birmingham', address: '8 Faith Avenue, Edgbaston', postal: 'B15 3ES', phone: '+441211234567', email: 'birmingham@kairos.church' },
      { name: 'Leeds Campus', regionId: ukRegion!.region_id, type: 'Campus', city: 'Leeds', address: 'University of Leeds, Student Union', postal: 'LS2 9JT', phone: '+441131234567', email: 'leeds@kairos.church' },
      { name: 'Lagos Central', regionId: ngRegion!.region_id, type: 'Main', city: 'Lagos', address: '22 Adeola Odeku Street, Victoria Island', postal: '101241', phone: '+2341234567890', email: 'lagos@kairos.church' },
    ];

    const branchIds: number[] = [];
    for (const b of branchData) {
      const [row] = await sql`
        INSERT INTO branches (branch_name, region_id, branch_type, city, address, postal_code, phone, email, is_active, established_date)
        VALUES (${b.name}, ${b.regionId}, ${b.type}, ${b.city}, ${b.address}, ${b.postal}, ${b.phone}, ${b.email}, true, ${daysAgo(365)})
        ON CONFLICT (branch_name, region_id) DO UPDATE SET city = ${b.city}
        RETURNING branch_id
      `;
      branchIds.push(row!.branch_id);
    }
    console.log(`Branches: ${branchIds.join(', ')}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. MEMBERS (diverse set across branches and roles)
    // ═══════════════════════════════════════════════════════════════════════
    const memberData = [
      // London Central (branch 0) — Admin + Pastor + Leaders + Members
      { first: 'Daniel', last: 'Bolarinwa', email: 'daniel@kairos.church', phone: '+447700100001', gender: 'Male', dob: '1988-03-15', branch: 0 },
      { first: 'Grace', last: 'Adeyemi', email: 'grace.adeyemi@kairos.church', phone: '+447700100002', gender: 'Female', dob: '1985-07-22', branch: 0 },
      { first: 'Samuel', last: 'Okonkwo', email: 'samuel.okonkwo@kairos.church', phone: '+447700100003', gender: 'Male', dob: '1990-11-08', branch: 0 },
      { first: 'Esther', last: 'Williams', email: 'esther.williams@kairos.church', phone: '+447700100004', gender: 'Female', dob: '1992-01-30', branch: 0 },
      { first: 'David', last: 'Mensah', email: 'david.mensah@kairos.church', phone: '+447700100005', gender: 'Male', dob: '1995-06-12', branch: 0 },
      { first: 'Ruth', last: 'Osei', email: 'ruth.osei@kairos.church', phone: '+447700100006', gender: 'Female', dob: '1993-09-25', branch: 0 },
      { first: 'Joseph', last: 'Adekunle', email: 'joseph.adekunle@kairos.church', phone: '+447700100007', gender: 'Male', dob: '1997-04-18', branch: 0 },
      { first: 'Mercy', last: 'Nwosu', email: 'mercy.nwosu@kairos.church', phone: '+447700100008', gender: 'Female', dob: '1994-12-05', branch: 0 },
      { first: 'Emmanuel', last: 'Asante', email: 'emmanuel.asante@kairos.church', phone: '+447700100009', gender: 'Male', dob: '1991-08-14', branch: 0 },
      { first: 'Priscilla', last: 'Owusu', email: 'priscilla.owusu@kairos.church', phone: '+447700100010', gender: 'Female', dob: '1996-02-28', branch: 0 },
      // Manchester North (branch 1)
      { first: 'James', last: 'Appiah', email: 'james.appiah@kairos.church', phone: '+447700200001', gender: 'Male', dob: '1987-05-20', branch: 1 },
      { first: 'Abigail', last: 'Boateng', email: 'abigail.boateng@kairos.church', phone: '+447700200002', gender: 'Female', dob: '1989-10-11', branch: 1 },
      { first: 'Michael', last: 'Tetteh', email: 'michael.tetteh@kairos.church', phone: '+447700200003', gender: 'Male', dob: '1993-03-07', branch: 1 },
      { first: 'Hannah', last: 'Adjei', email: 'hannah.adjei@kairos.church', phone: '+447700200004', gender: 'Female', dob: '1995-08-19', branch: 1 },
      { first: 'Peter', last: 'Kwarteng', email: 'peter.kwarteng@kairos.church', phone: '+447700200005', gender: 'Male', dob: '1991-12-03', branch: 1 },
      { first: 'Naomi', last: 'Darko', email: 'naomi.darko@kairos.church', phone: '+447700200006', gender: 'Female', dob: '1994-06-15', branch: 1 },
      // Birmingham West (branch 2)
      { first: 'Andrew', last: 'Ofori', email: 'andrew.ofori@kairos.church', phone: '+447700300001', gender: 'Male', dob: '1986-09-28', branch: 2 },
      { first: 'Deborah', last: 'Amoah', email: 'deborah.amoah@kairos.church', phone: '+447700300002', gender: 'Female', dob: '1990-04-14', branch: 2 },
      { first: 'Philip', last: 'Gyamfi', email: 'philip.gyamfi@kairos.church', phone: '+447700300003', gender: 'Male', dob: '1992-07-22', branch: 2 },
      { first: 'Lydia', last: 'Agyemang', email: 'lydia.agyemang@kairos.church', phone: '+447700300004', gender: 'Female', dob: '1988-11-09', branch: 2 },
      // Leeds Campus (branch 3)
      { first: 'Timothy', last: 'Frimpong', email: 'timothy.frimpong@kairos.church', phone: '+447700400001', gender: 'Male', dob: '2001-02-17', branch: 3 },
      { first: 'Sarah', last: 'Mensah', email: 'sarah.mensah@kairos.church', phone: '+447700400002', gender: 'Female', dob: '2002-05-30', branch: 3 },
      { first: 'Joshua', last: 'Antwi', email: 'joshua.antwi@kairos.church', phone: '+447700400003', gender: 'Male', dob: '2000-09-12', branch: 3 },
      // Lagos Central (branch 4)
      { first: 'Oluwaseun', last: 'Adebayo', email: 'seun.adebayo@kairos.church', phone: '+2348101234501', gender: 'Male', dob: '1984-01-25', branch: 4 },
      { first: 'Chidinma', last: 'Eze', email: 'chidinma.eze@kairos.church', phone: '+2348101234502', gender: 'Female', dob: '1991-06-08', branch: 4 },
      { first: 'Tunde', last: 'Bakare', email: 'tunde.bakare@kairos.church', phone: '+2348101234503', gender: 'Male', dob: '1989-11-20', branch: 4 },
      { first: 'Blessing', last: 'Okafor', email: 'blessing.okafor@kairos.church', phone: '+2348101234504', gender: 'Female', dob: '1993-04-03', branch: 4 },
      // Pending members (for approval demo)
      { first: 'Rebecca', last: 'Asare', email: 'rebecca.asare@kairos.church', phone: '+447700100011', gender: 'Female', dob: '1998-07-14', branch: 0 },
      { first: 'Isaac', last: 'Opoku', email: 'isaac.opoku@kairos.church', phone: '+447700200007', gender: 'Male', dob: '1999-03-22', branch: 1 },
    ];

    const memberIds: number[] = [];
    for (let i = 0; i < memberData.length; i++) {
      const m = memberData[i]!;
      const isPending = i >= memberData.length - 2; // last 2 are pending
      const [row] = await sql`
        INSERT INTO members (first_name, last_name, email, phone, gender, date_of_birth, home_branch_id, is_active, membership_date, address, city)
        VALUES (${m.first}, ${m.last}, ${m.email}, ${m.phone}, ${m.gender}, ${m.dob}, ${branchIds[m.branch]!}, ${!isPending}, ${isPending ? daysAgo(2) : daysAgo(180)}, ${'123 Church Street'}, ${branchData[m.branch]!.city})
        ON CONFLICT (email) DO UPDATE SET first_name = ${m.first}
        RETURNING member_id
      `;
      memberIds.push(row!.member_id);
    }
    console.log(`Members seeded: ${memberIds.length}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. BRANCH LEADERSHIP (pastors + elders)
    // ═══════════════════════════════════════════════════════════════════════
    // Daniel (0) = Admin, Grace (1) = London Pastor, James (10) = Manchester Pastor,
    // Andrew (16) = Birmingham Pastor, Timothy (20) = Leeds Pastor, Seun (23) = Lagos Pastor
    const leadershipData = [
      { branchIdx: 0, memberIdx: 1, role: 'Main Pastor' },   // Grace → London Pastor
      { branchIdx: 0, memberIdx: 2, role: 'Elder' },          // Samuel → London Elder
      { branchIdx: 1, memberIdx: 10, role: 'Main Pastor' },   // James → Manchester Pastor
      { branchIdx: 1, memberIdx: 11, role: 'Elder' },         // Abigail → Manchester Elder
      { branchIdx: 2, memberIdx: 16, role: 'Main Pastor' },   // Andrew → Birmingham Pastor
      { branchIdx: 3, memberIdx: 20, role: 'Main Pastor' },   // Timothy → Leeds Pastor
      { branchIdx: 4, memberIdx: 23, role: 'Main Pastor' },   // Seun → Lagos Pastor
      { branchIdx: 4, memberIdx: 25, role: 'Elder' },         // Tunde → Lagos Elder
    ];

    // Clear existing leadership to avoid partial unique index conflicts on re-seed
    await sql`DELETE FROM branch_leadership WHERE branch_id = ANY(${branchIds})`;
    for (const l of leadershipData) {
      await sql`
        INSERT INTO branch_leadership (branch_id, member_id, role, start_date, is_current)
        VALUES (${branchIds[l.branchIdx]!}, ${memberIds[l.memberIdx]!}, ${l.role}, ${daysAgo(180)}, true)
      `;
    }
    console.log('Branch leadership seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 6. DEPARTMENTS (global definitions + branch instances)
    // ═══════════════════════════════════════════════════════════════════════
    const deptNames = [
      { name: 'Choir', desc: 'Music and worship ministry' },
      { name: 'Ushers', desc: 'Hospitality and service coordination' },
      { name: 'Media', desc: 'Audio, visual, and social media ministry' },
      { name: 'Children Ministry', desc: 'Sunday school and children programs' },
      { name: 'Prayer Warriors', desc: 'Intercessory prayer ministry' },
      { name: 'Drama', desc: 'Creative arts and drama ministry' },
    ];

    const deptIds: number[] = [];
    for (const d of deptNames) {
      const [row] = await sql`
        INSERT INTO departments (department_name, description, is_active)
        VALUES (${d.name}, ${d.desc}, true)
        ON CONFLICT (department_name) DO UPDATE SET description = ${d.desc}
        RETURNING department_id
      `;
      deptIds.push(row!.department_id);
    }

    // Branch department instances for London (branch 0) — all 6 departments
    // Lead assignments: Samuel(2)=Choir, Esther(3)=Ushers, David(4)=Media, Ruth(5)=Children, Joseph(6)=Prayer, Mercy(7)=Drama
    const branchDeptIds: number[] = [];
    const londonDeptLeads = [2, 3, 4, 5, 6, 7];
    const londonDeptDeputies = [8, 9, null, null, null, null]; // Some have deputies
    for (let i = 0; i < deptIds.length; i++) {
      const deputy = londonDeptDeputies[i] != null ? memberIds[londonDeptDeputies[i]!] : null;
      const [row] = await sql`
        INSERT INTO branch_departments (branch_id, department_id, lead_member_id, deputy_member_id, is_active, start_date)
        VALUES (${branchIds[0]!}, ${deptIds[i]!}, ${memberIds[londonDeptLeads[i]!]!}, ${deputy}, true, ${daysAgo(150)})
        ON CONFLICT (branch_id, department_id) WHERE is_active = TRUE DO UPDATE SET lead_member_id = ${memberIds[londonDeptLeads[i]!]!}
        RETURNING branch_department_id
      `;
      branchDeptIds.push(row!.branch_department_id);
    }

    // Manchester (branch 1) — 3 departments: Choir, Ushers, Media
    const manchesterDeptIds: number[] = [];
    const manchesterLeads = [12, 13, 14]; // Michael, Hannah, Peter
    for (let i = 0; i < 3; i++) {
      const [row] = await sql`
        INSERT INTO branch_departments (branch_id, department_id, lead_member_id, is_active, start_date)
        VALUES (${branchIds[1]!}, ${deptIds[i]!}, ${memberIds[manchesterLeads[i]!]!}, true, ${daysAgo(120)})
        ON CONFLICT (branch_id, department_id) WHERE is_active = TRUE DO UPDATE SET lead_member_id = ${memberIds[manchesterLeads[i]!]!}
        RETURNING branch_department_id
      `;
      manchesterDeptIds.push(row!.branch_department_id);
    }
    console.log('Departments seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 7. DEPARTMENT MEMBERS
    // ═══════════════════════════════════════════════════════════════════════
    // London: assign several members to departments
    const deptMemberAssignments = [
      // Choir: members 2(Samuel-lead), 8(Emmanuel), 9(Priscilla)
      { bdId: branchDeptIds[0]!, members: [2, 8, 9] },
      // Ushers: members 3(Esther-lead), 4(David), 6(Joseph)
      { bdId: branchDeptIds[1]!, members: [3, 4, 6] },
      // Media: members 4(David-lead), 7(Mercy), 9(Priscilla)
      { bdId: branchDeptIds[2]!, members: [4, 7, 9] },
      // Children: members 5(Ruth-lead), 7(Mercy)
      { bdId: branchDeptIds[3]!, members: [5, 7] },
      // Prayer: members 6(Joseph-lead), 8(Emmanuel)
      { bdId: branchDeptIds[4]!, members: [6, 8] },
    ];

    for (const assignment of deptMemberAssignments) {
      for (const mIdx of assignment.members) {
        await sql`
          INSERT INTO department_members (branch_department_id, member_id, is_active, join_date)
          VALUES (${assignment.bdId}, ${memberIds[mIdx]!}, true, ${daysAgo(120)})
          ON CONFLICT ON CONSTRAINT uq_department_members_assignment DO NOTHING
        `;
      }
    }

    // Manchester department members
    const manchesterDeptMembers = [
      { bdId: manchesterDeptIds[0]!, members: [12, 14, 15] },
      { bdId: manchesterDeptIds[1]!, members: [13, 15] },
      { bdId: manchesterDeptIds[2]!, members: [14, 12] },
    ];
    for (const assignment of manchesterDeptMembers) {
      for (const mIdx of assignment.members) {
        await sql`
          INSERT INTO department_members (branch_department_id, member_id, is_active, join_date)
          VALUES (${assignment.bdId}, ${memberIds[mIdx]!}, true, ${daysAgo(100)})
          ON CONFLICT ON CONSTRAINT uq_department_members_assignment DO NOTHING
        `;
      }
    }
    console.log('Department members seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 8. FELLOWSHIPS + MEMBERS
    // ═══════════════════════════════════════════════════════════════════════
    const fellowshipData = [
      { name: 'Grace K-Group', branchIdx: 0, type: 'K-Groups', leaderIdx: 3, coLeaderIdx: 5, schedule: 'Every Wednesday 7pm', members: [4, 6, 8] },
      { name: 'Faith K-Group', branchIdx: 0, type: 'K-Groups', leaderIdx: 7, coLeaderIdx: 9, schedule: 'Every Thursday 7pm', members: [2] },
      { name: 'Manchester Kharis Express', branchIdx: 1, type: 'Kharis Express', leaderIdx: 11, coLeaderIdx: 13, schedule: 'Every Friday 6:30pm', members: [12, 14, 15] },
      { name: 'Leeds New Breeds', branchIdx: 3, type: 'New Breeds', leaderIdx: 20, coLeaderIdx: 21, schedule: 'Every Tuesday 6pm', members: [22] },
      { name: 'Lagos K-Group Alpha', branchIdx: 4, type: 'K-Groups', leaderIdx: 24, coLeaderIdx: 25, schedule: 'Every Saturday 5pm', members: [26] },
    ];

    const fellowshipIds: number[] = [];
    for (const f of fellowshipData) {
      const [row] = await sql`
        INSERT INTO fellowships (fellowship_name, branch_id, description, leader_id, co_leader_id, meeting_schedule, is_active)
        VALUES (${f.name}, ${branchIds[f.branchIdx]!}, ${f.type + ' fellowship'}, ${memberIds[f.leaderIdx]!}, ${memberIds[f.coLeaderIdx]!}, ${f.schedule}, true)
        ON CONFLICT ON CONSTRAINT uq_fellowships_name_branch DO UPDATE SET leader_id = ${memberIds[f.leaderIdx]!}
        RETURNING fellowship_id
      `;
      fellowshipIds.push(row!.fellowship_id);

      // Add leader + co-leader + members
      const allMembers = [f.leaderIdx, f.coLeaderIdx, ...f.members];
      for (const mIdx of allMembers) {
        await sql`
          INSERT INTO fellowship_members (fellowship_id, member_id, is_active, join_date)
          VALUES (${row!.fellowship_id}, ${memberIds[mIdx]!}, true, ${daysAgo(100)})
          ON CONFLICT ON CONSTRAINT uq_fellowship_members_assignment DO NOTHING
        `;
      }
    }
    console.log('Fellowships seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 9. SERVICES + ATTENDANCE (last 8 weeks of Sunday + Midweek services)
    // ═══════════════════════════════════════════════════════════════════════
    const serviceIds: number[] = [];
    // London Central services for last 8 Sundays + 4 midweek
    for (let week = 0; week < 8; week++) {
      const sundayDate = dateTimeAgo(week * 7 + ((new Date().getDay() + 1) % 7), 10); // last N Sundays at 10am
      const [svc] = await sql`
        INSERT INTO services (branch_id, service_date, service_type, service_title, topic, notes)
        VALUES (${branchIds[0]!}, ${sundayDate}, 'Sunday Service', ${'Sunday Worship Week ' + (8 - week)}, ${'The Power of Faith - Part ' + (8 - week)}, 'Regular Sunday service')
        ON CONFLICT ON CONSTRAINT uq_services_unique DO UPDATE SET topic = ${'The Power of Faith - Part ' + (8 - week)}
        RETURNING service_id
      `;
      serviceIds.push(svc!.service_id);
    }

    // Midweek services (last 4 weeks)
    for (let week = 0; week < 4; week++) {
      const midweekDate = dateTimeAgo(week * 7 + 3, 19); // Wednesdays at 7pm
      const [svc] = await sql`
        INSERT INTO services (branch_id, service_date, service_type, service_title, topic)
        VALUES (${branchIds[0]!}, ${midweekDate}, 'Midweek Service', ${'Midweek Bible Study Week ' + (4 - week)}, ${'Walking in the Spirit - Part ' + (4 - week)})
        ON CONFLICT ON CONSTRAINT uq_services_unique DO UPDATE SET topic = ${'Walking in the Spirit - Part ' + (4 - week)}
        RETURNING service_id
      `;
      serviceIds.push(svc!.service_id);
    }

    // Manchester services (last 4 Sundays)
    for (let week = 0; week < 4; week++) {
      const sundayDate = dateTimeAgo(week * 7 + ((new Date().getDay() + 1) % 7), 11);
      await sql`
        INSERT INTO services (branch_id, service_date, service_type, service_title)
        VALUES (${branchIds[1]!}, ${sundayDate}, 'Sunday Service', ${'Manchester Sunday Week ' + (4 - week)})
        ON CONFLICT ON CONSTRAINT uq_services_unique DO NOTHING
      `;
    }

    // Attendance for London Sunday services — realistic varying attendance
    const londonActiveMembers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // first 10 members
    const attendancePatterns = [
      ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present'],  // Daniel - always present
      ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present'],  // Grace - always present (pastor)
      ['Present', 'Present', 'Absent', 'Present', 'Present', 'Present', 'Virtual', 'Present'],   // Samuel
      ['Present', 'Present', 'Present', 'Present', 'Absent', 'Present', 'Present', 'Present'],   // Esther
      ['Present', 'Absent', 'Present', 'Present', 'Present', 'Absent', 'Present', 'Present'],    // David
      ['Present', 'Present', 'Present', 'Virtual', 'Present', 'Present', 'Present', 'Absent'],   // Ruth
      ['Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present', 'Present', 'Present'],      // Joseph - missed last 4 (flagged)
      ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present'],  // Mercy
      ['Virtual', 'Present', 'Present', 'Absent', 'Present', 'Present', 'Virtual', 'Present'],   // Emmanuel
      ['Present', 'Present', 'Absent', 'Present', 'Present', 'Present', 'Present', 'Present'],   // Priscilla
    ];

    for (let svcIdx = 0; svcIdx < 8; svcIdx++) {
      for (let mIdx = 0; mIdx < londonActiveMembers.length; mIdx++) {
        const status = attendancePatterns[mIdx]![svcIdx]!;
        await sql`
          INSERT INTO service_attendance (service_id, member_id, attendance_status, recorded_by)
          VALUES (${serviceIds[svcIdx]!}, ${memberIds[londonActiveMembers[mIdx]!]!}, ${status}, ${memberIds[0]!})
          ON CONFLICT (service_id, member_id) DO UPDATE SET attendance_status = ${status}
        `;
      }
    }
    console.log('Services and attendance seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 10. FELLOWSHIP MEETINGS + ATTENDANCE
    // ═══════════════════════════════════════════════════════════════════════
    // Grace K-Group meetings (last 4 weeks)
    for (let week = 0; week < 4; week++) {
      const meetingDate = dateTimeAgo(week * 7 + 4, 19); // Wednesdays at 7pm
      const [meeting] = await sql`
        INSERT INTO fellowship_meetings (fellowship_id, meeting_date, meeting_title, meeting_topic, location, duration_minutes, created_by)
        VALUES (${fellowshipIds[0]!}, ${meetingDate}, ${'Grace K-Group Week ' + (4 - week)}, ${'Book of Romans Chapter ' + (4 - week)}, 'Esther Williams Home', 90, ${memberIds[3]!})
        ON CONFLICT ON CONSTRAINT uq_fellowship_meetings_date DO UPDATE SET meeting_topic = ${'Book of Romans Chapter ' + (4 - week)}
        RETURNING meeting_id
      `;

      // Attendance for fellowship members: leader(3), co-leader(5), members(4,6,8)
      const fMembers = [3, 5, 4, 6, 8];
      const fStatuses = ['Present', 'Present', week === 2 ? 'Absent' : 'Present', week === 1 ? 'Late' : 'Present', week === 3 ? 'Excused' : 'Present'];
      for (let i = 0; i < fMembers.length; i++) {
        await sql`
          INSERT INTO fellowship_meeting_attendance (meeting_id, member_id, attendance_status, recorded_by)
          VALUES (${meeting!.meeting_id}, ${memberIds[fMembers[i]!]!}, ${fStatuses[i]!}, ${memberIds[3]!})
          ON CONFLICT (meeting_id, member_id) DO UPDATE SET attendance_status = ${fStatuses[i]!}
        `;
      }
    }
    console.log('Fellowship meetings seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 11. OUTREACH PROGRAMS + WORKERS + SOULS + FOLLOW-UPS
    // ═══════════════════════════════════════════════════════════════════════
    const outreachData = [
      { name: 'Southwark Community Outreach', branchIdx: 0, date: daysAgo(30), location: 'Southwark Park', city: 'London', coordIdx: 2, completed: true },
      { name: 'Brixton Street Evangelism', branchIdx: 0, date: daysAgo(14), location: 'Brixton Market', city: 'London', coordIdx: 4, completed: true },
      { name: 'Easter Preparation Outreach', branchIdx: 0, date: daysAgo(3), location: 'Peckham High Street', city: 'London', coordIdx: 6, completed: false },
      { name: 'Manchester University Outreach', branchIdx: 1, date: daysAgo(21), location: 'University of Manchester', city: 'Manchester', coordIdx: 10, completed: true },
    ];

    const outreachIds: number[] = [];
    for (const o of outreachData) {
      const [row] = await sql`
        INSERT INTO outreach_programs (branch_id, program_name, program_date, location, city, coordinator_id, is_completed, description)
        VALUES (${branchIds[o.branchIdx]!}, ${o.name}, ${o.date}, ${o.location}, ${o.city}, ${memberIds[o.coordIdx]!}, ${o.completed}, ${'Community evangelism program'})
        ON CONFLICT ON CONSTRAINT uq_outreach_programs_unique DO UPDATE SET is_completed = ${o.completed}
        RETURNING outreach_id
      `;
      outreachIds.push(row!.outreach_id);
    }

    // Register workers for outreach programs
    const workerAssignments = [
      { outreachIdx: 0, workers: [2, 4, 6, 8] },
      { outreachIdx: 1, workers: [4, 5, 7, 9] },
      { outreachIdx: 2, workers: [6, 2, 3, 8] },
      { outreachIdx: 3, workers: [10, 12, 14] },
    ];
    for (const wa of workerAssignments) {
      for (const wIdx of wa.workers) {
        await sql`
          INSERT INTO outreach_participants (outreach_id, member_id, role)
          VALUES (${outreachIds[wa.outreachIdx]!}, ${memberIds[wIdx]!}, 'Worker')
          ON CONFLICT (outreach_id, member_id) DO NOTHING
        `;
      }
    }

    // Souls captured across outreach programs
    const soulData = [
      // Southwark outreach (30 days ago) — various statuses
      { first: 'John', last: 'Smith', phone: '+447555000001', email: 'john.smith@email.com', outreachIdx: 0, assignedIdx: 2, status: 'Converted', city: 'London' },
      { first: 'Mary', last: 'Johnson', phone: '+447555000002', email: 'mary.j@email.com', outreachIdx: 0, assignedIdx: 4, status: 'Interested', city: 'London' },
      { first: 'Robert', last: 'Brown', phone: '+447555000003', email: null, outreachIdx: 0, assignedIdx: 6, status: 'Following Up', city: 'London' },
      { first: 'Patricia', last: 'Davis', phone: '+447555000004', email: 'pat.davis@email.com', outreachIdx: 0, assignedIdx: 8, status: 'Not Interested', city: 'London' },
      // Brixton outreach (14 days ago)
      { first: 'William', last: 'Wilson', phone: '+447555000005', email: 'w.wilson@email.com', outreachIdx: 1, assignedIdx: 4, status: 'Following Up', city: 'London' },
      { first: 'Jennifer', last: 'Taylor', phone: '+447555000006', email: null, outreachIdx: 1, assignedIdx: 5, status: 'Interested', city: 'London' },
      { first: 'Charles', last: 'Anderson', phone: '+447555000007', email: 'c.anderson@email.com', outreachIdx: 1, assignedIdx: 7, status: 'New', city: 'London' },
      { first: 'Linda', last: 'Thomas', phone: '+447555000008', email: null, outreachIdx: 1, assignedIdx: 9, status: 'Following Up', city: 'London' },
      // Easter prep outreach (3 days ago) — mostly New
      { first: 'Richard', last: 'Jackson', phone: '+447555000009', email: 'r.jackson@email.com', outreachIdx: 2, assignedIdx: 6, status: 'New', city: 'London' },
      { first: 'Barbara', last: 'White', phone: '+447555000010', email: null, outreachIdx: 2, assignedIdx: 2, status: 'New', city: 'London' },
      { first: 'Thomas', last: 'Harris', phone: '+447555000011', email: 'tom.harris@email.com', outreachIdx: 2, assignedIdx: 3, status: 'New', city: 'London' },
      // Manchester outreach
      { first: 'Susan', last: 'Martin', phone: '+447555000012', email: 'susan.m@email.com', outreachIdx: 3, assignedIdx: 10, status: 'Following Up', city: 'Manchester' },
      { first: 'Daniel', last: 'Garcia', phone: '+447555000013', email: null, outreachIdx: 3, assignedIdx: 12, status: 'Interested', city: 'Manchester' },
      { first: 'Nancy', last: 'Martinez', phone: '+447555000014', email: 'nancy.m@email.com', outreachIdx: 3, assignedIdx: 14, status: 'New', city: 'Manchester' },
    ];

    // Clear existing souls for these outreach programs to avoid partial unique index conflicts on re-seed
    await sql`DELETE FROM souls WHERE outreach_id = ANY(${outreachIds})`;
    const soulIds: number[] = [];
    for (const s of soulData) {
      const [row] = await sql`
        INSERT INTO souls (outreach_id, first_name, last_name, phone, email, assigned_member_id, status, city, gender, notes)
        VALUES (${outreachIds[s.outreachIdx]!}, ${s.first}, ${s.last}, ${s.phone}, ${s.email}, ${memberIds[s.assignedIdx]!}, ${s.status}, ${s.city}, ${Math.random() > 0.5 ? 'Male' : 'Female'}, ${'Captured during ' + outreachData[s.outreachIdx]!.name})
        RETURNING soul_id
      `;
      soulIds.push(row!.soul_id);
    }

    // Update outreach total_souls_reached
    await sql`UPDATE outreach_programs SET total_souls_reached = 4 WHERE outreach_id = ${outreachIds[0]!}`;
    await sql`UPDATE outreach_programs SET total_souls_reached = 4 WHERE outreach_id = ${outreachIds[1]!}`;
    await sql`UPDATE outreach_programs SET total_souls_reached = 3 WHERE outreach_id = ${outreachIds[2]!}`;
    await sql`UPDATE outreach_programs SET total_souls_reached = 3 WHERE outreach_id = ${outreachIds[3]!}`;

    // Follow-ups for souls that are not "New" or "Not Interested"
    const followUpSouls = [0, 1, 2, 4, 5, 7, 11, 12]; // indices into soulIds
    for (const sIdx of followUpSouls) {
      const numFollowUps = sIdx <= 1 ? 3 : sIdx <= 5 ? 2 : 1;
      for (let f = 0; f < numFollowUps; f++) {
        const contactMethods = ['Phone Call', 'Text Message', 'In-Person Visit', 'WhatsApp', 'Email'];
        const contactStatuses = ['Successful', 'No Answer', 'Interested', 'Call Back Later'];
        await sql`
          INSERT INTO follow_ups (soul_id, member_id, follow_up_date, contact_method, contact_status, duration_minutes, notes)
          VALUES (
            ${soulIds[sIdx]!},
            ${memberIds[soulData[sIdx]!.assignedIdx]!},
            ${dateTimeAgo((numFollowUps - f) * 3, 14 + f)},
            ${contactMethods[f % contactMethods.length]!},
            ${contactStatuses[f % contactStatuses.length]!},
            ${15 + f * 10},
            ${'Follow-up #' + (f + 1) + ' - ' + (f === numFollowUps - 1 ? 'Good conversation, showing interest' : 'Initial contact made')}
          )
        `;
      }
    }
    console.log('Outreach, souls, and follow-ups seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 12. DONATIONS (mix of online, manual, anonymous)
    // ═══════════════════════════════════════════════════════════════════════
    const donationData = [
      // London Central — various members, purposes, methods
      { memberIdx: 0, branchIdx: 0, amount: '500.00', purpose: 'Tithe', method: 'Card', date: daysAgo(2), anon: false },
      { memberIdx: 0, branchIdx: 0, amount: '200.00', purpose: 'Building Fund', method: 'Bank Transfer', date: daysAgo(9), anon: false },
      { memberIdx: 1, branchIdx: 0, amount: '350.00', purpose: 'Tithe', method: 'Card', date: daysAgo(5), anon: false },
      { memberIdx: 2, branchIdx: 0, amount: '100.00', purpose: 'Offering', method: 'Cash', date: daysAgo(7), anon: false },
      { memberIdx: 3, branchIdx: 0, amount: '250.00', purpose: 'Tithe', method: 'Online', date: daysAgo(3), anon: false },
      { memberIdx: 4, branchIdx: 0, amount: '75.00', purpose: 'Offering', method: 'Cash', date: daysAgo(7), anon: false },
      { memberIdx: 5, branchIdx: 0, amount: '150.00', purpose: 'Tithe', method: 'Card', date: daysAgo(10), anon: false },
      { memberIdx: 6, branchIdx: 0, amount: '50.00', purpose: 'Offering', method: 'Cash', date: daysAgo(14), anon: false },
      { memberIdx: 7, branchIdx: 0, amount: '300.00', purpose: 'Building Fund', method: 'Bank Transfer', date: daysAgo(12), anon: false },
      { memberIdx: 8, branchIdx: 0, amount: '120.00', purpose: 'Tithe', method: 'Online', date: daysAgo(6), anon: false },
      { memberIdx: 9, branchIdx: 0, amount: '80.00', purpose: 'Offering', method: 'Cash', date: daysAgo(7), anon: false },
      { memberIdx: 0, branchIdx: 0, amount: '1000.00', purpose: 'Building Fund', method: 'Check', date: daysAgo(15), anon: true },
      { memberIdx: 0, branchIdx: 0, amount: '500.00', purpose: 'Other', method: 'Cash', date: daysAgo(20), anon: true },
      { memberIdx: 0, branchIdx: 0, amount: '250.00', purpose: 'Offering', method: 'Card', date: daysAgo(14), anon: false },
      { memberIdx: 1, branchIdx: 0, amount: '400.00', purpose: 'Tithe', method: 'Online', date: daysAgo(28), anon: false },
      // Manchester
      { memberIdx: 10, branchIdx: 1, amount: '200.00', purpose: 'Tithe', method: 'Card', date: daysAgo(4), anon: false },
      { memberIdx: 11, branchIdx: 1, amount: '150.00', purpose: 'Offering', method: 'Cash', date: daysAgo(7), anon: false },
      { memberIdx: 12, branchIdx: 1, amount: '100.00', purpose: 'Tithe', method: 'Online', date: daysAgo(11), anon: false },
      { memberIdx: 10, branchIdx: 1, amount: '300.00', purpose: 'Building Fund', method: 'Bank Transfer', date: daysAgo(18), anon: true },
      // Birmingham
      { memberIdx: 16, branchIdx: 2, amount: '175.00', purpose: 'Tithe', method: 'Card', date: daysAgo(5), anon: false },
      { memberIdx: 17, branchIdx: 2, amount: '90.00', purpose: 'Offering', method: 'Cash', date: daysAgo(7), anon: false },
      // Lagos
      { memberIdx: 23, branchIdx: 4, amount: '450.00', purpose: 'Tithe', method: 'Card', date: daysAgo(3), anon: false },
      { memberIdx: 24, branchIdx: 4, amount: '200.00', purpose: 'Offering', method: 'Mobile Money', date: daysAgo(7), anon: false },
      { memberIdx: 25, branchIdx: 4, amount: '100.00', purpose: 'Building Fund', method: 'Bank Transfer', date: daysAgo(14), anon: false },
    ];

    // Clear existing seed donations to avoid duplicates on re-seed
    await sql`DELETE FROM donations WHERE recorded_by = ${memberIds[0]!}`;
    for (const d of donationData) {
      const desc = d.purpose === 'Other' ? 'Special missions fund contribution' : null;
      await sql`
        INSERT INTO donations (member_id, branch_id, donation_date, amount, currency, donation_purpose, description, payment_method, is_anonymous, recorded_by)
        VALUES (${memberIds[d.memberIdx]!}, ${branchIds[d.branchIdx]!}, ${d.date}, ${d.amount}, 'GBP', ${d.purpose}, ${desc}, ${d.method}, ${d.anon}, ${memberIds[0]!})
      `;
    }
    console.log(`Donations seeded: ${donationData.length}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 13. FORMS (pre-built + custom)
    // ═══════════════════════════════════════════════════════════════════════
    const formData = [
      {
        name: 'First-Time Visitor',
        desc: 'Welcome form for first-time visitors',
        scope: 'Church-wide',
        branchIdx: null,
        definition: {
          fields: [
            { type: 'Text', label: 'Full Name', required: true },
            { type: 'Email', label: 'Email Address', required: false },
            { type: 'Phone', label: 'Phone Number', required: true },
            { type: 'Dropdown', label: 'How did you hear about us?', required: true, options: ['Friend/Family', 'Social Media', 'Website', 'Walk-in', 'Other'] },
            { type: 'Textarea', label: 'Prayer Requests', required: false },
          ],
        },
      },
      {
        name: 'Department Signup',
        desc: 'Request to join a department',
        scope: 'Church-wide',
        branchIdx: null,
        definition: {
          fields: [
            { type: 'Text', label: 'Full Name', required: true },
            { type: 'Dropdown', label: 'Department', required: true, options: ['Choir', 'Ushers', 'Media', 'Children Ministry', 'Prayer Warriors', 'Drama'] },
            { type: 'Textarea', label: 'Why do you want to join?', required: true },
            { type: 'Checkbox', label: 'I commit to attending department meetings', required: true },
          ],
        },
      },
      {
        name: 'Baptism Request',
        desc: 'Request for water baptism',
        scope: 'Church-wide',
        branchIdx: null,
        definition: {
          fields: [
            { type: 'Text', label: 'Full Name', required: true },
            { type: 'Date', label: 'Date of Birth', required: true },
            { type: 'Phone', label: 'Phone Number', required: true },
            { type: 'Radio', label: 'Have you been baptised before?', required: true, options: ['Yes', 'No'] },
            { type: 'Textarea', label: 'Testimony', required: true },
          ],
        },
      },
      {
        name: 'London Easter Service Registration',
        desc: 'Register for Easter Sunday special service',
        scope: 'Branch-specific',
        branchIdx: 0,
        definition: {
          fields: [
            { type: 'Text', label: 'Full Name', required: true },
            { type: 'Number', label: 'Number of Guests', required: true },
            { type: 'Dropdown', label: 'Preferred Service Time', required: true, options: ['8:00 AM', '10:00 AM', '12:00 PM'] },
            { type: 'Checkbox', label: 'I need parking', required: false },
          ],
        },
      },
      {
        name: 'Testimony Submission',
        desc: 'Share your testimony with the church',
        scope: 'Church-wide',
        branchIdx: null,
        definition: {
          fields: [
            { type: 'Text', label: 'Full Name', required: true },
            { type: 'Dropdown', label: 'Category', required: true, options: ['Healing', 'Provision', 'Salvation', 'Deliverance', 'Other'] },
            { type: 'Textarea', label: 'Your Testimony', required: true },
            { type: 'Checkbox', label: 'I consent to this being shared publicly', required: true },
          ],
        },
      },
    ];

    // Clear existing seed forms to avoid duplicates on re-seed
    await sql`DELETE FROM forms WHERE created_by = ${memberIds[0]!}`;
    const formIds: number[] = [];
    for (const f of formData) {
      const [row] = await sql`
        INSERT INTO forms (form_name, form_description, form_definition, scope, target_branch_id, is_active, created_by)
        VALUES (${f.name}, ${f.desc}, ${JSON.stringify(f.definition)}, ${f.scope}, ${f.branchIdx != null ? branchIds[f.branchIdx]! : null}, true, ${memberIds[0]!})
        RETURNING form_id
      `;
      formIds.push(row!.form_id);
    }

    // Sample form submissions
    const submissionData = [
      { formIdx: 0, memberIdx: null, data: { 'Full Name': 'Sarah Thompson', 'Phone Number': '+447555100001', 'How did you hear about us?': 'Friend/Family', 'Prayer Requests': 'Please pray for my family' } },
      { formIdx: 0, memberIdx: null, data: { 'Full Name': 'Mark Williams', 'Phone Number': '+447555100002', 'How did you hear about us?': 'Social Media' } },
      { formIdx: 1, memberIdx: 8, data: { 'Full Name': 'Emmanuel Asante', 'Department': 'Drama', 'Why do you want to join?': 'I have a passion for creative arts', 'I commit to attending department meetings': true } },
      { formIdx: 2, memberIdx: 9, data: { 'Full Name': 'Priscilla Owusu', 'Date of Birth': '1996-02-28', 'Phone Number': '+447700100010', 'Have you been baptised before?': 'No', 'Testimony': 'I gave my life to Christ 6 months ago and want to be baptised.' } },
      { formIdx: 4, memberIdx: 5, data: { 'Full Name': 'Ruth Osei', 'Category': 'Healing', 'Your Testimony': 'God healed me from a chronic illness. I am grateful for His mercy.', 'I consent to this being shared publicly': true } },
    ];

    for (const s of submissionData) {
      await sql`
        INSERT INTO form_submissions (form_id, member_id, submission_data)
        VALUES (${formIds[s.formIdx]!}, ${s.memberIdx != null ? memberIds[s.memberIdx]! : null}, ${JSON.stringify(s.data)})
      `;
    }
    console.log('Forms and submissions seeded.');

    // ═══════════════════════════════════════════════════════════════════════
    // 14. NOTIFICATIONS (in-app announcements + alerts)
    // ═══════════════════════════════════════════════════════════════════════
    const notifData = [
      {
        title: 'Easter Service 2026 - Save the Date!',
        message: 'Join us for a special Easter celebration on April 12, 2026. Multiple service times available. Invite your friends and family!',
        type: 'Announcement',
        priority: 'High',
        scope: 'All',
        branchId: null,
      },
      {
        title: 'London Central - Building Fund Update',
        message: 'We have raised £15,000 towards our building fund target of £50,000. Thank you for your generous giving!',
        type: 'Announcement',
        priority: 'Normal',
        scope: 'Branch',
        branchId: branchIds[0]!,
      },
      {
        title: 'Choir Rehearsal Reminder',
        message: 'Reminder: Choir rehearsal this Saturday at 3pm. Please come prepared with your sheet music.',
        type: 'Reminder',
        priority: 'Normal',
        scope: 'Department',
        branchId: null,
        deptId: deptIds[0]!,
      },
      {
        title: 'Overdue Follow-ups Alert',
        message: 'You have souls that need follow-up. Please check your assigned souls and log your follow-up activities.',
        type: 'Alert',
        priority: 'Urgent',
        scope: 'Branch',
        branchId: branchIds[0]!,
      },
      {
        title: 'New Member Registrations Pending',
        message: '2 new member registrations are awaiting your approval. Please review and approve or reject.',
        type: 'Alert',
        priority: 'High',
        scope: 'Branch',
        branchId: branchIds[0]!,
      },
    ];

    // Clear existing seed notifications to avoid duplicates on re-seed
    await sql`DELETE FROM notifications WHERE sent_by = ${memberIds[0]!}`;
    for (const n of notifData) {
      let targetDeptId = null;
      if (n.scope === 'Department' && 'deptId' in n) {
        targetDeptId = n.deptId;
      }

      const [notif] = await sql`
        INSERT INTO notifications (title, message, notification_type, priority, target_scope, target_branch_id, target_department_id, sent_by, is_active)
        VALUES (${n.title}, ${n.message}, ${n.type}, ${n.priority}, ${n.scope}, ${n.branchId}, ${targetDeptId}, ${memberIds[0]!}, true)
        RETURNING notification_id
      `;

      // Create recipients based on scope
      let recipientMemberIndices: number[] = [];
      if (n.scope === 'All') {
        recipientMemberIndices = Array.from({ length: 27 }, (_, i) => i); // all active members
      } else if (n.scope === 'Branch' && n.branchId === branchIds[0]) {
        recipientMemberIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // London members
      } else if (n.scope === 'Department') {
        recipientMemberIndices = [2, 8, 9]; // Choir members
      }

      for (const mIdx of recipientMemberIndices) {
        const isRead = Math.random() > 0.4; // 60% read
        await sql`
          INSERT INTO notification_recipients (notification_id, member_id, is_read, read_at)
          VALUES (${notif!.notification_id}, ${memberIds[mIdx]!}, ${isRead}, ${isRead ? dateTimeAgo(1) : null})
          ON CONFLICT (notification_id, member_id) DO NOTHING
        `;
      }
    }
    console.log('Notifications seeded.');

    // NOTE: Cognito users are provisioned separately via scripts/seed-cognito-users.sh

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    const summary = {
      regions: 2,
      branches: branchIds.length,
      members: memberIds.length,
      pendingMembers: 2,
      departments: deptIds.length,
      branchDepartments: branchDeptIds.length + manchesterDeptIds.length,
      fellowships: fellowshipIds.length,
      services: serviceIds.length,
      outreachPrograms: outreachIds.length,
      souls: soulIds.length,
      donations: donationData.length,
      forms: formIds.length,
      formSubmissions: submissionData.length,
      notifications: notifData.length,
      message: 'Demo data seeded successfully! Ready for stakeholder demo.',
      adminEmail: memberData[0]!.email,
      adminMemberId: memberIds[0],
      londonBranchId: branchIds[0],
    };

    console.log('Seed complete:', JSON.stringify(summary, null, 2));
    return { statusCode: 200, body: JSON.stringify(summary) };
  } finally {
    await sql.end();
  }
};
