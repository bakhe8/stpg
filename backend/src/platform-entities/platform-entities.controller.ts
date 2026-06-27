import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlatformEntitiesService } from './platform-entities.service';
import { SuspendEntityDto } from './dto/suspend-entity.dto';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { CurrentPlatformUser } from '../identity/auth/decorators/current-platform-user.decorator';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { PlatformRole, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';

@Controller()
@AllowPlatform()
export class PlatformEntitiesController {
  constructor(
    private readonly service: PlatformEntitiesService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Platform Endpoints (يتطلب Platform JWT) ──────────────────────

  @Get('platform/entities')
  @UseGuards(JwtGuard, PlatformGuard)
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch('platform/entities/:id/suspend')
  @UseGuards(JwtGuard, PlatformGuard)
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendEntityDto,
    @CurrentPlatformUser() operator: { role: PlatformRole },
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('تعليق الكيان يتطلب OWNER أو SUPER_ADMIN');
    }
    return this.service.suspend(id, dto.reason, dto.statusType);
  }

  @Patch('platform/entities/:id/activate')
  @UseGuards(JwtGuard, PlatformGuard)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPlatformUser() operator: { role: PlatformRole },
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('تفعيل الكيان يتطلب OWNER أو SUPER_ADMIN');
    }
    return this.service.activate(id);
  }

  // ── Platform Endpoints — الاعتراضات ────────────────────────────────

  @Get('platform/appeals')
  @UseGuards(JwtGuard, PlatformGuard)
  getSuspensionAppeals(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getSuspensionAppeals({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch('platform/appeals/:id/respond')
  @UseGuards(JwtGuard, PlatformGuard)
  @HttpCode(HttpStatus.OK)
  respondToAppeal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { response: string; status: 'REVIEWED' | 'RESOLVED' },
    @CurrentPlatformUser() operator: { role: PlatformRole },
  ) {
    if (
      operator.role !== PlatformRole.OWNER &&
      operator.role !== PlatformRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'الرد على الاعتراضات يتطلب OWNER أو SUPER_ADMIN',
      );
    }
    return this.service.respondToAppeal(id, body.response, body.status);
  }

  // ── Tenant Endpoint — مدير الكيان يرى من وصل بياناته ──────────────

  @Get('entities/:id/platform-access-logs')
  @UseGuards(JwtGuard)
  async getPlatformAccessLogs(
    @Param('id', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: { id: string; userType: string },
  ) {
    // نرفض إذا كان Platform operator يحاول استخدام هذا الـ endpoint
    if (user.userType === 'platform') {
      throw new ForbiddenException(
        'Platform operators يستخدمون /platform/entities',
      );
    }

    // التحقق أن المستخدم FOUNDER أو ADMIN في هذا الكيان
    const membership = await this.prisma.membership.findUnique({
      where: { personId_entityId: { personId: user.id, entityId } },
      select: { role: true, isActive: true },
    });

    if (
      !membership?.isActive ||
      (membership.role !== MemberRole.FOUNDER &&
        membership.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'عرض سجل وصول المنصة متاح للمؤسس والمدير فقط',
      );
    }

    return this.service.getPlatformAccessLogs(entityId);
  }
}
