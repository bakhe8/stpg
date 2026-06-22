import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityRelationshipsService } from './entity-relationships.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { CreateEntityRelationshipDto } from './dto/create-entity-relationship.dto';
import { UpdateEntityRelationshipDto } from './dto/update-entity-relationship.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@UseGuards(JwtGuard)
@ApiTags('entity-relationships')
@ApiBearerAuth('access-token')
@Controller('entity-relationships')
export class EntityRelationshipsController {
  constructor(private readonly service: EntityRelationshipsService) {}

  @Post()
  create(
    @CurrentUser() user: Person,
    @Body() dto: CreateEntityRelationshipDto,
  ) {
    return this.service.createRelationship(user.id, dto);
  }

  @Get()
  findByEntity(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.service.findEntityRelationships(entityId, user.id);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntityRelationshipDto,
  ) {
    return this.service.updateRelationship(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  end(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.updateRelationship(id, user.id, { isActive: false });
  }

  // موافقة الكيان الهدف على الربط (الموافقة الثنائية)
  @Patch(':id/approve')
  approve(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approveRelationship(id, user.id);
  }

  // رفض الكيان الهدف لطلب الربط
  @Patch(':id/reject')
  reject(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.rejectRelationship(id, user.id);
  }

  @Get('overlap/report')
  getOverlapReport(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.service.getOverlapReport(entityId, user.id);
  }
}
