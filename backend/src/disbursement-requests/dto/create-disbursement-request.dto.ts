import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDisbursementRequestDto {
  @IsUUID()
  spendingItemId: string;

  @IsOptional()
  @IsUUID()
  beneficiaryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  beneficiaryName?: string;

  @IsOptional()
  @IsString()
  beneficiaryNotes?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
