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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(@Query(ValidationPipe) query: QueryEventDto) {
    return this.eventsService.findAll(query);
  }

  @Get('stats')
  async getStats(@Query('branchId') branchId?: string) {
    return this.eventsService.getStats(branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    return this.eventsService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  async registerMember(
    @Param('id') eventId: string,
    @Body(ValidationPipe) registerEventDto: RegisterEventDto
  ) {
    return this.eventsService.registerMember(eventId, registerEventDto);
  }

  @Delete(':id/register/:memberId')
  @HttpCode(HttpStatus.OK)
  async unregisterMember(
    @Param('id') eventId: string,
    @Param('memberId') memberId: string
  ) {
    return this.eventsService.unregisterMember(eventId, memberId);
  }
}
