import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateHouseholdDto {
  @IsUUID()
  entityId: string;

  @IsString()
  @MinLength(2)
  name: string;
}

export class AssignMemberToHouseholdDto {
  @IsUUID()
  membershipId: string;
}
