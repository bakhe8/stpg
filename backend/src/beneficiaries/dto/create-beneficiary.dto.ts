import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { BeneficiaryType } from '@prisma/client';

export class CreateBeneficiaryDto {
  @IsEnum(BeneficiaryType)
  type: BeneficiaryType;

  @IsOptional()
  @IsUUID()
  membershipId?: string;

  @IsOptional()
  @IsUUID()
  dependentId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  annualCap?: number;
}
