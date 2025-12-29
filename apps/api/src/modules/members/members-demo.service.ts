import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';

// In-memory demo data
const demoMembers = [
  {
    id: '1',
    branchId: 'branch-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main Street, Cityville',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'MALE' as const,
    maritalStatus: 'MARRIED' as const,
    occupation: 'Software Engineer',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    joinDate: new Date('2024-01-15'),
    userId: null,
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
  {
    id: '2',
    branchId: 'branch-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    address: '456 Oak Avenue, Townsburg',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'FEMALE' as const,
    maritalStatus: 'SINGLE' as const,
    occupation: 'Teacher',
    isActive: true,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    joinDate: new Date('2024-02-10'),
    userId: null,
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
  {
    id: '3',
    branchId: 'branch-1',
    firstName: 'Michael',
    lastName: 'Johnson',
    email: 'michael.johnson@example.com',
    phone: '+1234567892',
    address: '789 Pine Road, Villageton',
    dateOfBirth: new Date('1978-11-08'),
    gender: 'MALE' as const,
    maritalStatus: 'MARRIED' as const,
    occupation: 'Doctor',
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    joinDate: new Date('2024-01-20'),
    userId: null,
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
  {
    id: '4',
    branchId: 'branch-1',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@example.com',
    phone: '+1234567893',
    address: '321 Elm Street, Hamletville',
    dateOfBirth: new Date('1992-05-14'),
    gender: 'FEMALE' as const,
    maritalStatus: 'SINGLE' as const,
    occupation: 'Nurse',
    isActive: true,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
    joinDate: new Date('2024-03-05'),
    userId: null,
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
  {
    id: '5',
    branchId: 'branch-1',
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@example.com',
    phone: '+1234567894',
    address: '654 Maple Drive, Countryside',
    dateOfBirth: new Date('1980-09-30'),
    gender: 'MALE' as const,
    maritalStatus: 'DIVORCED' as const,
    occupation: 'Business Owner',
    isActive: false, // Archived member
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-06-15'),
    joinDate: new Date('2024-01-10'),
    userId: null,
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
];

@Injectable()
export class MembersDemoService {
  private members = [...demoMembers];
  private nextId = 6;

  /**
   * List members with filtering, pagination, and search
   */
  async findAll(query: QueryMemberDto) {
    const {
      search,
      branchId,
      gender,
      maritalStatus,
      isActive = true,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Filter members
    const filteredMembers = this.members.filter((member) => {
      if (member.isActive !== isActive) return false;
      if (branchId && member.branchId !== branchId) return false;
      if (gender && member.gender !== gender) return false;
      if (maritalStatus && member.maritalStatus !== maritalStatus) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        return (
          member.firstName.toLowerCase().includes(searchLower) ||
          member.lastName.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower) ||
          member.phone?.includes(search)
        );
      }

      return true;
    });

    // Sort members
    filteredMembers.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginate
    const total = filteredMembers.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedMembers = filteredMembers.slice(skip, skip + limitNum);

    return {
      data: paginatedMembers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get member by ID with full details
   */
  async findOne(id: string) {
    const member = this.members.find((m) => m.id === id);

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return {
      ...member,
      departmentMembers: [],
      fellowshipMembers: [],
    };
  }

  /**
   * Create a new member
   */
  async create(createMemberDto: CreateMemberDto) {
    // Check for duplicate email
    if (createMemberDto.email) {
      const existingMember = this.members.find(
        (m) => m.email === createMemberDto.email && m.isActive
      );

      if (existingMember) {
        throw new BadRequestException(
          `Member with email ${createMemberDto.email} already exists`
        );
      }
    }

    const newMember: any = {
      id: this.nextId.toString(),
      branchId: createMemberDto.branchId,
      firstName: createMemberDto.firstName,
      lastName: createMemberDto.lastName,
      email: createMemberDto.email || '',
      phone: createMemberDto.phone || '',
      address: createMemberDto.address || '',
      dateOfBirth: createMemberDto.dateOfBirth
        ? new Date(createMemberDto.dateOfBirth)
        : new Date(),
      gender: createMemberDto.gender || 'MALE',
      maritalStatus: createMemberDto.maritalStatus || 'SINGLE',
      occupation: createMemberDto.occupation || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      joinDate: new Date(),
      userId: null,
      branch: {
        id: createMemberDto.branchId,
        name: 'Main Branch',
      },
    };

    this.members.push(newMember);
    this.nextId++;

    return newMember;
  }

  /**
   * Update member with partial data
   */
  async update(id: string, updateMemberDto: UpdateMemberDto) {
    const memberIndex = this.members.findIndex((m) => m.id === id);

    if (memberIndex === -1) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Check for duplicate email if updating email
    if (updateMemberDto.email) {
      const duplicateMember = this.members.find(
        (m) => m.email === updateMemberDto.email && m.isActive && m.id !== id
      );

      if (duplicateMember) {
        throw new BadRequestException(
          `Member with email ${updateMemberDto.email} already exists`
        );
      }
    }

    // Build updated member with proper type handling
    const baseUpdate: any = {
      ...this.members[memberIndex],
      ...updateMemberDto,
      updatedAt: new Date(),
    };

    // Handle dateOfBirth conversion
    if (updateMemberDto.dateOfBirth) {
      baseUpdate.dateOfBirth =
        typeof updateMemberDto.dateOfBirth === 'string'
          ? new Date(updateMemberDto.dateOfBirth)
          : updateMemberDto.dateOfBirth;
    }

    this.members[memberIndex] = baseUpdate;

    return baseUpdate;
  }

  /**
   * Archive member (soft delete)
   */
  async remove(id: string) {
    const memberIndex = this.members.findIndex((m) => m.id === id);

    if (memberIndex === -1) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    this.members[memberIndex] = {
      ...this.members[memberIndex],
      isActive: false,
      updatedAt: new Date(),
    };

    return {
      message: `Member ${this.members[memberIndex].firstName} ${this.members[memberIndex].lastName} has been archived`,
      member: this.members[memberIndex],
    };
  }

  /**
   * Restore archived member
   */
  async restore(id: string) {
    const memberIndex = this.members.findIndex((m) => m.id === id);

    if (memberIndex === -1) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (this.members[memberIndex].isActive) {
      throw new BadRequestException('Member is already active');
    }

    this.members[memberIndex] = {
      ...this.members[memberIndex],
      isActive: true,
      updatedAt: new Date(),
    };

    return this.members[memberIndex];
  }

  /**
   * Get member statistics
   */
  async getStats(branchId?: string) {
    const filteredMembers = branchId
      ? this.members.filter((m) => m.branchId === branchId)
      : this.members;

    const totalMembers = filteredMembers.length;
    const activeMembers = filteredMembers.filter((m) => m.isActive).length;
    const archivedMembers = filteredMembers.filter((m) => !m.isActive).length;
    const maleMembers = filteredMembers.filter(
      (m) => m.gender === 'MALE' && m.isActive
    ).length;
    const femaleMembers = filteredMembers.filter(
      (m) => m.gender === 'FEMALE' && m.isActive
    ).length;
    const marriedMembers = filteredMembers.filter(
      (m) => m.maritalStatus === 'MARRIED' && m.isActive
    ).length;
    const singleMembers = filteredMembers.filter(
      (m) => m.maritalStatus === 'SINGLE' && m.isActive
    ).length;

    return {
      total: totalMembers,
      active: activeMembers,
      archived: archivedMembers,
      demographics: {
        gender: {
          male: maleMembers,
          female: femaleMembers,
        },
        maritalStatus: {
          married: marriedMembers,
          single: singleMembers,
        },
      },
    };
  }
}
