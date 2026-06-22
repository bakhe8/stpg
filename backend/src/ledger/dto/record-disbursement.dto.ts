import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RecordDisbursementDto {
  @IsString()
  @IsUUID()
  pathId: string;

  @IsString()
  @IsUUID()
  spendingItemId: string;

  @IsString()
  @IsUUID()
  decisionId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
