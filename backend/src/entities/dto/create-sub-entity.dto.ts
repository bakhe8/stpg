import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';
import { EntityType } from '@prisma/client';

const SUB_ENTITY_TYPES = Object.values(EntityType).filter(
  (t) => t !== EntityType.CAMPAIGN,
);

export class CreateSubEntityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(SUB_ENTITY_TYPES)
  type: Exclude<EntityType, 'CAMPAIGN'>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  campaignEndsAt?: string;
}

export function validateCampaignEndsAt(value?: string): void {
  if (!value) return;
  const date = new Date(value);
  if (isNaN(date.getTime()) || date <= new Date()) {
    throw new Error('campaignEndsAt يجب أن يكون تاريخاً مستقبلياً');
  }
}
