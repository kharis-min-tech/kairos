import { Test, TestingModule } from '@nestjs/testing';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

describe('MembersController', () => {
  let controller: MembersController;
  let service: MembersService;

  const mockMembersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    getStats: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    }).compile();

    controller = module.get<MembersController>(MembersController);
    service = module.get<MembersService>(MembersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated members', async () => {
      const mockResult = {
        data: [mockMember],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockMembersService.findAll.mockResolvedValue(mockResult);

      const query = { page: '1', limit: '10' };
      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getStats', () => {
    it('should return member statistics', async () => {
      const mockStats = {
        total: 100,
        active: 95,
        archived: 5,
        demographics: {
          gender: { male: 50, female: 45 },
          maritalStatus: { married: 30, single: 65 },
        },
      };
      mockMembersService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics for specific branch', async () => {
      const mockStats = {
        total: 50,
        active: 48,
        archived: 2,
        demographics: {
          gender: { male: 25, female: 23 },
          maritalStatus: { married: 15, single: 33 },
        },
      };
      mockMembersService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats('branch-1');

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith('branch-1');
    });
  });

  describe('findOne', () => {
    it('should return a member by ID', async () => {
      mockMembersService.findOne.mockResolvedValue(mockMember);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockMember);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create a new member', async () => {
      const createMemberDto = {
        branchId: 'branch-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1111111111',
        gender: 'FEMALE' as const,
        maritalStatus: 'SINGLE' as const,
      };
      const createdMember = { ...mockMember, ...createMemberDto, id: '2' };
      mockMembersService.create.mockResolvedValue(createdMember);

      const result = await controller.create(createMemberDto);

      expect(result).toEqual(createdMember);
      expect(service.create).toHaveBeenCalledWith(createMemberDto);
    });
  });

  describe('update', () => {
    it('should update a member', async () => {
      const updateMemberDto = {
        firstName: 'John Updated',
        email: 'john.updated@example.com',
      };
      const updatedMember = { ...mockMember, ...updateMemberDto };
      mockMembersService.update.mockResolvedValue(updatedMember);

      const result = await controller.update('1', updateMemberDto);

      expect(result).toEqual(updatedMember);
      expect(service.update).toHaveBeenCalledWith('1', updateMemberDto);
    });
  });

  describe('restore', () => {
    it('should restore an archived member', async () => {
      const restoredMember = { ...mockMember, isActive: true };
      mockMembersService.restore.mockResolvedValue(restoredMember);

      const result = await controller.restore('1');

      expect(result).toEqual(restoredMember);
      expect(service.restore).toHaveBeenCalledWith('1');
    });
  });

  describe('remove', () => {
    it('should archive a member', async () => {
      const removeResult = {
        message: 'Member John Doe has been archived',
        member: { ...mockMember, isActive: false },
      };
      mockMembersService.remove.mockResolvedValue(removeResult);

      const result = await controller.remove('1');

      expect(result).toEqual(removeResult);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
