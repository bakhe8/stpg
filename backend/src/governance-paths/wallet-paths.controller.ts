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
import { CreatePathDto } from './dto/create-path.dto';
import { GovernancePathsService } from './governance-paths.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';


@ApiTags('governance-paths')
@ApiBearerAuth('access-token')
@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletPathsController {
  constructor(private readonly pathsService: GovernancePathsService) {}

  @Post(':walletId/paths')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('walletId') walletId: string,
    @Body() dto: CreatePathDto,
    @CurrentUser() user: Person,
  ) {
    return this.pathsService.createPath(walletId, user.id, dto);
  }

  @Get(':walletId/paths')
  findAll(@Param('walletId') walletId: string, @CurrentUser() user: Person) {
    return this.pathsService.findWalletPaths(walletId, user.id);
  }
}
