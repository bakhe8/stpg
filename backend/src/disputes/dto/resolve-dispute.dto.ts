import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class ResolveDisputeDto {
  @IsString()
  @MinLength(10)
  arbitratorNotes: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsEnum(DisputeStatus)
  status: DisputeStatus;
}

export class AssignArbitratorDto {
  @IsUUID()
  arbitratorId: string;
}
