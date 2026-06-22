import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { EntityRelationshipType } from '@prisma/client';

export class CreateEntityRelationshipDto {
  @IsUUID()
  sourceEntityId: string;

  @IsUUID()
  targetEntityId: string;

  @IsEnum(EntityRelationshipType)
  type: EntityRelationshipType;

  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}
