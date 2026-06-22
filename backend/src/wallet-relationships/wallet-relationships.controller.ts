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
import { WalletRelationshipsService } from './wallet-relationships.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { CreateWalletRelationshipDto } from './dto/create-wallet-relationship.dto';
import { UpdateWalletRelationshipDto } from './dto/update-wallet-relationship.dto';
import { RejectWalletRelationshipDto } from './dto/reject-wallet-relationship.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@UseGuards(JwtGuard)
@ApiTags('wallet-relationships')
@ApiBearerAuth('access-token')
@Controller('wallet-relationships')
export class WalletRelationshipsController {
  constructor(private readonly service: WalletRelationshipsService) {}

  @Post()
  create(
    @CurrentUser() user: Person,
    @Body() dto: CreateWalletRelationshipDto,
  ) {
    return this.service.createRelationship(user.id, dto);
  }

  @Get()
  findByWallet(
    @CurrentUser() user: Person,
    @Query('walletId', ParseUUIDPipe) walletId: string,
  ) {
    return this.service.findWalletRelationships(walletId, user.id);
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
    @Body() dto: UpdateWalletRelationshipDto,
  ) {
    return this.service.updateRelationship(id, user.id, dto);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approveRelationship(id, user.id);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWalletRelationshipDto,
  ) {
    return this.service.rejectRelationship(id, user.id, dto);
  }

  @Get('shared/report')
  getSharedWalletReport(
    @CurrentUser() user: Person,
    @Query('walletId', ParseUUIDPipe) walletId: string,
  ) {
    return this.service.getSharedWalletReport(walletId, user.id);
  }
}
