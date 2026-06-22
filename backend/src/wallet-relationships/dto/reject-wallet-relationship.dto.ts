import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectWalletRelationshipDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
