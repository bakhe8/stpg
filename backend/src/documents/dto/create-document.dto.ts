import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { TransparencyLevel } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  fileUrl: string;

  @IsString()
  fileType: string;

  @IsInt()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @IsUUID()
  governancePathId?: string;

  @IsOptional()
  @IsUUID()
  decisionId?: string;

  @IsOptional()
  @IsUUID()
  disbursementRequestId?: string;

  @IsOptional()
  @IsUUID()
  appealId?: string;

  @IsOptional()
  @IsUUID()
  disputeId?: string;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  privacyLevel?: TransparencyLevel;
}
