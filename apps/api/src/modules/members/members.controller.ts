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
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all members',
    description:
      'Retrieve a paginated list of church members with optional filtering and sorting capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved members list',
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
              firstName: { type: 'string', example: 'John' },
              lastName: { type: 'string', example: 'Doe' },
              email: { type: 'string', example: 'john.doe@example.com' },
              phone: { type: 'string', example: '+1234567890' },
              isActive: { type: 'boolean', example: true },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            pages: { type: 'number', example: 10 },
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
  async findAll(@Query(ValidationPipe) query: QueryMemberDto) {
    return this.membersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get member statistics',
    description:
      'Retrieve statistical information about church members including counts by various categories',
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
    description: 'Successfully retrieved member statistics',
    schema: {
      type: 'object',
      properties: {
        totalMembers: { type: 'number', example: 150 },
        activeMembers: { type: 'number', example: 140 },
        inactiveMembers: { type: 'number', example: 10 },
        maleMembers: { type: 'number', example: 75 },
        femaleMembers: { type: 'number', example: 75 },
        marriedMembers: { type: 'number', example: 80 },
        singleMembers: { type: 'number', example: 70 },
      },
    },
  })
  async getStats(@Query('branchId') branchId?: string) {
    return this.membersService.getStats(branchId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get member by ID',
    description: 'Retrieve detailed information about a specific church member',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the member',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved member details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        phone: { type: 'string', example: '+1234567890' },
        address: { type: 'string', example: '123 Main St, City, State' },
        dateOfBirth: { type: 'string', format: 'date', example: '1990-01-01' },
        gender: { type: 'string', enum: ['MALE', 'FEMALE'], example: 'MALE' },
        maritalStatus: {
          type: 'string',
          enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
          example: 'MARRIED',
        },
        occupation: { type: 'string', example: 'Software Engineer' },
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
    status: 404,
    description: 'Member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Member with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new member',
    description: 'Create a new church member with the provided information',
  })
  @ApiBody({
    type: CreateMemberDto,
    description: 'Member information for creation',
  })
  @ApiResponse({
    status: 201,
    description: 'Member successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        phone: { type: 'string', example: '+1234567890' },
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
          example: ['firstName should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Member with email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Member with email john.doe@example.com already exists',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async create(@Body(ValidationPipe) createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update member',
    description: 'Update an existing church member with new information',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the member to update',
    type: 'string',
    example: '1',
  })
  @ApiBody({
    type: UpdateMemberDto,
    description: 'Updated member information',
  })
  @ApiResponse({
    status: 200,
    description: 'Member successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        phone: { type: 'string', example: '+1234567890' },
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
          example: ['email must be a valid email'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Member with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMemberDto: UpdateMemberDto
  ) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Put(':id/restore')
  @ApiOperation({
    summary: 'Restore archived member',
    description: 'Restore a previously archived church member to active status',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the member to restore',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Member successfully restored',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
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
    description: 'Member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Member with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async restore(@Param('id') id: string) {
    return this.membersService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive member',
    description:
      'Archive a church member (soft delete - sets isActive to false)',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the member to archive',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Member successfully archived',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
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
    description: 'Member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Member with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
