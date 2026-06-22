import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RecordTransferDto {
  @IsString()
  @IsUUID()
  sourcePathId: string;

  @IsString()
  @IsUUID()
  targetPathId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  description: string;

  @IsUUID()
  @IsOptional()
  decisionId?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
