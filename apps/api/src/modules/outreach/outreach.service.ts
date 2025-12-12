import { Injectable } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CreateSoulDto } from './dto/create-soul.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Injectable()
export class OutreachService {
  findAllPrograms() {
    return { message: 'This action returns all outreach programs' };
  }

  findOneProgram(id: string) {
    return { message: `This action returns outreach program #${id}` };
  }

  createProgram(createProgramDto: CreateProgramDto) {
    return {
      message: 'This action adds a new outreach program',
      data: createProgramDto,
    };
  }

  updateProgram(id: string, updateProgramDto: UpdateProgramDto) {
    return {
      message: `This action updates outreach program #${id}`,
      data: updateProgramDto,
    };
  }

  removeProgram(id: string) {
    return { message: `This action removes outreach program #${id}` };
  }

  findAllSouls() {
    return { message: 'This action returns all souls' };
  }

  createSoul(createSoulDto: CreateSoulDto) {
    return { message: 'This action adds a new soul', data: createSoulDto };
  }

  createFollowUp(soulId: string, createFollowUpDto: CreateFollowUpDto) {
    return {
      message: `This action creates a follow-up for soul #${soulId}`,
      data: createFollowUpDto,
    };
  }

  getFollowUps(soulId: string) {
    return { message: `This action returns follow-ups for soul #${soulId}` };
  }
}
