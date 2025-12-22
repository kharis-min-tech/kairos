import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsUUID()
  readonly leaderId?: string;

  @IsOptional()
  @IsUUID()
  readonly branchId?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
