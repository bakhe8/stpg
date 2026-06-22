import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import {
  ExitRefundPolicy,
  SubscriptionFrequency,
  TransparencyLevel,
} from '@prisma/client';

export class UpdateWalletPolicyDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  subscriptionAmount?: number;

  @IsOptional()
  @IsEnum(SubscriptionFrequency)
  subscriptionFrequency?: SubscriptionFrequency;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumActiveMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBenefitPerYear?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  exitNoticeDays?: number;

  @IsOptional()
  @IsEnum(ExitRefundPolicy)
  exitRefundPolicy?: ExitRefundPolicy;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  balanceTransparency?: TransparencyLevel;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  transactionTransparency?: TransparencyLevel;

  @IsOptional()
  @IsEnum(TransparencyLevel)
  beneficiaryTransparency?: TransparencyLevel;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
