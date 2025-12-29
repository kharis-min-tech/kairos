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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll(@Query(ValidationPipe) query: QueryDepartmentDto) {
    return this.departmentsService.findAll(query);
  }

  @Get('stats')
  async getStats(@Query('branchId') branchId?: string) {
    return this.departmentsService.getStats(branchId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDepartmentDto: UpdateDepartmentDto
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    return this.departmentsService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') departmentId: string,
    @Body(ValidationPipe) addMemberDto: AddMemberDto
  ) {
    return this.departmentsService.addMember(departmentId, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') departmentId: string,
    @Param('memberId') memberId: string
  ) {
    return this.departmentsService.removeMember(departmentId, memberId);
  }
}
