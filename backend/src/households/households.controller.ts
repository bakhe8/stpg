import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import {
  CreateHouseholdDto,
  AssignMemberToHouseholdDto,
} from './dto/household.dto';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@ApiTags('households')
@ApiBearerAuth('access-token')
@Controller('households')
@UseGuards(JwtGuard)
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHouseholdDto, @CurrentUser() user: Person) {
    return this.householdsService.create(user.id, dto);
  }

  @Get()
  findByEntity(
    @Query('entityId') entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.householdsService.findByEntity(entityId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.householdsService.findById(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.householdsService.delete(id, user.id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  assignMember(
    @Param('id') id: string,
    @Body() dto: AssignMemberToHouseholdDto,
    @CurrentUser() user: Person,
  ) {
    return this.householdsService.assignMember(id, user.id, dto);
  }

  @Delete(':id/members/:membershipId')
  removeMember(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: Person,
  ) {
    return this.householdsService.removeMember(id, membershipId, user.id);
  }
}
