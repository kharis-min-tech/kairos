import { PrismaClient } from '@prisma/client';

export class TestDatabaseConfig {
  private static prisma: PrismaClient;

  static async setupTestDatabase(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.DATABASE_URL ||
              'postgresql://test:test@localhost:5432/kairos_test',
          },
        },
      });

      await this.prisma.$connect();
    }

    return this.prisma;
  }

  static async cleanupTestDatabase(): Promise<void> {
    if (this.prisma) {
      // Clean up test data
      const tablenames = await this.prisma.$queryRaw<
        Array<{ tablename: string }>
      >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

      const tables = tablenames
        .map(({ tablename }: { tablename: string }) => tablename)
        .filter((name: string) => name !== '_prisma_migrations')
        .map((name: string) => `"public"."${name}"`)
        .join(', ');

      try {
        if (tables) {
          await this.prisma.$executeRawUnsafe(
            `TRUNCATE TABLE ${tables} CASCADE;`
          );
        }
      } catch (error) {
        console.log('Error cleaning up test database:', error);
      }
    }
  }

  static async teardownTestDatabase(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null as any;
    }
  }
}

// Global test helpers for database operations
export const testDbHelpers = {
  async createTestUser(data: any = {}) {
    const prisma = await TestDatabaseConfig.setupTestDatabase();
    return prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        userType: 'Member',
        mfaEnabled: false,
        ...data,
      },
    });
  },

  async createTestMember(data: any = {}) {
    const prisma = await TestDatabaseConfig.setupTestDatabase();
    return prisma.member.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Male',
        maritalStatus: 'Single',
        soulStatus: 'Member',
        ...data,
      },
    });
  },
};
