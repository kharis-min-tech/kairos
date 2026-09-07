/**
 * Seed script for local development.
 * Populates the database with realistic test data.
 *
 * Usage:  npm run db:seed  (from repo root)
 *    or:  npx tsx src/seed.ts  (from packages/database)
 *
 * All passwords: "Password1!"
 */
import { createDb } from './index';
import {
  regions,
  branches,
  members,
  roles,
  memberRoles,
  memberHealthRecords,
  services,
  serviceAttendance,
  branchLeadership,
  fellowships,
  fellowshipMembers,
  outreachPrograms,
  outreachParticipants,
  souls,
  followUps,
  departments,
  branchDepartments,
  departmentMembers,
  departmentJoinRequests,
  departmentFollowups,
  departmentUniformOutfits,
  departmentUniformSchedule,
  rotaTemplates,
  rotaTemplateSlots,
  rotaPoolMembers,
  rotaInstances,
  rotaAssignments,
  rotaSwapRequests,
  notificationEvents,
  auditLog,
  consentRecords,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
  fellowshipJoinRequests,
  fellowshipFollowups,
  newBelieverEnrollments,
  newBelieverSessions,
  newBelieverAttendance,
  mentorFollowups,
  notificationPreferences,
} from './schema';
import { sql } from 'drizzle-orm';
import { hashPassword } from '@kairos/utils';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function seed() {
  const db = createDb(DATABASE_URL);
  const password = await hashPassword('Password1!');

  console.log('Seeding database...\n');

  // Clean existing data so seed is idempotent
  await db.execute(sql`TRUNCATE regions, roles, departments CASCADE`);
  console.log('✓ Cleared existing data');

  // ── 1. Regions ──────────────────────────────────────────────
  const [uk, ghana, sl] = await db
    .insert(regions)
    .values([
      { regionName: 'United Kingdom', country: 'United Kingdom' },
      { regionName: 'Greater Accra', country: 'Ghana' },
      { regionName: 'Western Area', country: 'Sierra Leone' },
    ])
    .returning();
  console.log(`✓ 3 regions`);

  // ── 2. Branches ─────────────────────────────────────────────
  const [london, manchester, accra, kumasi, freetown] = await db
    .insert(branches)
    .values([
      {
        branchName: 'Kharis London Central',
        regionId: uk!.id,
        branchType: 'Main',
        address: '142 Kingsway',
        city: 'London',
        postalCode: 'WC2B 6NH',
        phone: '+442071234567',
        email: 'london@kharischurch.org',
        establishedDate: '2008-03-15',
      },
      {
        branchName: 'Kharis Manchester',
        regionId: uk!.id,
        branchType: 'Satellite',
        address: '55 Portland Street',
        city: 'Manchester',
        postalCode: 'M1 3HP',
        phone: '+441611234567',
        email: 'manchester@kharischurch.org',
        establishedDate: '2015-06-01',
      },
      {
        branchName: 'Kharis Accra',
        regionId: ghana!.id,
        branchType: 'Main',
        address: '12 Independence Avenue',
        city: 'Accra',
        phone: '+233201234567',
        email: 'accra@kharischurch.org',
        establishedDate: '2012-01-10',
      },
      {
        branchName: 'Kharis Kumasi',
        regionId: ghana!.id,
        branchType: 'Satellite',
        address: '8 Harper Road',
        city: 'Kumasi',
        phone: '+233551234567',
        email: 'kumasi@kharischurch.org',
        establishedDate: '2018-09-01',
      },
      {
        branchName: 'Kharis Freetown',
        regionId: sl!.id,
        branchType: 'Main',
        address: '33 Wilberforce Street',
        city: 'Freetown',
        phone: '+23276123456',
        email: 'freetown@kharischurch.org',
        establishedDate: '2019-11-20',
      },
    ])
    .returning();
  console.log(`✓ 5 branches`);

  // ── 3. Members ──────────────────────────────────────────────
  // Admin (super-admin, London)
  const [admin] = await db
    .insert(members)
    .values({
      firstName: 'Daniel',
      lastName: 'Bolarinwa',
      email: 'admin@kairos.local',
      phone: '+447700000001',
      gender: 'Male',
      dateOfBirth: '1990-05-15',
      homeBranchId: london!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'admin',
      membershipDate: '2008-03-15',
    })
    .returning();

  // Pastors
  const [pastorLondon] = await db
    .insert(members)
    .values({
      firstName: 'James',
      lastName: 'Okonkwo',
      email: 'james.okonkwo@kairos.local',
      phone: '+447700000002',
      gender: 'Male',
      dateOfBirth: '1975-08-22',
      homeBranchId: london!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      // RBAC Phase 4: 'pastor' is now an honorific, not a permission.
      // Branch admin access is granted explicitly via the BSA member_roles
      // row below (5a).
      systemRole: 'member',
      honorific: 'Pastor',
      membershipDate: '2008-03-15',
    })
    .returning();

  const [pastorManchester] = await db
    .insert(members)
    .values({
      firstName: 'Grace',
      lastName: 'Mensah',
      email: 'grace.mensah@kairos.local',
      phone: '+447700000003',
      gender: 'Female',
      dateOfBirth: '1980-02-14',
      homeBranchId: manchester!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      honorific: 'Pastor',
      membershipDate: '2015-06-01',
    })
    .returning();

  const [pastorAccra] = await db
    .insert(members)
    .values({
      firstName: 'Kwame',
      lastName: 'Asante',
      email: 'kwame.asante@kairos.local',
      phone: '+233201234568',
      gender: 'Male',
      dateOfBirth: '1978-11-30',
      homeBranchId: accra!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      honorific: 'Pastor',
      membershipDate: '2012-01-10',
    })
    .returning();

  const [pastorKumasi] = await db
    .insert(members)
    .values({
      firstName: 'Yaw',
      lastName: 'Kwarteng',
      email: 'yaw.kwarteng@kairos.local',
      phone: '+233551234569',
      gender: 'Male',
      dateOfBirth: '1982-07-14',
      homeBranchId: kumasi!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      honorific: 'Pastor',
      membershipDate: '2018-09-01',
    })
    .returning();

  // Leaders (fellowship leaders, elders)
  const [leaderSarah] = await db
    .insert(members)
    .values({
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.williams@kairos.local',
      phone: '+447700000004',
      gender: 'Female',
      dateOfBirth: '1992-07-10',
      homeBranchId: london!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      membershipDate: '2010-01-01',
    })
    .returning();

  const [leaderDavid] = await db
    .insert(members)
    .values({
      firstName: 'David',
      lastName: 'Appiah',
      email: 'david.appiah@kairos.local',
      phone: '+233201234569',
      gender: 'Male',
      dateOfBirth: '1988-03-25',
      homeBranchId: accra!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      membershipDate: '2013-06-15',
    })
    .returning();

  // Multi-branch test members
  await db
    .insert(members)
    .values({
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex.johnson@kairos.local',
      phone: '+447700000010',
      gender: 'Male',
      dateOfBirth: '1994-03-12',
      address: '10 Baker Street',
      city: 'London',
      postalCode: 'W1U 5BD',
      homeBranchId: london!.id,
      secondaryBranchId: manchester!.id,
      isAtSecondaryBranch: false,
      secondaryAddress: '22 Oxford Road',
      secondaryCity: 'Manchester',
      secondaryPostalCode: 'M2 4WU',
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      membershipDate: '2021-04-01',
    })
    .returning();

  const [amaBoateng] = await db
    .insert(members)
    .values({
      firstName: 'Ama',
      lastName: 'Boateng',
      email: 'ama.boateng@kairos.local',
      phone: '+233201234580',
      gender: 'Female',
      dateOfBirth: '1996-08-25',
      address: '5 Ring Road East',
      city: 'Accra',
      homeBranchId: accra!.id,
      secondaryBranchId: kumasi!.id,
      isAtSecondaryBranch: true,
      secondaryAddress: '14 Harper Road',
      secondaryCity: 'Kumasi',
      secondaryPostalCode: 'AK-039',
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      membershipDate: '2022-01-15',
    })
    .returning();

  const [abenaOsei] = await db
    .insert(members)
    .values({
      firstName: 'Abena',
      lastName: 'Osei',
      email: 'abena.osei@kairos.local',
      phone: '+233551234570',
      gender: 'Female',
      dateOfBirth: '1998-05-03',
      homeBranchId: kumasi!.id,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      membershipDate: '2019-03-20',
    })
    .returning();

  // Regular members
  const regularMembers = await db
    .insert(members)
    .values([
      {
        firstName: 'Emma',
        lastName: 'Thompson',
        email: 'emma.thompson@kairos.local',
        phone: '+447700000005',
        gender: 'Female',
        dateOfBirth: '1995-12-01',
        homeBranchId: london!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'approved',
        systemRole: 'member',
      },
      {
        firstName: 'Michael',
        lastName: 'Adjei',
        email: 'michael.adjei@kairos.local',
        phone: '+233551234568',
        gender: 'Male',
        dateOfBirth: '1993-04-18',
        homeBranchId: accra!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'approved',
        systemRole: 'member',
      },
      {
        firstName: 'Priscilla',
        lastName: 'Owusu',
        email: 'priscilla.owusu@kairos.local',
        phone: '+233201234570',
        gender: 'Female',
        dateOfBirth: '1997-09-05',
        homeBranchId: accra!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'approved',
        systemRole: 'member',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@kairos.local',
        phone: '+447700000006',
        gender: 'Male',
        dateOfBirth: '1991-01-20',
        homeBranchId: manchester!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'approved',
        systemRole: 'member',
      },
      {
        firstName: 'Fatima',
        lastName: 'Kamara',
        email: 'fatima.kamara@kairos.local',
        phone: '+23276123457',
        gender: 'Female',
        dateOfBirth: '1994-06-28',
        homeBranchId: freetown!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'approved',
        systemRole: 'member',
      },
      // Pending approval member
      {
        firstName: 'New',
        lastName: 'Applicant',
        email: 'new.applicant@kairos.local',
        phone: '+447700000007',
        gender: 'Male',
        dateOfBirth: '2000-03-10',
        homeBranchId: london!.id,
        passwordHash: password,
        emailVerified: true,
        approvalStatus: 'pending',
        systemRole: 'member',
      },
      // Unverified email member
      {
        firstName: 'Unverified',
        lastName: 'User',
        email: 'unverified@kairos.local',
        phone: '+447700000008',
        gender: 'Female',
        dateOfBirth: '1999-11-11',
        homeBranchId: london!.id,
        passwordHash: password,
        emailVerified: false,
        approvalStatus: 'pending',
        systemRole: 'member',
      },
    ])
    .returning();
  console.log(`✓ 17 members (1 admin, 4 pastors, 2 leaders, 5 regular, 3 multi-branch, 1 pending, 1 unverified)`);  // alexJohnson, amaBoateng, abenaOsei

  // Minor (child) with a guardian link — exercises the under-16 data-protection
  // feature. Emma Thompson (regular London member) is the guardian; she sees the
  // full record via the guardian link, leaderSarah sees it via the Safeguarding
  // Lead role (assigned below), and any other London member gets a redacted view.
  // Children carry NOT-NULL email + passwordHash like any member shell, but are
  // typed 'child' and blocked from logging in (see auth/service.ts).
  const guardianEmma = regularMembers[0]!;
  const [childLily] = await db
    .insert(members)
    .values({
      firstName: 'Lily',
      lastName: 'Thompson',
      email: 'lily.thompson@temp.kairos.local',
      gender: 'Female',
      dateOfBirth: '2015-09-14', // ~10 years old → under 16
      homeBranchId: london!.id,
      guardianMemberId: guardianEmma.id,
      memberType: 'child',
      passwordHash: password,
      emailVerified: false,
      approvalStatus: 'approved',
      systemRole: 'member',
    })
    .returning();
  console.log(`✓ 1 minor (child) linked to a guardian`);

  // Minor with NO guardian — surfaces immediately on the safeguarding-review
  // page with a "No guardian" (guardianStatus 'none') flag.
  await db
    .insert(members)
    .values({
      firstName: 'Noah',
      lastName: 'Adeyemi',
      email: 'noah.adeyemi@temp.kairos.local',
      gender: 'Male',
      dateOfBirth: '2014-03-02', // ~11 → under 16
      homeBranchId: london!.id,
      guardianMemberId: null,
      memberType: 'child',
      passwordHash: password,
      emailVerified: false,
      approvalStatus: 'approved',
      systemRole: 'member',
    });
  console.log(`✓ 1 minor (child) with no guardian`);

  // Login-ready minor — verified + approved so a login attempt reaches the
  // minor-login block (rather than tripping the email-not-verified check first).
  // Use this account to demo that minors are refused at sign-in.
  await db
    .insert(members)
    .values({
      firstName: 'Maya',
      lastName: 'Bello',
      email: 'maya.bello@kairos.local',
      gender: 'Female',
      dateOfBirth: '2012-11-20', // ~13 → under 16
      homeBranchId: london!.id,
      guardianMemberId: guardianEmma.id,
      memberType: 'child',
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
    });
  console.log(`✓ 1 login-ready minor (for minor-login-block demo)`);

  // ── 4. Roles ────────────────────────────────────────────────
  const [
    worshipLeadRole,
    youthCoordRole,
    mediaTeamRole,
    welcomeTeamRole,
    safeguardingLeadRole,
    branchSystemAdminRole,
    branchDataAdminRole,
    fellowshipLeaderRole,
    departmentLeadRole,
    departmentDeputyRole,
    /* newBelieversMentorRole */,
    /* newBelieversTeacherRole */,
    membershipAdminRole,
  ] = await db
    .insert(roles)
    .values([
      { roleName: 'Worship Lead', description: 'Leads worship during services' },
      { roleName: 'Youth Coordinator', description: 'Coordinates youth programs and activities' },
      { roleName: 'Media Team', description: 'Handles audio/visual and online streaming' },
      { roleName: 'Welcome Team', description: 'Greets and assists visitors at services' },
      {
        roleName: 'Safeguarding Lead',
        description: 'Authorised to view and manage safeguarding and health records for minors',
      },
      {
        roleName: 'Branch System Admin',
        description: 'Branch-level RBAC and access management. Can assign or revoke roles within the branch.',
      },
      {
        roleName: 'Branch Data Admin',
        description: 'Branch-level data operations. Can edit branch settings and member data but not grant roles.',
      },
      {
        roleName: 'Fellowship Leader',
        description: 'Leads or co-leads a specific fellowship. Authority is scoped to that fellowship.',
      },
      {
        roleName: 'Department Lead',
        description: 'Leads a specific branch department. Authority is scoped to that department.',
      },
      {
        roleName: 'Department Deputy',
        description: 'Deputy of a specific branch department. Same write authority as the lead, scoped to that department.',
      },
      {
        roleName: 'New Believers Mentor',
        description: 'Mentors new believers in a branch. Authority is branch-scoped.',
      },
      {
        roleName: 'New Believers Teacher',
        description: 'Teaches new-believer sessions in a branch. Authority is branch-scoped.',
      },
      // The only CHURCH-scoped role. Membership cohorts run church-wide, so no
      // branch grant can describe authority over one — see migration 0048.
      {
        roleName: 'Membership Admin',
        description:
          'Runs the church-wide membership class: cohorts, sessions, the interest pool, admission, marking and graduation. Church-scoped, not branch-scoped.',
      },
    ])
    .returning();
  console.log(`✓ 13 roles`);

  // ── 4b. Global Departments (master catalogue) ───────────────
  const [
    choirDept,
    ushersDept,
    /* dramaDept */,
    hospitalityDept,
    hostDept,
    /* productionDept */, /* soundDept */, /* sanctuaryDept */,
    /* newBelieversDept */, /* welfareDept */, /* childrensDept */, /* designDept */, /* socialMediaDept */,
    adminDept,
  ] = await db.insert(departments).values([
    { departmentName: 'Choir', description: 'Vocal worship ministry', iconKey: 'music' },
    { departmentName: 'Ushers', description: 'Welcome, seating and order', iconKey: 'users' },
    { departmentName: 'Drama', description: 'Drama and stage performances', iconKey: 'theater' },
    { departmentName: 'Hospitality', description: 'Food, refreshments and guest care', iconKey: 'coffee' },
    { departmentName: 'Host Team', description: 'First-time guest hosts', iconKey: 'hand-wave' },
    { departmentName: 'Production', description: 'Stage production and lighting', iconKey: 'lightbulb' },
    { departmentName: 'Sound', description: 'Audio engineering and mixing', iconKey: 'headphones' },
    { departmentName: 'Sanctuary Keepers', description: 'Cleaning and sanctuary preparation', iconKey: 'sparkles' },
    { departmentName: 'New Believers', description: 'New convert care and discipleship', iconKey: 'heart' },
    { departmentName: 'Welfare', description: 'Pastoral care and benevolence', iconKey: 'hand-heart' },
    { departmentName: "Children's Ministry", description: 'Sunday school and kids ministry', iconKey: 'baby' },
    { departmentName: 'Design', description: 'Graphic design and print', iconKey: 'palette' },
    { departmentName: 'Social Media', description: 'Online presence and content', iconKey: 'share' },
    { departmentName: 'Admin', description: 'Branch operations: operational data, service-day registers, first-timer captures. Lead and deputy hold branch data admin authority.', iconKey: 'clipboard' },
  ]).returning();
  console.log(`✓ 14 global departments`);

  // ── 4c. Branch Departments (smoke seed: 4 active instances) ─
  const [choirLondon, ushersAccra, /* hospitalityLondon */, hostTeamLondon, adminLondon, /* adminManchester */, /* adminAccra */] = await db.insert(branchDepartments).values([
    {
      branchId: london!.id,
      departmentId: choirDept!.id,
      leadMemberId: leaderSarah!.id,
      description: 'London choir ministry under Sarah',
    },
    {
      branchId: accra!.id,
      departmentId: ushersDept!.id,
      leadMemberId: leaderDavid!.id,
      description: 'Accra usher team under David',
    },
    {
      // Empty dept — used to demo the member-side "Request to Join" flow.
      branchId: london!.id,
      departmentId: hospitalityDept!.id,
      leadMemberId: leaderSarah!.id,
      description: 'London hospitality team, currently recruiting.',
    },
    {
      // Used to demo the member-side "Accept / Decline Offer" flow (see seed below).
      branchId: london!.id,
      departmentId: hostDept!.id,
      leadMemberId: leaderSarah!.id,
      description: 'London first-time guest host team, interviewing applicants.',
    },
    {
      // London admin desk — members here can record service attendance.
      // Lead = Branch Data Admin for London (operational authority).
      // Pastor + system admin retain write access as a fallback per the Admin-dept gate.
      branchId: london!.id,
      departmentId: adminDept!.id,
      leadMemberId: leaderSarah!.id,
      description: 'London admin desk — service-day registers and first-timer captures.',
    },
    {
      // Manchester admin desk — lead = Branch Data Admin for Manchester.
      // Pastor Grace Mensah is the only seeded Manchester leader, so she doubles up here.
      branchId: manchester!.id,
      departmentId: adminDept!.id,
      leadMemberId: pastorManchester!.id,
      description: 'Manchester admin desk — service-day registers and first-timer captures.',
    },
    {
      // Accra admin desk — lead = Branch Data Admin for Accra.
      // David Appiah (leader) holds operational data admin authority here.
      branchId: accra!.id,
      departmentId: adminDept!.id,
      leadMemberId: leaderDavid!.id,
      description: 'Accra admin desk — service-day registers and first-timer captures.',
    },
  ]).returning();
  console.log(`✓ 7 branch-department instances`);

  // ── 4d. Department Members (smoke seed) ─────────────────────
  await db.insert(departmentMembers).values([
    { branchDepartmentId: choirLondon!.id, memberId: leaderSarah!.id },
    { branchDepartmentId: choirLondon!.id, memberId: regularMembers[0]!.id },
    { branchDepartmentId: choirLondon!.id, memberId: regularMembers[2]!.id },
    { branchDepartmentId: choirLondon!.id, memberId: pastorLondon!.id },
    { branchDepartmentId: ushersAccra!.id, memberId: leaderDavid!.id },
    { branchDepartmentId: ushersAccra!.id, memberId: regularMembers[1]!.id },
    // Admin-dept (London) — gives at least one non-pastor/non-admin caller write access.
    // Reuse regularMembers[2] so logging in as that account demos the desk flow.
    { branchDepartmentId: adminLondon!.id, memberId: regularMembers[2]!.id },
  ]);
  console.log(`✓ 7 department member assignments`);

  // ── 4e. Choir@London rich scenario ──────────────────────────
  // Demonstrates: join requests, followups (incl. overdue), uniform gallery + schedule,
  // rota template + slots + pool + generated instances + assignments + swap request.

  // Join requests (1 applied, 1 historic active, 1 rejected, 1 offered awaiting member response)
  await db.insert(departmentJoinRequests).values([
    {
      branchDepartmentId: choirLondon!.id,
      memberId: regularMembers[3]!.id, // John Smith (Manchester) — historic cross-branch interest
      status: 'applied',
      notes: 'I sing tenor and would love to join when visiting London.',
    },
    {
      branchDepartmentId: choirLondon!.id,
      memberId: regularMembers[0]!.id, // Emma — already in choir; this is the historic accepted request
      status: 'active',
      notes: 'Soprano, 5 years experience.',
      reviewedBy: leaderSarah!.id,
      reviewedAt: new Date('2025-09-12T10:00:00Z'),
      reviewNotes: 'Welcome to the choir!',
    },
    {
      branchDepartmentId: choirLondon!.id,
      memberId: regularMembers[4]!.id, // Fatima (Freetown)
      status: 'rejected',
      notes: 'Interested in remote participation.',
      reviewedBy: leaderSarah!.id,
      reviewedAt: new Date('2026-01-08T09:30:00Z'),
      reviewNotes: 'Choir requires in-person attendance for rehearsals.',
    },
    {
      // Demo: Emma has been interviewed and offered a spot on the Host Team.
      // Logging in as Emma surfaces this in "My Requests" with Accept/Decline buttons.
      branchDepartmentId: hostTeamLondon!.id,
      memberId: regularMembers[0]!.id,
      status: 'offered',
      notes: 'I would love to welcome first-time guests on Sundays.',
      interviewScheduledAt: new Date('2026-05-05T18:00:00Z'),
      interviewFormat: 'in_person',
      interviewLocation: 'London Central — Room 2',
      interviewerOneId: leaderSarah!.id,
      interviewOutcome: 'pass',
      interviewNotes: 'Warm, articulate, great fit for guest hosting.',
      offeredAt: new Date('2026-05-08T10:00:00Z'),
      offerExpiresAt: new Date('2026-05-22T23:59:59Z'),
      offerMessage: 'Welcome aboard! Please accept by May 22 to begin a 30-day probation.',
      probationDays: 30,
    },
  ]);
  console.log(`✓ 4 department join requests (incl. 1 offered awaiting Emma)`);

  // Followups (one current week, one prior month, one overdue >30 days, one never-followed-up via no entry)
  await db.insert(departmentFollowups).values([
    {
      branchDepartmentId: choirLondon!.id,
      memberId: regularMembers[0]!.id, // Emma — recent
      recordedById: leaderSarah!.id,
      assignedToId: leaderSarah!.id,
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
      durationMinutes: 15,
      notes: 'Discussed solo for Easter service. Confirmed.',
      contactedAt: new Date('2026-05-02T18:00:00Z'),
    },
    {
      branchDepartmentId: choirLondon!.id,
      memberId: regularMembers[2]!.id, // Priscilla — overdue
      recordedById: leaderSarah!.id,
      assignedToId: leaderSarah!.id,
      contactMethod: 'Email',
      contactStatus: 'No Response',
      notes: 'Sent rehearsal schedule, awaiting reply.',
      contactedAt: new Date('2026-03-20T12:00:00Z'),
      nextFollowUpDate: '2026-04-01',
    },
    {
      branchDepartmentId: choirLondon!.id,
      memberId: pastorLondon!.id, // Pastor — pastoral check-in
      recordedById: leaderSarah!.id,
      contactMethod: 'In-Person',
      contactStatus: 'Successful',
      durationMinutes: 30,
      notes: 'Discussed worship direction for Q2.',
      contactedAt: new Date('2026-04-28T19:30:00Z'),
    },
  ]);
  console.log(`✓ 3 department followups (Choir@London)`);

  // Uniform outfits (2 in gallery)
  // 1x1 transparent PNG placeholders so seed works without large blobs
  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen5QwAAAABJRU5ErkJggg==';
  const [robeOutfit, suitOutfit] = await db
    .insert(departmentUniformOutfits)
    .values([
      {
        branchDepartmentId: choirLondon!.id,
        name: 'Royal Purple Robes',
        imageUrl: tinyPng,
        genderTarget: 'Unisex',
        notes: 'Standard Sunday robes with gold trim.',
        uploadedById: leaderSarah!.id,
      },
      {
        branchDepartmentId: choirLondon!.id,
        name: 'Formal Black & White',
        imageUrl: tinyPng,
        genderTarget: 'Unisex',
        notes: 'For special services and concerts.',
        uploadedById: leaderSarah!.id,
      },
    ])
    .returning();
  console.log(`✓ 2 uniform outfits (Choir@London)`);

  // Uniform schedule (last Sunday + this Sunday + next Sunday)
  await db.insert(departmentUniformSchedule).values([
    {
      branchDepartmentId: choirLondon!.id,
      outfitId: robeOutfit!.id,
      serviceDate: '2026-05-03',
      assignedById: leaderSarah!.id,
    },
    {
      branchDepartmentId: choirLondon!.id,
      outfitId: suitOutfit!.id,
      serviceDate: '2026-05-10',
      notes: 'Mother\'s Day special service.',
      assignedById: leaderSarah!.id,
    },
    {
      branchDepartmentId: choirLondon!.id,
      outfitId: robeOutfit!.id,
      serviceDate: '2026-05-17',
      assignedById: leaderSarah!.id,
    },
  ]);
  console.log(`✓ 3 uniform schedule entries (Choir@London)`);

  // Rota template: Sunday Worship (weekday 0 = Sunday)
  const [sundayTemplate] = await db
    .insert(rotaTemplates)
    .values([
      {
        branchDepartmentId: choirLondon!.id,
        name: 'Sunday Worship',
        recurrence: 'Weekly',
        weekday: 0,
        defaultStartTime: '10:30:00',
        notes: 'Main Sunday morning service.',
      },
    ])
    .returning();
  console.log(`✓ 1 rota template (Choir@London)`);

  // Rota slots (3 roles)
  const [leadVocalSlot, sopranoSlot, tenorSlot] = await db
    .insert(rotaTemplateSlots)
    .values([
      { templateId: sundayTemplate!.id, roleName: 'Lead Vocal', positionsRequired: 1, sortOrder: 1 },
      { templateId: sundayTemplate!.id, roleName: 'Soprano', positionsRequired: 1, sortOrder: 2 },
      { templateId: sundayTemplate!.id, roleName: 'Tenor', positionsRequired: 1, sortOrder: 3 },
    ])
    .returning();
  console.log(`✓ 3 rota slots`);

  // Rota pool (4 members)
  await db.insert(rotaPoolMembers).values([
    {
      templateId: sundayTemplate!.id,
      memberId: leaderSarah!.id,
      preferredRoleName: 'Lead Vocal',
      lastScheduledAt: '2026-05-03',
    },
    {
      templateId: sundayTemplate!.id,
      memberId: regularMembers[0]!.id,
      preferredRoleName: 'Soprano',
      lastScheduledAt: '2026-04-26',
    },
    {
      templateId: sundayTemplate!.id,
      memberId: regularMembers[2]!.id,
      preferredRoleName: 'Soprano',
    },
    {
      templateId: sundayTemplate!.id,
      memberId: pastorLondon!.id,
      preferredRoleName: 'Tenor',
      lastScheduledAt: '2026-04-19',
    },
  ]);
  console.log(`✓ 4 rota pool members`);

  // Rota instances (this Sunday published, next Sunday draft)
  const [thisSundayInstance, nextSundayInstance] = await db
    .insert(rotaInstances)
    .values([
      {
        templateId: sundayTemplate!.id,
        branchDepartmentId: choirLondon!.id,
        serviceDate: '2026-05-10',
        startTime: '10:30:00',
        status: 'Published',
        publishedAt: new Date('2026-05-04T09:00:00Z'),
      },
      {
        templateId: sundayTemplate!.id,
        branchDepartmentId: choirLondon!.id,
        serviceDate: '2026-05-17',
        startTime: '10:30:00',
        status: 'Draft',
      },
    ])
    .returning();
  console.log(`✓ 2 rota instances`);

  // Assignments — published instance fully filled; draft instance partial
  const assignmentRows = await db
    .insert(rotaAssignments)
    .values([
      // This Sunday (Published)
      { instanceId: thisSundayInstance!.id, slotId: leadVocalSlot!.id, memberId: leaderSarah!.id, status: 'Confirmed' },
      { instanceId: thisSundayInstance!.id, slotId: sopranoSlot!.id, memberId: regularMembers[2]!.id, status: 'Assigned' },
      { instanceId: thisSundayInstance!.id, slotId: tenorSlot!.id, memberId: pastorLondon!.id, status: 'Assigned' },
      // Next Sunday (Draft) — soprano left open
      { instanceId: nextSundayInstance!.id, slotId: leadVocalSlot!.id, memberId: leaderSarah!.id, status: 'Assigned' },
      { instanceId: nextSundayInstance!.id, slotId: sopranoSlot!.id, memberId: null, status: 'Open' },
      { instanceId: nextSundayInstance!.id, slotId: tenorSlot!.id, memberId: pastorLondon!.id, status: 'Assigned' },
    ])
    .returning();
  console.log(`✓ 6 rota assignments`);

  // Pending swap request — Priscilla can't make this Sunday, proposes Emma
  const sopranoThisSundayAssignment = assignmentRows.find(
    (a) => a.instanceId === thisSundayInstance!.id && a.slotId === sopranoSlot!.id,
  );
  await db.insert(rotaSwapRequests).values([
    {
      assignmentId: sopranoThisSundayAssignment!.id,
      requestedById: regularMembers[2]!.id,
      proposedMemberId: regularMembers[0]!.id,
      reason: 'Travelling for work, can Emma cover?',
      status: 'pending',
    },
  ]);
  console.log(`✓ 1 pending swap request`);

  // ── 5. Member Roles ─────────────────────────────────────────
  await db.insert(memberRoles).values([
    { memberId: leaderSarah!.id, roleId: worshipLeadRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
    { memberId: regularMembers[0]!.id, roleId: welcomeTeamRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
    { memberId: leaderDavid!.id, roleId: youthCoordRole!.id, branchId: accra!.id, scopeKind: 'branch', scopeId: accra!.id },
    { memberId: regularMembers[1]!.id, roleId: mediaTeamRole!.id, branchId: accra!.id, scopeKind: 'branch', scopeId: accra!.id },
    // Safeguarding Lead in London — grants full access to London minors' records.
    { memberId: leaderSarah!.id, roleId: safeguardingLeadRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
  ]);
  console.log(`✓ 5 member-role assignments`);

  // ── 5a. Branch System Admin assignments ─────────────────────
  // Highest branch tier — can assign/revoke roles within their branch.
  // RBAC Phase 4: 'pastor' is now an honorific (display only). Branch admin
  // access is explicit — every pastor who needs branch authority gets a BSA
  // grant here so the dev demo continues to work post-cutover.
  await db.insert(memberRoles).values([
    { memberId: leaderSarah!.id, roleId: branchSystemAdminRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
    { memberId: pastorLondon!.id, roleId: branchSystemAdminRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
    { memberId: pastorManchester!.id, roleId: branchSystemAdminRole!.id, branchId: manchester!.id, scopeKind: 'branch', scopeId: manchester!.id },
    { memberId: pastorAccra!.id, roleId: branchSystemAdminRole!.id, branchId: accra!.id, scopeKind: 'branch', scopeId: accra!.id },
    { memberId: pastorKumasi!.id, roleId: branchSystemAdminRole!.id, branchId: kumasi!.id, scopeKind: 'branch', scopeId: kumasi!.id },
  ]);
  console.log(`✓ 5 branch system admin assignments`);

  // ── 5a-ii. Membership Admin (church-scoped) ─────────────────
  // The demo case the church scope exists for: someone who runs the
  // membership class across the whole church WITHOUT being a platform admin
  // or holding branch authority. Sarah is a branch leader in London, so we
  // use a plain member instead to prove the grant stands on its own.
  //
  // Church grants store the nil UUID in scope_id (the column is NOT NULL and
  // a church scope has no entity to point at) and the grantee's home branch
  // in branch_id, which is only a query handle. See migration 0048.
  await db.insert(memberRoles).values([
    {
      memberId: regularMembers[0]!.id,
      roleId: membershipAdminRole!.id,
      branchId: london!.id,
      scopeKind: 'church',
      // The nil UUID. Mirrors CHURCH_SCOPE_ID in @kairos/types, inlined
      // because this package sits below @kairos/types and must not import it.
      scopeId: '00000000-0000-0000-0000-000000000000',
    },
  ]);
  console.log(`✓ 1 membership admin assignment (church-scoped)`);

  // ── 5b. Minor health record ─────────────────────────────────
  // Health/safeguarding record for Lily (the seeded child). Visible only to
  // admin/pastor, her guardian (Emma), and London Safeguarding Leads (Sarah).
  await db.insert(memberHealthRecords).values({
    memberId: childLily!.id,
    branchId: london!.id,
    medicalConditions: 'Mild asthma',
    allergies: 'Peanuts, tree nuts',
    medications: 'Salbutamol inhaler (as needed)',
    dietaryNeeds: 'Nut-free meals only',
    additionalNotes: 'Carries a reliever inhaler in her bag; notify guardian for any reaction.',
    photoMediaConsent: true,
    medicalTreatmentConsent: true,
    dataProcessingConsent: false,
    consentRecordedBy: pastorLondon!.id,
    consentDate: '2026-01-15',
  });
  console.log(`✓ 1 minor health record`);

  // ── 5c. Service attendance (Sunday/Special services, present-only) ──
  // Present-only model: rows exist ONLY for attendees (Present/Late/Virtual);
  // absence is inferred. London has 5 active 'member'-type people (Daniel, James,
  // Sarah, Emma, Alex Johnson). We record some of them across 3 services so the
  // reports demo: trends (multiple weeks), first-time visitor, and missing-members
  // (Alex Johnson is never recorded → shows as missing).
  const serviceDaysAgo = (n: number, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const [svcLastSunday, svcPrevSunday, svcWatchnight] = await db
    .insert(services)
    .values([
      { branchId: london!.id, serviceDate: serviceDaysAgo(3), serviceType: 'Sunday', topic: 'Faith that moves mountains', preacherId: pastorLondon!.id, expectedAttendance: 120, createdBy: pastorLondon!.id },
      { branchId: london!.id, serviceDate: serviceDaysAgo(10), serviceType: 'Sunday', topic: 'The Good Shepherd', preacherId: pastorLondon!.id, expectedAttendance: 120, createdBy: pastorLondon!.id },
      { branchId: london!.id, serviceDate: serviceDaysAgo(17, 21), serviceType: 'Special', serviceTitle: 'Watchnight Service', topic: 'Crossing Over', preacherId: pastorLondon!.id, createdBy: pastorLondon!.id },
    ])
    .returning();

  // First-time visitor captured at the most recent Sunday — minted as a visitor shell.
  const [serviceVisitor] = await db
    .insert(members)
    .values({
      firstName: 'Grace',
      lastName: 'Newcomer',
      email: 'grace.newcomer@temp.kairos.local',
      homeBranchId: london!.id,
      memberType: 'visitor',
      passwordHash: password,
      emailVerified: false,
      approvalStatus: 'approved',
      systemRole: 'member',
    })
    .returning();

  await db.insert(serviceAttendance).values([
    // Last Sunday: Emma + Sarah present, Daniel virtual, James late, plus a first-time visitor. (Alex absent → inferred.)
    { serviceId: svcLastSunday!.id, memberId: regularMembers[0]!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
    { serviceId: svcLastSunday!.id, memberId: leaderSarah!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
    { serviceId: svcLastSunday!.id, memberId: admin!.id, attendanceStatus: 'Virtual', recordedBy: pastorLondon!.id },
    { serviceId: svcLastSunday!.id, memberId: pastorLondon!.id, attendanceStatus: 'Late', arrivalTime: serviceDaysAgo(3, 11), recordedBy: pastorLondon!.id },
    { serviceId: svcLastSunday!.id, memberId: serviceVisitor!.id, attendanceStatus: 'Present', isFirstTimeVisitor: true, recordedBy: pastorLondon!.id },
    // Previous Sunday: lighter turnout.
    { serviceId: svcPrevSunday!.id, memberId: regularMembers[0]!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
    { serviceId: svcPrevSunday!.id, memberId: admin!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
    // Watchnight (Special): Sarah + Emma.
    { serviceId: svcWatchnight!.id, memberId: leaderSarah!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
    { serviceId: svcWatchnight!.id, memberId: regularMembers[0]!.id, attendanceStatus: 'Present', recordedBy: pastorLondon!.id },
  ]);
  console.log(`✓ 3 services + 9 attendance records (1 first-time visitor)`);

  // ── 6. Branch Leadership ────────────────────────────────────
  await db.insert(branchLeadership).values([
    { branchId: london!.id, memberId: pastorLondon!.id, role: 'Main Pastor', isCurrent: true },
    { branchId: london!.id, memberId: leaderSarah!.id, role: 'Elder', isCurrent: true },
    { branchId: manchester!.id, memberId: pastorManchester!.id, role: 'Main Pastor', isCurrent: true },
    { branchId: accra!.id, memberId: pastorAccra!.id, role: 'Main Pastor', isCurrent: true },
    { branchId: accra!.id, memberId: leaderDavid!.id, role: 'Elder', isCurrent: true },
    { branchId: kumasi!.id, memberId: pastorKumasi!.id, role: 'Main Pastor', isCurrent: true },
  ]);
  console.log(`✓ 6 leadership assignments`);

  // ── 7. Fellowships ──────────────────────────────────────────
  const [kGroupLondon, expressLondon, kGroupAccra, newBreedsAccra, kGroupKumasi] = await db
    .insert(fellowships)
    .values([
      {
        fellowshipName: 'Grace K-Group',
        branchId: london!.id,
        fellowshipType: 'K-Groups',
        description: 'Wednesday evening small group Bible study',
        leaderId: leaderSarah!.id,
        meetingSchedule: 'Every Wednesday, 7:00 PM',
        meetingDay: 'Wednesday',
        meetingTime: '19:00',
        latitude: 51.4934,
        longitude: -0.0998,
        country: 'United Kingdom',
      },
      {
        fellowshipName: 'Kharis Express London',
        branchId: london!.id,
        fellowshipType: 'Kharis Express',
        description: 'Friday evening young professionals fellowship',
        leaderId: pastorLondon!.id,
        meetingSchedule: 'Every Friday, 6:30 PM',
        meetingDay: 'Friday',
        meetingTime: '18:30',
        latitude: 51.5074,
        longitude: -0.1278,
        country: 'United Kingdom',
      },
      {
        fellowshipName: 'Accra K-Group Alpha',
        branchId: accra!.id,
        fellowshipType: 'K-Groups',
        description: 'Thursday evening house fellowship',
        leaderId: leaderDavid!.id,
        meetingSchedule: 'Every Thursday, 6:00 PM',
        meetingDay: 'Thursday',
        meetingTime: '18:00',
        latitude: 5.6037,
        longitude: -0.1870,
        country: 'Ghana',
      },
      {
        fellowshipName: 'New Breeds Accra',
        branchId: accra!.id,
        fellowshipType: 'New Breeds',
        description: 'New members integration fellowship',
        leaderId: pastorAccra!.id,
        meetingSchedule: 'Every Saturday, 10:00 AM',
        meetingDay: 'Saturday',
        meetingTime: '10:00',
        latitude: 5.6145,
        longitude: -0.2053,
        country: 'Ghana',
      },
      {
        fellowshipName: 'Kumasi K-Group',
        branchId: kumasi!.id,
        fellowshipType: 'K-Groups',
        description: 'Tuesday evening small group fellowship',
        leaderId: pastorKumasi!.id,
        meetingSchedule: 'Every Tuesday, 6:30 PM',
        meetingDay: 'Tuesday',
        meetingTime: '18:30',
        latitude: 6.6885,
        longitude: -1.6244,
        country: 'Ghana',
      },
    ])
    .returning();
  console.log(`✓ 5 fellowships`);

  // ── 7a. RBAC Phase 3e: mirror leadership FKs into member_roles ──
  // Service-layer write-through (Phase 3c/3d) handles new fellowships and
  // branch_departments. The seed inserts these rows directly via db.insert
  // (not through the service), so it has to populate the matching grants
  // itself. After `resolveGrants` cuts over in Phase 3f, missing rows here
  // would mean missing capabilities at runtime — and tests would fail.
  await db.insert(memberRoles).values([
    // FellowshipLeader grants (one per leader/co-leader; only `leaderId` is
    // set in the seed today).
    { memberId: leaderSarah!.id, roleId: fellowshipLeaderRole!.id, branchId: london!.id, scopeKind: 'fellowship', scopeId: kGroupLondon!.id },
    { memberId: pastorLondon!.id, roleId: fellowshipLeaderRole!.id, branchId: london!.id, scopeKind: 'fellowship', scopeId: expressLondon!.id },
    { memberId: leaderDavid!.id, roleId: fellowshipLeaderRole!.id, branchId: accra!.id, scopeKind: 'fellowship', scopeId: kGroupAccra!.id },
    { memberId: pastorAccra!.id, roleId: fellowshipLeaderRole!.id, branchId: accra!.id, scopeKind: 'fellowship', scopeId: newBreedsAccra!.id },
    { memberId: pastorKumasi!.id, roleId: fellowshipLeaderRole!.id, branchId: kumasi!.id, scopeKind: 'fellowship', scopeId: kGroupKumasi!.id },
    // DepartmentLead grants (no deputies seeded today; lead-only).
    { memberId: leaderSarah!.id, roleId: departmentLeadRole!.id, branchId: london!.id, scopeKind: 'department', scopeId: choirLondon!.id },
    { memberId: leaderDavid!.id, roleId: departmentLeadRole!.id, branchId: accra!.id, scopeKind: 'department', scopeId: ushersAccra!.id },
    { memberId: leaderSarah!.id, roleId: departmentLeadRole!.id, branchId: london!.id, scopeKind: 'department', scopeId: hostTeamLondon!.id },
    { memberId: leaderSarah!.id, roleId: departmentLeadRole!.id, branchId: london!.id, scopeKind: 'department', scopeId: adminLondon!.id },
    // Branch Data Admin (derived from being the lead of the Admin dept).
    // London → Sarah, Manchester → Grace, Accra → David.
    { memberId: leaderSarah!.id, roleId: branchDataAdminRole!.id, branchId: london!.id, scopeKind: 'branch', scopeId: london!.id },
    { memberId: pastorManchester!.id, roleId: branchDataAdminRole!.id, branchId: manchester!.id, scopeKind: 'branch', scopeId: manchester!.id },
    { memberId: leaderDavid!.id, roleId: branchDataAdminRole!.id, branchId: accra!.id, scopeKind: 'branch', scopeId: accra!.id },
  ]);
  console.log(`✓ 12 RBAC grants (FellowshipLeader/DepartmentLead/BDA)`);

  // Department Deputy role is captured in the destructure for future seeds;
  // none are assigned today. Silence the unused variable warning.
  void departmentDeputyRole;

  // ── 8. Fellowship Members ───────────────────────────────────
  await db.insert(fellowshipMembers).values([
    { fellowshipId: kGroupLondon!.id, memberId: leaderSarah!.id },
    { fellowshipId: kGroupLondon!.id, memberId: regularMembers[0]!.id },
    { fellowshipId: kGroupLondon!.id, memberId: pastorLondon!.id },
    { fellowshipId: expressLondon!.id, memberId: regularMembers[0]!.id },
    { fellowshipId: expressLondon!.id, memberId: admin!.id },
    { fellowshipId: kGroupAccra!.id, memberId: leaderDavid!.id },
    { fellowshipId: kGroupAccra!.id, memberId: regularMembers[1]!.id },
    { fellowshipId: kGroupAccra!.id, memberId: regularMembers[2]!.id },
    { fellowshipId: newBreedsAccra!.id, memberId: regularMembers[2]!.id },
    { fellowshipId: kGroupKumasi!.id, memberId: pastorKumasi!.id },
    { fellowshipId: kGroupKumasi!.id, memberId: abenaOsei!.id },
    { fellowshipId: kGroupKumasi!.id, memberId: amaBoateng!.id },
  ]);
  console.log(`✓ 12 fellowship memberships`);

  // ── 9. Outreach Programs ────────────────────────────────────
  const [londonOutreach, manchesterOutreach, accraOutreach] = await db
    .insert(outreachPrograms)
    .values([
      {
        branchId: london!.id,
        programName: 'London Street Evangelism',
        programDate: '2025-03-15',
        location: 'Oxford Street',
        address: 'Oxford Street',
        city: 'London',
        description: 'Street evangelism and community outreach',
        coordinatorId: leaderSarah!.id,
        createdBy: pastorLondon!.id,
        totalSoulsReached: 15,
        isCompleted: true,
      },
      {
        branchId: manchester!.id,
        programName: 'Manchester Community Outreach',
        programDate: '2025-03-20',
        location: 'Piccadilly Gardens',
        address: 'Piccadilly Gardens',
        city: 'Manchester',
        description: 'Community outreach and prayer ministry',
        coordinatorId: pastorManchester!.id,
        createdBy: pastorManchester!.id,
        totalSoulsReached: 8,
        isCompleted: false,
      },
      {
        branchId: accra!.id,
        programName: 'Accra Market Evangelism',
        programDate: '2025-03-25',
        location: 'Makola Market',
        address: 'Makola Market',
        city: 'Accra',
        description: 'Market evangelism and soul winning',
        coordinatorId: leaderDavid!.id,
        createdBy: leaderDavid!.id,
        totalSoulsReached: 20,
        isCompleted: true,
      },
    ])
    .returning();
  console.log(`✓ 3 outreach programs`);

  // ── 10. Outreach Participants ───────────────────────────────
  await db.insert(outreachParticipants).values([
    // London program participants
    {
      outreachId: londonOutreach!.id,
      memberId: leaderSarah!.id,
      role: 'Coordinator',
    },
    {
      outreachId: londonOutreach!.id,
      memberId: regularMembers[0]!.id,
      role: 'Worker',
    },
    {
      outreachId: londonOutreach!.id,
      memberId: pastorLondon!.id,
      role: 'Supervisor',
    },
    // Manchester program participants
    {
      outreachId: manchesterOutreach!.id,
      memberId: pastorManchester!.id,
      role: 'Coordinator',
    },
    {
      outreachId: manchesterOutreach!.id,
      memberId: regularMembers[3]!.id,
      role: 'Worker',
    },
    // Accra program participants
    {
      outreachId: accraOutreach!.id,
      memberId: leaderDavid!.id,
      role: 'Coordinator',
    },
    {
      outreachId: accraOutreach!.id,
      memberId: regularMembers[1]!.id,
      role: 'Worker',
    },
    {
      outreachId: accraOutreach!.id,
      memberId: regularMembers[2]!.id,
      role: 'Worker',
    },
    {
      outreachId: accraOutreach!.id,
      memberId: pastorAccra!.id,
      role: 'Supervisor',
    },
  ]);
  console.log(`✓ 9 outreach participants`);

  // ── 11. Souls ───────────────────────────────────────────────
  const soulsData = await db
    .insert(souls)
    .values([
      // London souls
      {
        outreachId: londonOutreach!.id,
        firstName: 'John',
        lastName: 'Davies',
        phone: '+447700900001',
        email: 'john.davies@example.com',
        city: 'London',
        gender: 'Male',
        ageRange: '25-34',
        status: 'Following Up',
        assignedMemberId: leaderSarah!.id,
      },
      {
        outreachId: londonOutreach!.id,
        firstName: 'Mary',
        lastName: 'Wilson',
        phone: '+447700900002',
        city: 'London',
        gender: 'Female',
        ageRange: '35-44',
        status: 'Interested',
        assignedMemberId: leaderSarah!.id,
      },
      {
        outreachId: londonOutreach!.id,
        firstName: 'Peter',
        lastName: 'Brown',
        phone: '+447700900003',
        email: 'peter.brown@example.com',
        city: 'London',
        gender: 'Male',
        ageRange: '18-24',
        status: 'New',
        assignedMemberId: regularMembers[0]!.id,
      },
      // Manchester souls
      {
        outreachId: manchesterOutreach!.id,
        firstName: 'Sarah',
        lastName: 'Taylor',
        phone: '+447700900004',
        city: 'Manchester',
        gender: 'Female',
        ageRange: '25-34',
        status: 'New',
        assignedMemberId: regularMembers[3]!.id,
      },
      {
        outreachId: manchesterOutreach!.id,
        firstName: 'David',
        lastName: 'Anderson',
        phone: '+447700900005',
        email: 'david.anderson@example.com',
        city: 'Manchester',
        gender: 'Male',
        ageRange: '45-54',
        status: 'Following Up',
        assignedMemberId: pastorManchester!.id,
      },
      // Accra souls
      {
        outreachId: accraOutreach!.id,
        firstName: 'Ama',
        lastName: 'Mensah',
        phone: '+233201900001',
        city: 'Accra',
        gender: 'Female',
        ageRange: '25-34',
        status: 'Interested',
        assignedMemberId: leaderDavid!.id,
      },
      {
        outreachId: accraOutreach!.id,
        firstName: 'Kwame',
        lastName: 'Boateng',
        phone: '+233201900002',
        email: 'kwame.boateng@example.com',
        city: 'Accra',
        gender: 'Male',
        ageRange: '35-44',
        status: 'Following Up',
        assignedMemberId: leaderDavid!.id,
      },
      {
        outreachId: accraOutreach!.id,
        firstName: 'Akua',
        lastName: 'Owusu',
        phone: '+233201900003',
        city: 'Accra',
        gender: 'Female',
        ageRange: '18-24',
        status: 'New',
        assignedMemberId: regularMembers[1]!.id,
      },
    ])
    .returning();
  console.log(`✓ 8 souls`);

  // ── 12. Follow-ups ──────────────────────────────────────────
  await db.insert(followUps).values([
    {
      soulId: soulsData[0]!.id,
      memberId: leaderSarah!.id,
      followUpDate: new Date('2025-03-16T10:00:00'),
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
      durationMinutes: 15,
      notes: 'Had a good conversation, interested in attending service',
      nextFollowUpDate: '2025-03-23',
    },
    {
      soulId: soulsData[1]!.id,
      memberId: leaderSarah!.id,
      followUpDate: new Date('2025-03-17T14:00:00'),
      contactMethod: 'WhatsApp',
      contactStatus: 'Successful',
      durationMinutes: 10,
      notes: 'Sent service details and location',
    },
    {
      soulId: soulsData[4]!.id,
      memberId: pastorManchester!.id,
      followUpDate: new Date('2025-03-21T11:00:00'),
      contactMethod: 'Phone Call',
      contactStatus: 'No Answer',
      notes: 'Will try again tomorrow',
      nextFollowUpDate: '2025-03-22',
    },
    {
      soulId: soulsData[5]!.id,
      memberId: leaderDavid!.id,
      followUpDate: new Date('2025-03-26T09:00:00'),
      contactMethod: 'In-Person Visit',
      contactStatus: 'Successful',
      durationMinutes: 30,
      notes: 'Visited at home, prayed together, very receptive',
      nextFollowUpDate: '2025-04-02',
    },
    {
      soulId: soulsData[6]!.id,
      memberId: leaderDavid!.id,
      followUpDate: new Date('2025-03-27T16:00:00'),
      contactMethod: 'Phone Call',
      contactStatus: 'Successful',
      durationMinutes: 20,
      notes: 'Discussed baptism and membership',
    },
  ]);
  console.log(`✓ 5 follow-ups`);

  // ── 13. Consent, audit, notification history (visible on /profile/settings/*) ──
  // Testers landing in staging see non-empty history on the security + legal
  // settings pages instead of an empty state. Every seeded consent record is at
  // version '1.0' — matches the CONSENT_VERSION_* env defaults so the banner
  // stays quiet until you bump those.
  const consentSeedUsers = [
    admin!,
    pastorLondon!,
    pastorManchester!,
    leaderSarah!,
    leaderDavid!,
    regularMembers[0]!,
  ];
  await db.insert(consentRecords).values(
    consentSeedUsers.flatMap((m, i) =>
      (['terms', 'privacy', 'marketing'] as const).map((t) => ({
        memberId: m.id,
        consentType: t,
        version: '1.0',
        granted: true,
        grantedAt: new Date(Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000),
      })),
    ),
  );
  console.log(`✓ ${consentSeedUsers.length * 3} consent records (3 types × ${consentSeedUsers.length} users)`);

  const desktopUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const mobileUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  await db.insert(auditLog).values([
    ...consentSeedUsers.flatMap((m, i) => [
      {
        actorMemberId: m.id,
        action: 'signin_success',
        outcome: 'success',
        ip: '203.0.113.42',
        userAgent: desktopUA,
        country: 'GB',
        createdAt: new Date(Date.now() - (3 + i) * 24 * 60 * 60 * 1000),
      },
      {
        actorMemberId: m.id,
        action: 'signin_success',
        outcome: 'success',
        ip: '198.51.100.15',
        userAgent: mobileUA,
        country: 'GB',
        createdAt: new Date(Date.now() - (1 + i) * 24 * 60 * 60 * 1000),
      },
    ]),
    {
      actorMemberId: admin!.id,
      action: 'password_change',
      outcome: 'success',
      ip: '203.0.113.42',
      userAgent: desktopUA,
      country: 'GB',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    {
      actorMemberId: leaderSarah!.id,
      action: 'role_granted',
      outcome: 'success',
      targetType: 'member',
      targetId: leaderSarah!.id,
      metadata: { role: 'SafeguardingLead', scope: `branch:${london!.id}` },
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log(`✓ ${consentSeedUsers.length * 2 + 2} audit log entries`);

  await db.insert(notificationEvents).values([
    {
      memberId: admin!.id,
      category: 'workflow',
      eventType: 'workflow.fellowship_join_request_received',
      subjectType: 'fellowship_join_request',
      payload: { fellowshipName: 'Youth Fellowship', requesterName: 'A new member' },
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: admin!.id,
      category: 'lifecycle',
      eventType: 'lifecycle.visitor_promoted',
      payload: { memberName: 'Grace Newcomer', reason: '6 services in 90 days' },
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: pastorLondon!.id,
      category: 'workflow',
      eventType: 'workflow.fellowship_join_request_received',
      payload: { fellowshipName: 'Prayer Warriors' },
      sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: pastorLondon!.id,
      category: 'forms',
      eventType: 'forms.submission_received',
      payload: { formType: 'first_timer', submitterName: 'Anonymous visitor' },
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: leaderSarah!.id,
      category: 'rota',
      eventType: 'rota.assignment_confirmed',
      payload: { rotaName: 'Choir Sunday Service', slotDate: '2026-08-03' },
      sentAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: leaderSarah!.id,
      category: 'uniform',
      eventType: 'uniform.schedule_set',
      payload: { departmentName: 'Choir', outfitName: 'Summer whites' },
      sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
    {
      memberId: regularMembers[0]!.id,
      category: 'security',
      eventType: 'security.password_changed',
      payload: { changedAt: new Date().toISOString() },
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      memberId: regularMembers[0]!.id,
      category: 'workflow',
      eventType: 'workflow.fellowship_join_request_decided',
      payload: { fellowshipName: 'Youth Fellowship', outcome: 'approved' },
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      branchId: london!.id,
    },
  ]);
  console.log(`✓ 8 notification events (mixed categories, all sent)`);

  // ── 14. Realistic tester hydration ──────────────────────────
  // Extends the smoke seed so every module renders realistically on staging:
  // more members per branch, backfilled leadership, additional departments +
  // members + join requests + followups, uniforms, rota with historical +
  // upcoming instances, 8 weeks of Sunday services + attendance across the
  // 4 branches London didn't already cover, fellowship meetings + attendance +
  // join requests + followups, new-believer pipeline, and notification
  // preferences. Active-branch scoping honored throughout — every dept /
  // fellowship / rota / attendance row uses a member whose home branch matches
  // the parent row's branch.
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  // Sunday of relative week `offset` at 10:00 local time (0 = this week's Sunday).
  const sundayOffset = (offset: number): Date => {
    const now = new Date();
    const sun = new Date(now);
    sun.setDate(now.getDate() - now.getDay() + offset * 7);
    sun.setHours(10, 0, 0, 0);
    return sun;
  };

  // ── 14a. Extra members ──
  const extraMemberSpecs: Array<{ firstName: string; lastName: string; email: string; branchId: string; gender: 'Male' | 'Female'; dob: string; phone: string; honorific?: string }> = [
    { firstName: 'Chidera', lastName: 'Nnamani', email: 'chidera.nnamani@kairos.local', branchId: london!.id,     gender: 'Male',   dob: '1993-11-02', phone: '+447700000101' },
    { firstName: 'Ruth',    lastName: 'Adeleke', email: 'ruth.adeleke@kairos.local',    branchId: london!.id,     gender: 'Female', dob: '1997-04-19', phone: '+447700000102' },
    { firstName: 'Tobi',    lastName: 'Balogun', email: 'tobi.balogun@kairos.local',    branchId: london!.id,     gender: 'Male',   dob: '1985-09-30', phone: '+447700000103' },
    { firstName: 'Amina',   lastName: 'Bello',   email: 'amina.bello@kairos.local',     branchId: london!.id,     gender: 'Female', dob: '2001-02-06', phone: '+447700000104' },
    { firstName: 'Elijah',  lastName: 'Owoyele', email: 'elijah.owoyele@kairos.local',  branchId: manchester!.id, gender: 'Male',   dob: '1979-01-17', phone: '+447700000201' },
    { firstName: 'Hannah',  lastName: 'Peters',  email: 'hannah.peters@kairos.local',   branchId: manchester!.id, gender: 'Female', dob: '1994-06-24', phone: '+447700000202' },
    { firstName: 'Micah',   lastName: 'Odumosu', email: 'micah.odumosu@kairos.local',   branchId: manchester!.id, gender: 'Male',   dob: '1990-08-11', phone: '+447700000203' },
    { firstName: 'Deborah', lastName: 'Fashina', email: 'deborah.fashina@kairos.local', branchId: manchester!.id, gender: 'Female', dob: '1996-12-05', phone: '+447700000204' },
    { firstName: 'Isaac',   lastName: 'Ojewale', email: 'isaac.ojewale@kairos.local',   branchId: manchester!.id, gender: 'Male',   dob: '1988-03-22', phone: '+447700000205' },
    { firstName: 'Naomi',   lastName: 'Adebayo', email: 'naomi.adebayo@kairos.local',   branchId: manchester!.id, gender: 'Female', dob: '1999-07-14', phone: '+447700000206' },
    { firstName: 'Kojo',    lastName: 'Boateng', email: 'kojo.boateng@kairos.local',    branchId: accra!.id,      gender: 'Male',   dob: '1986-05-08', phone: '+233201234701' },
    { firstName: 'Efua',    lastName: 'Danquah', email: 'efua.danquah@kairos.local',    branchId: accra!.id,      gender: 'Female', dob: '1991-10-30', phone: '+233201234702' },
    { firstName: 'Kwesi',   lastName: 'Frimpong',email: 'kwesi.frimpong@kairos.local',  branchId: accra!.id,      gender: 'Male',   dob: '1995-02-14', phone: '+233201234703' },
    { firstName: 'Afia',    lastName: 'Sarpong', email: 'afia.sarpong@kairos.local',    branchId: accra!.id,      gender: 'Female', dob: '2000-11-11', phone: '+233201234704' },
    { firstName: 'Kofi',    lastName: 'Owusu',   email: 'kofi.owusu@kairos.local',      branchId: kumasi!.id,     gender: 'Male',   dob: '1984-04-01', phone: '+233551234701' },
    { firstName: 'Adjoa',   lastName: 'Antwi',   email: 'adjoa.antwi@kairos.local',     branchId: kumasi!.id,     gender: 'Female', dob: '1989-09-15', phone: '+233551234702' },
    { firstName: 'Kwabena', lastName: 'Osei',    email: 'kwabena.osei@kairos.local',    branchId: kumasi!.id,     gender: 'Male',   dob: '1992-01-27', phone: '+233551234703' },
    { firstName: 'Akosua',  lastName: 'Gyasi',   email: 'akosua.gyasi@kairos.local',    branchId: kumasi!.id,     gender: 'Female', dob: '1997-08-03', phone: '+233551234704' },
    { firstName: 'Nana',    lastName: 'Amoah',   email: 'nana.amoah@kairos.local',      branchId: kumasi!.id,     gender: 'Male',   dob: '1980-12-20', phone: '+233551234705' },
    { firstName: 'Sahr',    lastName: 'Koroma',  email: 'sahr.koroma@kairos.local',     branchId: freetown!.id,   gender: 'Male',   dob: '1983-07-05', phone: '+23276123501', honorific: 'Pastor' },
    { firstName: 'Adama',   lastName: 'Turay',   email: 'adama.turay@kairos.local',     branchId: freetown!.id,   gender: 'Female', dob: '1990-03-18', phone: '+23276123502' },
    { firstName: 'Foday',   lastName: 'Sesay',   email: 'foday.sesay@kairos.local',     branchId: freetown!.id,   gender: 'Male',   dob: '1986-10-12', phone: '+23276123503' },
    { firstName: 'Isatu',   lastName: 'Conteh',  email: 'isatu.conteh@kairos.local',    branchId: freetown!.id,   gender: 'Female', dob: '1993-05-29', phone: '+23276123504' },
    { firstName: 'Mohamed', lastName: 'Bangura', email: 'mohamed.bangura@kairos.local', branchId: freetown!.id,   gender: 'Male',   dob: '1995-11-22', phone: '+23276123505' },
  ];
  const extraMembers = await db.insert(members).values(
    extraMemberSpecs.map((s, i) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      gender: s.gender,
      dateOfBirth: s.dob,
      homeBranchId: s.branchId,
      passwordHash: password,
      emailVerified: true,
      approvalStatus: 'approved',
      systemRole: 'member',
      memberType: 'member',
      honorific: s.honorific,
      membershipDate: dateStr(daysAgo(400 + i * 20)),
      membershipClassCompletedAt: daysAgo(180 + i * 10),
    })),
  ).returning();
  const findExtra = (email: string) => extraMembers.find((m) => m.email === email)!;
  console.log(`✓ ${extraMembers.length} extra members (Manchester ${extraMemberSpecs.filter(s => s.branchId === manchester!.id).length}, Accra ${extraMemberSpecs.filter(s => s.branchId === accra!.id).length}, Kumasi ${extraMemberSpecs.filter(s => s.branchId === kumasi!.id).length}, Freetown ${extraMemberSpecs.filter(s => s.branchId === freetown!.id).length}, London ${extraMemberSpecs.filter(s => s.branchId === london!.id).length})`);

  // Branch-scoped adult pools (approved, verified, active-branch).
  const inBranch = (bId: string) => extraMembers.filter((m) => m.homeBranchId === bId);
  const londonAdults     = [admin!, pastorLondon!, leaderSarah!, regularMembers[0]!, ...inBranch(london!.id)];
  void londonAdults; // built for symmetry; London already covered by the smoke seed's services + attendance
  const manchesterAdults = [pastorManchester!, regularMembers[3]!, ...inBranch(manchester!.id)];
  const accraAdults      = [pastorAccra!, leaderDavid!, regularMembers[1]!, regularMembers[2]!, ...inBranch(accra!.id)];
  const kumasiAdults     = [pastorKumasi!, abenaOsei!, amaBoateng!, ...inBranch(kumasi!.id)];
  const freetownAdults   = [regularMembers[4]!, ...inBranch(freetown!.id)];

  // ── 14b. Branch leadership backfill ──
  const manchesterElder = findExtra('elijah.owoyele@kairos.local');
  const kumasiElder     = findExtra('nana.amoah@kairos.local');
  const freetownPastor  = findExtra('sahr.koroma@kairos.local');
  const freetownElder   = findExtra('foday.sesay@kairos.local');
  await db.insert(branchLeadership).values([
    { branchId: manchester!.id, memberId: manchesterElder.id, role: 'Elder',       startDate: '2023-01-15' },
    { branchId: kumasi!.id,     memberId: kumasiElder.id,     role: 'Elder',       startDate: '2022-06-01' },
    { branchId: freetown!.id,   memberId: freetownPastor.id,  role: 'Main Pastor', startDate: '2020-01-10' },
    { branchId: freetown!.id,   memberId: freetownElder.id,   role: 'Elder',       startDate: '2021-03-05' },
  ]);
  console.log(`✓ 4 leadership backfill entries`);

  // ── 15. Additional branch departments ──
  const allDepts = await db.select().from(departments);
  const deptByName = new Map(allDepts.map((d) => [d.departmentName, d]));
  const newBranchDeptSpecs = [
    { branch: manchester!, deptName: 'Choir',             lead: manchesterElder,                             description: 'Manchester choir under Elder Elijah.' },
    { branch: manchester!, deptName: 'Ushers',            lead: findExtra('hannah.peters@kairos.local'),     description: 'Manchester welcome and seating team.' },
    { branch: manchester!, deptName: 'Sanctuary Keepers', lead: findExtra('micah.odumosu@kairos.local'),     description: 'Manchester sanctuary care.' },
    { branch: accra!,      deptName: 'Choir',             lead: findExtra('kojo.boateng@kairos.local'),      description: 'Accra choir ministry.' },
    { branch: accra!,      deptName: 'Sound',             lead: findExtra('kwesi.frimpong@kairos.local'),    description: 'Accra sound engineering.' },
    // (accra, Admin) already created by the smoke seed above — do not re-add.
    { branch: kumasi!,     deptName: 'Choir',             lead: findExtra('kwabena.osei@kairos.local'),      description: 'Kumasi choir ministry.' },
    { branch: kumasi!,     deptName: 'Ushers',            lead: kumasiElder,                                 description: 'Kumasi ushers under Elder Nana.' },
    { branch: kumasi!,     deptName: 'Admin',             lead: findExtra('adjoa.antwi@kairos.local'),       description: 'Kumasi admin desk.' },
    { branch: freetown!,   deptName: 'Choir',             lead: findExtra('adama.turay@kairos.local'),       description: 'Freetown choir.' },
    { branch: freetown!,   deptName: 'Admin',             lead: freetownElder,                               description: 'Freetown admin desk.' },
  ];
  const newBranchDepts = await db.insert(branchDepartments).values(
    newBranchDeptSpecs.map((s) => ({
      branchId: s.branch.id,
      departmentId: deptByName.get(s.deptName)!.id,
      leadMemberId: s.lead.id,
      description: s.description,
    })),
  ).returning();
  console.log(`✓ ${newBranchDepts.length} additional branch departments`);

  // DepartmentLead grants for the new leads (so /profile/roles surfaces them).
  await db.insert(memberRoles).values(
    newBranchDepts.map((bd) => ({
      memberId: bd.leadMemberId!,
      roleId: departmentLeadRole!.id,
      branchId: bd.branchId,
      scopeKind: 'department',
      scopeId: bd.id,
    })),
  );
  console.log(`✓ ${newBranchDepts.length} DepartmentLead grants`);

  const findBd = (branchId: string, deptName: string) =>
    newBranchDepts.find((bd) => bd.branchId === branchId && bd.departmentId === deptByName.get(deptName)!.id)!;
  const choirManchester     = findBd(manchester!.id, 'Choir');
  const ushersManchester    = findBd(manchester!.id, 'Ushers');
  const sanctuaryManchester = findBd(manchester!.id, 'Sanctuary Keepers');
  const choirAccra          = findBd(accra!.id, 'Choir');
  const soundAccra          = findBd(accra!.id, 'Sound');
  const choirKumasi         = findBd(kumasi!.id, 'Choir');
  const ushersKumasi        = findBd(kumasi!.id, 'Ushers');
  const adminKumasi         = findBd(kumasi!.id, 'Admin');
  const choirFreetown       = findBd(freetown!.id, 'Choir');
  const adminFreetown       = findBd(freetown!.id, 'Admin');

  // ── 15a. Department members ── lead + up to 4 more from the same branch pool.
  const buildDmRows = (bd: { id: string }, lead: { id: string }, pool: Array<{ id: string }>, startDaysAgo: number) => {
    const list = [lead, ...pool.filter((m) => m.id !== lead.id)].slice(0, 5);
    return list.map((m, i) => ({
      branchDepartmentId: bd.id,
      memberId: m.id,
      joinDate: dateStr(daysAgo(startDaysAgo - i * 8)),
      membershipStatus: 'active' as const,
    }));
  };
  const dmRows = [
    ...buildDmRows(choirManchester,     manchesterElder,                             manchesterAdults, 90),
    ...buildDmRows(ushersManchester,    findExtra('hannah.peters@kairos.local'),     manchesterAdults, 75),
    ...buildDmRows(sanctuaryManchester, findExtra('micah.odumosu@kairos.local'),     manchesterAdults, 60),
    ...buildDmRows(choirAccra,          findExtra('kojo.boateng@kairos.local'),      accraAdults,      100),
    ...buildDmRows(soundAccra,          findExtra('kwesi.frimpong@kairos.local'),    accraAdults,      80),
    ...buildDmRows(choirKumasi,         findExtra('kwabena.osei@kairos.local'),      kumasiAdults,     90),
    ...buildDmRows(ushersKumasi,        kumasiElder,                                 kumasiAdults,     70),
    ...buildDmRows(adminKumasi,         findExtra('adjoa.antwi@kairos.local'),       kumasiAdults,     110),
    ...buildDmRows(choirFreetown,       findExtra('adama.turay@kairos.local'),       freetownAdults,   80),
    ...buildDmRows(adminFreetown,       freetownElder,                               freetownAdults,   130),
    // Extend existing ushersAccra with more members so its rota pool has depth.
    { branchDepartmentId: ushersAccra!.id, memberId: findExtra('efua.danquah@kairos.local').id,   joinDate: dateStr(daysAgo(72)), membershipStatus: 'active' as const },
    { branchDepartmentId: ushersAccra!.id, memberId: findExtra('kwesi.frimpong@kairos.local').id, joinDate: dateStr(daysAgo(65)), membershipStatus: 'active' as const },
  ];
  await db.insert(departmentMembers).values(dmRows);
  console.log(`✓ ${dmRows.length} additional department members`);

  // ── 15b. Join requests (mid-flight recruitment states) ──
  await db.insert(departmentJoinRequests).values([
    { branchDepartmentId: choirManchester.id, memberId: manchesterAdults[6]!.id, status: 'applied',              notes: 'Auditioning next Sunday' },
    { branchDepartmentId: choirManchester.id, memberId: manchesterAdults[7]!.id, status: 'offered',              notes: 'Offer sent',      offeredAt: daysAgo(2), offerExpiresAt: daysAhead(5), offerMessage: 'Come join us this Sunday.' },
    { branchDepartmentId: ushersKumasi.id,    memberId: kumasiAdults[6]!.id,     status: 'interview_scheduled',  notes: 'First interview', interviewScheduledAt: daysAhead(3), interviewFormat: 'in_person', interviewLocation: 'Kumasi meeting room' },
    { branchDepartmentId: choirAccra.id,      memberId: accraAdults[6]!.id,      status: 'rejected',             notes: 'Not yet a confirmed member', reviewedAt: daysAgo(10) },
  ]);

  // ── 15c. Followups (contact activity per dept) ──
  await db.insert(departmentFollowups).values([
    { branchDepartmentId: choirAccra.id,       memberId: accraAdults[3]!.id,      recordedById: findExtra('kojo.boateng@kairos.local').id,  contactedAt: daysAgo(7), contactMethod: 'Phone Call', contactStatus: 'Successful',  durationMinutes: 15, notes: 'Rehearsal reminder' },
    { branchDepartmentId: choirAccra.id,       memberId: accraAdults[4]!.id,      recordedById: findExtra('kojo.boateng@kairos.local').id,  contactedAt: daysAgo(3), contactMethod: 'WhatsApp',   contactStatus: 'Unreachable', notes: 'No response yet' },
    { branchDepartmentId: ushersManchester.id, memberId: manchesterAdults[3]!.id, recordedById: findExtra('hannah.peters@kairos.local').id, contactedAt: daysAgo(5), contactMethod: 'Phone Call', contactStatus: 'Successful',  durationMinutes: 8,  notes: 'Rota confirmation' },
    { branchDepartmentId: adminKumasi.id,      memberId: kumasiAdults[2]!.id,     recordedById: findExtra('adjoa.antwi@kairos.local').id,   contactedAt: daysAgo(1), contactMethod: 'In Person',  contactStatus: 'Successful',  durationMinutes: 20, notes: 'Audit prep review' },
  ]);
  console.log(`✓ 4 dept join requests + 4 dept followups`);

  // ── 16. Uniforms for 3 more departments ──
  // Colored SVG data URIs so the gallery renders visible swatches without any
  // network fetch (broken-image icons look bad in a demo).
  const swatch = (hex: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='${hex}'/></svg>`,
    )}`;
  const [ushersAccraOutfit, ushersKumasiOutfit, choirManchesterOutfit] = await db.insert(departmentUniformOutfits).values([
    { branchDepartmentId: ushersAccra!.id,     name: 'Sunday burgundy', imageUrl: swatch('#800020'), genderTarget: 'Unisex', notes: 'Full Sunday service dress', uploadedById: leaderDavid!.id },
    { branchDepartmentId: ushersKumasi.id,     name: 'Sunday navy',     imageUrl: swatch('#000080'), genderTarget: 'Unisex',                                     uploadedById: kumasiElder.id },
    { branchDepartmentId: choirManchester.id,  name: 'Blue robes',      imageUrl: swatch('#4169e1'), genderTarget: 'Unisex',                                     uploadedById: manchesterElder.id },
  ]).returning();
  await db.insert(departmentUniformSchedule).values([
    { branchDepartmentId: ushersAccra!.id,     outfitId: ushersAccraOutfit!.id,     serviceDate: dateStr(sundayOffset(0)), genderTarget: 'Unisex', assignedById: leaderDavid!.id },
    { branchDepartmentId: ushersAccra!.id,     outfitId: ushersAccraOutfit!.id,     serviceDate: dateStr(sundayOffset(1)), genderTarget: 'Unisex', assignedById: leaderDavid!.id },
    { branchDepartmentId: ushersKumasi.id,     outfitId: ushersKumasiOutfit!.id,    serviceDate: dateStr(sundayOffset(0)), genderTarget: 'Unisex', assignedById: kumasiElder.id },
    { branchDepartmentId: choirManchester.id,  outfitId: choirManchesterOutfit!.id, serviceDate: dateStr(sundayOffset(0)), genderTarget: 'Unisex', assignedById: manchesterElder.id },
    { branchDepartmentId: choirManchester.id,  outfitId: choirManchesterOutfit!.id, serviceDate: dateStr(sundayOffset(1)), genderTarget: 'Unisex', assignedById: manchesterElder.id },
  ]);
  console.log(`✓ 3 more uniforms + 5 schedule entries`);

  // ── 17. Rota expansion — 3 more templates + 6 weeks history + 2 upcoming ──
  const rotaExpansionSpecs = [
    { bd: choirManchester, name: 'Sunday choir rota',  startTime: '10:00:00', poolIds: dmRows.filter((r) => r.branchDepartmentId === choirManchester.id).map((r) => r.memberId),  slotDefs: [{ n: 'Lead singer', p: 1 }, { n: 'Backing', p: 2 }] },
    { bd: ushersAccra!,    name: 'Sunday ushers rota', startTime: '09:30:00', poolIds: dmRows.filter((r) => r.branchDepartmentId === ushersAccra!.id).map((r) => r.memberId).concat([leaderDavid!.id, regularMembers[1]!.id]),
      slotDefs: [{ n: 'Door usher', p: 2 }, { n: 'Seating usher', p: 2 }] },
    { bd: adminKumasi,     name: 'Sunday admin rota',  startTime: '10:00:00', poolIds: dmRows.filter((r) => r.branchDepartmentId === adminKumasi.id).map((r) => r.memberId),      slotDefs: [{ n: 'Register keeper', p: 1 }, { n: 'First-timer capture', p: 1 }] },
  ];
  const newTemplates = await db.insert(rotaTemplates).values(
    rotaExpansionSpecs.map((s) => ({
      branchDepartmentId: s.bd.id,
      name: s.name,
      recurrence: 'Weekly' as const,
      weekday: 0,
      defaultStartTime: s.startTime,
    })),
  ).returning();
  const newSlots = await db.insert(rotaTemplateSlots).values(
    rotaExpansionSpecs.flatMap((spec, tIdx) =>
      spec.slotDefs.map((sd, sortOrder) => ({
        templateId: newTemplates[tIdx]!.id,
        roleName: sd.n,
        positionsRequired: sd.p,
        sortOrder,
      })),
    ),
  ).returning();
  await db.insert(rotaPoolMembers).values(
    rotaExpansionSpecs.flatMap((spec, tIdx) =>
      // dedupe pool IDs — same member could appear twice via concat above
      Array.from(new Set(spec.poolIds)).map((mid) => ({
        templateId: newTemplates[tIdx]!.id,
        memberId: mid,
      })),
    ),
  );
  const newInstances = await db.insert(rotaInstances).values(
    newTemplates.flatMap((tmpl, tIdx) => {
      const spec = rotaExpansionSpecs[tIdx]!;
      const rows = [];
      for (let w = -6; w <= 1; w++) {
        rows.push({
          templateId: tmpl.id,
          branchDepartmentId: spec.bd.id,
          serviceDate: dateStr(sundayOffset(w)),
          startTime: spec.startTime,
          status: w < 0 ? 'Completed' : 'Published',
          publishedAt: daysAgo(Math.max(1, Math.abs(w) * 7 + 1)),
        });
      }
      return rows;
    }),
  ).returning();
  // Assignments: round-robin the pool across slot positions, skipping duplicate
  // (instance, member) — unique index would otherwise reject.
  const asnRows: Array<{ instanceId: string; slotId: string; memberId: string; status: string }> = [];
  for (const inst of newInstances) {
    const spec = rotaExpansionSpecs.find((s) => s.bd.id === inst.branchDepartmentId)!;
    const uniquePool = Array.from(new Set(spec.poolIds));
    const slotsForTmpl = newSlots.filter((s) => s.templateId === inst.templateId);
    let poolPos = newInstances.indexOf(inst); // rotate start per instance
    for (const slot of slotsForTmpl) {
      for (let p = 0; p < slot.positionsRequired; p++) {
        if (uniquePool.length === 0) break;
        let attempts = 0;
        while (attempts < uniquePool.length) {
          const mid = uniquePool[poolPos % uniquePool.length]!;
          poolPos++;
          attempts++;
          if (asnRows.some((r) => r.instanceId === inst.id && r.memberId === mid)) continue;
          asnRows.push({
            instanceId: inst.id,
            slotId: slot.id,
            memberId: mid,
            status: inst.status === 'Completed' ? 'Confirmed' : p === 0 ? 'Confirmed' : 'Assigned',
          });
          break;
        }
      }
    }
  }
  if (asnRows.length) await db.insert(rotaAssignments).values(asnRows);
  console.log(`✓ ${newTemplates.length} rota templates + ${newInstances.length} instances + ${asnRows.length} assignments`);

  // ── 18. Services + attendance for 4 branches × 8 Sundays ──
  // London already has 3 services from the smoke seed — skip to avoid the
  // (branchId, serviceDate, serviceType) unique index tripping.
  const otherBranchInfo = [
    { branch: manchester!, adults: manchesterAdults, recorder: pastorManchester!, preacher: pastorManchester! },
    { branch: accra!,      adults: accraAdults,      recorder: leaderDavid!,      preacher: pastorAccra!    },
    { branch: kumasi!,     adults: kumasiAdults,     recorder: pastorKumasi!,     preacher: pastorKumasi!   },
    { branch: freetown!,   adults: freetownAdults,   recorder: freetownPastor,    preacher: freetownPastor  },
  ];
  const topics = ['The living hope', 'Faith like a mustard seed', "God's covenant faithfulness", 'A living sacrifice'];
  const newServices = await db.insert(services).values(
    otherBranchInfo.flatMap((info) =>
      Array.from({ length: 8 }, (_, i) => {
        const w = i + 1;
        return {
          branchId: info.branch.id,
          serviceDate: sundayOffset(-w),
          serviceType: 'Sunday',
          serviceTitle: 'Sunday service',
          topic: topics[w % topics.length]!,
          preacherId: info.preacher.id,
          expectedAttendance: 40 + info.adults.length * 5,
          createdBy: info.recorder.id,
        };
      }),
    ),
  ).returning();
  // Attendance per service: keep ~75% turnout, but rotate WHICH members attend
  // each week so cohort compare has real divergence. Previously every service
  // used the same first-N adults, so "present in A but absent from B" always
  // returned 0 rows — /attendance/reports demos broke.
  const attendanceRows: Array<{ serviceId: string; memberId: string; attendanceStatus: string; arrivalTime: Date; recordedBy: string }> = [];
  const servicesByBranch = new Map<string, typeof newServices>();
  for (const svc of newServices) {
    const bucket = servicesByBranch.get(svc.branchId) ?? [];
    bucket.push(svc);
    servicesByBranch.set(svc.branchId, bucket);
  }
  for (const [branchId, branchServices] of servicesByBranch) {
    // Sort ascending by date so weekIdx=0 is the oldest, weekIdx=N-1 the most
    // recent — deterministic offsets across re-seeds.
    branchServices.sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime());
    const info = otherBranchInfo.find((b) => b.branch.id === branchId)!;
    const total = info.adults.length;
    const attendeeCount = Math.max(3, Math.min(total, Math.round(total * 0.75)));
    branchServices.forEach((svc, weekIdx) => {
      const offset = weekIdx % total;
      for (let i = 0; i < attendeeCount; i++) {
        const adultIdx = (offset + i) % total;
        attendanceRows.push({
          serviceId: svc.id,
          memberId: info.adults[adultIdx]!.id,
          attendanceStatus: i === attendeeCount - 1 && attendeeCount > 3 ? 'Late' : 'Present',
          arrivalTime: svc.serviceDate,
          recordedBy: info.recorder.id,
        });
      }
    });
  }
  await db.insert(serviceAttendance).values(attendanceRows);
  console.log(`✓ ${newServices.length} services + ${attendanceRows.length} attendance rows (4 branches × 8 Sundays)`);

  // ── 19. Fellowship expansion — meetings + attendance + join requests + followups ──
  // Grow existing fellowship rosters with a few extras so meeting attendance
  // has depth. `(fellowshipId, memberId, joinDate)` unique => distinct pairs.
  await db.insert(fellowshipMembers).values([
    { fellowshipId: kGroupLondon!.id,   memberId: findExtra('ruth.adeleke@kairos.local').id },
    { fellowshipId: kGroupLondon!.id,   memberId: findExtra('chidera.nnamani@kairos.local').id },
    { fellowshipId: expressLondon!.id,  memberId: findExtra('tobi.balogun@kairos.local').id },
    { fellowshipId: kGroupAccra!.id,    memberId: findExtra('kojo.boateng@kairos.local').id },
    { fellowshipId: kGroupAccra!.id,    memberId: findExtra('efua.danquah@kairos.local').id },
    { fellowshipId: newBreedsAccra!.id, memberId: findExtra('afia.sarpong@kairos.local').id },
    { fellowshipId: kGroupKumasi!.id,   memberId: findExtra('kofi.owusu@kairos.local').id },
    { fellowshipId: kGroupKumasi!.id,   memberId: findExtra('adjoa.antwi@kairos.local').id },
  ]);

  const fellowshipInfo = [
    { fellowship: kGroupLondon!,   day: 3, hour: 19, minute: 0,  location: "Sarah's home — SW London", leader: leaderSarah!,  pool: [leaderSarah!, regularMembers[0]!, pastorLondon!, findExtra('ruth.adeleke@kairos.local'), findExtra('chidera.nnamani@kairos.local')] },
    { fellowship: expressLondon!,  day: 5, hour: 18, minute: 30, location: 'Central London hub',       leader: pastorLondon!, pool: [regularMembers[0]!, admin!, findExtra('tobi.balogun@kairos.local')] },
    { fellowship: kGroupAccra!,    day: 4, hour: 18, minute: 0,  location: "David's home — Accra",     leader: leaderDavid!,  pool: [leaderDavid!, regularMembers[1]!, regularMembers[2]!, findExtra('kojo.boateng@kairos.local'), findExtra('efua.danquah@kairos.local')] },
    { fellowship: newBreedsAccra!, day: 6, hour: 10, minute: 0,  location: 'Accra youth centre',       leader: pastorAccra!,  pool: [regularMembers[2]!, findExtra('afia.sarpong@kairos.local')] },
    { fellowship: kGroupKumasi!,   day: 2, hour: 18, minute: 30, location: 'Kumasi meeting room',      leader: pastorKumasi!, pool: [pastorKumasi!, abenaOsei!, findExtra('kofi.owusu@kairos.local'), findExtra('adjoa.antwi@kairos.local')] },
  ];
  const meetingTopics = ['Prayer & fellowship', 'Bible study — Romans', 'Testimony night', 'Worship & word'];
  const newMeetings = await db.insert(fellowshipMeetings).values(
    fellowshipInfo.flatMap((info) =>
      Array.from({ length: 8 }, (_, i) => {
        const w = i + 1;
        const dt = new Date();
        dt.setDate(dt.getDate() - dt.getDay() + info.day - 7 * (w - 1));
        dt.setHours(info.hour, info.minute, 0, 0);
        return {
          fellowshipId: info.fellowship.id,
          meetingDate: dt,
          meetingTitle: `${info.fellowship.fellowshipName} — ${dateStr(dt)}`,
          meetingTopic: meetingTopics[w % meetingTopics.length]!,
          location: info.location,
          durationMinutes: 90,
          createdBy: info.leader.id,
        };
      }),
    ),
  ).returning();

  const fmaRows: Array<{ meetingId: string; memberId: string; attendanceStatus: string; recordedBy: string }> = [];
  for (const meeting of newMeetings) {
    const info = fellowshipInfo.find((i) => i.fellowship.id === meeting.fellowshipId)!;
    const attendeeCount = Math.max(2, Math.min(info.pool.length, Math.round(info.pool.length * 0.8)));
    for (let i = 0; i < attendeeCount; i++) {
      fmaRows.push({
        meetingId: meeting.id,
        memberId: info.pool[i]!.id,
        attendanceStatus: i === attendeeCount - 1 && attendeeCount > 2 ? 'Late' : 'Present',
        recordedBy: info.leader.id,
      });
    }
  }
  await db.insert(fellowshipMeetingAttendance).values(fmaRows);
  console.log(`✓ 8 fellowship-member expansions + ${newMeetings.length} meetings + ${fmaRows.length} meeting attendance rows`);

  await db.insert(fellowshipJoinRequests).values([
    { fellowshipId: kGroupLondon!.id,   memberId: findExtra('tobi.balogun@kairos.local').id,   status: 'pending',  notes: 'Wants to join K-Group as well' },
    { fellowshipId: expressLondon!.id,  memberId: findExtra('amina.bello@kairos.local').id,    status: 'approved', reviewedBy: pastorLondon!.id, reviewedAt: daysAgo(3) },
    { fellowshipId: kGroupAccra!.id,    memberId: findExtra('kwesi.frimpong@kairos.local').id, status: 'pending',  notes: 'Wants to join weekly study' },
    { fellowshipId: newBreedsAccra!.id, memberId: findExtra('efua.danquah@kairos.local').id,   status: 'rejected', reviewedBy: pastorAccra!.id,  reviewedAt: daysAgo(10), notes: 'Already committed to another fellowship' },
    { fellowshipId: kGroupKumasi!.id,   memberId: findExtra('akosua.gyasi@kairos.local').id,   status: 'pending' },
  ]);
  await db.insert(fellowshipFollowups).values([
    { fellowshipId: kGroupLondon!.id,   memberId: regularMembers[0]!.id,                   recordedById: leaderSarah!.id, contactedAt: daysAgo(5), contactMethod: 'Phone Call', contactStatus: 'Successful',  durationMinutes: 20, notes: 'Prayer request for family' },
    { fellowshipId: kGroupAccra!.id,    memberId: regularMembers[2]!.id,                   recordedById: leaderDavid!.id, contactedAt: daysAgo(2), contactMethod: 'WhatsApp',   contactStatus: 'Successful',                       notes: 'Sunday meet confirmed' },
    { fellowshipId: newBreedsAccra!.id, memberId: findExtra('afia.sarpong@kairos.local').id, recordedById: pastorAccra!.id, contactedAt: daysAgo(1), contactMethod: 'In Person',  contactStatus: 'Successful',  durationMinutes: 15 },
  ]);
  console.log(`✓ 5 fellowship join requests + 3 fellowship followups`);

  // ── 20. New Believers pipeline (spread across stages, all 5 branches) ──
  const nbSpecs = [
    { member: findExtra('amina.bello@kairos.local'),     branch: london!,     teacher: pastorLondon!,     mentor: leaderSarah!,    stage: 'session-2',  enrolledDaysAgo: 21 },
    { member: findExtra('ruth.adeleke@kairos.local'),    branch: london!,     teacher: pastorLondon!,     mentor: leaderSarah!,    stage: 'session-3',  enrolledDaysAgo: 35 },
    { member: findExtra('naomi.adebayo@kairos.local'),   branch: manchester!, teacher: pastorManchester!, mentor: manchesterElder, stage: 'session-1',  enrolledDaysAgo: 10 },
    { member: findExtra('deborah.fashina@kairos.local'), branch: manchester!, teacher: pastorManchester!, mentor: manchesterElder, stage: 'session-4',  enrolledDaysAgo: 42 },
    { member: findExtra('afia.sarpong@kairos.local'),    branch: accra!,      teacher: pastorAccra!,      mentor: leaderDavid!,    stage: 'completed',  enrolledDaysAgo: 60 },
    { member: findExtra('akosua.gyasi@kairos.local'),    branch: kumasi!,     teacher: pastorKumasi!,     mentor: kumasiElder,     stage: 'session-1',  enrolledDaysAgo: 7  },
    { member: findExtra('isatu.conteh@kairos.local'),    branch: freetown!,   teacher: freetownPastor,    mentor: freetownElder,   stage: 'session-2',  enrolledDaysAgo: 21 },
    { member: findExtra('mohamed.bangura@kairos.local'), branch: freetown!,   teacher: freetownPastor,    mentor: freetownElder,   stage: 'integrated', enrolledDaysAgo: 90 },
  ];
  const stageOrder = ['session-1', 'session-2', 'session-3', 'session-4', 'completed', 'integrated'];
  const newBelievers = await db.insert(newBelieverEnrollments).values(
    nbSpecs.map((s) => {
      const stageIdx = stageOrder.indexOf(s.stage);
      const sessionCompletedAt: Record<string, string> = {};
      for (let i = 0; i < stageIdx && i < 4; i++) {
        sessionCompletedAt[stageOrder[i]!] = daysAgo(s.enrolledDaysAgo - (i + 1) * 7).toISOString();
      }
      return {
        memberId: s.member.id,
        branchId: s.branch.id,
        teacherId: s.teacher.id,
        mentorId: s.mentor.id,
        stage: s.stage,
        enrolledAt: daysAgo(s.enrolledDaysAgo),
        completedAt: s.stage === 'completed' || s.stage === 'integrated' ? daysAgo(Math.max(1, s.enrolledDaysAgo - 28)) : null,
        sessionCompletedAt: Object.keys(sessionCompletedAt).length ? sessionCompletedAt : null,
      };
    }),
  ).returning();
  await db.insert(mentorFollowups).values([
    { enrollmentId: newBelievers[0]!.id, mentorMemberId: leaderSarah!.id,    note: 'Great session — reading through Genesis this week', contactedAt: daysAgo(6) },
    { enrollmentId: newBelievers[0]!.id, mentorMemberId: leaderSarah!.id,    note: 'Confirmed for Sunday class',                        contactedAt: daysAgo(1) },
    { enrollmentId: newBelievers[3]!.id, mentorMemberId: manchesterElder.id, note: 'Ready for baptism conversation',                    contactedAt: daysAgo(3) },
    { enrollmentId: newBelievers[4]!.id, mentorMemberId: leaderDavid!.id,    note: 'Encouraged to join Ushers',                         contactedAt: daysAgo(5) },
  ]);

  // NB sessions (one recent per branch) + attendance for currently-enrolled students at or beyond that stage.
  const nbSessions = await db.insert(newBelieverSessions).values([
    { branchId: london!.id,     teacherId: pastorLondon!.id,     sessionStage: 'session-2', sessionDate: daysAgo(3),  topic: 'Foundations — session 2', location: 'London teaching room',    createdBy: pastorLondon!.id },
    { branchId: manchester!.id, teacherId: pastorManchester!.id, sessionStage: 'session-1', sessionDate: daysAgo(2),  topic: 'Welcome — session 1',    location: 'Manchester teaching room', createdBy: pastorManchester!.id },
    { branchId: accra!.id,      teacherId: pastorAccra!.id,      sessionStage: 'session-4', sessionDate: daysAgo(5),  topic: 'Finishing well',          location: 'Accra teaching room',     createdBy: pastorAccra!.id },
    { branchId: kumasi!.id,     teacherId: pastorKumasi!.id,     sessionStage: 'session-1', sessionDate: daysAgo(1),  topic: 'Welcome — session 1',    location: 'Kumasi teaching room',    createdBy: pastorKumasi!.id },
    { branchId: freetown!.id,   teacherId: freetownPastor.id,    sessionStage: 'session-2', sessionDate: daysAgo(4),  topic: 'Foundations',             location: 'Freetown teaching room',  createdBy: freetownPastor.id },
  ]).returning();
  const nbAttendanceRows: Array<{ sessionId: string; enrollmentId: string; attended: boolean; recordedBy: string }> = [];
  for (const session of nbSessions) {
    const sIdx = stageOrder.indexOf(session.sessionStage);
    for (const enrollment of newBelievers) {
      if (enrollment.branchId !== session.branchId) continue;
      const eIdx = stageOrder.indexOf(enrollment.stage);
      if (eIdx >= sIdx) {
        nbAttendanceRows.push({
          sessionId: session.id,
          enrollmentId: enrollment.id,
          attended: true,
          recordedBy: session.teacherId!,
        });
      }
    }
  }
  if (nbAttendanceRows.length) await db.insert(newBelieverAttendance).values(nbAttendanceRows);
  console.log(`✓ ${newBelievers.length} new-believer enrollments + 4 mentor followups + ${nbSessions.length} NB sessions + ${nbAttendanceRows.length} NB attendance rows`);

  // ── 21. Notification-preference overrides (a couple per lens) ──
  await db.insert(notificationPreferences).values([
    { memberId: admin!.id,             category: 'uniform',   enabled: false, cadence: 'immediate' },
    { memberId: pastorLondon!.id,      category: 'forms',     enabled: true,  cadence: 'digest_daily' },
    { memberId: leaderSarah!.id,       category: 'rota',      enabled: true,  cadence: 'immediate' },
    { memberId: regularMembers[0]!.id, category: 'lifecycle', enabled: false, cadence: 'immediate' },
  ]);
  console.log(`✓ 4 notification-preference overrides`);

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts (all passwords: "Password1!"):');
  console.log('  Admin:   admin@kairos.local');
  console.log('  Pastor:  james.okonkwo@kairos.local  (London)');
  console.log('  Pastor:  grace.mensah@kairos.local    (Manchester)');
  console.log('  Pastor:  kwame.asante@kairos.local    (Accra)');
  console.log('  Leader:  sarah.williams@kairos.local  (London)');
  console.log('  Leader:  david.appiah@kairos.local    (Accra)');
  console.log('  Member:  emma.thompson@kairos.local   (London)');
  console.log('  Member:  alex.johnson@kairos.local    (home=London, secondary=Manchester, isAtSecondaryBranch=false)');
  console.log('  Member:  ama.boateng@kairos.local     (home=Accra, secondary=Kumasi,     isAtSecondaryBranch=true)');
  console.log('  Pastor:  yaw.kwarteng@kairos.local    (Kumasi)');
  console.log('  Pending: new.applicant@kairos.local   (London)');
  console.log('  Unverified: unverified@kairos.local   (London)');
  console.log('');
  console.log('Under-16 data-protection demo (3 London minors):');
  console.log('  • Lily Thompson  — child, guardian = Emma Thompson, has a health record.');
  console.log('      emma.thompson@kairos.local   (guardian)        → full record + health');
  console.log('      sarah.williams@kairos.local  (Safeguarding Lead) → full record + health');
  console.log('      any other London member                        → REDACTED (name only)');
  console.log('  • Noah Adeyemi   — child, NO guardian → shows "No guardian" on /members/safeguarding.');
  console.log('  • Maya Bello     — child, verified+approved → demos the minor-login block:');
  console.log('      try logging in as maya.bello@kairos.local → refused ("belongs to a minor").');
  console.log('  • Deactivate Emma to make Lily show as "Guardian inactive" on the review page.');
  console.log('');
  console.log('Service attendance demo (London, 3 services):');
  console.log('  • 2 Sundays + 1 Watchnight (Special). Present/Late/Virtual recorded; absence inferred.');
  console.log('  • Grace Newcomer is a first-time visitor (visitor shell) at the last Sunday.');
  console.log('  • Alex Johnson is never recorded → appears under Reports → missing members.');
  console.log('  • As admin/pastor the create-service form lets you pick any branch.');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
