import {
  User,
  Member,
  UserType,
  SoulStatus,
  CreateMemberDto,
  ApiResponse,
} from '../index';

describe('Shared Types', () => {
  it('should export User interface correctly', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      userType: UserType.Member,
      mfaEnabled: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.id).toBe('123');
    expect(user.userType).toBe(UserType.Member);
  });

  it('should export Member interface correctly', () => {
    const member: Member = {
      id: '456',
      branchId: 'branch-1',
      membershipNumber: 'MEM001',
      firstName: 'John',
      lastName: 'Doe',
      soulStatus: SoulStatus.Member,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(member.firstName).toBe('John');
    expect(member.soulStatus).toBe(SoulStatus.Member);
  });

  it('should export CreateMemberDto correctly', () => {
    const createMemberDto: CreateMemberDto = {
      branchId: 'branch-1',
      firstName: 'Jane',
      lastName: 'Smith',
      soulStatus: SoulStatus.NewContact,
    };

    expect(createMemberDto.firstName).toBe('Jane');
    expect(createMemberDto.soulStatus).toBe(SoulStatus.NewContact);
  });

  it('should export ApiResponse correctly', () => {
    const response: ApiResponse<Member> = {
      success: true,
      message: 'Member created successfully',
      data: {
        id: '789',
        branchId: 'branch-1',
        membershipNumber: 'MEM002',
        firstName: 'Bob',
        lastName: 'Johnson',
        soulStatus: SoulStatus.Member,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      timestamp: new Date().toISOString(),
    };

    expect(response.success).toBe(true);
    expect(response.data?.firstName).toBe('Bob');
  });

  it('should export enums correctly', () => {
    expect(UserType.Admin).toBe('Admin');
    expect(UserType.Pastor).toBe('Pastor');
    expect(UserType.Member).toBe('Member');

    expect(SoulStatus.NewContact).toBe('NewContact');
    expect(SoulStatus.Member).toBe('Member');
    expect(SoulStatus.Regular).toBe('Regular');
  });
});
