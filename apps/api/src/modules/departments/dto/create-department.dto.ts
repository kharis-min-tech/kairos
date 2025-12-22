import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;

  @IsUUID()
  branchId!: string;
}
