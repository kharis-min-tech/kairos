import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { Event, Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List events with filtering, pagination, and search
   */
  async findAll(query: QueryEventDto) {
    const {
      search,
      branchId,
      isActive = true,
      startDate,
      endDate,
      page = '1',
      limit = '10',
      sortBy = 'startDate',
      sortOrder = 'asc',
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.EventWhereInput = {
      isActive,
      ...(branchId && { branchId }),
      ...(startDate && { startDate: { gte: new Date(startDate) } }),
      ...(endDate && { endDate: { lte: new Date(endDate) } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build order by clause
    const orderBy: Prisma.EventOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
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
          _count: {
            select: {
              registrations: true,
              attendance: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get event by ID with full details
   */
  async findOne(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
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
        registrations: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            registeredAt: 'asc',
          },
        },
        attendance: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  /**
   * Create a new event
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    const { startDate, endDate, ...eventData } = createEventDto;

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: createEventDto.branchId },
    });

    if (!branch) {
      throw new BadRequestException(
        `Branch with ID ${createEventDto.branchId} not found`
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create event
    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        startDate: start,
        endDate: end,
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

    return event;
  }

  /**
   * Update event with partial data
   */
  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    // Check if event exists
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const { startDate, endDate, ...updateData } = updateEventDto;

    // Validate branch exists if updating branchId
    if (updateEventDto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: updateEventDto.branchId },
      });

      if (!branch) {
        throw new BadRequestException(
          `Branch with ID ${updateEventDto.branchId} not found`
        );
      }
    }

    // Validate dates if provided
    const start = startDate ? new Date(startDate) : existingEvent.startDate;
    const end = endDate ? new Date(endDate) : existingEvent.endDate;

    if (end && end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    // Update event
    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: {
        ...updateData,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
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

    return updatedEvent;
  }

  /**
   * Archive event (soft delete)
   */
  async remove(id: string): Promise<{ message: string; event: Event }> {
    // Check if event exists
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Archive the event
    const archivedEvent = await this.prisma.event.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      message: `Event "${archivedEvent.name}" has been archived`,
      event: archivedEvent,
    };
  }

  /**
   * Restore archived event
   */
  async restore(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (event.isActive) {
      throw new BadRequestException('Event is already active');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Register member for event
   */
  async registerMember(eventId: string, registerEventDto: RegisterEventDto) {
    // Validate event exists and is active
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (!event.isActive) {
      throw new BadRequestException('Cannot register for archived event');
    }

    // Check capacity
    if (event.capacity && event._count.registrations >= event.capacity) {
      throw new BadRequestException('Event is at full capacity');
    }

    // Validate member exists
    const member = await this.prisma.member.findUnique({
      where: { id: registerEventDto.memberId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${registerEventDto.memberId} not found`
      );
    }

    // Check if member is already registered
    const existingRegistration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        memberId: registerEventDto.memberId,
      },
    });

    if (existingRegistration) {
      throw new BadRequestException(
        'Member is already registered for this event'
      );
    }

    // Register member
    const registration = await this.prisma.eventRegistration.create({
      data: {
        eventId,
        memberId: registerEventDto.memberId,
        notes: registerEventDto.notes,
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
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      },
    });

    return registration;
  }

  /**
   * Unregister member from event
   */
  async unregisterMember(eventId: string, memberId: string) {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        memberId,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    await this.prisma.eventRegistration.delete({
      where: { id: registration.id },
    });

    return { message: 'Member unregistered from event successfully' };
  }

  /**
   * Get event statistics
   */
  async getStats(branchId?: string) {
    const where: Prisma.EventWhereInput = {
      ...(branchId && { branchId }),
    };

    const now = new Date();

    const [
      totalEvents,
      activeEvents,
      archivedEvents,
      upcomingEvents,
      pastEvents,
      totalRegistrations,
    ] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.count({ where: { ...where, isActive: true } }),
      this.prisma.event.count({ where: { ...where, isActive: false } }),
      this.prisma.event.count({
        where: {
          ...where,
          isActive: true,
          startDate: { gte: now },
        },
      }),
      this.prisma.event.count({
        where: {
          ...where,
          isActive: true,
          startDate: { lt: now },
        },
      }),
      this.prisma.eventRegistration.count({
        where: {
          event: where,
        },
      }),
    ]);

    return {
      total: totalEvents,
      active: activeEvents,
      archived: archivedEvents,
      upcoming: upcomingEvents,
      past: pastEvents,
      totalRegistrations,
    };
  }
}
