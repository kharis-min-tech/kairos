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
} from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function seed() {
  const db = createDb(DATABASE_URL);
  const password = await bcrypt.hash('Password1!', 10);

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
      systemRole: 'pastor',
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
      systemRole: 'pastor',
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
      systemRole: 'pastor',
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
      systemRole: 'pastor',
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
      systemRole: 'leader',
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
      systemRole: 'leader',
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

  // ── 4. Roles ────────────────────────────────────────────────
  const [worshipLeadRole, youthCoordRole, mediaTeamRole, welcomeTeamRole, safeguardingLeadRole] = await db
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
    ])
    .returning();
  console.log(`✓ 5 roles`);

  // ── 4b. Global Departments (master catalogue) ───────────────
  const [
    choirDept,
    ushersDept,
    /* dramaDept */,
    hospitalityDept,
    hostDept,
    /* productionDept */, /* soundDept */, /* sanctuaryDept */,
    /* newBelieversDept */, /* welfareDept */, /* childrensDept */, /* designDept */, /* socialMediaDept */,
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
  ]).returning();
  console.log(`✓ 13 global departments`);

  // ── 4c. Branch Departments (smoke seed: 4 active instances) ─
  const [choirLondon, ushersAccra, /* hospitalityLondon */, hostTeamLondon] = await db.insert(branchDepartments).values([
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
      description: 'London hospitality team — currently recruiting.',
    },
    {
      // Used to demo the member-side "Accept / Decline Offer" flow (see seed below).
      branchId: london!.id,
      departmentId: hostDept!.id,
      leadMemberId: leaderSarah!.id,
      description: 'London first-time guest host team — interviewing applicants.',
    },
  ]).returning();
  console.log(`✓ 4 branch-department instances`);

  // ── 4d. Department Members (smoke seed) ─────────────────────
  await db.insert(departmentMembers).values([
    { branchDepartmentId: choirLondon!.id, memberId: leaderSarah!.id },
    { branchDepartmentId: choirLondon!.id, memberId: regularMembers[0]!.id },
    { branchDepartmentId: choirLondon!.id, memberId: regularMembers[2]!.id },
    { branchDepartmentId: choirLondon!.id, memberId: pastorLondon!.id },
    { branchDepartmentId: ushersAccra!.id, memberId: leaderDavid!.id },
    { branchDepartmentId: ushersAccra!.id, memberId: regularMembers[1]!.id },
  ]);
  console.log(`✓ 6 department member assignments`);

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
    { memberId: leaderSarah!.id, roleId: worshipLeadRole!.id, branchId: london!.id },
    { memberId: regularMembers[0]!.id, roleId: welcomeTeamRole!.id, branchId: london!.id },
    { memberId: leaderDavid!.id, roleId: youthCoordRole!.id, branchId: accra!.id },
    { memberId: regularMembers[1]!.id, roleId: mediaTeamRole!.id, branchId: accra!.id },
    // Safeguarding Lead in London — grants full access to London minors' records.
    { memberId: leaderSarah!.id, roleId: safeguardingLeadRole!.id, branchId: london!.id },
  ]);
  console.log(`✓ 5 member-role assignments`);

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
  console.log('Under-16 data-protection demo (minor: Lily Thompson, London):');
  console.log('  • Lily is memberType "child" — she has NO login (login is blocked for minors).');
  console.log('  • emma.thompson@kairos.local — guardian → sees Lily\'s full record + health.');
  console.log('  • sarah.williams@kairos.local — Safeguarding Lead (London) → sees full record + health.');
  console.log('  • Any other London member → sees Lily REDACTED (name only, no DOB/contact/health).');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
