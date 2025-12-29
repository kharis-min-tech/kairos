import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiPropertyOptional({
    description: "Member's first name",
    example: 'John',
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: "^[a-zA-Z\\s'-]+$",
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message:
      'First name must contain only letters, spaces, hyphens, and apostrophes',
  })
  readonly firstName?: string;

  @ApiPropertyOptional({
    description: "Member's last name",
    example: 'Doe',
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: "^[a-zA-Z\\s'-]+$",
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message:
      'Last name must contain only letters, spaces, hyphens, and apostrophes',
  })
  readonly lastName?: string;

  @ApiPropertyOptional({
    description: "Member's email address",
    example: 'john.doe@example.com',
    type: 'string',
    format: 'email',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(1, 255)
  readonly email?: string;

  @ApiPropertyOptional({
    description: "Member's phone number in international format (E.164)",
    example: '+1234567890',
    type: 'string',
    pattern: '^\\+[1-9]\\d{1,14}$',
    maxLength: 15,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be in international format (E.164) starting with + and containing 7-15 digits',
  })
  readonly phone?: string;

  @ApiPropertyOptional({
    description: "Member's date of birth in ISO 8601 date format (YYYY-MM-DD)",
    example: '1990-01-01',
    type: 'string',
    format: 'date',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid ISO 8601 date (YYYY-MM-DD)' }
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date of birth must be in YYYY-MM-DD format',
  })
  readonly dateOfBirth?: string;

  @ApiPropertyOptional({
    description: "Member's physical address",
    example: '123 Main St, City, State, 12345',
    type: 'string',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  readonly address?: string;

  @ApiPropertyOptional({
    description: "Member's gender",
    example: 'MALE',
    enum: ['MALE', 'FEMALE'],
    type: 'string',
  })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE'], {
    message: 'Gender must be either MALE or FEMALE',
  })
  readonly gender?: 'MALE' | 'FEMALE';

  @ApiPropertyOptional({
    description: "Member's marital status",
    example: 'MARRIED',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
    type: 'string',
  })
  @IsOptional()
  @IsIn(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
    message:
      'Marital status must be one of: SINGLE, MARRIED, DIVORCED, WIDOWED',
  })
  readonly maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

  @ApiPropertyOptional({
    description: "Member's occupation or profession",
    example: 'Software Engineer',
    type: 'string',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  readonly occupation?: string;

  @ApiPropertyOptional({
    description: 'Whether the member is active or archived',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
