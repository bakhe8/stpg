import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateDependentDto } from './dto/create-dependent.dto';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('memberships')
@ApiBearerAuth('access-token')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.membershipsService.findById(id, user.id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.membershipsService.activate(id, user.id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: Person,
  ) {
    return this.membershipsService.updateRole(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  exit(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.membershipsService.exitEntity(id, user.id);
  }

  @Get(':id/preferences')
  getPreferences(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.membershipsService.getPreferences(id, user.id);
  }

  @Put(':id/preferences')
  upsertPreferences(
    @Param('id') id: string,
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: Person,
  ) {
    return this.membershipsService.upsertPreferences(id, user.id, dto);
  }

  @Post(':id/dependents')
  @HttpCode(HttpStatus.CREATED)
  addDependent(
    @Param('id') id: string,
    @Body() dto: CreateDependentDto,
    @CurrentUser() user: Person,
  ) {
    return this.membershipsService.addDependent(id, user.id, dto);
  }
}
