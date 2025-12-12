import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('branches')
  findAllBranches() {
    return this.settingsService.findAllBranches();
  }

  @Get('branches/:id')
  findOneBranch(@Param('id') id: string) {
    return this.settingsService.findOneBranch(id);
  }

  @Post('branches')
  createBranch(@Body() createBranchDto: CreateBranchDto) {
    return this.settingsService.createBranch(createBranchDto);
  }

  @Put('branches/:id')
  updateBranch(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto
  ) {
    return this.settingsService.updateBranch(id, updateBranchDto);
  }

  @Delete('branches/:id')
  removeBranch(@Param('id') id: string) {
    return this.settingsService.removeBranch(id);
  }

  @Get('app-settings')
  getAppSettings() {
    return this.settingsService.getAppSettings();
  }

  @Put('app-settings/:key')
  updateAppSetting(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto
  ) {
    return this.settingsService.updateAppSetting(key, updateSettingDto);
  }
}
