import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsPositive,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Event name',
    example: 'Youth Conference 2024',
    type: 'string',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  readonly name?: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'Updated event description with new activities and speakers',
    type: 'string',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({
    description: 'Event start date and time in ISO 8601 format',
    example: '2024-06-15T09:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  readonly startDate?: string;

  @ApiPropertyOptional({
    description: 'Event end date and time in ISO 8601 format',
    example: '2024-06-15T17:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  readonly endDate?: string;

  @ApiPropertyOptional({
    description: 'Event location or venue',
    example: 'Main Auditorium',
    type: 'string',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  readonly location?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees allowed',
    example: 250,
    type: 'number',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  readonly capacity?: number;

  @ApiPropertyOptional({
    description: 'Registration fee for the event (0 for free events)',
    example: 30.0,
    type: 'number',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  readonly fee?: number;

  @ApiPropertyOptional({
    description: 'Whether the event is active or archived',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @ApiPropertyOptional({
    description: 'UUID of the branch hosting this event',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: 'string',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  readonly branchId?: string;
}
