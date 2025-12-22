import {
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  IsNumberString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMemberDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'])
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
