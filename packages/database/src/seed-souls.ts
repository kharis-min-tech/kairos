import { config } from 'dotenv';
import { resolve } from 'path';
import { createDb } from './index';
import { souls, followUps, members, outreachPrograms, branches } from './schema';
import { eq } from 'drizzle-orm';

// Load .env from root directory
config({ path: resolve(process.cwd(), '../../.env') });

let databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('DATABASE_URL not found in ../../.env. Trying root .env file...');
  config({ path: resolve(process.cwd(), '.env') });
  databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required. Please ensure .env file exists in root directory.');
  }
}

const db = createDb(databaseUrl);

async function seedSoulsData() {
  console.log('🌱 Seeding souls and follow-up data...');

  try {
    // Get existing branches
    const existingBranches = await db.select().from(branches).limit(1);
    if (existingBranches.length === 0) {
      console.error('❌ No branches found. Please seed branches first.');
      return;
    }
    const branchId = existingBranches[0].id;

    // Get existing members
    const existingMembers = await db.select().from(members).where(eq(members.isActive, true)).limit(5);
    if (existingMembers.length === 0) {
      console.error('❌ No members found. Please seed members first.');
      return;
    }

    // Create an outreach program
    const [outreachProgram] = await db
      .insert(outreachPrograms)
      .values({
        branchId,
        programName: 'Community Outreach 2024',
        programDate: '2024-01-15', // date field expects string
        location: 'Community Center',
        address: '123 Main Street',
        city: 'Metro City',
        description: 'Community outreach program for soul winning',
        coordinatorId: existingMembers[0].id,
        coordinatorName: `${existingMembers[0].firstName} ${existingMembers[0].lastName}`,
        createdBy: existingMembers[0].id,
        totalSoulsReached: 0,
        isCompleted: false,
        isOpenToAllBranches: false,
      })
      .returning()
      .onConflictDoNothing();

    if (!outreachProgram) {
      console.log('⚠️  Outreach program already exists, using existing data');
    }

    // Sample souls data with various statuses and contact patterns
    const soulsSeedData = [
      // CRITICAL (RED) - No follow-up
      { firstName: 'John', lastName: 'Smith', phone: '+1234567890', email: 'john.smith@email.com', status: 'New', daysAgo: 5, hasFollowUp: false },
      { firstName: 'Mary', lastName: 'Johnson', phone: '+1234567891', email: 'mary.j@email.com', status: 'Following Up', daysAgo: 4, hasFollowUp: false },
      { firstName: 'David', lastName: 'Williams', phone: '+1234567892', email: 'david.w@email.com', status: 'Interested', daysAgo: 6, hasFollowUp: false },
      
      // CRITICAL (RED) - Old follow-ups
      { firstName: 'Sarah', lastName: 'Brown', phone: '+1234567893', email: 'sarah.b@email.com', status: 'New', daysAgo: 3, hasFollowUp: true, lastFollowUpDays: 4 },
      { firstName: 'Michael', lastName: 'Davis', phone: '+1234567894', email: 'michael.d@email.com', status: 'Following Up', daysAgo: 5, hasFollowUp: true, lastFollowUpDays: 5 },
      { firstName: 'Jennifer', lastName: 'Miller', phone: '+1234567895', email: 'jennifer.m@email.com', status: 'Interested', daysAgo: 7, hasFollowUp: true, lastFollowUpDays: 6 },
      { firstName: 'Robert', lastName: 'Wilson', phone: '+1234567896', email: 'robert.w@email.com', status: 'New', daysAgo: 4, hasFollowUp: true, lastFollowUpDays: 3 },
      { firstName: 'Lisa', lastName: 'Moore', phone: '+1234567897', email: 'lisa.m@email.com', status: 'Following Up', daysAgo: 6, hasFollowUp: true, lastFollowUpDays: 4 },
      
      // AMBER (MONITOR) - 2 days for New/Following Up
      { firstName: 'James', lastName: 'Taylor', phone: '+1234567898', email: 'james.t@email.com', status: 'New', daysAgo: 2, hasFollowUp: true, lastFollowUpDays: 2 },
      { firstName: 'Patricia', lastName: 'Anderson', phone: '+1234567899', email: 'patricia.a@email.com', status: 'Following Up', daysAgo: 2, hasFollowUp: true, lastFollowUpDays: 2 },
      
      // AMBER (MONITOR) - 3-4 days for Interested
      { firstName: 'Christopher', lastName: 'Thomas', phone: '+1234567800', email: 'chris.t@email.com', status: 'Interested', daysAgo: 3, hasFollowUp: true, lastFollowUpDays: 3 },
      { firstName: 'Nancy', lastName: 'Jackson', phone: '+1234567801', email: 'nancy.j@email.com', status: 'Interested', daysAgo: 4, hasFollowUp: true, lastFollowUpDays: 4 },
      { firstName: 'Daniel', lastName: 'White', phone: '+1234567802', email: 'daniel.w@email.com', status: 'Interested', daysAgo: 3, hasFollowUp: true, lastFollowUpDays: 3 },
      
      // GREEN (ALL GOOD) - Recent contact
      { firstName: 'Karen', lastName: 'Harris', phone: '+1234567803', email: 'karen.h@email.com', status: 'New', daysAgo: 1, hasFollowUp: true, lastFollowUpDays: 1 },
      { firstName: 'Matthew', lastName: 'Martin', phone: '+1234567804', email: 'matthew.m@email.com', status: 'Following Up', daysAgo: 1, hasFollowUp: true, lastFollowUpDays: 1 },
      { firstName: 'Betty', lastName: 'Thompson', phone: '+1234567805', email: 'betty.t@email.com', status: 'Interested', daysAgo: 2, hasFollowUp: true, lastFollowUpDays: 2 },
      { firstName: 'Anthony', lastName: 'Garcia', phone: '+1234567806', email: 'anthony.g@email.com', status: 'New', daysAgo: 0, hasFollowUp: true, lastFollowUpDays: 0 },
      { firstName: 'Sandra', lastName: 'Martinez', phone: '+1234567807', email: 'sandra.m@email.com', status: 'Following Up', daysAgo: 1, hasFollowUp: true, lastFollowUpDays: 1 },
      
      // GREEN (ALL GOOD) - Converted/Not Interested/Lost Contact
      { firstName: 'Mark', lastName: 'Robinson', phone: '+1234567808', email: 'mark.r@email.com', status: 'Converted', daysAgo: 10, hasFollowUp: true, lastFollowUpDays: 5 },
      { firstName: 'Donna', lastName: 'Clark', phone: '+1234567809', email: 'donna.c@email.com', status: 'Converted', daysAgo: 15, hasFollowUp: true, lastFollowUpDays: 7 },
      { firstName: 'Paul', lastName: 'Rodriguez', phone: '+1234567810', email: 'paul.r@email.com', status: 'Not Interested', daysAgo: 8, hasFollowUp: true, lastFollowUpDays: 8 },
      { firstName: 'Carol', lastName: 'Lewis', phone: '+1234567811', email: 'carol.l@email.com', status: 'Lost Contact', daysAgo: 20, hasFollowUp: true, lastFollowUpDays: 15 },
    ];

    console.log('📝 Creating souls...');
    
    for (const soulData of soulsSeedData) {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - soulData.daysAgo);

      const [soul] = await db
        .insert(souls)
        .values({
          outreachId: outreachProgram?.id || null,
          firstName: soulData.firstName,
          lastName: soulData.lastName,
          phone: soulData.phone,
          email: soulData.email,
          status: soulData.status,
          assignedMemberId: existingMembers[Math.floor(Math.random() * existingMembers.length)].id,
          createdAt: createdDate,
          updatedAt: createdDate,
        })
        .returning()
        .onConflictDoNothing();

      if (soul && soulData.hasFollowUp) {
        // Create follow-up records
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() - (soulData.lastFollowUpDays || 0));

        // Determine contact status based on RAG
        let contactStatus = 'Successful';
        let urgencyLevel = 'GREEN';
        
        if (soulData.lastFollowUpDays && soulData.lastFollowUpDays >= 5) {
          contactStatus = Math.random() > 0.5 ? 'Wrong Number' : 'Declined';
          urgencyLevel = 'RED';
        } else if (soulData.lastFollowUpDays && soulData.lastFollowUpDays >= 3) {
          contactStatus = Math.random() > 0.5 ? 'No Answer' : 'Busy';
          urgencyLevel = 'AMBER';
        }

        await db
          .insert(followUps)
          .values({
            soulId: soul.id,
            memberId: existingMembers[Math.floor(Math.random() * existingMembers.length)].id,
            followUpDate: followUpDate,
            contactMethod: ['Phone Call', 'Text Message', 'Email', 'In Person'][Math.floor(Math.random() * 4)],
            contactStatus: contactStatus,
            urgencyLevel: urgencyLevel,
            durationMinutes: Math.floor(Math.random() * 30) + 5,
            notes: `Follow-up with ${soulData.firstName} ${soulData.lastName}`,
            createdAt: followUpDate,
            updatedAt: followUpDate,
          })
          .onConflictDoNothing();
      }

      console.log(`  ✓ Created soul: ${soulData.firstName} ${soulData.lastName} (${soulData.status})`);
    }

    console.log('\n✅ Souls and follow-up data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Total souls: ${soulsSeedData.length}`);
    console.log(`  - Critical (RED): ~8 souls`);
    console.log(`  - Monitor (AMBER): ~5 souls`);
    console.log(`  - All Good (GREEN): ~9 souls`);
    console.log('\n🎯 Navigate to /souls-dashboard to see the data!');

  } catch (error) {
    console.error('❌ Error seeding souls data:', error);
    throw error;
  }
}

seedSoulsData()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
