import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({
    description: 'UUID of the member to add to the department',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    description: 'Role of the member in the department',
    example: 'Assistant Leader',
    type: 'string',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  role?: string;
}
