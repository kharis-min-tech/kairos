import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Youth Ministry',
    type: 'string',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Ministry focused on youth development and spiritual growth',
    type: 'string',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'UUID of the member who leads this department',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  leaderId?: string;

  @ApiProperty({
    description: 'UUID of the branch this department belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  branchId!: string;
}
