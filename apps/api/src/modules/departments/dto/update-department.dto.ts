import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'Department name',
    example: 'Youth Ministry',
    type: 'string',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  readonly name?: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Updated ministry description focusing on youth development',
    type: 'string',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({
    description: 'UUID of the member who leads this department',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  readonly leaderId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the branch this department belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  readonly branchId?: string;

  @ApiPropertyOptional({
    description: 'Whether the department is active or archived',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
