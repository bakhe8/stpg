import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum TransferReviewStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

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
  @IsEnum(TransferReviewStatus)
  @IsNotEmpty()
  status: TransferReviewStatus;

  @IsString()
  @IsOptional()
  reviewerNotes?: string;
}
