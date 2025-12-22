import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  readonly lastName?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly phone?: string;

  @IsOptional()
  @IsDateString()
  readonly dateOfBirth?: string;

  @IsOptional()
  @IsString()
  readonly address?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  readonly gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'])
  readonly maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  @IsOptional()
  @IsString()
  readonly occupation?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
