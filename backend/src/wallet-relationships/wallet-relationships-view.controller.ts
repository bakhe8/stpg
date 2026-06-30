import { Controller, Get, Param } from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { WalletRelationshipsService } from './wallet-relationships.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('wallet-relationships')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletRelationshipsViewController {
  constructor(private readonly service: WalletRelationshipsService) {}

  @Get(':walletId/relationships')
  findAll(@Param('walletId') walletId: string, @CurrentUser() user: Person) {
    return this.service.findWalletRelationships(walletId, user.id);
  }
}
