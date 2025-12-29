import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsString()
  role?: string;
}
