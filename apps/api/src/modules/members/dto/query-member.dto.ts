import {
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  IsNumberString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMemberDto {
  @ApiPropertyOptional({
    description: 'Search term to filter members by name, email, or phone',
    example: 'john',
    type: 'string',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9\s@._+-]+$/, {
    message:
      'Search term must contain only alphanumeric characters, spaces, and common symbols',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter members by branch identifier',
    example: 'branch-1',
    type: 'string',
    pattern: '^[a-zA-Z0-9_-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Branch ID must contain only alphanumeric characters, hyphens, and underscores',
  })
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter members by gender',
    example: 'MALE',
    enum: ['MALE', 'FEMALE'],
    type: 'string',
  })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE'], {
    message: 'Gender must be either MALE or FEMALE',
  })
  gender?: 'MALE' | 'FEMALE';

  @ApiPropertyOptional({
    description: 'Filter members by marital status',
    example: 'MARRIED',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
    type: 'string',
  })
  @IsOptional()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
    message:
      'Marital status must be one of: SINGLE, MARRIED, DIVORCED, WIDOWED',
  })
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  @ApiPropertyOptional({
    description: 'Filter members by active status',
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
    maximum: 1000,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Page must be a valid number' })
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page (maximum 100)',
    example: '10',
    type: 'string',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Limit must be a valid number' })
  limit?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'firstName',
    type: 'string',
    enum: ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'], {
    message:
      'Sort field must be one of: firstName, lastName, email, createdAt, updatedAt',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order direction',
    example: 'asc',
    enum: ['asc', 'desc'],
    type: 'string',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'Sort order must be either asc or desc',
  })
  sortOrder?: 'asc' | 'desc';
}
