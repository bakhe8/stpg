import { IsEnum, IsString, MinLength } from 'class-validator';
import { AppealStatus } from '@prisma/client';

export class RespondAppealDto {
  @IsString()
  @MinLength(5)
  reviewerNotes: string;

  @IsEnum(AppealStatus)
  status: AppealStatus;
}
