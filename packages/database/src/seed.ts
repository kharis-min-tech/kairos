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
  branchLeadership,
  fellowships,
  fellowshipMembers,
  outreachPrograms,
  outreachParticipants,
  souls,
  followUps,
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
  await db.execute(sql`TRUNCATE regions, roles CASCADE`);
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

  // ── 4. Roles ────────────────────────────────────────────────
  const [worshipLeadRole, youthCoordRole, mediaTeamRole, welcomeTeamRole] = await db
    .insert(roles)
    .values([
      { roleName: 'Worship Lead', description: 'Leads worship during services' },
      { roleName: 'Youth Coordinator', description: 'Coordinates youth programs and activities' },
      { roleName: 'Media Team', description: 'Handles audio/visual and online streaming' },
      { roleName: 'Welcome Team', description: 'Greets and assists visitors at services' },
    ])
    .returning();
  console.log(`✓ 4 roles`);

  // ── 5. Member Roles ─────────────────────────────────────────
  await db.insert(memberRoles).values([
    { memberId: leaderSarah!.id, roleId: worshipLeadRole!.id, branchId: london!.id },
    { memberId: regularMembers[0]!.id, roleId: welcomeTeamRole!.id, branchId: london!.id },
    { memberId: leaderDavid!.id, roleId: youthCoordRole!.id, branchId: accra!.id },
    { memberId: regularMembers[1]!.id, roleId: mediaTeamRole!.id, branchId: accra!.id },
  ]);
  console.log(`✓ 4 member-role assignments`);

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
      },
      {
        fellowshipName: 'Kharis Express London',
        branchId: london!.id,
        fellowshipType: 'Kharis Express',
        description: 'Friday evening young professionals fellowship',
        leaderId: pastorLondon!.id,
        meetingSchedule: 'Every Friday, 6:30 PM',
      },
      {
        fellowshipName: 'Accra K-Group Alpha',
        branchId: accra!.id,
        fellowshipType: 'K-Groups',
        description: 'Thursday evening house fellowship',
        leaderId: leaderDavid!.id,
        meetingSchedule: 'Every Thursday, 6:00 PM',
      },
      {
        fellowshipName: 'New Breeds Accra',
        branchId: accra!.id,
        fellowshipType: 'New Breeds',
        description: 'New members integration fellowship',
        leaderId: pastorAccra!.id,
        meetingSchedule: 'Every Saturday, 10:00 AM',
      },
      {
        fellowshipName: 'Kumasi K-Group',
        branchId: kumasi!.id,
        fellowshipType: 'K-Groups',
        description: 'Tuesday evening small group fellowship',
        leaderId: pastorKumasi!.id,
        meetingSchedule: 'Every Tuesday, 6:30 PM',
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

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
