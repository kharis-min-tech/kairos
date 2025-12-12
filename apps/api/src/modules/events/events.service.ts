import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  findAll() {
    return { message: 'This action returns all events' };
  }

  findOne(id: string) {
    return { message: `This action returns event #${id}` };
  }

  create(createEventDto: CreateEventDto) {
    return { message: 'This action adds a new event', data: createEventDto };
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return {
      message: `This action updates event #${id}`,
      data: updateEventDto,
    };
  }

  remove(id: string) {
    return { message: `This action removes event #${id}` };
  }
}
