import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TransparencyLevel } from '@prisma/client';

export class CreateSpendingItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  eligibilityCriteria?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmountPerRequest?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmountPerYear?: number;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  privacyLevel?: TransparencyLevel;

  @IsOptional()
  @IsBoolean()
  requiresCommitteeApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsException?: boolean;
}
