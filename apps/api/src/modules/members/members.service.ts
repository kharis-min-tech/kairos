import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';
import { Member, Prisma } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.MemberWhereInput = {
      isActive,
      ...(branchId && { branchId }),
      ...(gender && { gender }),
      ...(maritalStatus && { maritalStatus }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build order by clause
    const orderBy: Prisma.MemberOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              userType: true,
            },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members,
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
  async findOne(id: string): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            isActive: true,
          },
        },
        departmentMembers: {
          where: { isActive: true },
          include: {
            department: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        fellowshipMembers: {
          where: { isActive: true },
          include: {
            fellowship: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return member;
  }

  /**
   * Create a new member
   */
  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const { dateOfBirth, ...memberData } = createMemberDto;

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: createMemberDto.branchId },
    });

    if (!branch) {
      throw new BadRequestException(
        `Branch with ID ${createMemberDto.branchId} not found`
      );
    }

    // Check for duplicate email if provided
    if (createMemberDto.email) {
      const existingMember = await this.prisma.member.findFirst({
        where: {
          email: createMemberDto.email,
          isActive: true,
        },
      });

      if (existingMember) {
        throw new BadRequestException(
          `Member with email ${createMemberDto.email} already exists`
        );
      }
    }

    // Create member
    const member = await this.prisma.member.create({
      data: {
        ...memberData,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return member;
  }

  /**
   * Update member with partial data
   */
  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    // Check if member exists
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Check for duplicate email if updating email
    if (
      updateMemberDto.email &&
      updateMemberDto.email !== existingMember.email
    ) {
      const duplicateMember = await this.prisma.member.findFirst({
        where: {
          email: updateMemberDto.email,
          isActive: true,
          NOT: { id },
        },
      });

      if (duplicateMember) {
        throw new BadRequestException(
          `Member with email ${updateMemberDto.email} already exists`
        );
      }
    }

    const { dateOfBirth, ...updateData } = updateMemberDto;

    // Update member
    const updatedMember = await this.prisma.member.update({
      where: { id },
      data: {
        ...updateData,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        updatedAt: new Date(),
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedMember;
  }

  /**
   * Archive member (soft delete)
   */
  async remove(id: string): Promise<{ message: string; member: Member }> {
    // Check if member exists
    const existingMember = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Archive the member (soft delete)
    const archivedMember = await this.prisma.member.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      message: `Member ${archivedMember.firstName} ${archivedMember.lastName} has been archived`,
      member: archivedMember,
    };
  }

  /**
   * Restore archived member
   */
  async restore(id: string): Promise<Member> {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (member.isActive) {
      throw new BadRequestException('Member is already active');
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get member statistics
   */
  async getStats(branchId?: string) {
    const where: Prisma.MemberWhereInput = {
      ...(branchId && { branchId }),
    };

    const [
      totalMembers,
      activeMembers,
      archivedMembers,
      maleMembers,
      femaleMembers,
      marriedMembers,
      singleMembers,
    ] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.count({ where: { ...where, isActive: true } }),
      this.prisma.member.count({ where: { ...where, isActive: false } }),
      this.prisma.member.count({
        where: { ...where, gender: 'MALE', isActive: true },
      }),
      this.prisma.member.count({
        where: { ...where, gender: 'FEMALE', isActive: true },
      }),
      this.prisma.member.count({
        where: { ...where, maritalStatus: 'MARRIED', isActive: true },
      }),
      this.prisma.member.count({
        where: { ...where, maritalStatus: 'SINGLE', isActive: true },
      }),
    ]);

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
