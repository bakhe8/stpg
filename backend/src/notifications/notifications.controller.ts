import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Body, Post } from '@nestjs/common';
import { SubscribeDto } from './dto/subscribe.dto';

@UseGuards(JwtGuard)
@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get the VAPID public key for web push' })
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  @Get()
  getMyNotifications(
    @CurrentUser() user: Person,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.id,
      unread === 'true',
    );
  }

  @Get('count')
  countUnread(@CurrentUser() user: Person) {
    return this.notificationsService.countUnread(user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: Person,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: Person) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: Person, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.deleteNotification(id, user.id);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Register a device push subscription' })
  subscribe(@CurrentUser() user: Person, @Body() dto: SubscribeDto) {
    return this.notificationsService.subscribeDevice(
      user.id,
      dto.subscription,
      dto.deviceOs,
    );
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Remove a device push subscription' })
  unsubscribe(@CurrentUser() user: Person, @Body() dto: SubscribeDto) {
    return this.notificationsService.unsubscribeDevice(
      user.id,
      dto.subscription,
    );
  }
}
