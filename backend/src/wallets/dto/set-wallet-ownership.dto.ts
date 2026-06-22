import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OwnershipEntryDto {
  @IsUUID()
  entityId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercent: number;
}

export class SetWalletOwnershipDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnershipEntryDto)
  ownerships: OwnershipEntryDto[];
}
