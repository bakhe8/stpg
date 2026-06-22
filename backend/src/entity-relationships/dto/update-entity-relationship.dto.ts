import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateEntityRelationshipDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}
