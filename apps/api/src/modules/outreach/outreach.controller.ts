import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CreateSoulDto } from './dto/create-soul.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get('programs')
  findAllPrograms() {
    return this.outreachService.findAllPrograms();
  }

  @Get('programs/:id')
  findOneProgram(@Param('id') id: string) {
    return this.outreachService.findOneProgram(id);
  }

  @Post('programs')
  createProgram(@Body() createProgramDto: CreateProgramDto) {
    return this.outreachService.createProgram(createProgramDto);
  }

  @Put('programs/:id')
  updateProgram(
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto
  ) {
    return this.outreachService.updateProgram(id, updateProgramDto);
  }

  @Delete('programs/:id')
  removeProgram(@Param('id') id: string) {
    return this.outreachService.removeProgram(id);
  }

  @Get('souls')
  findAllSouls() {
    return this.outreachService.findAllSouls();
  }

  @Post('souls')
  createSoul(@Body() createSoulDto: CreateSoulDto) {
    return this.outreachService.createSoul(createSoulDto);
  }

  @Post('souls/:id/follow-ups')
  createFollowUp(
    @Param('id') soulId: string,
    @Body() createFollowUpDto: CreateFollowUpDto
  ) {
    return this.outreachService.createFollowUp(soulId, createFollowUpDto);
  }

  @Get('souls/:id/follow-ups')
  getFollowUps(@Param('id') soulId: string) {
    return this.outreachService.getFollowUps(soulId);
  }
}
