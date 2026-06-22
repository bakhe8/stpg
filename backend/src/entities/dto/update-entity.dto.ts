import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntityType } from '@prisma/client';

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(EntityType)
  type?: EntityType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;
}
