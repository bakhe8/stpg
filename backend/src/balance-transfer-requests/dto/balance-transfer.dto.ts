import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTransferRequestDto {
  @IsUUID()
  @IsNotEmpty()
  fromPathId: string;

  @IsUUID()
  @IsNotEmpty()
  toPathId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewTransferDto {
  @IsString()
  @IsNotEmpty()
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  reviewerNotes?: string;
}
