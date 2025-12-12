import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { FellowshipsService } from './fellowships.service';
import { CreateFellowshipDto } from './dto/create-fellowship.dto';
import { UpdateFellowshipDto } from './dto/update-fellowship.dto';

@Controller('fellowships')
export class FellowshipsController {
  constructor(private readonly fellowshipsService: FellowshipsService) {}

  @Get()
  findAll() {
    return this.fellowshipsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fellowshipsService.findOne(id);
  }

  @Post()
  create(@Body() createFellowshipDto: CreateFellowshipDto) {
    return this.fellowshipsService.create(createFellowshipDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateFellowshipDto: UpdateFellowshipDto
  ) {
    return this.fellowshipsService.update(id, updateFellowshipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fellowshipsService.remove(id);
  }
}
