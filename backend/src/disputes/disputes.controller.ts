import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import {
  AssignArbitratorDto,
  ResolveDisputeDto,
} from './dto/resolve-dispute.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('disputes')
@ApiBearerAuth('access-token')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  open(@CurrentUser() user: Person, @Body() dto: OpenDisputeDto) {
    return this.disputesService.openDispute(user.id, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: Person) {
    return this.disputesService.findMyDisputes(user.id);
  }

  @Get()
  findByEntity(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.disputesService.findEntityDisputes(entityId, user.id);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.disputesService.findById(id, user.id);
  }

  @Patch(':id/arbitrator')
  assignArbitrator(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignArbitratorDto,
  ) {
    return this.disputesService.assignArbitrator(id, user.id, dto);
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(id, user.id, dto);
  }

  @Patch(':id/escalate')
  escalate(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.disputesService.escalate(id, user.id);
  }
}
