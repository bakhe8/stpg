import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { AppealType } from '@prisma/client';

export class FileAppealDto {
  @IsString()
  @IsUUID()
  decisionId: string;

  @IsEnum(AppealType)
  type: AppealType;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];

  @IsOptional()
  @IsString()
  requestedAction?: string;
}
