import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VoteChoice } from '@prisma/client';

export class CastVoteDto {
  @IsEnum(VoteChoice)
  choice: VoteChoice;

  @IsOptional()
  @IsString()
  notes?: string;
}
