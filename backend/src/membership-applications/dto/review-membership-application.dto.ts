import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReviewMembershipApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reviewerNotes?: string;
}
