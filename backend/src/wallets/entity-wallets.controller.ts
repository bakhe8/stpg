import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletsService } from './wallets.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('wallets')
@ApiBearerAuth('access-token')
@Controller('entities')
export class EntityWalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post(':entityId/wallets')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('entityId') entityId: string,
    @Body() dto: CreateWalletDto,
    @CurrentUser() user: Person,
  ) {
    return this.walletsService.createWallet(entityId, user.id, dto);
  }

  @Get(':entityId/wallets')
  findAll(@Param('entityId') entityId: string, @CurrentUser() user: Person) {
    return this.walletsService.findEntityWallets(entityId, user.id);
  }
}
