import { IsOptional, IsInt, Min, IsDateString, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
