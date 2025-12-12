import { Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class CommunicationsService {
  findAllAnnouncements() {
    return { message: 'This action returns all announcements' };
  }

  findOneAnnouncement(id: string) {
    return { message: `This action returns announcement #${id}` };
  }

  createAnnouncement(createAnnouncementDto: CreateAnnouncementDto) {
    return {
      message: 'This action adds a new announcement',
      data: createAnnouncementDto,
    };
  }

  updateAnnouncement(id: string, updateAnnouncementDto: UpdateAnnouncementDto) {
    return {
      message: `This action updates announcement #${id}`,
      data: updateAnnouncementDto,
    };
  }

  removeAnnouncement(id: string) {
    return { message: `This action removes announcement #${id}` };
  }

  findAllMessages() {
    return { message: 'This action returns all messages' };
  }

  createMessage(createMessageDto: CreateMessageDto) {
    return {
      message: 'This action creates a new message',
      data: createMessageDto,
    };
  }
}
