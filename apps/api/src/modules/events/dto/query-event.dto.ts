import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumberString,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEventDto {
  @ApiPropertyOptional({
    description:
      'Search term to filter events by name, description, or location',
    example: 'youth',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter events by branch identifier',
    example: 'branch-1',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter events by active status',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter events starting from this date (ISO 8601 format)',
    example: '2024-01-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter events ending before this date (ISO 8601 format)',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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
    example: 'startDate',
    type: 'string',
    enum: [
      'name',
      'startDate',
      'endDate',
      'createdAt',
      'updatedAt',
      'registrationCount',
    ],
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
