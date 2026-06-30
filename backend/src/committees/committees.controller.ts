import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import {
  CreateCommitteeDto,
  UpdateCommitteeDto,
  AddCommitteeMemberDto,
} from './dto/create-committee.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('committees')
@ApiBearerAuth('access-token')
@Controller('committees')
export class CommitteesController {
  constructor(private readonly committeesService: CommitteesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: Person, @Body() dto: CreateCommitteeDto) {
    return this.committeesService.create(user.id, dto);
  }

  @Get()
  findByEntity(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.findByEntity(entityId, user.id);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
    @Body() dto: UpdateCommitteeDto,
  ) {
    return this.committeesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.deactivate(id, user.id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Person,
    @Body() dto: AddCommitteeMemberDto,
  ) {
    return this.committeesService.addMember(id, user.id, dto);
  }

  @Delete(':id/members/:membershipId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.removeMember(id, membershipId, user.id);
  }

  @Patch(':id/paths/:pathId/assign')
  assignPath(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.assignPath(id, pathId, user.id);
  }

  @Patch(':id/paths/:pathId/unassign')
  unassignPath(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @CurrentUser() user: Person,
  ) {
    return this.committeesService.unassignPath(id, pathId, user.id);
  }
}
