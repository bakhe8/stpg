import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinInvitationContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  relationshipDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sponsorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
