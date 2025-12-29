import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: DepartmentsService;

  const mockDepartmentsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    getStats: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [
        {
          provide: DepartmentsService,
          useValue: mockDepartmentsService,
        },
      ],
    }).compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
    service = module.get<DepartmentsService>(DepartmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated departments', async () => {
      const mockResult = {
        data: [mockDepartment],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockDepartmentsService.findAll.mockResolvedValue(mockResult);

      const query = { page: '1', limit: '10' };
      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getStats', () => {
    it('should return department statistics', async () => {
      const mockStats = {
        total: 10,
        active: 8,
        archived: 2,
        totalMembers: 50,
        withLeaders: 5,
        withoutLeaders: 3,
      };
      mockDepartmentsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics for specific branch', async () => {
      const mockStats = {
        total: 5,
        active: 4,
        archived: 1,
        totalMembers: 25,
        withLeaders: 3,
        withoutLeaders: 1,
      };
      mockDepartmentsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats('branch-1');

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith('branch-1');
    });
  });

  describe('findOne', () => {
    it('should return a department by ID', async () => {
      mockDepartmentsService.findOne.mockResolvedValue(mockDepartment);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockDepartment);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create a new department', async () => {
      const createDepartmentDto = {
        branchId: 'branch-1',
        name: 'Music Ministry',
        description: 'Worship and music ministry',
        leaderId: 'leader-1',
      };
      const createdDepartment = {
        ...mockDepartment,
        ...createDepartmentDto,
        id: '2',
      };
      mockDepartmentsService.create.mockResolvedValue(createdDepartment);

      const result = await controller.create(createDepartmentDto);

      expect(result).toEqual(createdDepartment);
      expect(service.create).toHaveBeenCalledWith(createDepartmentDto);
    });
  });

  describe('update', () => {
    it('should update a department', async () => {
      const updateDepartmentDto = {
        name: 'Updated Youth Ministry',
        description: 'Updated description',
      };
      const updatedDepartment = { ...mockDepartment, ...updateDepartmentDto };
      mockDepartmentsService.update.mockResolvedValue(updatedDepartment);

      const result = await controller.update('1', updateDepartmentDto);

      expect(result).toEqual(updatedDepartment);
      expect(service.update).toHaveBeenCalledWith('1', updateDepartmentDto);
    });
  });

  describe('restore', () => {
    it('should restore an archived department', async () => {
      const restoredDepartment = { ...mockDepartment, isActive: true };
      mockDepartmentsService.restore.mockResolvedValue(restoredDepartment);

      const result = await controller.restore('1');

      expect(result).toEqual(restoredDepartment);
      expect(service.restore).toHaveBeenCalledWith('1');
    });
  });

  describe('remove', () => {
    it('should archive a department', async () => {
      const removeResult = {
        message: 'Department Youth Ministry has been archived',
        department: { ...mockDepartment, isActive: false },
      };
      mockDepartmentsService.remove.mockResolvedValue(removeResult);

      const result = await controller.remove('1');

      expect(result).toEqual(removeResult);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('addMember', () => {
    it('should add member to department', async () => {
      const addMemberDto = {
        memberId: 'member-1',
        role: 'Volunteer',
      };
      const departmentMember = {
        id: 'dm-1',
        departmentId: '1',
        memberId: 'member-1',
        role: 'Volunteer',
      };
      mockDepartmentsService.addMember.mockResolvedValue(departmentMember);

      const result = await controller.addMember('1', addMemberDto);

      expect(result).toEqual(departmentMember);
      expect(service.addMember).toHaveBeenCalledWith('1', addMemberDto);
    });
  });

  describe('removeMember', () => {
    it('should remove member from department', async () => {
      const removeResult = {
        message: 'Member removed from department successfully',
      };
      mockDepartmentsService.removeMember.mockResolvedValue(removeResult);

      const result = await controller.removeMember('1', 'member-1');

      expect(result).toEqual(removeResult);
      expect(service.removeMember).toHaveBeenCalledWith('1', 'member-1');
    });
  });
});
