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
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionsService } from './subscriptions.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@Controller()
@UseGuards(JwtGuard)
export class DocumentedSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('paths/:pathId/subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(
    @Param('pathId') pathId: string,
    @Body() dto: SubscribeDto,
    @CurrentUser() user: Person,
  ) {
    return this.subscriptionsService.subscribe(pathId, user.id, dto);
  }

  @Get('memberships/:membershipId/subscriptions')
  findMembershipSubscriptions(
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: Person,
  ) {
    return this.subscriptionsService.findMemberSubscriptions(
      membershipId,
      user.id,
    );
  }
}
