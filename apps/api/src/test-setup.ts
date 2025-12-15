import 'reflect-metadata';

// Test database configuration
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://test:test@localhost:5432/kairos_test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Global test helpers
(global as any).testHelpers = {
  // Helper to create test user data
  createTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    userType: 'Member',
    mfaEnabled: false,
  }),

  // Helper to create test member data
  createTestMember: () => ({
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'Male',
    maritalStatus: 'Single',
    soulStatus: 'Member',
  }),
};

// Mock external services
if (typeof jest !== 'undefined') {
  jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      member: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    })),
  }));
}
