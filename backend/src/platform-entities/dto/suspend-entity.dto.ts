import { IsEnum, IsString, MinLength } from 'class-validator';
import { EntityPlatformStatus } from '@prisma/client';

export class SuspendEntityDto {
  @IsString()
  @MinLength(10)
  reason: string;

  @IsEnum(EntityPlatformStatus)
  statusType: EntityPlatformStatus;
}
