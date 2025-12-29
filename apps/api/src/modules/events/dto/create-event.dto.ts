import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    description: 'Event name',
    example: 'Youth Conference 2024',
    type: 'string',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example:
      'Annual youth conference featuring inspiring speakers, workshops, and fellowship activities',
    type: 'string',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Event start date and time in ISO 8601 format',
    example: '2024-06-15T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({
    description: 'Event end date and time in ISO 8601 format',
    example: '2024-06-15T17:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Event location or venue',
    example: 'Main Auditorium',
    type: 'string',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees allowed',
    example: 200,
    type: 'number',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Registration fee for the event (0 for free events)',
    example: 25.0,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  fee?: number;

  @ApiPropertyOptional({
    description: 'Whether the event is active or archived',
    example: true,
    type: 'boolean',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'UUID of the branch hosting this event',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  branchId!: string;
}
