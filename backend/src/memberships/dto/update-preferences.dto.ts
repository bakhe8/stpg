import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GovernancePathType } from '@prisma/client';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(GovernancePathType, { each: true })
  acceptedGovernanceTypes?: GovernancePathType[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpendingCapAccepted?: number;

  @IsOptional()
  @IsBoolean()
  requiresAuditAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresCommitteeApproval?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
