import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  MinLength,
} from 'class-validator';
import { RuleTargetType, RuleType } from '@prisma/client';

export class CreateRuleDto {
  @IsEnum(RuleTargetType)
  targetType: RuleTargetType;

  @IsUUID()
  targetId: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RuleType)
  ruleType: RuleType;

  @IsObject()
  ruleData: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  ruleData?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
