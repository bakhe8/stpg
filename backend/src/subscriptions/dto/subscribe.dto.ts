import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsUUID()
  membershipId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
