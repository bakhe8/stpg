import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  DecisionType,
  SubjectType,
  VoteType,
  VotersScope,
} from '@prisma/client';

export class CreateDecisionDto {
  @IsEnum(DecisionType)
  type: DecisionType;

  @IsEnum(SubjectType)
  subjectType: SubjectType;

  @IsString()
  @IsUUID()
  subjectId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  governancePathId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  spendingItemId?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsEnum(VoteType)
  voteType: VoteType;

  @IsEnum(VotersScope)
  votersScope: VotersScope;

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

  @IsDateString()
  closesAt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
