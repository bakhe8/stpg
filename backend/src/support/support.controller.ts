import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';
import { CurrentPlatformUser } from '../identity/auth/decorators/current-platform-user.decorator';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { CreateSupportSessionDto } from './dto/support-session.dto';
import { ForbiddenException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('sessions/:entityId')
  @AllowPlatform()
  @UseGuards(JwtGuard)
  async getSessions(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser()
    user: {
      id: string;
      userType: 'tenant' | 'platform';
      role?: PlatformRole;
    },
  ) {
    return this.supportService.getActiveSessions(entityId, user);
  }

  @Post('entities/:entityId/sessions')
  @AllowPlatform()
  @UseGuards(JwtGuard, PlatformGuard)
  async createSession(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPlatformUser() operator: { id: string; role: PlatformRole },
    @Body() dto: CreateSupportSessionDto,
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'فتح جلسات الدعم يتطلب OWNER أو SUPER_ADMIN حتى لا يفتح الدعم أو التحليل نطاقاً لنفسه',
      );
    }
    return this.supportService.requestSupportAccess(
      entityId,
      operator.id,
      dto.scope,
      dto.hours,
    );
  }

  @Post('entities/:entityId/sessions/:id/revoke')
  @AllowPlatform()
  @UseGuards(JwtGuard, PlatformGuard)
  async revokeSession(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentPlatformUser() operator: { role: PlatformRole },
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'إلغاء جلسات الدعم يتطلب OWNER أو SUPER_ADMIN',
      );
    }
    return this.supportService.revokeSupportAccess(sessionId, entityId);
  }
}
