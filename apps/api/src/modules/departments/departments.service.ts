import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Department, Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List departments with filtering, pagination, and search
   */
  async findAll(query: QueryDepartmentDto) {
    const {
      search,
      branchId,
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
    const where: Prisma.DepartmentWhereInput = {
      isActive,
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build order by clause
    const orderBy: Prisma.DepartmentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
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
          members: {
            where: { isActive: true },
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: {
                where: { isActive: true },
              },
            },
          },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data: departments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get department by ID with full details
   */
  async findOne(id: string): Promise<Department> {
    const department = await this.prisma.department.findUnique({
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
        members: {
          where: { isActive: true },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                joinDate: true,
              },
            },
          },
          orderBy: {
            joinDate: 'asc',
          },
        },
        attendance: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  /**
   * Create a new department
   */
  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: createDepartmentDto.branchId },
    });

    if (!branch) {
      throw new BadRequestException(
        `Branch with ID ${createDepartmentDto.branchId} not found`
      );
    }

    // Validate leader exists if provided
    if (createDepartmentDto.leaderId) {
      const leader = await this.prisma.member.findUnique({
        where: { id: createDepartmentDto.leaderId },
      });

      if (!leader) {
        throw new BadRequestException(
          `Member with ID ${createDepartmentDto.leaderId} not found`
        );
      }
    }

    // Check for duplicate department name in the same branch
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        name: createDepartmentDto.name,
        branchId: createDepartmentDto.branchId,
        isActive: true,
      },
    });

    if (existingDepartment) {
      throw new BadRequestException(
        `Department with name "${createDepartmentDto.name}" already exists in this branch`
      );
    }

    // Create department
    const department = await this.prisma.department.create({
      data: createDepartmentDto,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return department;
  }

  /**
   * Update department with partial data
   */
  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto
  ): Promise<Department> {
    // Check if department exists
    const existingDepartment = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Validate branch exists if updating branchId
    if (updateDepartmentDto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: updateDepartmentDto.branchId },
      });

      if (!branch) {
        throw new BadRequestException(
          `Branch with ID ${updateDepartmentDto.branchId} not found`
        );
      }
    }

    // Validate leader exists if updating leaderId
    if (updateDepartmentDto.leaderId) {
      const leader = await this.prisma.member.findUnique({
        where: { id: updateDepartmentDto.leaderId },
      });

      if (!leader) {
        throw new BadRequestException(
          `Member with ID ${updateDepartmentDto.leaderId} not found`
        );
      }
    }

    // Check for duplicate name if updating name
    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== existingDepartment.name
    ) {
      const duplicateDepartment = await this.prisma.department.findFirst({
        where: {
          name: updateDepartmentDto.name,
          branchId: updateDepartmentDto.branchId || existingDepartment.branchId,
          isActive: true,
          NOT: { id },
        },
      });

      if (duplicateDepartment) {
        throw new BadRequestException(
          `Department with name "${updateDepartmentDto.name}" already exists in this branch`
        );
      }
    }

    // Update department
    const updatedDepartment = await this.prisma.department.update({
      where: { id },
      data: {
        ...updateDepartmentDto,
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

    return updatedDepartment;
  }

  /**
   * Archive department (soft delete)
   */
  async remove(
    id: string
  ): Promise<{ message: string; department: Department }> {
    // Check if department exists
    const existingDepartment = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Archive the department and its members
    const [archivedDepartment] = await this.prisma.$transaction([
      this.prisma.department.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      }),
      // Archive all department members
      this.prisma.departmentMember.updateMany({
        where: { departmentId: id },
        data: { isActive: false },
      }),
    ]);

    return {
      message: `Department "${archivedDepartment.name}" has been archived`,
      department: archivedDepartment,
    };
  }

  /**
   * Restore archived department
   */
  async restore(id: string): Promise<Department> {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (department.isActive) {
      throw new BadRequestException('Department is already active');
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Add member to department
   */
  async addMember(departmentId: string, addMemberDto: AddMemberDto) {
    // Validate department exists
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException(
        `Department with ID ${departmentId} not found`
      );
    }

    // Validate member exists
    const member = await this.prisma.member.findUnique({
      where: { id: addMemberDto.memberId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${addMemberDto.memberId} not found`
      );
    }

    // Check if member is already in department
    const existingMembership = await this.prisma.departmentMember.findFirst({
      where: {
        departmentId,
        memberId: addMemberDto.memberId,
        isActive: true,
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Member is already in this department');
    }

    // Add member to department
    const departmentMember = await this.prisma.departmentMember.create({
      data: {
        departmentId,
        memberId: addMemberDto.memberId,
        role: addMemberDto.role,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return departmentMember;
  }

  /**
   * Remove member from department
   */
  async removeMember(departmentId: string, memberId: string) {
    const departmentMember = await this.prisma.departmentMember.findFirst({
      where: {
        departmentId,
        memberId,
        isActive: true,
      },
    });

    if (!departmentMember) {
      throw new NotFoundException('Member not found in this department');
    }

    await this.prisma.departmentMember.update({
      where: { id: departmentMember.id },
      data: { isActive: false },
    });

    return { message: 'Member removed from department successfully' };
  }

  /**
   * Get department statistics
   */
  async getStats(branchId?: string) {
    const where: Prisma.DepartmentWhereInput = {
      ...(branchId && { branchId }),
    };

    const [
      totalDepartments,
      activeDepartments,
      archivedDepartments,
      totalMembers,
      departmentsWithLeaders,
    ] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.count({ where: { ...where, isActive: true } }),
      this.prisma.department.count({ where: { ...where, isActive: false } }),
      this.prisma.departmentMember.count({
        where: {
          isActive: true,
          department: where,
        },
      }),
      this.prisma.department.count({
        where: {
          ...where,
          isActive: true,
          leaderId: { not: null },
        },
      }),
    ]);

    return {
      total: totalDepartments,
      active: activeDepartments,
      archived: archivedDepartments,
      totalMembers,
      withLeaders: departmentsWithLeaders,
      withoutLeaders: activeDepartments - departmentsWithLeaders,
    };
  }
}
