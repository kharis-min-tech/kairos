import { PrismaClient, Gender, MaritalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMembers() {
  console.log('Seeding members...');

  // First, ensure we have a branch
  const branch = await prisma.branch.upsert({
    where: { id: 'main-branch' },
    update: {},
    create: {
      id: 'main-branch',
      name: 'Main Branch',
      address: '123 Church Street, City Center',
      phone: '+1-555-0123',
      email: 'main@kairosChurch.org',
      isActive: true,
    },
  });

  // Sample members data
  const membersData = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0101',
      address: '123 Main Street, Cityville',
      dateOfBirth: new Date('1985-03-15'),
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.MARRIED,
      occupation: 'Software Engineer',
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1-555-0102',
      address: '456 Oak Avenue, Townsburg',
      dateOfBirth: new Date('1990-07-22'),
      gender: Gender.FEMALE,
      maritalStatus: MaritalStatus.SINGLE,
      occupation: 'Teacher',
    },
    {
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@example.com',
      phone: '+1-555-0103',
      address: '789 Pine Road, Villageton',
      dateOfBirth: new Date('1978-11-08'),
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.MARRIED,
      occupation: 'Doctor',
    },
    {
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.williams@example.com',
      phone: '+1-555-0104',
      address: '321 Elm Street, Hamletville',
      dateOfBirth: new Date('1992-05-14'),
      gender: Gender.FEMALE,
      maritalStatus: MaritalStatus.SINGLE,
      occupation: 'Nurse',
    },
    {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      phone: '+1-555-0105',
      address: '654 Maple Drive, Countryside',
      dateOfBirth: new Date('1980-09-30'),
      gender: Gender.MALE,
      maritalStatus: MaritalStatus.DIVORCED,
      occupation: 'Business Owner',
    },
  ];

  // Create members
  for (const memberData of membersData) {
    await prisma.member.upsert({
      where: { email: memberData.email },
      update: {},
      create: {
        ...memberData,
        branchId: branch.id,
      },
    });
  }

  console.log(`✅ Seeded ${membersData.length} members`);
}

async function main() {
  try {
    await seedMembers();
  } catch (error) {
    console.error('Error seeding members:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedMembers };
