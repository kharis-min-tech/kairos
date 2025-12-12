import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SecurityService } from './security.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('roles')
  findAllRoles() {
    return this.securityService.findAllRoles();
  }

  @Get('roles/:id')
  findOneRole(@Param('id') id: string) {
    return this.securityService.findOneRole(id);
  }

  @Post('roles')
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.securityService.createRole(createRoleDto);
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.securityService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  removeRole(@Param('id') id: string) {
    return this.securityService.removeRole(id);
  }

  @Post('users/:userId/roles')
  assignRole(
    @Param('userId') userId: string,
    @Body() assignRoleDto: AssignRoleDto
  ) {
    return this.securityService.assignRole(userId, assignRoleDto);
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.securityService.getAuditLogs();
  }

  @Get('access-logs')
  getAccessLogs() {
    return this.securityService.getAccessLogs();
  }
}
