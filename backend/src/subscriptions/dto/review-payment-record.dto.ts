import { IsOptional, IsString } from 'class-validator';

export class ApprovePaymentRecordDto {
  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}

export class RejectPaymentRecordDto {
  @IsString()
  reviewerNotes: string;
}
