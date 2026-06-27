import {
  Controller,
  Get,
  ParseUUIDPipe,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('fund-health')
  getFundHealth(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.analyticsService.getFundHealth(entityId, user.id);
  }

  @Get('entities/:entityId/health')
  getEntityHealth(
    @CurrentUser() user: Person,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.analyticsService.getFundHealth(entityId, user.id);
  }

  @Get('my-report')
  getMyCrossEntityReport(@CurrentUser() user: Person) {
    return this.analyticsService.getMemberCrossEntityReport(user.id, user.id);
  }

  @Get('monthly-report')
  getMonthlyReport(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getMonthlyFinancialReport(
      entityId,
      user.id,
      period,
    );
  }

  @Get('auditor-overview')
  getAuditorOverview(
    @CurrentUser() user: Person,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.analyticsService.getAuditorOverview(entityId, user.id);
  }

  // B-2: تقرير التدقيق الشهري بتاريخ محدد
  @Get('entities/:entityId/audit/report/:period')
  generateAuditReport(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('period') period: string,
    @CurrentUser() user: Person,
  ) {
    return this.analyticsService.generateAuditReport(entityId, period, user.id);
  }

  // B-3: كشف تداخل اشتراكات العضو بالغرض
  @Get('members/overlaps')
  getMemberSubscriptionOverlaps(@CurrentUser() user: Person) {
    return this.analyticsService.getMemberSubscriptionOverlaps(
      user.id,
      user.id,
    );
  }

  // B-4: كشف الأعضاء غير المشتركين في محافظ المنفعة المشتركة
  @Get('entities/:entityId/shared-benefit/free-riders')
  getSharedBenefitFreeRiders(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.analyticsService.getSharedBenefitFreeRiders(entityId, user.id);
  }

  // D-3: تقرير الشجرة الكاملة للكيان وكل فروعه
  @Get('entities/:entityId/subtree-report')
  getEntitySubtreeReport(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.analyticsService.getEntitySubtreeReport(entityId, user.id);
  }

  // S-2: تقرير الدعم المالي الوارد والصادر للكيان
  @Get('entities/:entityId/support-report')
  getEntitySupportReport(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: Person,
  ) {
    return this.analyticsService.getEntitySupportReport(entityId, user.id);
  }
}
