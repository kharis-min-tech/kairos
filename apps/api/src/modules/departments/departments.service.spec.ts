import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  const mockPrismaService = {
    department: {
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
    member: {
      findUnique: jest.fn(),
    },
    departmentMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDepartment = {
    id: '1',
    branchId: 'branch-1',
    name: 'Youth Ministry',
    description: 'Ministry for young people',
    leaderId: 'leader-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBranch = {
    id: 'branch-1',
    name: 'Main Branch',
    address: '123 Church St',
    phone: '+1234567890',
    email: 'main@church.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated departments with default filters', async () => {
      const mockDepartments = [mockDepartment];
      mockPrismaService.department.findMany.mockResolvedValue(mockDepartments);
      mockPrismaService.department.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        data: mockDepartments,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      });

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: expect.any(Object),
      });
    });

    it('should filter departments by search term', async () => {
      const mockDepartments = [mockDepartment];
      mockPrismaService.department.findMany.mockResolvedValue(mockDepartments);
      mockPrismaService.department.count.mockResolvedValue(1);

      await service.findAll({ search: 'Youth' });

      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'Youth', mode: 'insensitive' } },
              { description: { contains: 'Youth', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a department by ID', async () => {
      const departmentWithRelations = {
        ...mockDepartment,
        branch: mockBranch,
        members: [],
        attendance: [],
      };
      mockPrismaService.department.findUnique.mockResolvedValue(
        departmentWithRelations
      );

      const result = await service.findOne('1');

      expect(result).toEqual(departmentWithRelations);
      expect(mockPrismaService.department.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when department not found', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDepartmentDto = {
      branchId: 'branch-1',
      name: 'Music Ministry',
      description: 'Worship and music ministry',
      leaderId: 'leader-1',
    };

    it('should create a new department', async () => {
      const createdDepartment = {
        ...mockDepartment,
        ...createDepartmentDto,
        id: '2',
      };
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.department.findFirst.mockResolvedValue(null);
      mockPrismaService.department.create.mockResolvedValue(createdDepartment);

      const result = await service.create(createDepartmentDto);

      expect(result).toEqual(createdDepartment);
      expect(mockPrismaService.department.create).toHaveBeenCalledWith({
        data: createDepartmentDto,
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw BadRequestException when branch not found', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(null);

      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when leader not found', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.member.findUnique.mockResolvedValue(null);

      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when department name already exists', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.department.findFirst.mockResolvedValue(mockDepartment);

      await expect(service.create(createDepartmentDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    const updateDepartmentDto = {
      name: 'Updated Youth Ministry',
      description: 'Updated description',
    };

    it('should update a department', async () => {
      const updatedDepartment = { ...mockDepartment, ...updateDepartmentDto };
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.department.findFirst.mockResolvedValue(null);
      mockPrismaService.department.update.mockResolvedValue(updatedDepartment);

      const result = await service.update('1', updateDepartmentDto);

      expect(result).toEqual(updatedDepartment);
      expect(mockPrismaService.department.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          ...updateDepartmentDto,
          updatedAt: expect.any(Date),
        },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException when department not found', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.update('999', updateDepartmentDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should archive a department', async () => {
      const archivedDepartment = { ...mockDepartment, isActive: false };
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.$transaction.mockResolvedValue([archivedDepartment]);

      const result = await service.remove('1');

      expect(result.message).toContain('archived');
      expect(result.department).toEqual(archivedDepartment);
    });

    it('should throw NotFoundException when department not found', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    const addMemberDto = {
      memberId: 'member-1',
      role: 'Volunteer',
    };

    it('should add member to department', async () => {
      const departmentMember = {
        id: 'dm-1',
        departmentId: '1',
        memberId: 'member-1',
        role: 'Volunteer',
        member: mockMember,
        department: mockDepartment,
      };

      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.departmentMember.findFirst.mockResolvedValue(null);
      mockPrismaService.departmentMember.create.mockResolvedValue(
        departmentMember
      );

      const result = await service.addMember('1', addMemberDto);

      expect(result).toEqual(departmentMember);
    });

    it('should throw BadRequestException when member already in department', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.member.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.departmentMember.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.addMember('1', addMemberDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getStats', () => {
    it('should return department statistics', async () => {
      mockPrismaService.department.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // active
        .mockResolvedValueOnce(2) // archived
        .mockResolvedValueOnce(5); // with leaders

      mockPrismaService.departmentMember.count.mockResolvedValue(50); // total members

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        archived: 2,
        totalMembers: 50,
        withLeaders: 5,
        withoutLeaders: 3,
      });
    });
  });
});
