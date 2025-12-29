import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEventDto {
  @ApiProperty({
    description: 'UUID of the member to register for the event',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    description:
      'Additional notes for the registration (e.g., dietary restrictions, special needs)',
    example:
      'Dietary restrictions: vegetarian, wheelchair accessible seating needed',
    type: 'string',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
