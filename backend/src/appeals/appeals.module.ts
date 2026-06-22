import { Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [PrismaModule, NotificationsModule, RulesModule],
  controllers: [AppealsController],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
