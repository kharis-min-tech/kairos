import { Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  findAll() {
    return { message: 'This action returns all members' };
  }

  findOne(id: string) {
    return { message: `This action returns member #${id}` };
  }

  create(createMemberDto: CreateMemberDto) {
    return { message: 'This action adds a new member', data: createMemberDto };
  }

  update(id: string, updateMemberDto: UpdateMemberDto) {
    return {
      message: `This action updates member #${id}`,
      data: updateMemberDto,
    };
  }

  remove(id: string) {
    return { message: `This action removes member #${id}` };
  }
}
