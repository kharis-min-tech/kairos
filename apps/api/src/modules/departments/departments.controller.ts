import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { AddMemberDto } from './dto/add-member.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all departments',
    description:
      'Retrieve a paginated list of church departments with optional filtering and sorting capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved departments list',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '1' },
              branchId: { type: 'string', example: 'branch-1' },
              name: { type: 'string', example: 'Youth Ministry' },
              description: {
                type: 'string',
                example: 'Ministry focused on youth development',
              },
              leaderId: { type: 'string', example: 'member-1' },
              isActive: { type: 'boolean', example: true },
              memberCount: { type: 'number', example: 25 },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 50 },
            pages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['page must be a number'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async findAll(@Query(ValidationPipe) query: QueryDepartmentDto) {
    return this.departmentsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get department statistics',
    description:
      'Retrieve statistical information about church departments including counts and member distribution',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Filter statistics by specific branch',
    type: 'string',
    example: 'branch-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved department statistics',
    schema: {
      type: 'object',
      properties: {
        totalDepartments: { type: 'number', example: 12 },
        activeDepartments: { type: 'number', example: 10 },
        inactiveDepartments: { type: 'number', example: 2 },
        totalMembers: { type: 'number', example: 150 },
        averageMembersPerDepartment: { type: 'number', example: 12.5 },
        departmentsWithLeaders: { type: 'number', example: 8 },
        departmentsWithoutLeaders: { type: 'number', example: 2 },
      },
    },
  })
  async getStats(@Query('branchId') branchId?: string) {
    return this.departmentsService.getStats(branchId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get department by ID',
    description:
      'Retrieve detailed information about a specific church department including member relationships',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved department details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Ministry' },
        description: {
          type: 'string',
          example: 'Ministry focused on youth development',
        },
        leaderId: { type: 'string', example: 'member-1' },
        isActive: { type: 'boolean', example: true },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
        leader: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'member-1' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
          },
        },
        members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'member-2' },
              firstName: { type: 'string', example: 'Jane' },
              lastName: { type: 'string', example: 'Smith' },
              role: { type: 'string', example: 'Assistant' },
              joinedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00Z',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Department with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new department',
    description: 'Create a new church department with the provided information',
  })
  @ApiBody({
    type: CreateDepartmentDto,
    description: 'Department information for creation',
  })
  @ApiResponse({
    status: 201,
    description: 'Department successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Ministry' },
        description: {
          type: 'string',
          example: 'Ministry focused on youth development',
        },
        leaderId: { type: 'string', example: 'member-1' },
        isActive: { type: 'boolean', example: true },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['name should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Department with name already exists in branch',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example:
            'Department with name Youth Ministry already exists in this branch',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async create(@Body(ValidationPipe) createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update department',
    description: 'Update an existing church department with new information',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department to update',
    type: 'string',
    example: '1',
  })
  @ApiBody({
    type: UpdateDepartmentDto,
    description: 'Updated department information',
  })
  @ApiResponse({
    status: 200,
    description: 'Department successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Ministry' },
        description: {
          type: 'string',
          example: 'Updated ministry description',
        },
        leaderId: { type: 'string', example: 'member-1' },
        isActive: { type: 'boolean', example: true },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['name should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Department with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDepartmentDto: UpdateDepartmentDto
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Put(':id/restore')
  @ApiOperation({
    summary: 'Restore archived department',
    description:
      'Restore a previously archived church department to active status',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department to restore',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Department successfully restored',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        name: { type: 'string', example: 'Youth Ministry' },
        isActive: { type: 'boolean', example: true },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Department with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async restore(@Param('id') id: string) {
    return this.departmentsService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive department',
    description:
      'Archive a church department (soft delete - sets isActive to false)',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department to archive',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Department successfully archived',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        name: { type: 'string', example: 'Youth Ministry' },
        isActive: { type: 'boolean', example: false },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Department with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add member to department',
    description:
      'Add a church member to a specific department with an optional role',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department',
    type: 'string',
    example: '1',
  })
  @ApiBody({
    type: AddMemberDto,
    description: 'Member information to add to department',
  })
  @ApiResponse({
    status: 201,
    description: 'Member successfully added to department',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'dept-member-1' },
        departmentId: { type: 'string', example: '1' },
        memberId: { type: 'string', example: 'member-1' },
        role: { type: 'string', example: 'Assistant' },
        joinedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['memberId must be a UUID'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department or member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Department with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Member already in department',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Member is already in this department',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async addMember(
    @Param('id') departmentId: string,
    @Body(ValidationPipe) addMemberDto: AddMemberDto
  ) {
    return this.departmentsService.addMember(departmentId, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove member from department',
    description: 'Remove a church member from a specific department',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the department',
    type: 'string',
    example: '1',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Unique identifier of the member to remove',
    type: 'string',
    example: 'member-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Member successfully removed from department',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Member John Doe has been removed from Youth Ministry',
        },
        departmentMember: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'dept-member-1' },
            departmentId: { type: 'string', example: '1' },
            memberId: { type: 'string', example: 'member-1' },
            isActive: { type: 'boolean', example: false },
            leftAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department or member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Member not found in this department',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async removeMember(
    @Param('id') departmentId: string,
    @Param('memberId') memberId: string
  ) {
    return this.departmentsService.removeMember(departmentId, memberId);
  }
}
