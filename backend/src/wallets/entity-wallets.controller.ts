import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Person } from '@prisma/client';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletsService } from './wallets.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('wallets')
@ApiBearerAuth('access-token')
@Controller('entities')
@UseGuards(JwtGuard)
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
