import { Injectable } from '@nestjs/common';
import { CreateFellowshipDto } from './dto/create-fellowship.dto';
import { UpdateFellowshipDto } from './dto/update-fellowship.dto';

@Injectable()
export class FellowshipsService {
  findAll() {
    return { message: 'This action returns all fellowships' };
  }

  findOne(id: string) {
    return { message: `This action returns fellowship #${id}` };
  }

  create(createFellowshipDto: CreateFellowshipDto) {
    return {
      message: 'This action adds a new fellowship',
      data: createFellowshipDto,
    };
  }

  update(id: string, updateFellowshipDto: UpdateFellowshipDto) {
    return {
      message: `This action updates fellowship #${id}`,
      data: updateFellowshipDto,
    };
  }

  remove(id: string) {
    return { message: `This action removes fellowship #${id}` };
  }
}
