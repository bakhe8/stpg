import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { WalletRelationshipType } from '@prisma/client';

export class UpdateWalletRelationshipDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(WalletRelationshipType)
  relationshipType?: WalletRelationshipType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  contributionPercent?: number;

  @IsOptional()
  @IsBoolean()
  hasVotingRights?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOversightRights?: boolean;
}
