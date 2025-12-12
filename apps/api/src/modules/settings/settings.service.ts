import { Injectable } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  findAllBranches() {
    return { message: 'This action returns all branches' };
  }

  findOneBranch(id: string) {
    return { message: `This action returns branch #${id}` };
  }

  createBranch(createBranchDto: CreateBranchDto) {
    return { message: 'This action adds a new branch', data: createBranchDto };
  }

  updateBranch(id: string, updateBranchDto: UpdateBranchDto) {
    return {
      message: `This action updates branch #${id}`,
      data: updateBranchDto,
    };
  }

  removeBranch(id: string) {
    return { message: `This action removes branch #${id}` };
  }

  getAppSettings() {
    return { message: 'This action returns app settings' };
  }

  updateAppSetting(key: string, updateSettingDto: UpdateSettingDto) {
    return {
      message: `This action updates app setting ${key}`,
      data: updateSettingDto,
    };
  }
}
