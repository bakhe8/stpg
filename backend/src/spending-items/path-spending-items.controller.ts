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
import { CreateSpendingItemDto } from './dto/create-spending-item.dto';
import { SpendingItemsService } from './spending-items.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('spending-items')
@ApiBearerAuth('access-token')
@Controller('paths')
@UseGuards(JwtGuard)
export class PathSpendingItemsController {
  constructor(private readonly spendingItemsService: SpendingItemsService) {}

  @Post(':pathId/spending-items')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('pathId') pathId: string,
    @Body() dto: CreateSpendingItemDto,
    @CurrentUser() user: Person,
  ) {
    return this.spendingItemsService.createSpendingItem(pathId, user.id, dto);
  }

  @Get(':pathId/spending-items')
  findAll(@Param('pathId') pathId: string, @CurrentUser() user: Person) {
    return this.spendingItemsService.findPathItems(pathId, user.id);
  }
}
