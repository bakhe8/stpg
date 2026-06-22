import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import {
  GovernancePathType,
  TransparencyLevel,
  VoteType,
} from '@prisma/client';

export class UpdateEntityPolicyDto {
  @IsOptional()
  @IsBoolean()
  allowOpenMembership?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMemberApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultiplePaths?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSubEntities?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEntityRelations?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(GovernancePathType, { each: true })
  allowedGovernanceTypes?: GovernancePathType[];

  @IsOptional()
  @IsEnum(VoteType)
  defaultVoteType?: VoteType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  decisionQuorumPercent?: number;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  defaultTransparency?: TransparencyLevel;

  @IsOptional()
  @IsBoolean()
  allowAppeals?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  appealTimeoutDays?: number;
}
