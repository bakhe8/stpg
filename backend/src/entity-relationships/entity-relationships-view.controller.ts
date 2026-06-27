import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { EntityRelationshipsService } from './entity-relationships.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('entity-relationships')
@ApiBearerAuth('access-token')
@Controller('entities')
@UseGuards(JwtGuard)
export class EntityRelationshipsViewController {
  constructor(private readonly service: EntityRelationshipsService) {}

  @Get(':entityId/relationships')
  findAll(@Param('entityId') entityId: string, @CurrentUser() user: Person) {
    return this.service.findEntityRelationships(entityId, user.id);
  }
}
