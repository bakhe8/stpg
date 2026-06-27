import {
  IsString,
  IsNumber,
  IsPositive,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class RecordEntitySupportDto {
  @IsUUID()
  sourcePathId: string;

  @IsUUID()
  targetPathId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsUUID()
  @IsNotEmpty()
  decisionId: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
