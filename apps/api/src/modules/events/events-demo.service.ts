import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';

// In-memory demo data
const demoEvents = [
  {
    id: '1',
    branchId: 'branch-1',
    title: 'Sunday Service',
    description: 'Weekly Sunday worship service',
    startDate: new Date('2024-12-29T10:00:00Z'),
    endDate: new Date('2024-12-29T12:00:00Z'),
    location: 'Main Sanctuary',
    eventType: 'SERVICE' as const,
    capacity: 200,
    fee: 0,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
  {
    id: '2',
    branchId: 'branch-1',
    title: 'Youth Conference',
    description: 'Annual youth conference and retreat',
    startDate: new Date('2025-01-15T09:00:00Z'),
    endDate: new Date('2025-01-17T17:00:00Z'),
    location: 'Conference Center',
    eventType: 'CONFERENCE' as const,
    capacity: 100,
    fee: 50,
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
    },
  },
];

@Injectable()
export class EventsDemoService {
  private events = [...demoEvents];
  private nextId = 3;

  async findAll(query: QueryEventDto) {
    const {
      search,
      branchId,
      isActive = true,
      page = '1',
      limit = '10',
      sortBy = 'startDate',
      sortOrder = 'asc',
    } = query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Filter events
    const filteredEvents = this.events.filter((event) => {
      if (event.isActive !== isActive) return false;
      if (branchId && event.branchId !== branchId) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        return (
          event.title.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort events
    filteredEvents.sort((a, b) => {
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
    const total = filteredEvents.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedEvents = filteredEvents.slice(skip, skip + limitNum);

    return {
      data: paginatedEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const event = this.events.find((e) => e.id === id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async create(createEventDto: CreateEventDto) {
    const newEvent: any = {
      id: this.nextId.toString(),
      branchId: createEventDto.branchId,
      title: createEventDto.name, // Map name to title
      description: createEventDto.description || '',
      startDate: new Date(createEventDto.startDate),
      endDate: createEventDto.endDate
        ? new Date(createEventDto.endDate)
        : new Date(createEventDto.startDate),
      location: createEventDto.location || '',
      eventType: 'OTHER' as const, // Default event type
      capacity: createEventDto.capacity || 0,
      fee: createEventDto.fee || 0,
      isActive: createEventDto.isActive !== false, // Default to true
      createdAt: new Date(),
      updatedAt: new Date(),
      branch: {
        id: createEventDto.branchId,
        name: 'Main Branch',
      },
    };

    this.events.push(newEvent);
    this.nextId++;

    return newEvent;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const eventIndex = this.events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const updatedEvent: any = {
      ...this.events[eventIndex],
      ...(updateEventDto.name && { title: updateEventDto.name }), // Map name to title
      ...(updateEventDto.description !== undefined && {
        description: updateEventDto.description,
      }),
      ...(updateEventDto.location !== undefined && {
        location: updateEventDto.location,
      }),
      ...(updateEventDto.capacity !== undefined && {
        capacity: updateEventDto.capacity,
      }),
      ...(updateEventDto.fee !== undefined && { fee: updateEventDto.fee }),
      ...(updateEventDto.isActive !== undefined && {
        isActive: updateEventDto.isActive,
      }),
      ...(updateEventDto.startDate && {
        startDate: new Date(updateEventDto.startDate),
      }),
      ...(updateEventDto.endDate && {
        endDate: new Date(updateEventDto.endDate),
      }),
      updatedAt: new Date(),
    };

    this.events[eventIndex] = updatedEvent;

    return updatedEvent;
  }

  async remove(id: string) {
    const eventIndex = this.events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    this.events[eventIndex] = {
      ...this.events[eventIndex],
      isActive: false,
      updatedAt: new Date(),
    };

    return {
      message: `Event "${this.events[eventIndex].title}" has been archived`,
      event: this.events[eventIndex],
    };
  }

  async restore(id: string) {
    const eventIndex = this.events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (this.events[eventIndex].isActive) {
      throw new BadRequestException('Event is already active');
    }

    this.events[eventIndex] = {
      ...this.events[eventIndex],
      isActive: true,
      updatedAt: new Date(),
    };

    return this.events[eventIndex];
  }

  async getStats(branchId?: string) {
    const filteredEvents = branchId
      ? this.events.filter((e) => e.branchId === branchId)
      : this.events;

    const totalEvents = filteredEvents.length;
    const activeEvents = filteredEvents.filter((e) => e.isActive).length;
    const archivedEvents = filteredEvents.filter((e) => !e.isActive).length;
    const upcomingEvents = filteredEvents.filter(
      (e) => e.isActive && new Date(e.startDate) > new Date()
    ).length;
    const pastEvents = filteredEvents.filter(
      (e) => e.isActive && new Date(e.endDate) < new Date()
    ).length;

    return {
      total: totalEvents,
      active: activeEvents,
      archived: archivedEvents,
      upcoming: upcomingEvents,
      past: pastEvents,
    };
  }
}
