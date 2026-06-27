import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SpendingItemsService } from './spending-items.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreateSpendingItemDto } from './dto/create-spending-item.dto';
import { UpdateSpendingItemDto } from './dto/update-spending-item.dto';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('spending-items')
@ApiBearerAuth('access-token')
@Controller('spending-items')
@UseGuards(JwtGuard)
export class SpendingItemsController {
  constructor(private readonly spendingItemsService: SpendingItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Query('pathId') pathId: string,
    @Body() dto: CreateSpendingItemDto,
    @CurrentUser() user: Person,
  ) {
    return this.spendingItemsService.createSpendingItem(pathId, user.id, dto);
  }

  @Get()
  findPathItems(@Query('pathId') pathId: string, @CurrentUser() user: Person) {
    return this.spendingItemsService.findPathItems(pathId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.spendingItemsService.findById(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSpendingItemDto,
    @CurrentUser() user: Person,
  ) {
    return this.spendingItemsService.updateSpendingItem(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: Person) {
    return this.spendingItemsService.removeSpendingItem(id, user.id);
  }
}
