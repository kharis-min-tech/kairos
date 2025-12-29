import { IsUUID, IsOptional, IsString } from 'class-validator';

export class RegisterEventDto {
  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
