import { Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  findAll() {
    return { message: 'This action returns all departments' };
  }

  findOne(id: string) {
    return { message: `This action returns department #${id}` };
  }

  create(createDepartmentDto: CreateDepartmentDto) {
    return {
      message: 'This action adds a new department',
      data: createDepartmentDto,
    };
  }

  update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    return {
      message: `This action updates department #${id}`,
      data: updateDepartmentDto,
    };
  }

  remove(id: string) {
    return { message: `This action removes department #${id}` };
  }
}
