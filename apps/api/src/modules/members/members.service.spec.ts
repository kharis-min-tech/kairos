import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPrismaService = {
    member: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    branch: {
      findUnique: jest.fn(),
    },
  };

  const mockMember = {
    id: '1',
    branchId: 'branch-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE' as const,
    maritalStatus: 'SINGLE' as const,
    occupation: 'Engineer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    joinDate: new Date(),
    userId: null,
  };

  const mockBranch = {
    id: 'branch-1',
    name: 'Main Branch',
    address: '456 Church St',
    phone: '+1987654321',
    email: 'main@church.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated members with default filters', async () => {
      const mockMembers = [mockMember];
      mockPrismaService.member.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.member.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: mockMembers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      });

      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, userType: true } },
        },
      });
    });

    it('should filter members by search term', async () => {
      const mockMembers = [mockMember];
      mockPrismaService.member.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.member.count.mockResolvedValue(1);

      await service.findAll({ search: 'John' });

      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: 'John', mode: 'insensitive' } },
              { lastName: { contains: 'John', mode: 'insensitive' } },
              { email: { contains: 'John', mode: 'insensitive' } },
              { phone: { contains: 'John', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a member by ID', async () => {
      const memberWithRelations = {
        ...mockMember,
        branch: mockBranch,
        user: null,
        departmentMembers: [],
        fellowshipMembers: [],
      };
      mockPrismaService.member.findUnique.mockResolvedValue(
        memberWithRelations
      );

      const result = await service.findOne('1');

      expect(result).toEqual(memberWithRelations);
      expect(mockPrismaService.member.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockPrismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createMemberDto = {
      branchId: 'branch-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1111111111',
      dateOfBirth: '1995-05-15',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
    };

    it('should create a new member', async () => {
      const createdMember = { ...mockMember, ...createMemberDto, id: '2' };
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.member.create.mockResolvedValue(createdMember);

      const result = await service.create(createMemberDto);

      expect(result).toEqual(createdMember);
      expect(mockPrismaService.member.create).toHaveBeenCalledWith({
        data: {
          ...createMemberDto,
          dateOfBirth: new Date(createMemberDto.dateOfBirth),
        },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw BadRequestException when branch not found', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(null);

      await expect(service.create(createMemberDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when email already exists', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.member.findFirst.mockResolvedValue(mockMember);

      await expect(service.create(createMemberDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    const updateMemberDto = {
      firstName: 'John Updated',
      email: 'john.updated@example.com',
    };

    it('should update a member', async () => {
      const updatedMember = { ...mockMember, ...updateMemberDto };
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.member.findFirst.mockResolvedValue(null);
      mockPrismaService.member.update.mockResolvedValue(updatedMember);

      const result = await service.update('1', updateMemberDto);

      expect(result).toEqual(updatedMember);
      expect(mockPrismaService.member.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          ...updateMemberDto,
          updatedAt: expect.any(Date),
        },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockPrismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.update('999', updateMemberDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should archive a member', async () => {
      const archivedMember = { ...mockMember, isActive: false };
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.member.update.mockResolvedValue(archivedMember);

      const result = await service.remove('1');

      expect(result.message).toContain('archived');
      expect(result.member).toEqual(archivedMember);
      expect(mockPrismaService.member.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockPrismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore an archived member', async () => {
      const archivedMember = { ...mockMember, isActive: false };
      const restoredMember = { ...mockMember, isActive: true };
      mockPrismaService.member.findUnique.mockResolvedValue(archivedMember);
      mockPrismaService.member.update.mockResolvedValue(restoredMember);

      const result = await service.restore('1');

      expect(result).toEqual(restoredMember);
      expect(mockPrismaService.member.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isActive: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when member is already active', async () => {
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);

      await expect(service.restore('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return member statistics', async () => {
      mockPrismaService.member.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // active
        .mockResolvedValueOnce(5) // archived
        .mockResolvedValueOnce(50) // male
        .mockResolvedValueOnce(45) // female
        .mockResolvedValueOnce(30) // married
        .mockResolvedValueOnce(65); // single

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        active: 95,
        archived: 5,
        demographics: {
          gender: { male: 50, female: 45 },
          maritalStatus: { married: 30, single: 65 },
        },
      });
    });
  });
});
