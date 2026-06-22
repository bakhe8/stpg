import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WalletRelationshipType } from '@prisma/client';

export class CreateWalletRelationshipDto {
  @IsUUID()
  sourceWalletId: string;

  @IsUUID()
  targetWalletId: string;

  @IsEnum(WalletRelationshipType)
  relationshipType: WalletRelationshipType;

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
