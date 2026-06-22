import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GovernancePathType } from '@prisma/client';

export class CreatePathDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(GovernancePathType)
  type: GovernancePathType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
