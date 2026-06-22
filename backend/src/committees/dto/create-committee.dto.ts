import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCommitteeDto {
  @IsUUID()
  entityId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCommitteeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddCommitteeMemberDto {
  @IsUUID()
  membershipId: string;
}
