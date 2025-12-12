import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get('announcements')
  findAllAnnouncements() {
    return this.communicationsService.findAllAnnouncements();
  }

  @Get('announcements/:id')
  findOneAnnouncement(@Param('id') id: string) {
    return this.communicationsService.findOneAnnouncement(id);
  }

  @Post('announcements')
  createAnnouncement(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.communicationsService.createAnnouncement(createAnnouncementDto);
  }

  @Put('announcements/:id')
  updateAnnouncement(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto
  ) {
    return this.communicationsService.updateAnnouncement(
      id,
      updateAnnouncementDto
    );
  }

  @Delete('announcements/:id')
  removeAnnouncement(@Param('id') id: string) {
    return this.communicationsService.removeAnnouncement(id);
  }

  @Get('messages')
  findAllMessages() {
    return this.communicationsService.findAllMessages();
  }

  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.communicationsService.createMessage(createMessageDto);
  }
}
