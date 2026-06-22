import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { VoteType } from '@prisma/client';

export class UpdatePathPolicyDto {
  @IsOptional()
  @IsEnum(VoteType)
  voteType?: VoteType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  individualSpendingCap?: number;

  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quorumPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  approvalPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  votingDurationHours?: number;

  @IsOptional()
  @IsBoolean()
  allowAppeals?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  appealWindowDays?: number;

  @IsOptional()
  @IsBoolean()
  allowBalanceTransfer?: boolean;
}
