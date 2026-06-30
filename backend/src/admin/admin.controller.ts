import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlatformGuard } from '../identity/auth/platform.guard';
import { AllowPlatform } from '../identity/auth/decorators/allow-platform.decorator';

@ApiTags('admin')
@Controller('admin/cron')
@AllowPlatform()
@UseGuards(PlatformGuard)
export class AdminController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiOperation({ summary: 'توليد دفعات الاستحقاق الشهرية يدوياً (للاختبار)' })
  @Post('generate-dues')
  async generateDues() {
    return this.subscriptionsService.generateMonthlyDues();
  }
}
