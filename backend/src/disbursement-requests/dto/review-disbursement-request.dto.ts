import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveDisbursementRequestDto {
  @IsOptional()
  @IsString()
  reviewerNotes?: string;

  @IsOptional()
  @IsUUID()
  decisionId?: string;
}

export class RejectDisbursementRequestDto {
  @IsString()
  reviewerNotes: string;
}

export class ExecuteDisbursementRequestDto {
  @IsOptional()
  @IsString()
  reference?: string;
}
