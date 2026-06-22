import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { DisputeType } from '@prisma/client';

export class OpenDisputeDto {
  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @IsUUID()
  governancePathId?: string;

  @IsOptional()
  @IsUUID()
  respondentId?: string;

  @IsOptional()
  @IsUUID()
  linkedAppealId?: string;

  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsEnum(DisputeType)
  type: DisputeType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
