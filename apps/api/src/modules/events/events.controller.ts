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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all events',
    description:
      'Retrieve a paginated list of church events with optional filtering by date range and sorting capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved events list',
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
              name: { type: 'string', example: 'Youth Conference 2024' },
              description: {
                type: 'string',
                example: 'Annual youth conference with inspiring speakers',
              },
              startDate: {
                type: 'string',
                format: 'date-time',
                example: '2024-06-15T09:00:00Z',
              },
              endDate: {
                type: 'string',
                format: 'date-time',
                example: '2024-06-15T17:00:00Z',
              },
              location: { type: 'string', example: 'Main Auditorium' },
              capacity: { type: 'number', example: 200 },
              fee: { type: 'number', example: 25.0 },
              registrationCount: { type: 'number', example: 150 },
              isActive: { type: 'boolean', example: true },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 25 },
            pages: { type: 'number', example: 3 },
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
          example: ['startDate must be a valid ISO 8601 date string'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async findAll(@Query(ValidationPipe) query: QueryEventDto) {
    return this.eventsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get event statistics',
    description:
      'Retrieve statistical information about church events including counts, registrations, and revenue',
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
    description: 'Successfully retrieved event statistics',
    schema: {
      type: 'object',
      properties: {
        totalEvents: { type: 'number', example: 25 },
        activeEvents: { type: 'number', example: 20 },
        upcomingEvents: { type: 'number', example: 8 },
        pastEvents: { type: 'number', example: 12 },
        totalRegistrations: { type: 'number', example: 450 },
        totalRevenue: { type: 'number', example: 11250.0 },
        averageAttendance: { type: 'number', example: 18 },
        eventsWithFees: { type: 'number', example: 15 },
        freeEvents: { type: 'number', example: 10 },
      },
    },
  })
  async getStats(@Query('branchId') branchId?: string) {
    return this.eventsService.getStats(branchId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event by ID',
    description:
      'Retrieve detailed information about a specific church event including registration details',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved event details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Conference 2024' },
        description: {
          type: 'string',
          example:
            'Annual youth conference with inspiring speakers and workshops',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T09:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T17:00:00Z',
        },
        location: { type: 'string', example: 'Main Auditorium' },
        capacity: { type: 'number', example: 200 },
        fee: { type: 'number', example: 25.0 },
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
        registrations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'reg-1' },
              memberId: { type: 'string', example: 'member-1' },
              member: {
                type: 'object',
                properties: {
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                },
              },
              registrationDate: {
                type: 'string',
                format: 'date-time',
                example: '2024-05-01T00:00:00Z',
              },
              notes: {
                type: 'string',
                example: 'Dietary restrictions: vegetarian',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Event with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new event',
    description:
      'Create a new church event with the provided information including date/time specifications',
  })
  @ApiBody({
    type: CreateEventDto,
    description: 'Event information for creation',
  })
  @ApiResponse({
    status: 201,
    description: 'Event successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Conference 2024' },
        description: {
          type: 'string',
          example: 'Annual youth conference with inspiring speakers',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T09:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T17:00:00Z',
        },
        location: { type: 'string', example: 'Main Auditorium' },
        capacity: { type: 'number', example: 200 },
        fee: { type: 'number', example: 25.0 },
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
          example: [
            'name should not be empty',
            'startDate must be a valid ISO 8601 date string',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Event with name already exists in the same time period',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example:
            'Event with name Youth Conference 2024 already exists in this time period',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update event',
    description:
      'Update an existing church event with new information including date/time modifications',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event to update',
    type: 'string',
    example: '1',
  })
  @ApiBody({
    type: UpdateEventDto,
    description: 'Updated event information',
  })
  @ApiResponse({
    status: 200,
    description: 'Event successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        branchId: { type: 'string', example: 'branch-1' },
        name: { type: 'string', example: 'Youth Conference 2024' },
        description: { type: 'string', example: 'Updated event description' },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T09:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-06-15T17:00:00Z',
        },
        location: { type: 'string', example: 'Main Auditorium' },
        capacity: { type: 'number', example: 250 },
        fee: { type: 'number', example: 30.0 },
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
          example: ['startDate must be a valid ISO 8601 date string'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Event with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Put(':id/restore')
  @ApiOperation({
    summary: 'Restore archived event',
    description: 'Restore a previously archived church event to active status',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event to restore',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Event successfully restored',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        name: { type: 'string', example: 'Youth Conference 2024' },
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
    description: 'Event not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Event with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async restore(@Param('id') id: string) {
    return this.eventsService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive event',
    description:
      'Archive a church event (soft delete - sets isActive to false)',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event to archive',
    type: 'string',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Event successfully archived',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        name: { type: 'string', example: 'Youth Conference 2024' },
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
    description: 'Event not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Event with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register member for event',
    description:
      'Register a church member for a specific event with optional notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event',
    type: 'string',
    example: '1',
  })
  @ApiBody({
    type: RegisterEventDto,
    description: 'Member registration information',
  })
  @ApiResponse({
    status: 201,
    description: 'Member successfully registered for event',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'reg-1' },
        eventId: { type: 'string', example: '1' },
        memberId: { type: 'string', example: 'member-1' },
        registrationDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00Z',
        },
        notes: { type: 'string', example: 'Dietary restrictions: vegetarian' },
        paymentStatus: { type: 'string', example: 'PENDING' },
        amountPaid: { type: 'number', example: 0 },
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
    description: 'Event or member not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Event with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Member already registered for event or event is full',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Member is already registered for this event',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async registerMember(
    @Param('id') eventId: string,
    @Body(ValidationPipe) registerEventDto: RegisterEventDto
  ) {
    return this.eventsService.registerMember(eventId, registerEventDto);
  }

  @Delete(':id/register/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister member from event',
    description: "Remove a church member's registration from a specific event",
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the event',
    type: 'string',
    example: '1',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Unique identifier of the member to unregister',
    type: 'string',
    example: 'member-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Member successfully unregistered from event',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Member John Doe has been unregistered from Youth Conference 2024',
        },
        registration: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'reg-1' },
            eventId: { type: 'string', example: '1' },
            memberId: { type: 'string', example: 'member-1' },
            paymentStatus: { type: 'string', example: 'CANCELLED' },
            cancelledAt: {
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
    description: 'Event or member registration not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Member registration not found for this event',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async unregisterMember(
    @Param('id') eventId: string,
    @Param('memberId') memberId: string
  ) {
    return this.eventsService.unregisterMember(eventId, memberId);
  }
}
