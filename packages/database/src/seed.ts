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
  const [london, manchester, accra, _kumasi, freetown] = await db
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
  console.log(`✓ 13 members (1 admin, 3 pastors, 2 leaders, 5 regular, 1 pending, 1 unverified)`);

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
  ]);
  console.log(`✓ 5 leadership assignments`);

  // ── 7. Fellowships ──────────────────────────────────────────
  const [kGroupLondon, expressLondon, kGroupAccra, newBreedsAccra] = await db
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
    ])
    .returning();
  console.log(`✓ 4 fellowships`);

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
  ]);
  console.log(`✓ 9 fellowship memberships`);

  console.log('\n✅ Seed complete!\n');
  console.log('Test accounts (all passwords: "Password1!"):');
  console.log('  Admin:   admin@kairos.local');
  console.log('  Pastor:  james.okonkwo@kairos.local  (London)');
  console.log('  Pastor:  grace.mensah@kairos.local    (Manchester)');
  console.log('  Pastor:  kwame.asante@kairos.local    (Accra)');
  console.log('  Leader:  sarah.williams@kairos.local  (London)');
  console.log('  Leader:  david.appiah@kairos.local    (Accra)');
  console.log('  Member:  emma.thompson@kairos.local   (London)');
  console.log('  Pending: new.applicant@kairos.local   (London)');
  console.log('  Unverified: unverified@kairos.local   (London)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
