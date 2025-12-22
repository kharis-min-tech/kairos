import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  branchId!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'])
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  @IsOptional()
  @IsString()
  occupation?: string;
}
