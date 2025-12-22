import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsPositive,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsDateString()
  readonly startDate?: string;

  @IsOptional()
  @IsDateString()
  readonly endDate?: string;

  @IsOptional()
  @IsString()
  readonly location?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  readonly capacity?: number;

  @IsOptional()
  @IsNumber()
  readonly fee?: number;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @IsOptional()
  @IsUUID()
  readonly branchId?: string;
}
