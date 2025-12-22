import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { AddMemberDto } from './dto/add-member.dto';

// In-memory demo data
const demoDepartments = [
  {
    id: '1',
    branchId: 'branch-1',
    name: 'Youth Ministry',
    description: 'Ministry focused on young people and teenagers',
    leaderId: '1',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
    members: [],
  },
  {
    id: '2',
    branchId: 'branch-1',
    name: 'Music Ministry',
    description: 'Worship and music ministry',
    leaderId: '2',
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
    members: [],
  },
];

@Injectable()
export class DepartmentsDemoService {
  private departments = [...demoDepartments];
  private nextId = 3;

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

    // Filter departments
    const filteredDepartments = this.departments.filter((department) => {
      if (department.isActive !== isActive) return false;
      if (branchId && department.branchId !== branchId) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        return (
          department.name.toLowerCase().includes(searchLower) ||
          department.description?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort departments
    filteredDepartments.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];

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
    const total = filteredDepartments.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedDepartments = filteredDepartments.slice(
      skip,
      skip + limitNum
    );

    return {
      data: paginatedDepartments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const department = this.departments.find((d) => d.id === id);

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async create(createDepartmentDto: CreateDepartmentDto) {
    const newDepartment: any = {
      id: this.nextId.toString(),
      ...createDepartmentDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      branch: {
        id: createDepartmentDto.branchId,
        name: 'Main Branch',
      },
      members: [],
    };

    this.departments.push(newDepartment);
    this.nextId++;

    return newDepartment;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const departmentIndex = this.departments.findIndex((d) => d.id === id);

    if (departmentIndex === -1) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    const updatedDepartment: any = {
      ...this.departments[departmentIndex],
      ...updateDepartmentDto,
      updatedAt: new Date(),
    };

    this.departments[departmentIndex] = updatedDepartment;

    return updatedDepartment;
  }

  async remove(id: string) {
    const departmentIndex = this.departments.findIndex((d) => d.id === id);

    if (departmentIndex === -1) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    this.departments[departmentIndex] = {
      ...this.departments[departmentIndex],
      isActive: false,
      updatedAt: new Date(),
    };

    return {
      message: `Department "${this.departments[departmentIndex].name}" has been archived`,
      department: this.departments[departmentIndex],
    };
  }

  async restore(id: string) {
    const departmentIndex = this.departments.findIndex((d) => d.id === id);

    if (departmentIndex === -1) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (this.departments[departmentIndex].isActive) {
      throw new BadRequestException('Department is already active');
    }

    this.departments[departmentIndex] = {
      ...this.departments[departmentIndex],
      isActive: true,
      updatedAt: new Date(),
    };

    return this.departments[departmentIndex];
  }

  async addMember(_departmentId: string, _addMemberDto: AddMemberDto) {
    return { message: 'Member added to department (demo)' };
  }

  async removeMember(_departmentId: string, _memberId: string) {
    return { message: 'Member removed from department (demo)' };
  }

  async getStats(branchId?: string) {
    const filteredDepartments = branchId
      ? this.departments.filter((d) => d.branchId === branchId)
      : this.departments;

    const totalDepartments = filteredDepartments.length;
    const activeDepartments = filteredDepartments.filter(
      (d) => d.isActive
    ).length;
    const archivedDepartments = filteredDepartments.filter(
      (d) => !d.isActive
    ).length;

    return {
      total: totalDepartments,
      active: activeDepartments,
      archived: archivedDepartments,
      totalMembers: 0,
      withLeaders: activeDepartments,
      withoutLeaders: 0,
    };
  }
}
