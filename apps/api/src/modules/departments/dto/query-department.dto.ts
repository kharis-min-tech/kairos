import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumberString,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDepartmentDto {
  @ApiPropertyOptional({
    description: 'Search term to filter departments by name or description',
    example: 'youth',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter departments by branch identifier',
    example: 'branch-1',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter departments by active status',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination (starts from 1)',
    example: '1',
    type: 'string',
    minimum: 1,
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page (maximum 100)',
    example: '10',
    type: 'string',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
    type: 'string',
    enum: ['name', 'createdAt', 'updatedAt', 'memberCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order direction',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
